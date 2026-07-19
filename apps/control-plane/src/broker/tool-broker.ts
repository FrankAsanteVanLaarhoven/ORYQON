/**
 * Tool broker — the deterministic gate between model-proposed tool calls and
 * real execution.
 *
 * Agents never hold credentials and never call tools directly: they can only
 * emit a ToolRequest, which the broker admits only if the task is allowed the
 * tool, the tool is registered, the agent is permitted, the tenant matches,
 * approval is present where required, and no kill switch is engaged. The
 * underlying credential lives in the tool's handler closure — it is never
 * passed to, or returned to, the agent.
 */

export const REASON_CODES = [
  'OK',
  'KILL_SWITCH_ENGAGED',
  'TOOL_NOT_ALLOWED_FOR_TASK',
  'TOOL_NOT_REGISTERED',
  'TOOL_NOT_ALLOWED_FOR_AGENT',
  'TENANT_MISMATCH',
  'APPROVAL_REQUIRED',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export class BrokerError extends Error {
  readonly reason: ReasonCode;
  constructor(reason: ReasonCode) {
    super(reason);
    this.name = 'BrokerError';
    this.reason = reason;
  }
}

export interface AgentTask {
  tenantId: string;
  agent: string;
  allowedToolIds: ReadonlySet<string>;
  approvals: ReadonlySet<string>;
  killSwitch?: boolean;
}

export type ToolHandler = (
  task: AgentTask,
  args: Record<string, unknown>,
) => Promise<unknown>;

export interface ToolDefinition {
  id: string;
  /** If set, the tool is bound to a single tenant. */
  tenantId?: string;
  permittedAgents: ReadonlySet<string>;
  requiresApproval: boolean;
  handler: ToolHandler;
}

export interface ToolRequest {
  toolId: string;
  args?: Record<string, unknown>;
}

export interface AuditEvent {
  tenantId: string;
  agent: string;
  toolId: string;
  reason: ReasonCode;
}

export type AuditSink = (event: AuditEvent) => void;

export class ToolBroker {
  private tools = new Map<string, ToolDefinition>();

  register(def: ToolDefinition): void {
    if (this.tools.has(def.id)) {
      throw new Error(`TOOL_ALREADY_REGISTERED:${def.id}`);
    }
    this.tools.set(def.id, def);
  }

  async invoke(task: AgentTask, req: ToolRequest, audit?: AuditSink): Promise<unknown> {
    const fail = (reason: ReasonCode): never => {
      audit?.({ tenantId: task.tenantId, agent: task.agent, toolId: req.toolId, reason });
      throw new BrokerError(reason);
    };

    if (task.killSwitch) return fail('KILL_SWITCH_ENGAGED');
    if (!task.allowedToolIds.has(req.toolId)) return fail('TOOL_NOT_ALLOWED_FOR_TASK');

    const tool = this.tools.get(req.toolId);
    if (!tool) return fail('TOOL_NOT_REGISTERED');
    if (!tool.permittedAgents.has(task.agent)) return fail('TOOL_NOT_ALLOWED_FOR_AGENT');
    if (tool.tenantId && tool.tenantId !== task.tenantId) return fail('TENANT_MISMATCH');
    if (tool.requiresApproval && !task.approvals.has(req.toolId)) return fail('APPROVAL_REQUIRED');

    const result = await tool.handler(task, req.args ?? {});
    audit?.({ tenantId: task.tenantId, agent: task.agent, toolId: req.toolId, reason: 'OK' });
    return result;
  }
}
