import { requireTenant } from '../security/tenant-context.ts';
import { can } from '../rbac/roles.ts';
import type { Actor } from '../rbac/roles.ts';
import { requireStepUp } from '../auth/step-up.ts';
import type { AuthContext } from '../auth/step-up.ts';

/**
 * Human authorization workflow.
 *
 * When policy returns REVIEW (or an action exceeds an agent's autonomy) an
 * approval request is raised. Authorising it enforces the enterprise controls
 * already defined elsewhere: the approver must hold `campaign.approve`
 * (Gate 1 RBAC), may not approve their own proposal (separation of duties), and
 * must clear step-up for privileged/high-risk actions (Gate 1 step-up). Every
 * decision is immutable and returns a new request; state is tenant-bound and
 * fails closed across tenants.
 */

export type ApprovalState = 'PENDING' | 'AUTHORISED' | 'DENIED' | 'EXPIRED';

export interface ApprovalRequest {
  approvalId: string;
  tenantId: string;
  actionType: string;
  riskClass: number;
  requestedBy: string;
  proposalKey: string;
  state: ApprovalState;
  decidedBy: string | null;
  expiresAt: string; // ISO 8601
}

export interface RaiseSpec {
  approvalId: string;
  actionType: string;
  riskClass: number;
  requestedBy: string;
  proposalKey: string;
  expiresAt: string;
}

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

export type DecisionReason =
  | 'OK'
  | 'NOT_PENDING'
  | 'EXPIRED'
  | 'NOT_AUTHORISED_TO_APPROVE'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'STEP_UP_REQUIRED'
  | 'STEP_UP_INSUFFICIENT_AAL'
  | 'STEP_UP_EXPIRED';

export interface DecisionResult {
  ok: boolean;
  reason: DecisionReason;
  request: ApprovalRequest;
}

function assertTenant(tenantId: string): void {
  if (requireTenant() !== tenantId) throw new ApprovalError('CROSS_TENANT_DENIED');
}

function isExpired(request: ApprovalRequest, nowMs: number): boolean {
  const t = Date.parse(request.expiresAt);
  return Number.isNaN(t) || t <= nowMs;
}

export function raiseApproval(spec: RaiseSpec): ApprovalRequest {
  const tenantId = requireTenant();
  if (!spec.approvalId) throw new ApprovalError('APPROVAL_ID_INVALID');
  if (!spec.requestedBy) throw new ApprovalError('REQUESTED_BY_INVALID');
  return {
    approvalId: spec.approvalId,
    tenantId,
    actionType: spec.actionType,
    riskClass: spec.riskClass,
    requestedBy: spec.requestedBy,
    proposalKey: spec.proposalKey,
    state: 'PENDING',
    decidedBy: null,
    expiresAt: spec.expiresAt,
  };
}

export function authorise(
  request: ApprovalRequest,
  approver: Actor,
  auth: AuthContext,
  nowMs: number,
): DecisionResult {
  assertTenant(request.tenantId);
  if (request.state !== 'PENDING') return { ok: false, reason: 'NOT_PENDING', request };
  if (isExpired(request, nowMs)) return { ok: false, reason: 'EXPIRED', request: { ...request, state: 'EXPIRED' } };
  if (!can(approver, 'campaign.approve')) return { ok: false, reason: 'NOT_AUTHORISED_TO_APPROVE', request };
  if (approver.actorId === request.requestedBy) return { ok: false, reason: 'SELF_APPROVAL_FORBIDDEN', request };
  const su = requireStepUp({ actionType: request.actionType, riskClass: request.riskClass }, auth, nowMs);
  if (!su.ok) return { ok: false, reason: su.reason, request };
  return { ok: true, reason: 'OK', request: { ...request, state: 'AUTHORISED', decidedBy: approver.actorId } };
}

export function deny(request: ApprovalRequest, approver: Actor, nowMs: number): DecisionResult {
  assertTenant(request.tenantId);
  if (request.state !== 'PENDING') return { ok: false, reason: 'NOT_PENDING', request };
  if (isExpired(request, nowMs)) return { ok: false, reason: 'EXPIRED', request: { ...request, state: 'EXPIRED' } };
  if (!can(approver, 'campaign.approve')) return { ok: false, reason: 'NOT_AUTHORISED_TO_APPROVE', request };
  return { ok: true, reason: 'OK', request: { ...request, state: 'DENIED', decidedBy: approver.actorId } };
}

/** Tenant-scoped hold for pending approvals; upsert on decision. */
export class ApprovalStore {
  private byKey = new Map<string, ApprovalRequest>();

  private key(tenantId: string, approvalId: string): string {
    return `${tenantId}\n${approvalId}`;
  }

  put(request: ApprovalRequest): void {
    if (requireTenant() !== request.tenantId) throw new ApprovalError('CROSS_TENANT_DENIED');
    this.byKey.set(this.key(request.tenantId, request.approvalId), request);
  }

  get(approvalId: string): ApprovalRequest | null {
    return this.byKey.get(this.key(requireTenant(), approvalId)) ?? null;
  }

  listPending(): ApprovalRequest[] {
    const tenantId = requireTenant();
    const out: ApprovalRequest[] = [];
    for (const r of this.byKey.values()) {
      if (r.tenantId === tenantId && r.state === 'PENDING') out.push(r);
    }
    return out;
  }

  size(): number {
    return this.byKey.size;
  }
}
