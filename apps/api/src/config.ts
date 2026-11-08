/**
 * Environment parsing and validation. Kept apart from `main.ts` so it can be
 * tested, and so a bad value stops the process instead of being ignored.
 */

/**
 * Value for Fastify's `trustProxy`:
 * - `false`: ignore `X-Forwarded-*` (default).
 * - `true`: trust every hop.
 * - digits as text: that many hops, counted from the socket.
 * - `string[]`: addresses and CIDR ranges of the proxies in front.
 */
export type TrustProxy = boolean | string | string[];

const NAMED_RANGES = new Set(['loopback', 'linklocal', 'uniquelocal']);
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_CIDR = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
const IPV6 = /^[0-9a-f:]+$/i;
const IPV6_CIDR = /^([0-9a-f:]+)\/(\d{1,3})$/i;

function isValidIpv4(address: string): boolean {
  const match = IPV4.exec(address);
  if (!match) return false;
  return match.slice(1).every((octet) => Number(octet) <= 255);
}

function isValidCidr(value: string): boolean {
  const v4 = IPV4_CIDR.exec(value);
  if (v4) return isValidIpv4(v4[1] ?? '') && Number(v4[2]) <= 32;

  const v6 = IPV6_CIDR.exec(value);
  if (v6) return (v6[1] ?? '').includes(':') && Number(v6[2]) <= 128;

  return false;
}

function isProxyEntry(value: string): boolean {
  if (NAMED_RANGES.has(value)) return true;
  return isValidIpv4(value) || isValidCidr(value) || (IPV6.test(value) && value.includes(':'));
}

/**
 * Reads `TRUST_PROXY`. Throws on an invalid value: a typo behind a TLS proxy
 * would otherwise show up only as a login that drops the session cookie.
 */
export function parseTrustProxy(raw: string | undefined): TrustProxy {
  const value = raw?.trim();

  if (!value || value === 'false') return false;
  if (value === 'true') return true;

  if (/^\d+$/.test(value)) {
    if (value === '0') throw new Error('TRUST_PROXY: the number of hops must be 1 or more');
    return value;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) return false;

  const invalid = entries.filter((entry) => !isProxyEntry(entry));
  if (invalid.length > 0) {
    throw new Error(
      `TRUST_PROXY: not an address, a CIDR range or a number of hops: ${invalid.join(', ')}`,
    );
  }

  return entries;
}

/** Public origin of the dashboard, without a trailing slash. */
export function parseOrigin(raw: string | undefined, required: boolean): string | undefined {
  const value = raw?.trim().replace(/\/+$/, '');

  if (!value) {
    if (required) {
      throw new Error('ORIGIN is required: the public address of the dashboard, e.g. https://sc.example.com');
    }
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`ORIGIN is not a valid URL: ${value}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('ORIGIN must use http or https');
  }

  return url.origin;
}
