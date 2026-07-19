/**
 * Connector contract.
 *
 * A connector is a governed channel adapter (Shopify, Instagram, Email, …). It
 * is the only thing that could ever touch an external system — and in this gate
 * nothing does: the sole shipped implementation is a fail-closed NoopConnector
 * that performs NO side effect and always reports NOT_EXECUTED. A real
 * connector would implement the same interface, execute through the tool broker
 * (credential resolved inside the handler closure, never exposed), and run only
 * under an explicit, authorized live-execution mode.
 */

export type Channel =
  | 'shopify'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'pinterest'
  | 'email'
  | 'marketplace'
  | 'digital_delivery';

export const CHANNELS: ReadonlySet<string> = new Set<Channel>([
  'shopify',
  'instagram',
  'youtube',
  'linkedin',
  'pinterest',
  'email',
  'marketplace',
  'digital_delivery',
]);

export interface DispatchRequest {
  tenantId: string;
  actionType: string;
  targetId: string;
  payload: Record<string, unknown>;
}

export type DispatchStatus = 'NOT_EXECUTED' | 'DISPATCHED';

export interface DispatchOutcome {
  status: DispatchStatus;
  reason: string;
  connectorId: string;
}

export interface Connector {
  connectorId: string;
  channel: Channel;
  /** Action types this connector can carry out. */
  capabilities: ReadonlySet<string>;
  /** Attempt to carry out an action. The shipped implementation performs no side effect. */
  dispatch(req: DispatchRequest): DispatchOutcome;
}

/**
 * The only connector shipped. It never contacts an external system: whatever it
 * is asked to do, it returns NOT_EXECUTED. This keeps the platform's "no live
 * execution path exists yet" guarantee true by construction.
 */
export class NoopConnector implements Connector {
  readonly connectorId: string;
  readonly channel: Channel;
  readonly capabilities: ReadonlySet<string>;

  constructor(connectorId: string, channel: Channel, capabilities: Iterable<string>) {
    this.connectorId = connectorId;
    this.channel = channel;
    this.capabilities = new Set(capabilities);
  }

  dispatch(_req: DispatchRequest): DispatchOutcome {
    return { status: 'NOT_EXECUTED', reason: 'LIVE_CONNECTOR_NOT_ENABLED', connectorId: this.connectorId };
  }
}
