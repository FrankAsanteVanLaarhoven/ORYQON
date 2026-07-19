import { requireTenant } from '../security/tenant-context.ts';
import { CHANNELS } from './connector.ts';
import type { Channel } from './connector.ts';

/**
 * Connector registry.
 *
 * A connector is registered with a credential *reference* — never the secret
 * itself (secrets are resolved by a secret manager at the point of use and are
 * never held here, returned, or logged). A freshly registered connector starts
 * DISCONNECTED: it must be explicitly connected before it is eligible to
 * dispatch, and REVOKED is terminal. Everything is tenant-scoped and fails
 * closed.
 */

export type ConnectorStatus = 'DISCONNECTED' | 'CONNECTED' | 'DEGRADED' | 'REVOKED';

export interface ConnectorSpec {
  connectorId: string;
  channel: Channel;
  capabilities: string[];
  /** An opaque reference (e.g. "ref:shopify/prod") — NOT the secret. */
  credentialRef: string;
}

export interface ConnectorRecord {
  connectorId: string;
  tenantId: string;
  channel: Channel;
  capabilities: ReadonlySet<string>;
  credentialRef: string;
  status: ConnectorStatus;
}

export class ConnectorRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorRegistryError';
  }
}

interface InternalRecord {
  connectorId: string;
  tenantId: string;
  channel: Channel;
  capabilities: Set<string>;
  credentialRef: string;
  status: ConnectorStatus;
}

function scopeKey(tenantId: string, connectorId: string): string {
  return `${tenantId}\n${connectorId}`;
}

export class ConnectorRegistry {
  private byKey = new Map<string, InternalRecord>();

  private snapshot(r: InternalRecord): ConnectorRecord {
    return {
      connectorId: r.connectorId,
      tenantId: r.tenantId,
      channel: r.channel,
      capabilities: new Set(r.capabilities),
      credentialRef: r.credentialRef,
      status: r.status,
    };
  }

  register(spec: ConnectorSpec): ConnectorRecord {
    const tenantId = requireTenant();
    const connectorId = (spec.connectorId ?? '').trim();
    if (!connectorId) throw new ConnectorRegistryError('CONNECTOR_ID_INVALID');
    if (!CHANNELS.has(spec.channel)) throw new ConnectorRegistryError(`CHANNEL_INVALID:${String(spec.channel)}`);
    // A credential must be a reference, never an inline secret.
    if (typeof spec.credentialRef !== 'string' || !spec.credentialRef.startsWith('ref:')) {
      throw new ConnectorRegistryError('CREDENTIAL_REF_INVALID');
    }
    const key = scopeKey(tenantId, connectorId);
    if (this.byKey.has(key)) throw new ConnectorRegistryError(`CONNECTOR_EXISTS:${connectorId}`);
    const record: InternalRecord = {
      connectorId,
      tenantId,
      channel: spec.channel,
      capabilities: new Set(spec.capabilities),
      credentialRef: spec.credentialRef,
      status: 'DISCONNECTED', // fail closed — not eligible to dispatch until connected
    };
    this.byKey.set(key, record);
    return this.snapshot(record);
  }

  get(connectorId: string): ConnectorRecord | null {
    const tenantId = requireTenant();
    const r = this.byKey.get(scopeKey(tenantId, connectorId));
    return r ? this.snapshot(r) : null;
  }

  isConnected(connectorId: string): boolean {
    return this.get(connectorId)?.status === 'CONNECTED';
  }

  setStatus(connectorId: string, status: ConnectorStatus): void {
    const tenantId = requireTenant();
    const r = this.byKey.get(scopeKey(tenantId, connectorId));
    if (!r) throw new ConnectorRegistryError(`CONNECTOR_NOT_FOUND:${connectorId}`);
    if (r.status === 'REVOKED') throw new ConnectorRegistryError('CONNECTOR_REVOKED'); // terminal
    r.status = status;
  }

  size(): number {
    return this.byKey.size;
  }
}
