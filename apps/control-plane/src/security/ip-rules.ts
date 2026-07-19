import net from 'node:net';

/**
 * IP-range rules for SSRF defence.
 *
 * Any host an operator or agent supplies is resolved to concrete addresses and
 * every address is checked against these blocks BEFORE a fetch is permitted.
 * The headline target is cloud instance metadata (169.254.169.254) and every
 * loopback / private / link-local / reserved range that could reach internal
 * services. Unparseable input fails closed (treated as blocked).
 */

// ---------------------------------------------------------------- IPv4 -------

export function parseIPv4(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const octet = Number(m[i]);
    if (octet > 255) return null;
    n = n * 256 + octet;
  }
  return n >>> 0;
}

const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incl. cloud metadata 169.254.169.254)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved (incl. 255.255.255.255 broadcast)
];

function v4Mask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

const BLOCKED_V4_COMPILED = BLOCKED_V4.map(([base, prefix]) => {
  const mask = v4Mask(prefix);
  return { base: (parseIPv4(base)! & mask) >>> 0, mask };
});

export function isBlockedV4(n: number): boolean {
  for (const { base, mask } of BLOCKED_V4_COMPILED) {
    if (((n & mask) >>> 0) === base) return true;
  }
  return false;
}

// ---------------------------------------------------------------- IPv6 -------

const FULL128 = (1n << 128n) - 1n;

export function v6ToBigInt(addr: string): bigint | null {
  let s = addr.split('%')[0]; // strip zone identifier
  // Embedded IPv4 in the last group, e.g. ::ffff:127.0.0.1
  if (s.includes('.')) {
    const lastColon = s.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (v4 === null) return null;
    const hi = (v4 >>> 16) & 0xffff;
    const lo = v4 & 0xffff;
    s = s.slice(0, lastColon + 1) + hi.toString(16) + ':' + lo.toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
  let parts: string[];
  if (tail === null) {
    parts = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    parts = [...head, ...Array(missing).fill('0'), ...tail];
  }
  if (parts.length !== 8) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
    n = (n << 16n) | BigInt(parseInt(p, 16));
  }
  return n;
}

const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
  ['::1', 128], // loopback
  ['::', 128], // unspecified
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
  ['2001:db8::', 32], // documentation
  ['64:ff9b::', 96], // NAT64
  ['100::', 64], // discard-only
];

function v6Mask(prefix: number): bigint {
  return prefix === 0 ? 0n : (FULL128 << BigInt(128 - prefix)) & FULL128;
}

const BLOCKED_V6_COMPILED = BLOCKED_V6.map(([base, prefix]) => {
  const mask = v6Mask(prefix);
  return { base: v6ToBigInt(base)! & mask, mask };
});

function isV4Mapped(n: bigint): boolean {
  // ::ffff:0:0/96 — the top 96 bits equal 0x…0000ffff
  return n >> 32n === 0xffffn;
}

export function isBlockedV6(n: bigint): boolean {
  if (isV4Mapped(n)) return isBlockedV4(Number(n & 0xffffffffn) >>> 0);
  for (const { base, mask } of BLOCKED_V6_COMPILED) {
    if ((n & mask) === base) return true;
  }
  return false;
}

// --------------------------------------------------------------- public ------

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const n = parseIPv4(ip);
    return n === null ? true : isBlockedV4(n);
  }
  if (version === 6) {
    const n = v6ToBigInt(ip);
    return n === null ? true : isBlockedV6(n);
  }
  return true; // not a valid IP literal → fail closed
}
