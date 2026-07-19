import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsResolver, type SettingLayer } from '../src/settings/settings.ts';

const layers: SettingLayer[] = [
  { scope: 'platform', scopeId: '', version: 'p1', values: { aiDisclosure: 'required', refundThreshold: 50 } },
  { scope: 'organization', scopeId: 'org-1', version: 'o7', values: { refundThreshold: 100 } },
  { scope: 'brand', scopeId: 'brand-9', version: 'b3', values: { brandVoice: 'precise', refundThreshold: 250 } },
];

test('the most specific scope defining a key wins', () => {
  const r = new SettingsResolver(layers);
  assert.equal(r.resolve('refundThreshold')?.value, 250);
  assert.equal(r.resolve('refundThreshold')?.sourceScope, 'brand');
  assert.equal(r.resolve('refundThreshold')?.version, 'b3');
});

test('keys fall through to the least specific layer that defines them', () => {
  const r = new SettingsResolver(layers);
  assert.equal(r.resolve('aiDisclosure')?.value, 'required');
  assert.equal(r.resolve('aiDisclosure')?.sourceScope, 'platform');
  assert.equal(r.resolve('brandVoice')?.sourceScope, 'brand');
});

test('an undefined key resolves to null', () => {
  const r = new SettingsResolver(layers);
  assert.equal(r.resolve('doesNotExist'), null);
});

test('resolution is deterministic regardless of layer input order', () => {
  const a = new SettingsResolver([...layers]);
  const b = new SettingsResolver([...layers].reverse());
  assert.equal(a.resolve('refundThreshold')?.value, b.resolve('refundThreshold')?.value);
  assert.equal(a.resolve('refundThreshold')?.version, b.resolve('refundThreshold')?.version);
});

test('effectiveVersion fingerprints the winning layers for a receipt', () => {
  const r = new SettingsResolver(layers);
  assert.equal(
    r.effectiveVersion(['refundThreshold', 'aiDisclosure', 'missing']),
    'refundThreshold=brand:b3|aiDisclosure=platform:p1|missing=unset',
  );
});
