import { requireTenant } from '../security/tenant-context.ts';

/**
 * Agent run — a bounded unit of agent activity.
 *
 * A run is ACTIVE from creation and holds a step budget: every proposal an agent
 * emits consumes one step, and the run cannot exceed maxSteps. A run ends in
 * exactly one terminal state (COMPLETED / FAILED / ABORTED) and accepts no
 * further steps thereafter. The run is bound to the tenant it was created in;
 * using it from another tenant fails closed.
 */

export type RunState = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABORTED';

export class AgentRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentRunError';
  }
}

export class AgentRun {
  readonly runId: string;
  readonly agentId: string;
  readonly tenantId: string;
  readonly maxSteps: number;
  private _steps: number;
  private _state: RunState;

  constructor(runId: string, agentId: string, maxSteps: number) {
    if (!runId || typeof runId !== 'string') throw new AgentRunError('RUN_ID_INVALID');
    if (!agentId || typeof agentId !== 'string') throw new AgentRunError('AGENT_ID_INVALID');
    if (!Number.isInteger(maxSteps) || maxSteps <= 0) throw new AgentRunError('RUN_BUDGET_INVALID');
    this.tenantId = requireTenant();
    this.runId = runId;
    this.agentId = agentId;
    this.maxSteps = maxSteps;
    this._steps = 0;
    this._state = 'ACTIVE';
  }

  private assertOwnTenant(): void {
    if (requireTenant() !== this.tenantId) throw new AgentRunError('CROSS_TENANT_DENIED');
  }

  /** Consume one step; throws if the run is not active or the budget is spent. */
  step(): number {
    this.assertOwnTenant();
    if (this._state !== 'ACTIVE') throw new AgentRunError(`RUN_NOT_ACTIVE:${this._state}`);
    if (this._steps >= this.maxSteps) throw new AgentRunError('STEP_BUDGET_EXCEEDED');
    this._steps += 1;
    return this._steps;
  }

  private end(to: RunState): void {
    this.assertOwnTenant();
    if (this._state !== 'ACTIVE') throw new AgentRunError(`RUN_NOT_ACTIVE:${this._state}`);
    this._state = to;
  }

  complete(): void {
    this.end('COMPLETED');
  }
  fail(): void {
    this.end('FAILED');
  }
  abort(): void {
    this.end('ABORTED');
  }

  state(): RunState {
    this.assertOwnTenant();
    return this._state;
  }
  stepsUsed(): number {
    this.assertOwnTenant();
    return this._steps;
  }
  remaining(): number {
    this.assertOwnTenant();
    return Math.max(0, this.maxSteps - this._steps);
  }
}
