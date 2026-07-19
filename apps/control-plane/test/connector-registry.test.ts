import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTenant } from '../src/security/tenant-context.ts';
import { ConnectorRegistry, ConnectorRegistryError } from '../src/connectors/connector-registry.ts';
import type { ConnectorSpec } from '../src/connectors/connector-registry.ts';

const spec: ConnectorSpec = {
  connectorId: 'conn-shopify',
  channel: 'shopify',
  capabilities: ['PUBLISH_CONTENT', 'IMPORT_PRODUCT'],
  credentialRef: 'ref:shopify/prod',
};

test('a registered connector starts DISCONNECTED (fail closed)', () => {
  withTenant('t-a', () => {
    const reg = new ConnectorRegistry();
    const rec = reg.register(spec);
    assert.equal(rec.status, 'DISCONNECTED');
    assert.equal(reg.isConnected('conn-shopify'), false);
    assert.equal(rec.capabilities.has('PUBLISH_CONTENT'), true);
    assert.equal(rec.credentialRef, 'ref:shopify/prod');
  });
});

test('a credential must be a reference, not an inline secret', () => {
  withTenant('t-a', () => {
    const reg = new ConnectorRegistry();
    assert.throws(() => reg.register({ ...spec, credentialRef: 'shpat_live_9f2a...' }), /CREDENTIAL_REF_INVALID/);
    assert.throws(() => reg.register({ ...spec, credentialRef: '' }), /CREDENTIAL_REF_INVALID/);
  });
});

test('an invalid channel and duplicate ids are rejected', () => {
  withTenant('t-a', () => {
    const reg = new ConnectorRegistry();
    assert.throws(() => reg.register({ ...spec, channel: 'carrier-pigeon' as unknown as ConnectorSpec['channel'] }), ConnectorRegistryError);
    reg.register(spec);
    assert.throws(() => reg.register(spec), /CONNECTOR_EXISTS/);
  });
});

test('connect makes it eligible; REVOKED is terminal', () => {
  withTenant('t-a', () => {
    const reg = new ConnectorRegistry();
    reg.register(spec);
    reg.setStatus('conn-shopify', 'CONNECTED');
    assert.equal(reg.isConnected('conn-shopify'), true);
    reg.setStatus('conn-shopify', 'REVOKED');
    assert.throws(() => reg.setStatus('conn-shopify', 'CONNECTED'), /CONNECTOR_REVOKED/);
  });
});

test('the registry is tenant-scoped', () => {
  const reg = new ConnectorRegistry();
  withTenant('t-a', () => reg.register(spec));
  withTenant('t-b', () => {
    assert.equal(reg.get('conn-shopify'), null);
    assert.throws(() => reg.setStatus('conn-shopify', 'CONNECTED'), /CONNECTOR_NOT_FOUND/);
  });
  withTenant('t-a', () => assert.ok(reg.get('conn-shopify')));
});

test('the returned capability set is a snapshot', () => {
  withTenant('t-a', () => {
    const reg = new ConnectorRegistry();
    const rec = reg.register(spec);
    (rec.capabilities as Set<string>).add('DELETE_STORE');
    assert.equal(reg.get('conn-shopify')?.capabilities.has('DELETE_STORE'), false);
  });
});

test('registering without a tenant scope fails closed', () => {
  const reg = new ConnectorRegistry();
  assert.throws(() => reg.register(spec), /TENANT_CONTEXT_MISSING/);
});
