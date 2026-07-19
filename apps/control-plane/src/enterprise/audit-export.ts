import { createHash } from 'node:crypto';
import { requireTenant } from '../security/tenant-context.ts';

/**
 * Audit export.
 *
 * Verifies the continuity of a hash-chained audit log (each entry's prevDigest
 * must equal the previous entry's digest, with monotonic sequence) and produces
 * a content-addressed export manifest. The export is tenant-scoped: entries from
 * another tenant fail closed. The manifest's SHA-256 is a deterministic
 * integrity anchor over the canonical entries; cryptographic signing of the
 * export is a later, separately-authorized step (no keys are held here).
 */

export interface AuditEntry {
  seq: number;
  tenantId: string;
  action: string;
  prevDigest: string;
  digest: string;
  at: string; // ISO 8601
}

export interface ChainResult {
  intact: boolean;
  brokenAt: number | null;
  length: number;
}

export class AuditExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditExportError';
  }
}

/** Verify a hash chain: monotonic sequence and prevDigest linkage. */
export function verifyChain(entries: readonly AuditEntry[]): ChainResult {
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const cur = entries[i];
    if (cur.seq !== prev.seq + 1 || cur.prevDigest !== prev.digest) {
      return { intact: false, brokenAt: cur.seq, length: entries.length };
    }
  }
  return { intact: true, brokenAt: null, length: entries.length };
}

export interface AuditExport {
  tenantId: string;
  count: number;
  firstDigest: string | null;
  lastDigest: string | null;
  intact: boolean;
  sha256: string;
}

export function exportAudit(entries: readonly AuditEntry[]): AuditExport {
  const tenantId = requireTenant();
  for (const e of entries) {
    if (e.tenantId !== tenantId) throw new AuditExportError('CROSS_TENANT_DENIED');
  }
  const chain = verifyChain(entries);
  const canonical = JSON.stringify(entries.map((e) => [e.seq, e.action, e.prevDigest, e.digest, e.at]));
  const sha256 = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return {
    tenantId,
    count: entries.length,
    firstDigest: entries.length ? entries[0].digest : null,
    lastDigest: entries.length ? entries[entries.length - 1].digest : null,
    intact: chain.intact,
    sha256,
  };
}
