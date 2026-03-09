/**
 * Research Models — Shared Research / Retrieval Layer
 *
 * Normalized result types for all retrieval operations:
 * ResearchResult → single search hit (forum post, link, listing, service)
 * ResearchPacket → bundled results for a diagnostic/repair context
 * ResolvedLink   → a verified (or unverified) external link
 */

import { classifyDomain, TRUST_TIERS, SOURCE_CLASSES } from './domainTrust';

// ─── Result Types ───────────────────────────────────────────────────

export const RESULT_TYPES = {
  FORUM_POST:      'forum_post',
  OFFICIAL_LINK:   'official_link',
  DEALER_LINK:     'dealer_link',
  PARTS_SOURCE:    'parts_source',
  SERVICE_SOURCE:  'service_source',
  RECALL_NOTICE:   'recall_notice',
  ARTICLE:         'article',
};

// ─── Search Modes ───────────────────────────────────────────────────

export const SEARCH_MODES = {
  FORUMS:           'forums',
  OFFICIAL_LINKS:   'official_links',
  DEALERS:          'dealers',
  PARTS_SOURCES:    'parts_sources',
  SERVICES:         'services',
  ISSUE_RESEARCH:   'issue_research',   // mixed mode
};

// ─── ResearchResult Factory ─────────────────────────────────────────

/**
 * Create a normalized ResearchResult from any source.
 *
 * @param {Object} raw - Raw data from any retrieval source
 * @returns {ResearchResult}
 *
 * @typedef {Object} ResearchResult
 * @property {string}  id           - Unique identifier
 * @property {string}  resultType   - One of RESULT_TYPES
 * @property {string}  title        - Display title
 * @property {string}  url          - Full URL
 * @property {string}  snippet      - Preview text / description
 * @property {string}  source       - Friendly source label
 * @property {string}  sourceClass  - From SOURCE_CLASSES
 * @property {number}  trustTier    - 1-4
 * @property {string}  trustLabel   - Human-readable tier
 * @property {boolean} isKnownSource - Domain in registry
 * @property {boolean} verifiedLive  - URL confirmed reachable (null if unchecked)
 * @property {number}  confidence   - 0.0 - 1.0
 * @property {string|null} date     - Publication/post date
 * @property {Object}  meta         - Source-specific extra fields
 * @property {number}  _ts          - Created timestamp
 */
export function createResearchResult({
  id,
  resultType = RESULT_TYPES.ARTICLE,
  title = '',
  url = '',
  snippet = '',
  source = '',
  date = null,
  confidence = 0.5,
  verifiedLive = null,
  meta = {},
} = {}) {
  const domainInfo = classifyDomain(url);

  return {
    id: id || `rr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    resultType,
    title,
    url,
    snippet,
    source: source || domainInfo.label,
    sourceClass: domainInfo.sourceClass,
    trustTier: domainInfo.trustTier,
    trustLabel: domainInfo.isKnown ? domainInfo.label : 'Unclassified',
    isKnownSource: domainInfo.isKnown,
    verifiedLive,
    confidence,
    date,
    meta,
    _ts: Date.now(),
  };
}

// ─── ResolvedLink Factory ───────────────────────────────────────────

/**
 * @typedef {Object} ResolvedLink
 * @property {string}  url           - Full URL
 * @property {string}  linkType      - 'oem_parts', 'dealer_locator', 'recall', 'service_manual', 'general'
 * @property {string}  label         - Display text
 * @property {string}  source        - Domain label
 * @property {number}  trustTier     - 1-4
 * @property {boolean} verifiedLive  - URL confirmed reachable
 * @property {boolean} verifiedOfficial - Domain is in OEM/official registry
 * @property {number}  confidence    - 0.0 - 1.0
 */
export function createResolvedLink({
  url = '',
  linkType = 'general',
  label = '',
  verifiedLive = false,
  confidence = 0.5,
} = {}) {
  const domainInfo = classifyDomain(url);

  return {
    url,
    linkType,
    label: label || domainInfo.label,
    source: domainInfo.label,
    trustTier: domainInfo.trustTier,
    verifiedLive,
    verifiedOfficial: domainInfo.trustTier <= 2 && domainInfo.isKnown,
    confidence,
  };
}

// ─── ResearchPacket ─────────────────────────────────────────────────

/**
 * Bundle multiple research results into a coherent packet for a context.
 *
 * @typedef {Object} ResearchPacket
 * @property {string}          context     - What was being researched
 * @property {string}          mode        - SEARCH_MODES used
 * @property {ResearchResult[]} results    - All normalized results
 * @property {ResolvedLink[]}  officialLinks - Verified official links
 * @property {ResolvedLink[]}  dealerLinks   - Dealer/locator links
 * @property {ResearchResult[]} forumResults  - Forum-specific subset
 * @property {ResearchResult[]} partsSources  - Parts vendor results
 * @property {ResearchResult[]} serviceSources - Service/repair shop results
 * @property {Object}          stats       - { total, byTier, byType, searchTimeMs }
 * @property {string|null}     error       - Error message if partially failed
 * @property {number}          _ts         - Created timestamp
 */
export function createResearchPacket({
  context = '',
  mode = SEARCH_MODES.ISSUE_RESEARCH,
  results = [],
  officialLinks = [],
  dealerLinks = [],
  error = null,
} = {}) {
  const forumResults = results.filter(r =>
    r.resultType === RESULT_TYPES.FORUM_POST ||
    r.sourceClass === SOURCE_CLASSES.TRUCK_FORUM ||
    r.sourceClass === SOURCE_CLASSES.GENERAL_FORUM ||
    r.sourceClass === SOURCE_CLASSES.QA_SITE
  );

  const partsSources = results.filter(r =>
    r.resultType === RESULT_TYPES.PARTS_SOURCE ||
    r.sourceClass === SOURCE_CLASSES.SPECIALIST_VENDOR ||
    r.sourceClass === SOURCE_CLASSES.AFTERMARKET_VENDOR ||
    r.sourceClass === SOURCE_CLASSES.MARKETPLACE
  );

  const serviceSources = results.filter(r =>
    r.resultType === RESULT_TYPES.SERVICE_SOURCE ||
    r.sourceClass === SOURCE_CLASSES.SERVICE_LOCATOR
  );

  const byTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const byType = {};
  for (const r of results) {
    byTier[r.trustTier] = (byTier[r.trustTier] || 0) + 1;
    byType[r.resultType] = (byType[r.resultType] || 0) + 1;
  }

  return {
    context,
    mode,
    results,
    officialLinks,
    dealerLinks,
    forumResults,
    partsSources,
    serviceSources,
    stats: {
      total: results.length,
      byTier,
      byType,
    },
    error,
    _ts: Date.now(),
  };
}

// ─── Normalizers (convert existing formats → ResearchResult) ────────

/**
 * Convert a forum search result (from api/forum-search) to ResearchResult.
 */
export function normalizeForumResult(raw) {
  return createResearchResult({
    id: `forum-${hashStr(raw.link || raw.title)}`,
    resultType: RESULT_TYPES.FORUM_POST,
    title: raw.title || '',
    url: raw.link || '',
    snippet: raw.snippet || '',
    source: raw.source || '',
    date: raw.date || null,
    confidence: 0.7,
  });
}

/**
 * Convert a vendor listing (from api/parts/search) to ResearchResult.
 */
export function normalizeVendorListing(raw) {
  return createResearchResult({
    id: `vendor-${raw.sourceKey || ''}-${hashStr(raw.itemUrl || raw.title)}`,
    resultType: RESULT_TYPES.PARTS_SOURCE,
    title: raw.title || raw.vendor || '',
    url: raw.itemUrl || '',
    snippet: [raw.brand, raw.condition, raw.price ? `$${raw.price}` : ''].filter(Boolean).join(' · '),
    source: raw.vendor || raw.sourceKey || '',
    confidence: raw.fitmentConfidence || 0.5,
    meta: {
      partNumber: raw.partNumber,
      brand: raw.brand,
      price: raw.price,
      condition: raw.condition,
      availability: raw.availability,
      imageUrl: raw.imageUrl,
      sourceTier: raw.sourceTier,
      isOEM: raw.isOEM,
    },
  });
}

/**
 * Convert a constructed search URL to ResolvedLink.
 */
export function normalizeSearchUrl(key, url) {
  const domainInfo = classifyDomain(url);

  let linkType = 'general';
  if (domainInfo.sourceClass === SOURCE_CLASSES.OEM_MANUFACTURER) linkType = 'oem_parts';
  else if (domainInfo.sourceClass === SOURCE_CLASSES.DEALER_LOCATOR) linkType = 'dealer_locator';
  else if (domainInfo.sourceClass === SOURCE_CLASSES.SPECIALIST_VENDOR) linkType = 'oem_parts';

  return createResolvedLink({
    url,
    linkType,
    label: domainInfo.label,
    verifiedLive: false,  // constructed URLs are NOT verified
    confidence: domainInfo.isKnown ? 0.6 : 0.3,
  });
}

/**
 * Convert a Google Places service result to ResearchResult.
 */
export function normalizeServiceResult(raw) {
  return createResearchResult({
    id: `svc-${raw.id || hashStr(raw.name)}`,
    resultType: RESULT_TYPES.SERVICE_SOURCE,
    title: raw.name || '',
    url: '', // Places results don't have website URLs in our API
    snippet: [
      raw.address,
      raw.rating ? `★ ${raw.rating} (${raw.reviews || 0})` : '',
      raw.distance ? `${raw.distance.toFixed(1)} mi` : '',
    ].filter(Boolean).join(' · '),
    source: 'Google Places',
    confidence: raw.rating ? Math.min(raw.rating / 5, 1) : 0.5,
    meta: {
      placeId: raw.id,
      address: raw.address,
      lat: raw.lat,
      lng: raw.lng,
      rating: raw.rating,
      reviews: raw.reviews,
      phone: raw.phone,
      hours: raw.hours,
      is24Hours: raw.is24Hours,
      specialties: raw.specialties,
      distance: raw.distance,
      type: raw.type,
    },
  });
}

// ─── Format helpers ─────────────────────────────────────────────────

/**
 * Format a ResearchPacket's forum results into AI prompt context.
 * Replaces the old formatForumContext() with trust metadata.
 */
export function formatResearchContext(packet) {
  if (!packet || packet.results.length === 0) return '';

  const sections = [];

  // Official links
  if (packet.officialLinks.length > 0) {
    const verified = packet.officialLinks.filter(l => l.verifiedOfficial);
    if (verified.length > 0) {
      sections.push(
        `\n🏭 VERIFIED OFFICIAL LINKS:\n` +
        verified.map((l, i) => `  ${i + 1}. ${l.label}: ${l.url}`).join('\n')
      );
    }
  }

  // Forum discussions
  if (packet.forumResults.length > 0) {
    sections.push(
      `\n🌐 REAL FORUM DISCUSSIONS (cite these URLs when referencing):\n` +
      packet.forumResults.map((r, i) =>
        `  ${i + 1}. "${r.title}"\n` +
        `     Source: ${r.source} [Trust: ${r.trustLabel}]\n` +
        `     URL: ${r.url}\n` +
        (r.date ? `     Date: ${r.date}\n` : '') +
        `     ${r.snippet}`
      ).join('\n\n')
    );
  }

  // Parts sources
  if (packet.partsSources.length > 0) {
    sections.push(
      `\n🔧 PARTS SOURCES:\n` +
      packet.partsSources.map((r, i) =>
        `  ${i + 1}. ${r.title} — ${r.snippet}`
      ).join('\n')
    );
  }

  return sections.join('\n');
}

// ─── Utilities ──────────────────────────────────────────────────────

function hashStr(str) {
  if (!str) return Math.random().toString(36).slice(2, 8);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
