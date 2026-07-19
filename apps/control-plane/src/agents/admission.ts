import type { ActionProposal } from '../idempotency/action-proposal.ts';
import type { AgentRegistry } from './agent-registry.ts';
import type { AgentRun } from './agent-run.ts';

/**
 * Admission control — the agent control plane's gate.
 *
 * Before a proposal an agent emits ever reaches the policy engine or the tool
 * broker, it must be admitted: the run must be active with budget remaining, the
 * agent must be registered and active, the tenant must line up on all three
 * (proposal, run, agent), the agent's autonomy must permit proposing, the
 * action type must be within the agent's capability set, and the risk must be
 * within its ceiling. Every check fails closed; admission is a pure decision and
 * performs no side effects (the caller records the step and forwards).
 */

export const ADMISSION_REASONS = [
  'ADMITTED',
  'KILL_SWITCH_ENGAGED',
  'RUN_NOT_ACTIVE',
  'STEP_BUDGET_EXCEEDED',
  'AGENT_NOT_FOUND',
  'AGENT_SUSPENDED',
  'TENANT_MISMATCH',
  'AUTONOMY_FORBIDS_PROPOSAL',
  'ACTION_NOT_IN_CAPABILITY',
  'RISK_CEILING_EXCEEDED',
] as const;

export type AdmissionReason = (typeof ADMISSION_REASONS)[number];

export interface AdmissionResult {
  admitted: boolean;
  reason: AdmissionReason;
}

export interface AdmissionContext {
  registry: AgentRegistry;
  run: AgentRun;
  proposal: ActionProposal;
  killSwitch?: boolean;
}

export function admitProposal(ctx: AdmissionContext): AdmissionResult {
  const deny = (reason: AdmissionReason): AdmissionResult => ({ admitted: false, reason });
  const { registry, run, proposal } = ctx;

  if (ctx.killSwitch) return deny('KILL_SWITCH_ENGAGED');
  if (run.state() !== 'ACTIVE') return deny('RUN_NOT_ACTIVE');
  if (run.remaining() <= 0) return deny('STEP_BUDGET_EXCEEDED');

  const agent = registry.get(run.agentId);
  if (!agent) return deny('AGENT_NOT_FOUND');
  if (agent.status !== 'ACTIVE') return deny('AGENT_SUSPENDED');

  if (proposal.tenantId !== run.tenantId || proposal.tenantId !== agent.tenantId) {
    return deny('TENANT_MISMATCH');
  }
  if (agent.autonomy === 'OBSERVE') return deny('AUTONOMY_FORBIDS_PROPOSAL');
  if (!agent.allowedActionTypes.has(proposal.actionType)) return deny('ACTION_NOT_IN_CAPABILITY');
  if (proposal.riskClass > agent.riskCeiling) return deny('RISK_CEILING_EXCEEDED');

  return { admitted: true, reason: 'ADMITTED' };
}
