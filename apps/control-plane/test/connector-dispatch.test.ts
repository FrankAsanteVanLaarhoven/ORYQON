import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { ConnectorRegistry } from '../src/connectors/connector-registry.ts';
import { NoopConnector } from '../src/connectors/connector.ts';
import type { DispatchRequest } from '../src/connectors/connector.ts';
import { dispatchAction } from '../src/connectors/dispatch.ts';

function req(over: Partial<DispatchRequest> = {}): DispatchRequest {
  return { tenantId: 't-a', actionType: 'PUBLISH_CONTENT', targetId: 'x1', payload: {}, ...over };
}

function fixture(connect = true) {
  const registry = new ConnectorRegistry();
  registry.register({
    connectorId: 'conn-shopify',
    channel: 'shopify',
    capabilities: ['PUBLISH_CONTENT'],
    credentialRef: 'ref:shopify/prod',
  });
  if (connect) registry.setStatus('conn-shopify', 'CONNECTED');
  const connector = new NoopConnector('conn-shopify', 'shopify', ['PUBLISH_CONTENT']);
  return { registry, connector };
}

test('with live execution off (default), an admitted request is not dispatched', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    const d = dispatchAction({ registry, connector, request: req() });
    assert.equal(d.dispatched, false);
    assert.equal(d.reason, 'LIVE_EXECUTION_DISABLED');
    assert.equal(d.outcome, undefined); // the connector was never invoked
  });
});

test('even with live execution ON, the shipped connector performs no side effect', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    const d = dispatchAction({ registry, connector, request: req(), liveEnabled: true });
    assert.equal(d.dispatched, false);
    assert.equal(d.reason, 'CONNECTOR_NOT_EXECUTED');
    assert.equal(d.outcome?.status, 'NOT_EXECUTED');
  });
});

test('a disconnected connector cannot dispatch', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture(false);
    const d = dispatchAction({ registry, connector, request: req(), liveEnabled: true });
    assert.equal(d.reason, 'CONNECTOR_NOT_CONNECTED');
  });
});

test('a revoked connector cannot dispatch', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    registry.setStatus('conn-shopify', 'REVOKED');
    const d = dispatchAction({ registry, connector, request: req(), liveEnabled: true });
    assert.equal(d.reason, 'CONNECTOR_REVOKED');
  });
});

test('an unsupported action is rejected', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    const d = dispatchAction({ registry, connector, request: req({ actionType: 'PRICE_CHANGE' }), liveEnabled: true });
    assert.equal(d.reason, 'CAPABILITY_UNSUPPORTED');
  });
});

test('a request for another tenant is rejected', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    const d = dispatchAction({ registry, connector, request: req({ tenantId: 't-b' }), liveEnabled: true });
    assert.equal(d.reason, 'TENANT_MISMATCH');
  });
});

test('an engaged kill switch blocks dispatch', () => {
  withTenant('t-a', () => {
    const { registry, connector } = fixture();
    const d = dispatchAction({ registry, connector, request: req(), liveEnabled: true, killSwitch: true });
    assert.equal(d.reason, 'KILL_SWITCH_ENGAGED');
  });
});

test('an unregistered connector is rejected', () => {
  withTenant('t-a', () => {
    const registry = new ConnectorRegistry();
    const connector = new NoopConnector('ghost', 'email', ['PUBLISH_CONTENT']);
    const d = dispatchAction({ registry, connector, request: req(), liveEnabled: true });
    assert.equal(d.reason, 'CONNECTOR_NOT_FOUND');
  });
});
