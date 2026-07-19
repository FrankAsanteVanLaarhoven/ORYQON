/**
 * Step-up authentication for privileged actions.
 *
 * A privileged action (a privileged action type, or risk class at or above the
 * threshold) requires a recent, sufficiently strong step-up assertion. Without
 * one — or with a stale or too-weak one — the action is refused and re-auth is
 * demanded. Non-privileged actions need no step-up.
 */

export interface StepUpAssertion {
  at: string; // ISO 8601 timestamp of the step-up
  aal: number; // authenticator assurance level achieved
}

export interface AuthContext {
  actorId: string;
  aal: number;
  stepUp?: StepUpAssertion;
}

export interface StepUpInput {
  actionType: string;
  riskClass: number;
}

const PRIVILEGED_ACTIONS = new Set([
  'PRICE_CHANGE',
  'REFUND_ISSUE',
  'POLICY_ACTIVATE',
  'ROLE_GRANT',
  'CONNECTOR_CREDENTIAL',
]);
const PRIVILEGED_RISK = 4;
const REQUIRED_AAL = 2;
const DEFAULT_MAX_AGE_MS = 5 * 60_000; // 5 minutes

export function isPrivileged(input: StepUpInput): boolean {
  return PRIVILEGED_ACTIONS.has(input.actionType) || input.riskClass >= PRIVILEGED_RISK;
}

export type StepUpResult =
  | { ok: true }
  | { ok: false; reason: 'STEP_UP_REQUIRED' | 'STEP_UP_INSUFFICIENT_AAL' | 'STEP_UP_EXPIRED' };

export function requireStepUp(
  input: StepUpInput,
  auth: AuthContext,
  nowMs: number,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): StepUpResult {
  if (!isPrivileged(input)) return { ok: true };

  const stepUp = auth.stepUp;
  if (!stepUp) return { ok: false, reason: 'STEP_UP_REQUIRED' };
  if (stepUp.aal < REQUIRED_AAL) return { ok: false, reason: 'STEP_UP_INSUFFICIENT_AAL' };

  const at = Date.parse(stepUp.at);
  if (Number.isNaN(at) || nowMs - at > maxAgeMs) {
    return { ok: false, reason: 'STEP_UP_EXPIRED' };
  }
  return { ok: true };
}
