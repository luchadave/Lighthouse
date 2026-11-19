const trackingParameters = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'gbraid',
  'wbraid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'vero_id',
  'oly_enc_id',
  'oly_anon_id',
  '_hsenc',
  '_hsmi',
  'hsctatracking',
  'ref_src',
  'ref_url'
]);

export function cleanUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return value;
    }

    for (const key of [...url.searchParams.keys()]) {
      const normalized = key.toLowerCase();

      if (
        normalized.startsWith('utm_') ||
        trackingParameters.has(normalized)
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return value;
  }
}
