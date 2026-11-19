// @ts-nocheck
import { lookup } from 'node:dns';
import { Agent, fetch } from 'undici';
import ipaddr from 'ipaddr.js';
export function publicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
const agent = new Agent({ connect: { lookup(hostname, options, callback) {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, null, 0);
    if (!addresses.length || addresses.some(a => !publicAddress(a.address))) return callback(new Error('Feed addresses must be on the public internet'), null, 0);
    if (options.all) callback(null, addresses); else callback(null, addresses[0].address, addresses[0].family);
  });
} } });
export function webURL(value, base) {
  const url = new URL(value, base);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public HTTP or HTTPS URL');
  if (url.port && !['80','443'].includes(url.port)) throw new Error('Feed URLs must use port 80 or 443');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host) && !publicAddress(host)) throw new Error('Private feed addresses are not allowed');
  return url.href;
}
export async function fetchFeed(value, headers = {}) {
  const label = 'Feed';
  let url = webURL(value);
  const signal = AbortSignal.timeout(20000);
  for (let redirect = 0; redirect <= 5; redirect++) {
    const response = await fetch(url, { dispatcher: agent, redirect: 'manual', signal, headers: { 'User-Agent': 'Lighthouse/1.0 RSS Reader', Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml', ...headers } });
    if ([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) throw new Error(`${label} redirect has no destination`);
      url = webURL(location, url); continue;
    }
    if (response.status === 304) return { status: 304 };
    if (!response.ok) { await response.body?.cancel(); throw new Error(`${label} returned HTTP ${response.status}`); }
    const type = response.headers.get('content-type') || '';
    let size = 0; const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error(`${label} exceeds 5 MB`); }
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    const charset = /charset=["']?([^;\s"']+)/i.exec(type)?.[1] || 'utf-8';
    let text; try { text = new TextDecoder(charset).decode(bytes); } catch { text = bytes.toString('utf8'); }
    return { status: 200, text, url, etag: response.headers.get('etag'), modified: response.headers.get('last-modified') };
  }
  throw new Error(`Too many ${label.toLowerCase()} redirects`);
}
