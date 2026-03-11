/**
 * Link Verification — Shared Research / Retrieval Layer
 *
 * Verifies URLs are reachable and classifies them.
 * Uses server-side HEAD requests through the research API.
 * Client-side provides a lightweight check via the API proxy.
 */

import { classifyDomain } from './domainTrust';

/**
 * Batch-verify links through the research API.
 * If verification fails, the error propagates — no fake results.
 *
 * @param {string[]} urls - URLs to verify
 * @param {string} accessToken - JWT for auth
 * @returns {Promise<Map<string, { reachable: boolean, statusCode?: number, redirectUrl?: string }>>}
 */
export async function verifyLinks(urls, accessToken) {
  if (!urls || urls.length === 0) return new Map();

  const response = await fetch('/api/research-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      action: 'verify_links',
      urls: urls.slice(0, 10), // max 10 per batch
    }),
  });

  if (!response.ok) {
    throw new Error(`Link verification failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const map = new Map();
  for (const [url, result] of Object.entries(data.results || {})) {
    map.set(url, result);
  }
  return map;
}

/**
 * Enrich ResolvedLinks with live verification status.
 * @param {ResolvedLink[]} links
 * @param {string} accessToken
 * @returns {Promise<ResolvedLink[]>}
 */
export async function verifyResolvedLinks(links, accessToken) {
  if (!links || links.length === 0) return [];

  const urls = links.map(l => l.url).filter(Boolean);
  const verificationMap = await verifyLinks(urls, accessToken);

  return links.map(link => {
    const verification = verificationMap.get(link.url);
    if (verification) {
      return {
        ...link,
        verifiedLive: verification.reachable,
        confidence: verification.reachable
          ? Math.min(link.confidence + 0.15, 1.0)
          : Math.max(link.confidence - 0.2, 0.1),
      };
    }
    return link;
  });
}

/**
 * Quick client-side URL validation (structural only, no network).
 * @param {string} url
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateUrlStructure(url) {
  if (!url) return { valid: false, reason: 'Empty URL' };

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Not HTTP(S)' };
    }

    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, reason: 'Invalid hostname' };
    }

    // Check for obviously bad patterns
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(parsed.hostname)) {
      return { valid: false, reason: 'Local address' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }
}

/**
 * Determine if a link should be marked as "constructed" (guessed) vs "resolved" (verified).
 * @param {string} url
 * @returns {boolean} true if the URL is a known pattern-guess
 */
export function isConstructedUrl(url) {
  if (!url) return true;

  // These URL patterns are known to be guessed/constructed (not actual API endpoints)
  const constructedPatterns = [
    /parts\.freightliner\.com\/search\?q=/i,
    /peterbiltparts\.com\/search\?q=/i,
    /kenworth\.com\/parts\/\?q=/i,
    /volvotrucks\.us\/parts\/\?q=/i,
    /macktrucks\.com\/parts\/\?q=/i,
  ];

  return constructedPatterns.some(p => p.test(url));
}


