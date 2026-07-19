import type { Connector, DispatchOutcome, DispatchRequest } from './connector.ts';
import type { ConnectorRegistry } from './connector-registry.ts';

/**
 * Connector dispatch gate.
 *
 * Before a connector may act, the request is admitted: no kill switch, the
 * connector is registered and CONNECTED (not revoked/disconnected), the tenant
 * lines up, and the action is within the connector's capabilities. Then the
 * LIVE-EXECUTION GUARD applies: live execution is OFF by default, so an admitted
 * request returns LIVE_EXECUTION_DISABLED without invoking anything. Even when a
 * caller opts in (liveEnabled: true), the only shipped connector is the
 * NoopConnector, which returns NOT_EXECUTED — so no external side effect can
 * occur in this gate by construction.
 */

export const DISPATCH_REASONS = [
  'DISPATCHED',
  'LIVE_EXECUTION_DISABLED',
  'CONNECTOR_NOT_EXECUTED',
  'KILL_SWITCH_ENGAGED',
  'CONNECTOR_NOT_FOUND',
  'CONNECTOR_NOT_CONNECTED',
  'CONNECTOR_REVOKED',
  'CAPABILITY_UNSUPPORTED',
  'TENANT_MISMATCH',
] as const;

export type DispatchReason = (typeof DISPATCH_REASONS)[number];

export interface DispatchDecision {
  dispatched: boolean;
  reason: DispatchReason;
  outcome?: DispatchOutcome;
}

export interface DispatchContext {
  registry: ConnectorRegistry;
  connector: Connector;
  request: DispatchRequest;
  /** Live execution is OFF by default; leaving it unset keeps the fail-closed guard engaged. */
  liveEnabled?: boolean;
  killSwitch?: boolean;
}

export function dispatchAction(ctx: DispatchContext): DispatchDecision {
  const deny = (reason: DispatchReason): DispatchDecision => ({ dispatched: false, reason });
  const { registry, connector, request } = ctx;

  if (ctx.killSwitch) return deny('KILL_SWITCH_ENGAGED');

  const record = registry.get(connector.connectorId);
  if (!record) return deny('CONNECTOR_NOT_FOUND');
  if (record.status === 'REVOKED') return deny('CONNECTOR_REVOKED');
  if (record.status !== 'CONNECTED') return deny('CONNECTOR_NOT_CONNECTED');
  if (request.tenantId !== record.tenantId) return deny('TENANT_MISMATCH');
  if (!record.capabilities.has(request.actionType)) return deny('CAPABILITY_UNSUPPORTED');

  // Fail-closed live-execution guard.
  if (!ctx.liveEnabled) return deny('LIVE_EXECUTION_DISABLED');

  // Opted in — invoke the connector. The shipped connector still performs no side effect.
  const outcome = connector.dispatch(request);
  if (outcome.status === 'DISPATCHED') {
    return { dispatched: true, reason: 'DISPATCHED', outcome };
  }
  return { dispatched: false, reason: 'CONNECTOR_NOT_EXECUTED', outcome };
}
