import net from 'node:net';
import dns from 'node:dns';
import { isBlockedIp } from './ip-rules.ts';

/**
 * SSRF-safe URL validation.
 *
 * ORYQON ingests operator- and agent-supplied URLs (product links, supplier
 * pages, images). Every one is validated here before any fetch: scheme and port
 * allowlists, no embedded credentials, DNS resolution, and an IP-range check on
 * EVERY resolved address (so a hostname that resolves to a private address —
 * including DNS-rebinding style multi-answer records — is rejected).
 *
 * The resolver is injectable so the block corpus is deterministic and offline.
 */

export type UrlRejectReason =
  | 'INVALID_SYNTAX'
  | 'DISALLOWED_SCHEME'
  | 'EMBEDDED_CREDENTIALS'
  | 'DISALLOWED_PORT'
  | 'UNRESOLVABLE'
  | 'BLOCKED_IP_RANGE';

export type UrlGuardResult =
  | { ok: true; url: string; safeForLog: string; addresses: string[] }
  | { ok: false; reason: UrlRejectReason };

export type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) => {
  const records = await dns.promises.lookup(host, { all: true });
  return records.map((r) => r.address);
};

export interface UrlGuardOptions {
  resolve?: Resolver;
  allowedPorts?: number[];
}

export async function validateUrl(
  raw: string,
  opts: UrlGuardOptions = {},
): Promise<UrlGuardResult> {
  const resolve = opts.resolve ?? defaultResolver;
  const allowedPorts = opts.allowedPorts ?? [80, 443];

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'INVALID_SYNTAX' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'DISALLOWED_SCHEME' };
  }

  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'EMBEDDED_CREDENTIALS' };
  }

  if (url.port !== '' && !allowedPorts.includes(Number(url.port))) {
    return { ok: false, reason: 'DISALLOWED_PORT' };
  }

  let host = url.hostname;
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

  let addresses: string[];
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      return { ok: false, reason: 'UNRESOLVABLE' };
    }
    if (!addresses || addresses.length === 0) {
      return { ok: false, reason: 'UNRESOLVABLE' };
    }
  }

  for (const addr of addresses) {
    if (isBlockedIp(addr)) return { ok: false, reason: 'BLOCKED_IP_RANGE' };
  }

  // Query and fragment are stripped from the log-safe form (they may carry data).
  const safeForLog = `${url.protocol}//${url.host}${url.pathname}`;
  url.hash = '';
  return { ok: true, url: url.toString(), safeForLog, addresses };
}
