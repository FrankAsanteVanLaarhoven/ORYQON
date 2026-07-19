import { PolicyRegistry } from './policy-registry.ts';

/**
 * Default-deny policy evaluation — the in-process mirror of `policies/oryqon.rego`.
 *
 * Baseline rules (first match wins; anything unmatched is denied):
 *   expired                          → DENY
 *   publish without evidence         → DENY
 *   high-risk publish or price action→ REVIEW
 *   low-risk import or compilation   → ALLOW
 *   everything else                  → DENY
 */

export type PolicyDecision = 'ALLOW' | 'DENY' | 'REVIEW';

export interface PolicyInput {
  actionType: string;
  riskClass: number;
  hasEvidence: boolean;
  expired: boolean;
}

export interface PolicyResult {
  decision: PolicyDecision;
  reason: string;
  policyVersion: string;
}

const HIGH_RISK = 4;
const PUBLISH_ACTIONS = new Set(['PUBLISH_CONTENT', 'ACTIVATE_OFFER']);
const PRICE_ACTIONS = new Set(['PRICE_CHANGE']);
const LOW_RISK_ALLOW = new Set(['IMPORT_PRODUCT', 'COMPILE_CHANNEL_VARIANT']);

export function evaluatePolicy(input: PolicyInput, policyVersion: string): PolicyResult {
  const result = (decision: PolicyDecision, reason: string): PolicyResult => ({
    decision,
    reason,
    policyVersion,
  });

  if (input.expired) return result('DENY', 'ACTION_EXPIRED');

  if (PUBLISH_ACTIONS.has(input.actionType) && !input.hasEvidence) {
    return result('DENY', 'PUBLISH_WITHOUT_EVIDENCE');
  }

  if (
    (PUBLISH_ACTIONS.has(input.actionType) || PRICE_ACTIONS.has(input.actionType)) &&
    input.riskClass >= HIGH_RISK
  ) {
    return result('REVIEW', 'HIGH_RISK_REQUIRES_REVIEW');
  }

  if (LOW_RISK_ALLOW.has(input.actionType) && input.riskClass < HIGH_RISK) {
    return result('ALLOW', 'LOW_RISK_ALLOWED');
  }

  return result('DENY', 'DEFAULT_DENY');
}

/**
 * Evaluate against the registry's active policy. With no active policy, deny —
 * there is no implicit "allow while unconfigured" state.
 */
export function evaluateWithRegistry(
  registry: PolicyRegistry,
  input: PolicyInput,
): PolicyResult {
  const version = registry.getActiveVersion();
  if (!version) {
    return { decision: 'DENY', reason: 'NO_ACTIVE_POLICY', policyVersion: 'none' };
  }
  return evaluatePolicy(input, version);
}
