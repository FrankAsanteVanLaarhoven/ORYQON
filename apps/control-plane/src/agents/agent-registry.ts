import { requireTenant } from '../security/tenant-context.ts';

/**
 * Agent registry — identity and the bounded-autonomy envelope for each agent.
 *
 * An agent may only ever *propose* (never execute directly). What it may propose
 * is fixed at registration: a set of allowed action types, a risk ceiling, an
 * autonomy level, and a per-run step budget. Capabilities are frozen on
 * registration; only status (ACTIVE/SUSPENDED) is mutable. Everything is
 * tenant-scoped — an agent registered in one tenant is invisible in another,
 * and reads without a tenant context fail closed.
 */

export type AutonomyLevel = 'OBSERVE' | 'PROPOSE' | 'AUTONOMOUS';
export type AgentStatus = 'ACTIVE' | 'SUSPENDED';

const AUTONOMY_LEVELS: ReadonlySet<string> = new Set<AutonomyLevel>(['OBSERVE', 'PROPOSE', 'AUTONOMOUS']);

export interface AgentSpec {
  agentId: string;
  allowedActionTypes: string[];
  /** Highest risk class (0..6) the agent may propose. */
  riskCeiling: number;
  autonomy: AutonomyLevel;
  /** Maximum proposals/steps allowed within a single run. */
  maxStepsPerRun: number;
}

export interface AgentRecord {
  agentId: string;
  tenantId: string;
  allowedActionTypes: ReadonlySet<string>;
  riskCeiling: number;
  autonomy: AutonomyLevel;
  maxStepsPerRun: number;
  status: AgentStatus;
}

export class AgentRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentRegistryError';
  }
}

interface InternalRecord {
  agentId: string;
  tenantId: string;
  allowedActionTypes: Set<string>;
  riskCeiling: number;
  autonomy: AutonomyLevel;
  maxStepsPerRun: number;
  status: AgentStatus;
}

function scopeKey(tenantId: string, agentId: string): string {
  return `${tenantId}\n${agentId}`;
}

export class AgentRegistry {
  private byKey = new Map<string, InternalRecord>();

  private snapshot(r: InternalRecord): AgentRecord {
    return {
      agentId: r.agentId,
      tenantId: r.tenantId,
      allowedActionTypes: new Set(r.allowedActionTypes),
      riskCeiling: r.riskCeiling,
      autonomy: r.autonomy,
      maxStepsPerRun: r.maxStepsPerRun,
      status: r.status,
    };
  }

  register(spec: AgentSpec): AgentRecord {
    const tenantId = requireTenant();
    const agentId = (spec.agentId ?? '').trim();
    if (!agentId) throw new AgentRegistryError('AGENT_ID_INVALID');
    if (!AUTONOMY_LEVELS.has(spec.autonomy)) throw new AgentRegistryError(`AUTONOMY_INVALID:${String(spec.autonomy)}`);
    if (!Number.isInteger(spec.riskCeiling) || spec.riskCeiling < 0 || spec.riskCeiling > 6) {
      throw new AgentRegistryError('RISK_CEILING_INVALID');
    }
    if (!Number.isInteger(spec.maxStepsPerRun) || spec.maxStepsPerRun <= 0) {
      throw new AgentRegistryError('MAX_STEPS_INVALID');
    }
    const key = scopeKey(tenantId, agentId);
    if (this.byKey.has(key)) throw new AgentRegistryError(`AGENT_EXISTS:${agentId}`);
    const record: InternalRecord = {
      agentId,
      tenantId,
      allowedActionTypes: new Set(spec.allowedActionTypes),
      riskCeiling: spec.riskCeiling,
      autonomy: spec.autonomy,
      maxStepsPerRun: spec.maxStepsPerRun,
      status: 'ACTIVE',
    };
    this.byKey.set(key, record);
    return this.snapshot(record);
  }

  get(agentId: string): AgentRecord | null {
    const tenantId = requireTenant();
    const r = this.byKey.get(scopeKey(tenantId, agentId));
    return r ? this.snapshot(r) : null;
  }

  isActive(agentId: string): boolean {
    return this.get(agentId)?.status === 'ACTIVE';
  }

  suspend(agentId: string): void {
    const tenantId = requireTenant();
    const r = this.byKey.get(scopeKey(tenantId, agentId));
    if (!r) throw new AgentRegistryError(`AGENT_NOT_FOUND:${agentId}`);
    r.status = 'SUSPENDED';
  }

  reinstate(agentId: string): void {
    const tenantId = requireTenant();
    const r = this.byKey.get(scopeKey(tenantId, agentId));
    if (!r) throw new AgentRegistryError(`AGENT_NOT_FOUND:${agentId}`);
    r.status = 'ACTIVE';
  }

  size(): number {
    return this.byKey.size;
  }
}
