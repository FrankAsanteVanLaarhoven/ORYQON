import { createHash } from 'node:crypto';
import { requireTenant } from '../security/tenant-context.ts';

/**
 * Evidence store — content-addressed, immutable attestations.
 *
 * Evidence is the forensic backing for a product claim. Each record binds a
 * human-readable statement to the exact content it was drawn from via a
 * SHA-256 hash, and is DEEP-FROZEN the moment it is recorded: an attestation,
 * once made, can never be edited. Every record is stamped with the ambient
 * tenant and is only ever returned inside that same tenant scope —
 * cross-tenant reads FAIL CLOSED (return null). Recording the identical
 * attestation twice is idempotent: the content-addressed id is the same, so
 * the first frozen record is returned again.
 */

export type EvidenceKind =
  | 'DOCUMENT'
  | 'MEASUREMENT'
  | 'CERTIFICATION'
  | 'ATTESTATION'
  | 'EXTERNAL_RECORD';

const KINDS: ReadonlySet<string> = new Set<EvidenceKind>([
  'DOCUMENT',
  'MEASUREMENT',
  'CERTIFICATION',
  'ATTESTATION',
  'EXTERNAL_RECORD',
]);

export interface EvidenceInput {
  kind: EvidenceKind;
  /** Provenance — where the content came from. */
  source: string;
  /** The assertion the content is offered as proof of. */
  statement: string;
  /** The raw material the integrity hash is computed over. */
  content: unknown;
  /** ISO capture timestamp, caller-supplied so the record stays deterministic. */
  capturedAt: string;
}

export interface Evidence {
  evidenceId: string;
  tenantId: string;
  kind: EvidenceKind;
  source: string;
  statement: string;
  /** SHA-256 hex of the canonical form of the content. */
  contentHash: string;
  capturedAt: string;
}

export class EvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceError';
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Deterministic serialization: object keys sorted recursively so that two
 * structurally-equal contents always hash identically regardless of key order.
 */
function canonicalize(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') +
    '}'
  );
}

function requireField(input: EvidenceInput, field: keyof EvidenceInput): void {
  const v = input[field];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new EvidenceError(`EVIDENCE_FIELD_INVALID:${String(field)}`);
  }
}

function scopeKey(tenantId: string, evidenceId: string): string {
  return `${tenantId}\n${evidenceId}`;
}

export class EvidenceStore {
  private byId = new Map<string, Evidence>();

  /**
   * Record an attestation. Returns the frozen, content-addressed record.
   * Idempotent: an identical attestation (same tenant, kind, source,
   * statement, content and capturedAt) yields the same id and record.
   */
  record(input: EvidenceInput): Evidence {
    const tenantId = requireTenant();
    if (!KINDS.has(input.kind)) {
      throw new EvidenceError(`EVIDENCE_KIND_INVALID:${String(input.kind)}`);
    }
    requireField(input, 'source');
    requireField(input, 'statement');
    requireField(input, 'capturedAt');

    const contentHash = sha256(canonicalize(input.content));
    const evidenceId =
      'ev_' +
      sha256(
        [tenantId, input.kind, input.source, input.statement, contentHash, input.capturedAt].join(
          '\n',
        ),
      ).slice(0, 24);

    const k = scopeKey(tenantId, evidenceId);
    const existing = this.byId.get(k);
    if (existing) return existing;

    const record: Evidence = Object.freeze({
      evidenceId,
      tenantId,
      kind: input.kind,
      source: input.source,
      statement: input.statement,
      contentHash,
      capturedAt: input.capturedAt,
    });
    this.byId.set(k, record);
    return record;
  }

  /** Fetch evidence in the current tenant scope. Cross-tenant reads return null. */
  get(evidenceId: string): Evidence | null {
    const tenantId = requireTenant();
    return this.byId.get(scopeKey(tenantId, evidenceId)) ?? null;
  }

  has(evidenceId: string): boolean {
    return this.get(evidenceId) !== null;
  }

  /**
   * Prove an attestation still matches the content it was drawn from: recompute
   * the hash and compare. False if the evidence is unknown in this tenant or the
   * content has drifted from what was attested.
   */
  verifyIntegrity(evidenceId: string, content: unknown): boolean {
    const record = this.get(evidenceId);
    if (!record) return false;
    return record.contentHash === sha256(canonicalize(content));
  }

  size(): number {
    return this.byId.size;
  }
}
