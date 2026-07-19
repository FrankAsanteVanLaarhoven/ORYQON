/**
 * ActionProposal — the single typed envelope for every external side effect.
 *
 * Nothing leaves ORYQON except through a proposal that a human authorises and
 * policy executes. The lifecycle is an explicit state machine; illegal
 * transitions throw. Idempotency (no duplicate action under replay) is enforced
 * by the store keyed on (tenantId, idempotencyKey).
 */

export type ActionState =
  | 'PROPOSED'
  | 'REVIEW'
  | 'AUTHORISED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'DENIED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVOKED';

export interface ActionProposal {
  actionType: string;
  tenantId: string;
  actorId: string;
  idempotencyKey: string;
  targetType: string;
  targetId: string;
  riskClass: number;
  policyVersion: string;
  evidenceIds: string[];
  payload: Record<string, unknown>;
  expiresAt: string; // ISO 8601
  state: ActionState;
}

const TRANSITIONS: Record<ActionState, readonly ActionState[]> = {
  PROPOSED: ['REVIEW', 'AUTHORISED', 'DENIED', 'EXPIRED'],
  REVIEW: ['AUTHORISED', 'DENIED', 'EXPIRED'],
  AUTHORISED: ['EXECUTING', 'REVOKED', 'EXPIRED'],
  EXECUTING: ['EXECUTED', 'FAILED'],
  EXECUTED: [],
  DENIED: [],
  FAILED: [],
  EXPIRED: [],
  REVOKED: [],
};

export function canTransition(from: ActionState, to: ActionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  readonly from: ActionState;
  readonly to: ActionState;
  constructor(from: ActionState, to: ActionState) {
    super(`ILLEGAL_TRANSITION:${from}->${to}`);
    this.name = 'IllegalTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function transition(proposal: ActionProposal, to: ActionState): ActionProposal {
  if (!canTransition(proposal.state, to)) {
    throw new IllegalTransitionError(proposal.state, to);
  }
  return { ...proposal, state: to };
}

export function isExpired(proposal: ActionProposal, nowMs: number): boolean {
  const t = Date.parse(proposal.expiresAt);
  return Number.isNaN(t) ? true : t <= nowMs;
}
