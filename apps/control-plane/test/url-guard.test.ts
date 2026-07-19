import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrl, type Resolver } from '../src/security/url-guard.ts';
import { isBlockedIp } from '../src/security/ip-rules.ts';

const resolvesTo = (addrs: string[]): Resolver => async () => addrs;
const nx: Resolver = async () => {
  throw new Error('NXDOMAIN');
};

test('rejects the cloud metadata endpoint', async () => {
  const r = await validateUrl('http://169.254.169.254/latest/meta-data/', {
    resolve: resolvesTo(['169.254.169.254']),
  });
  assert.deepEqual(r, { ok: false, reason: 'BLOCKED_IP_RANGE' });
});

test('rejects a hostname that resolves to a private address', async () => {
  const r = await validateUrl('https://intranet.example.com', {
    resolve: resolvesTo(['10.0.0.5']),
  });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, 'BLOCKED_IP_RANGE');
});

test('rejects DNS-rebinding: any resolved address in a blocked range blocks', async () => {
  const r = await validateUrl('https://public-looking.example.com', {
    resolve: resolvesTo(['93.184.216.34', '127.0.0.1']),
  });
  assert.equal(r.ok, false);
});

test('rejects loopback literal, IPv6 loopback, and IPv4-mapped loopback', async () => {
  for (const u of ['http://127.0.0.1', 'http://[::1]', 'http://[::ffff:127.0.0.1]']) {
    const r = await validateUrl(u);
    assert.equal(r.ok, false, `${u} should be blocked`);
  }
});

test('rejects non-http(s) schemes', async () => {
  for (const u of ['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com']) {
    const r = await validateUrl(u, { resolve: resolvesTo(['93.184.216.34']) });
    assert.equal(r.ok === false && r.reason, 'DISALLOWED_SCHEME', u);
  }
});

test('rejects embedded credentials', async () => {
  const r = await validateUrl('http://user:pass@example.com', {
    resolve: resolvesTo(['93.184.216.34']),
  });
  assert.equal(r.ok === false && r.reason, 'EMBEDDED_CREDENTIALS');
});

test('rejects disallowed ports', async () => {
  const r = await validateUrl('http://example.com:22', {
    resolve: resolvesTo(['93.184.216.34']),
  });
  assert.equal(r.ok === false && r.reason, 'DISALLOWED_PORT');
});

test('rejects unparseable input and unresolvable hosts', async () => {
  assert.equal((await validateUrl('not a url')).ok, false);
  const r = await validateUrl('https://does-not-exist.example', { resolve: nx });
  assert.equal(r.ok === false && r.reason, 'UNRESOLVABLE');
});

test('allows a public host and strips query/fragment from the log form', async () => {
  const r = await validateUrl('https://example.com/product?token=abc#frag', {
    resolve: resolvesTo(['93.184.216.34']),
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.safeForLog, 'https://example.com/product');
    assert.ok(!r.url.includes('#frag'));
  }
});

test('ip-rules block every named private/reserved range', () => {
  const blocked = [
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::1', 'fe80::1', 'fc00::1', 'ff02::1',
  ];
  for (const ip of blocked) assert.equal(isBlockedIp(ip), true, `${ip} should be blocked`);

  const allowed = ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'];
  for (const ip of allowed) assert.equal(isBlockedIp(ip), false, `${ip} should be allowed`);
});
