/**
 * Research Service — Frontend Shared Research / Retrieval Layer
 *
 * Single entry point for all research/retrieval operations from the client.
 * Routes through /api/research-search for authenticated Google CSE + link
 * verification, with client-side OEM link resolution as zero-cost fallback.
 *
 * Replaces direct usage of:
 *   - forumSearchService.searchForums()       → researchService.searchForums()
 *   - vendorService.getSearchUrls()           → researchService.getVerifiedLinks()
 *   - fabricated OEM URLs                     → researchService.resolveOfficialLinks()
 */

import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import {
  createResearchResult,
  createResearchPacket,
  normalizeForumResult,
  normalizeVendorListing,
  normalizeServiceResult,
  formatResearchContext,
  RESULT_TYPES,
  SEARCH_MODES,
} from '@/utils/researchModels';
import { buildQuery, resolveOEMLinks, getTrustedVendorLinks } from '@/utils/queryBuilder';
import { isConstructedUrl } from '@/utils/linkVerification';

const RESEARCH_API = '/api/research-search';
const SEARCH_TIMEOUT = 6000; // 6s for the shared layer (was 3s for forums only)

// ─── Auth helper ────────────────────────────────────────────────────

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (hasSupabaseConfig && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // No auth — will get 401, handled gracefully
    }
  }
  return headers;
}

// ─── Core fetch wrapper ─────────────────────────────────────────────

async function researchFetch(body, timeout = SEARCH_TIMEOUT) {
  const headers = await getAuthHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(RESEARCH_API, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn('Research API HTTP error:', response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn('Research search timed out');
    } else {
      console.warn('Research search failed:', err.message);
    }
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Search truck forums for community discussions.
 * Drop-in replacement for forumSearchService.searchForums()
 * with the auth bug fixed and trust metadata added.
 *
 * @param {Object} params - { make, model, year, errorCodes, symptoms, freeText }
 * @param {number} [num=5]
 * @returns {Promise<{ results: ResearchResult[], query: string, error?: string }>}
 */
export async function searchForums(params = {}, num = 5) {
  const query = buildQuery(SEARCH_MODES.FORUMS, params);

  if (!query || query.trim().length < 3) {
    return { results: [], query: '', error: 'Query too short' };
  }

  const data = await researchFetch({
    action: 'search',
    mode: 'forums',
    query,
    num,
    context: params,
  });

  if (!data) {
    return { results: [], query, error: 'Search unavailable' };
  }

  return {
    results: data.results || [],
    query: data.query || query,
    error: data.error || null,
  };
}

/**
 * Resolve verified OEM/manufacturer official links for a make.
 * Replaces fabricated search URLs with curated portal links.
 *
 * @param {string} make - Truck manufacturer
 * @returns {Promise<{ officialLinks: ResolvedLink[], dealerLinks: ResolvedLink[] }>}
 */
export async function resolveOfficialLinks(make) {
  if (!make) return { officialLinks: [], dealerLinks: [] };

  // Try server-side resolution first (can verify links live)
  const data = await researchFetch({
    action: 'search',
    mode: 'official_links',
    query: `${make} official parts`,
    context: { make },
  });

  if (data && (data.officialLinks?.length > 0 || data.dealerLinks?.length > 0)) {
    return {
      officialLinks: data.officialLinks || [],
      dealerLinks: data.dealerLinks || [],
    };
  }

  // Fallback: client-side OEM resolution (no network needed)
  const oemLinks = resolveOEMLinks(make);
  const official = oemLinks.filter(l => l.linkType !== 'dealer_locator');
  const dealers = oemLinks.filter(l => l.linkType === 'dealer_locator');

  return { officialLinks: official, dealerLinks: dealers };
}

/**
 * Get a full research packet for a diagnostic issue.
 * Best used from Diagnostics page — combines forums + OEM links + parts.
 *
 * @param {Object} context - { make, model, year, errorCodes, symptoms, freeText, partName, partNumber }
 * @returns {Promise<ResearchPacket>}
 */
export async function getIssueResearchPacket(context = {}) {
  const query = buildQuery(SEARCH_MODES.ISSUE_RESEARCH, context);

  const data = await researchFetch({
    action: 'search',
    mode: 'issue_research',
    query,
    context,
    num: 8,
  });

  if (!data) {
    // Full fallback: client-side only
    const oemLinks = context.make ? resolveOEMLinks(context.make) : [];
    const vendorLinks = (context.partNumber || context.partName)
      ? getTrustedVendorLinks(context.partNumber, context.partName)
      : [];

    return createResearchPacket({
      context: query,
      mode: SEARCH_MODES.ISSUE_RESEARCH,
      results: [],
      officialLinks: oemLinks.filter(l => l.linkType !== 'dealer_locator'),
      dealerLinks: oemLinks.filter(l => l.linkType === 'dealer_locator').concat(vendorLinks),
      error: 'Research API unavailable — showing cached links only',
    });
  }

  return createResearchPacket({
    context: query,
    mode: SEARCH_MODES.ISSUE_RESEARCH,
    results: data.results || [],
    officialLinks: data.officialLinks || [],
    dealerLinks: data.dealerLinks || [],
    error: data.error || null,
  });
}

/**
 * Get verified parts source links (replaces getSearchUrls for parts).
 * Returns trusted vendor links with trust metadata instead of guessed OEM URLs.
 *
 * @param {string} partNumber
 * @param {string} partName
 * @param {string} [make]
 * @returns {Promise<{ links: ResolvedLink[], officialLinks: ResolvedLink[] }>}
 */
export async function getVerifiedPartsLinks(partNumber, partName, make) {
  const vendorLinks = getTrustedVendorLinks(partNumber, partName);
  const oemLinks = make ? resolveOEMLinks(make) : [];

  // Try to enrich with server-side search results
  const data = await researchFetch({
    action: 'search',
    mode: 'parts_sources',
    query: buildQuery(SEARCH_MODES.PARTS_SOURCES, { partNumber, partName, make }),
    context: { partNumber, partName, make },
  });

  if (data && data.dealerLinks?.length > 0) {
    return {
      links: data.dealerLinks,
      officialLinks: data.officialLinks || oemLinks.filter(l => l.linkType !== 'dealer_locator'),
    };
  }

  return {
    links: vendorLinks,
    officialLinks: oemLinks.filter(l => l.linkType !== 'dealer_locator'),
  };
}

/**
 * Search for dealer/service links near user.
 *
 * @param {Object} params - { make, serviceType, lat, lng }
 * @returns {Promise<{ results: ResearchResult[], dealerLinks: ResolvedLink[] }>}
 */
export async function searchDealerLinks(params = {}) {
  const query = buildQuery(SEARCH_MODES.DEALERS, params);

  const data = await researchFetch({
    action: 'search',
    mode: 'dealers',
    query,
    context: params,
  });

  if (!data) {
    const oemLinks = params.make ? resolveOEMLinks(params.make) : [];
    return {
      results: [],
      dealerLinks: oemLinks.filter(l => l.linkType === 'dealer_locator'),
    };
  }

  return {
    results: data.results || [],
    dealerLinks: (data.officialLinks || []).concat(data.dealerLinks || []),
  };
}

/**
 * Format a research packet's results into AI prompt context.
 * Replaces forumSearchService.formatForumContext().
 *
 * @param {ResearchPacket} packet
 * @returns {string}
 */
export { formatResearchContext };

/**
 * Backwards-compatible formatter for raw forum results array.
 * Use formatResearchContext(packet) for new code.
 *
 * @param {Array} results - Raw forum results (old format or new ResearchResult[])
 * @returns {string}
 */
export function formatForumContext(results) {
  if (!results || results.length === 0) return '';

  let context = `\n\n🌐 REAL FORUM DISCUSSIONS (from verified sources — cite these URLs when referencing):\n`;
  results.forEach((r, i) => {
    const title = r.title || '';
    const source = r.source || '';
    const url = r.url || r.link || '';
    const date = r.date || null;
    const snippet = r.snippet || '';
    const trust = r.trustLabel ? ` [Trust: ${r.trustLabel}]` : '';

    context += `\n${i + 1}. "${title}"`;
    context += `\n   Source: ${source}${trust}`;
    context += `\n   URL: ${url}`;
    if (date) context += `\n   Date: ${date}`;
    context += `\n   Snippet: ${snippet}`;
    context += '\n';
  });

  return context;
}

// ─── Utility re-exports for consumers ───────────────────────────────

export { SEARCH_MODES, RESULT_TYPES } from '@/utils/researchModels';
export { isConstructedUrl } from '@/utils/linkVerification';
export { resolveOEMLinks, getTrustedVendorLinks } from '@/utils/queryBuilder';
export { classifyDomain, TRUST_TIERS, SOURCE_CLASSES } from '@/utils/domainTrust';
