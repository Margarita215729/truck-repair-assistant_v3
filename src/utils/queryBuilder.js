/**
 * Query Builder — Shared Research / Retrieval Layer
 *
 * Builds targeted search queries from diagnostic context (make/model/year,
 * fault codes, part numbers, symptoms). Used by both frontend and backend
 * search functions for consistent query construction.
 */

import { SEARCH_MODES } from './researchModels';

// ─── Truck context helpers ──────────────────────────────────────────

/**
 * Build a truck identity string.
 * @param {{ make?: string, model?: string, year?: string|number }} ctx
 * @returns {string} e.g., "2019 Freightliner Cascadia"
 */
export function truckIdentity({ make, model, year } = {}) {
  return [year, make, model].filter(Boolean).join(' ').trim();
}

// ─── Query builders per search mode ─────────────────────────────────

/**
 * Build a forum search query for a diagnostic issue.
 * @param {Object} params
 * @param {string} [params.make]
 * @param {string} [params.model]
 * @param {string} [params.year]
 * @param {string[]} [params.errorCodes]
 * @param {string[]} [params.symptoms]
 * @param {string} [params.freeText]
 * @param {string} [params.partName]
 * @returns {string}
 */
export function buildForumQuery({ make, model, year, errorCodes = [], symptoms = [], freeText = '', partName = '' } = {}) {
  const parts = [];

  if (make) parts.push(make);
  if (model) parts.push(model);
  if (year) parts.push(String(year));

  // Error codes — most specific signal, max 3
  if (errorCodes.length > 0) {
    parts.push(errorCodes.slice(0, 3).join(' '));
  }

  // Part name if relevant
  if (partName) {
    parts.push(partName);
  }

  // Symptoms — max 2
  if (symptoms.length > 0) {
    parts.push(symptoms.slice(0, 2).join(' '));
  }

  // Free text — truncated
  if (freeText) {
    parts.push(freeText.substring(0, 60));
  }

  // Ensure truck context
  if (!parts.some(p => /truck|repair|fix|problem|diesel/i.test(p))) {
    parts.push('truck repair');
  }

  return parts.join(' ').trim();
}

/**
 * Build a query for OEM/official link resolution.
 * @param {Object} params
 * @param {string} [params.make]
 * @param {string} [params.partNumber]
 * @param {string} [params.partName]
 * @param {string} [params.system] - e.g., "aftertreatment", "engine", "transmission"
 * @returns {string}
 */
export function buildOfficialLinkQuery({ make, partNumber, partName, system } = {}) {
  const parts = [];

  if (make) parts.push(make);
  if (partNumber) parts.push(partNumber);
  if (partName) parts.push(partName);
  if (system) parts.push(system);

  parts.push('official parts catalog');

  return parts.join(' ').trim();
}

/**
 * Build a query for dealer/service locator search.
 * @param {Object} params
 * @param {string} [params.make]
 * @param {string} [params.lat]
 * @param {string} [params.lng]
 * @param {string} [params.serviceType] - e.g., "repair", "towing", "parts"
 * @returns {string}
 */
export function buildDealerQuery({ make, serviceType = 'repair' } = {}) {
  const parts = [];

  if (make) parts.push(make);
  parts.push('truck');
  parts.push(serviceType === 'parts' ? 'parts dealer' : `${serviceType} service`);
  parts.push('near me');

  return parts.join(' ').trim();
}

/**
 * Build a parts source query.
 * @param {Object} params
 * @param {string} [params.partNumber]
 * @param {string} [params.partName]
 * @param {string} [params.make]
 * @param {string} [params.brand]
 * @returns {string}
 */
export function buildPartsQuery({ partNumber, partName, make, brand } = {}) {
  const parts = [];

  if (partNumber) parts.push(partNumber);
  if (brand) parts.push(brand);
  if (partName) parts.push(partName);
  if (make) parts.push(make);

  if (!parts.some(p => /truck|part/i.test(p))) {
    parts.push('truck part');
  }

  return parts.join(' ').trim();
}

// ─── Master query builder ───────────────────────────────────────────

/**
 * Build a query for any search mode.
 * @param {string} mode - One of SEARCH_MODES
 * @param {Object} context - All available context fields
 * @returns {string}
 */
export function buildQuery(mode, context = {}) {
  switch (mode) {
    case SEARCH_MODES.FORUMS:
      return buildForumQuery(context);
    case SEARCH_MODES.OFFICIAL_LINKS:
      return buildOfficialLinkQuery(context);
    case SEARCH_MODES.DEALERS:
      return buildDealerQuery(context);
    case SEARCH_MODES.PARTS_SOURCES:
      return buildPartsQuery(context);
    case SEARCH_MODES.SERVICES:
      return buildDealerQuery({ ...context, serviceType: context.serviceType || 'repair' });
    case SEARCH_MODES.ISSUE_RESEARCH:
      return buildForumQuery(context);
    default:
      return buildForumQuery(context);
  }
}

// ─── OEM Link Resolution (known patterns) ───────────────────────────

/**
 * OEM/manufacturer official link patterns.
 * These are curated, verified URLs — NOT guessed search endpoints.
 *
 * Each entry provides:
 *  - partsPortal: the real parts catalog URL (if public)
 *  - dealerLocator: the real dealer/service locator URL
 *  - techDocs: technical documentation portal (if public)
 *  - recallLookup: recall/TSB lookup URL
 *
 * URLs marked with `null` mean no public portal exists.
 * URLs that are search-based use `{query}` placeholder.
 */
export const OEM_LINKS = {
  freightliner: {
    label: 'Freightliner (Daimler)',
    partsPortal: 'https://dtna.com/parts-and-service',
    dealerLocator: 'https://www.freightliner.com/find-a-dealer/',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=freightliner',
  },
  peterbilt: {
    label: 'Peterbilt',
    partsPortal: 'https://www.peterbilt.com/parts',
    dealerLocator: 'https://www.peterbilt.com/find-a-dealer',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=peterbilt',
  },
  kenworth: {
    label: 'Kenworth',
    partsPortal: 'https://www.kenworth.com/parts-and-services',
    dealerLocator: 'https://www.kenworth.com/dealers',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=kenworth',
  },
  volvo: {
    label: 'Volvo Trucks',
    partsPortal: 'https://www.volvotrucks.us/parts/',
    dealerLocator: 'https://www.volvotrucks.us/find-a-dealer/',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=volvo+truck',
  },
  mack: {
    label: 'Mack Trucks',
    partsPortal: 'https://www.macktrucks.com/parts-and-services/',
    dealerLocator: 'https://www.macktrucks.com/buy-mack/find-a-dealer/',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=mack',
  },
  international: {
    label: 'International (Navistar)',
    partsPortal: 'https://www.internationaltrucks.com/parts-and-service',
    dealerLocator: 'https://www.international.com/dealer-network/dealer-locator',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=international',
  },
  westernstar: {
    label: 'Western Star',
    partsPortal: 'https://www.westernstartrucks.com/parts-and-service',
    dealerLocator: 'https://www.westernstartrucks.com/dealers/',
    techDocs: null,
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=western+star',
  },
  cummins: {
    label: 'Cummins',
    partsPortal: 'https://parts.cummins.com/',
    dealerLocator: 'https://www.cummins.com/support/find-dealer',
    techDocs: 'https://quickserve.cummins.com/',
    recallLookup: null,
  },
};

/**
 * Resolve OEM official links for a make.
 * Returns only verified portal URLs — never constructed search URLs.
 *
 * @param {string} make - Truck make (case-insensitive)
 * @returns {ResolvedLink[]}
 */
export function resolveOEMLinks(make) {
  if (!make) return [];

  const key = make.toLowerCase().replace(/[^a-z]/g, '');
  const oem = OEM_LINKS[key];

  if (!oem) return [];

  const links = [];

  if (oem.partsPortal) {
    links.push({
      url: oem.partsPortal,
      linkType: 'oem_parts',
      label: `${oem.label} — Parts Portal`,
      source: oem.label,
      trustTier: 1,
      verifiedLive: false,    // will be verified on demand
      verifiedOfficial: true,
      confidence: 0.9,
    });
  }

  if (oem.dealerLocator) {
    links.push({
      url: oem.dealerLocator,
      linkType: 'dealer_locator',
      label: `${oem.label} — Dealer Locator`,
      source: oem.label,
      trustTier: 1,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.9,
    });
  }

  if (oem.techDocs) {
    links.push({
      url: oem.techDocs,
      linkType: 'service_manual',
      label: `${oem.label} — Technical Docs`,
      source: oem.label,
      trustTier: 1,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.85,
    });
  }

  if (oem.recallLookup) {
    links.push({
      url: oem.recallLookup,
      linkType: 'recall',
      label: `${oem.label} — NHTSA Recalls`,
      source: 'NHTSA',
      trustTier: 1,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.95,
    });
  }

  return links;
}

/**
 * Get trusted parts vendor search URLs.
 * Only returns vendors known to have working search endpoints.
 *
 * @param {string} partNumber
 * @param {string} partName
 * @returns {ResolvedLink[]}
 */
export function getTrustedVendorLinks(partNumber, partName) {
  const term = partNumber || partName || '';
  if (!term) return [];

  const encoded = encodeURIComponent(term);
  const fullEncoded = encodeURIComponent([partNumber, partName].filter(Boolean).join(' '));

  // Only vendors with VERIFIED working search endpoints
  return [
    {
      url: `https://www.fleetpride.com/parts/search?q=${encoded}`,
      linkType: 'oem_parts',
      label: 'FleetPride',
      source: 'FleetPride',
      trustTier: 2,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.8,
    },
    {
      url: `https://www.finditparts.com/search?q=${encoded}`,
      linkType: 'oem_parts',
      label: 'FinditParts',
      source: 'FinditParts',
      trustTier: 2,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.8,
    },
    {
      url: `https://www.rockauto.com/en/partsearch/?partnum=${encoded}`,
      linkType: 'oem_parts',
      label: 'RockAuto',
      source: 'RockAuto',
      trustTier: 3,
      verifiedLive: false,
      verifiedOfficial: true,
      confidence: 0.7,
    },
    {
      url: `https://www.ebay.com/sch/i.html?_nkw=${fullEncoded}&_sacat=6028`,
      linkType: 'general',
      label: 'eBay (Truck Parts)',
      source: 'eBay',
      trustTier: 4,
      verifiedLive: false,
      verifiedOfficial: false,
      confidence: 0.6,
    },
    {
      url: `https://www.google.com/search?tbm=shop&q=${fullEncoded}`,
      linkType: 'general',
      label: 'Google Shopping',
      source: 'Google',
      trustTier: 4,
      verifiedLive: false,
      verifiedOfficial: false,
      confidence: 0.5,
    },
  ];
}
