import { createHash } from 'node:crypto';
import { requireTenant } from '../security/tenant-context.ts';
import type { EvidenceStore } from './evidence-store.ts';

/**
 * Product Passport — the single verified record for a product.
 *
 * A passport holds claims. A claim is UNVERIFIED until at least one piece of
 * evidence (from the tenant's evidence store) is attached to it. Publishing
 * FAILS CLOSED: if any REQUIRED claim is still unverified the passport cannot
 * be published (`PUBLISH_WITHOUT_EVIDENCE` — the same reason code the policy
 * engine emits). Publishing deep-freezes the claims: a published passport is
 * immutable, and may only be WITHDRAWN. Every operation is bound to the tenant
 * the passport was created in — using it from another tenant fails closed.
 */

export type PassportStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
export type ClaimStatus = 'UNVERIFIED' | 'VERIFIED';

export interface Claim {
  claimId: string;
  attribute: string;
  value: string;
  required: boolean;
  evidenceIds: string[];
  status: ClaimStatus;
}

export interface ClaimInput {
  attribute: string;
  value: string;
  /** Required claims must be verified before the passport can be published. Default: true. */
  required?: boolean;
}

export class PassportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassportError';
  }
}

function claimIdFor(tenantId: string, productId: string, attribute: string): string {
  return (
    'cl_' +
    createHash('sha256').update([tenantId, productId, attribute].join('\n'), 'utf8').digest('hex').slice(0, 20)
  );
}

function copyClaim(c: Claim): Claim {
  return { ...c, evidenceIds: [...c.evidenceIds] };
}

export class ProductPassport {
  readonly tenantId: string;
  readonly productId: string;
  private evidence: EvidenceStore;
  private _status: PassportStatus;
  private claims: Map<string, Claim>;
  private _publishedVersion: string | null;

  constructor(productId: string, evidence: EvidenceStore) {
    if (!productId || typeof productId !== 'string') throw new PassportError('PRODUCT_ID_INVALID');
    this.tenantId = requireTenant();
    this.productId = productId;
    this.evidence = evidence;
    this._status = 'DRAFT';
    this.claims = new Map();
    this._publishedVersion = null;
  }

  private assertOwnTenant(): void {
    if (requireTenant() !== this.tenantId) throw new PassportError('CROSS_TENANT_DENIED');
  }

  private assertDraft(): void {
    if (this._status !== 'DRAFT') throw new PassportError(`NOT_DRAFT:${this._status}`);
  }

  addClaim(input: ClaimInput): Claim {
    this.assertOwnTenant();
    this.assertDraft();
    const attribute = (input.attribute ?? '').trim();
    if (!attribute) throw new PassportError('CLAIM_ATTRIBUTE_INVALID');
    const claimId = claimIdFor(this.tenantId, this.productId, attribute);
    if (this.claims.has(claimId)) throw new PassportError(`CLAIM_EXISTS:${attribute}`);
    const claim: Claim = {
      claimId,
      attribute,
      value: input.value,
      required: input.required !== false,
      evidenceIds: [],
      status: 'UNVERIFIED',
    };
    this.claims.set(claimId, claim);
    return copyClaim(claim);
  }

  /** Attach tenant-scoped evidence to a claim; a claim with any evidence is VERIFIED. */
  attachEvidence(claimId: string, evidenceId: string): void {
    this.assertOwnTenant();
    this.assertDraft();
    const claim = this.claims.get(claimId);
    if (!claim) throw new PassportError(`UNKNOWN_CLAIM:${claimId}`);
    // Cross-tenant / unknown evidence returns null from the tenant-scoped store.
    if (!this.evidence.get(evidenceId)) throw new PassportError(`EVIDENCE_NOT_FOUND:${evidenceId}`);
    if (!claim.evidenceIds.includes(evidenceId)) claim.evidenceIds.push(evidenceId);
    claim.status = 'VERIFIED';
  }

  publish(version: string): void {
    this.assertOwnTenant();
    if (this._status !== 'DRAFT') throw new PassportError(`NOT_DRAFT:${this._status}`);
    if (!version || typeof version !== 'string') throw new PassportError('VERSION_INVALID');
    for (const claim of this.claims.values()) {
      if (claim.required && claim.status !== 'VERIFIED') {
        throw new PassportError('PUBLISH_WITHOUT_EVIDENCE');
      }
    }
    for (const claim of this.claims.values()) {
      Object.freeze(claim.evidenceIds);
      Object.freeze(claim);
    }
    this._status = 'PUBLISHED';
    this._publishedVersion = version;
  }

  withdraw(): void {
    this.assertOwnTenant();
    if (this._status !== 'PUBLISHED') throw new PassportError(`NOT_PUBLISHED:${this._status}`);
    this._status = 'WITHDRAWN';
  }

  /** True when every REQUIRED claim is verified — the boolean the policy engine consumes. */
  hasRequiredEvidence(): boolean {
    this.assertOwnTenant();
    for (const claim of this.claims.values()) {
      if (claim.required && claim.status !== 'VERIFIED') return false;
    }
    return true;
  }

  status(): PassportStatus {
    this.assertOwnTenant();
    return this._status;
  }

  publishedVersion(): string | null {
    return this._publishedVersion;
  }

  getClaim(claimId: string): Claim | null {
    this.assertOwnTenant();
    const claim = this.claims.get(claimId);
    return claim ? copyClaim(claim) : null;
  }

  listClaims(): Claim[] {
    this.assertOwnTenant();
    return Array.from(this.claims.values(), copyClaim);
  }
}
