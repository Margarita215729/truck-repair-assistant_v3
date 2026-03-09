/**
 * Domain Trust Policy — Shared Research / Retrieval Layer
 *
 * Classifies domains into trust tiers and source classes.
 * Single source of truth for trust evaluation across the entire app.
 */

// ─── Trust Tiers ────────────────────────────────────────────────────

export const TRUST_TIERS = {
  VERIFIED_OFFICIAL: 1,   // OEM sites, manufacturer portals, .gov
  AUTHORIZED:        2,   // Authorized dealers, vetted specialist vendors
  COMMUNITY:         3,   // Known forums, Stack Exchange, curated communities
  GENERAL:           4,   // Marketplaces, generic search, user-generated
};

export const TRUST_TIER_LABELS = {
  [TRUST_TIERS.VERIFIED_OFFICIAL]: 'Verified Official',
  [TRUST_TIERS.AUTHORIZED]:       'Authorized / Specialist',
  [TRUST_TIERS.COMMUNITY]:        'Community / Forum',
  [TRUST_TIERS.GENERAL]:          'General / Marketplace',
};

// ─── Source Classes ─────────────────────────────────────────────────

export const SOURCE_CLASSES = {
  OEM_MANUFACTURER:    'oem_manufacturer',
  DEALER_LOCATOR:      'dealer_locator',
  AUTHORIZED_DEALER:   'authorized_dealer',
  SPECIALIST_VENDOR:   'specialist_vendor',
  AFTERMARKET_VENDOR:  'aftermarket_vendor',
  MARKETPLACE:         'marketplace',
  SEARCH_ENGINE:       'search_engine',
  TRUCK_FORUM:         'truck_forum',
  GENERAL_FORUM:       'general_forum',
  QA_SITE:             'qa_site',
  GOV_RECALL:          'gov_recall',
  SERVICE_LOCATOR:     'service_locator',
  NEWS_ARTICLE:        'news_article',
};

// ─── Known Domain Registry ──────────────────────────────────────────
// Maps domain patterns to { sourceClass, trustTier, label }

const DOMAIN_REGISTRY = [
  // Tier 1: OEM / Manufacturer / Government
  { pattern: /freightliner\.com/i,         sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Freightliner (Daimler)' },
  { pattern: /peterbilt(parts)?\.com/i,     sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Peterbilt' },
  { pattern: /kenworth\.com/i,              sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Kenworth' },
  { pattern: /volvotrucks\.(com|us)/i,      sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Volvo Trucks' },
  { pattern: /macktrucks\.com/i,            sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Mack Trucks' },
  { pattern: /internationaltrucks\.com/i,   sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'International (Navistar)' },
  { pattern: /westernstartrucks\.com/i,     sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Western Star' },
  { pattern: /cummins\.com/i,               sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Cummins' },
  { pattern: /detroitdiesel\.com/i,         sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Detroit Diesel' },
  { pattern: /paccar\.com/i,                sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'PACCAR' },
  { pattern: /eaton\.com/i,                 sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Eaton' },
  { pattern: /bendix\.com/i,                sourceClass: SOURCE_CLASSES.OEM_MANUFACTURER,   trustTier: 1, label: 'Bendix' },
  { pattern: /nhtsa\.gov/i,                 sourceClass: SOURCE_CLASSES.GOV_RECALL,          trustTier: 1, label: 'NHTSA (Recall/Safety)' },

  // Tier 2: Authorized Dealers / Specialists
  { pattern: /fleetpride\.com/i,            sourceClass: SOURCE_CLASSES.SPECIALIST_VENDOR,  trustTier: 2, label: 'FleetPride' },
  { pattern: /truckpro\.com/i,              sourceClass: SOURCE_CLASSES.SPECIALIST_VENDOR,  trustTier: 2, label: 'TruckPro' },
  { pattern: /finditparts\.com/i,           sourceClass: SOURCE_CLASSES.SPECIALIST_VENDOR,  trustTier: 2, label: 'FinditParts' },
  { pattern: /rushtruckcenters\.com/i,      sourceClass: SOURCE_CLASSES.AUTHORIZED_DEALER,  trustTier: 2, label: 'Rush Truck Centers' },
  { pattern: /pfreedmanson?s?\.com/i,       sourceClass: SOURCE_CLASSES.SPECIALIST_VENDOR,  trustTier: 2, label: 'Freedman Seating' },
  { pattern: /4statetrucks\.com/i,          sourceClass: SOURCE_CLASSES.SPECIALIST_VENDOR,  trustTier: 2, label: '4 State Trucks' },

  // Tier 3: Aftermarket / Community Forums
  { pattern: /rockauto\.com/i,              sourceClass: SOURCE_CLASSES.AFTERMARKET_VENDOR, trustTier: 3, label: 'RockAuto' },
  { pattern: /dormanproducts\.com/i,        sourceClass: SOURCE_CLASSES.AFTERMARKET_VENDOR, trustTier: 3, label: 'Dorman Products' },
  { pattern: /thetruckersreport\.com/i,     sourceClass: SOURCE_CLASSES.TRUCK_FORUM,        trustTier: 3, label: 'TruckersReport' },
  { pattern: /reddit\.com\/(r\/(Truckers|TruckRepair|MechanicAdvice|DieselTechs|Justrolledintotheshop))?/i,
    sourceClass: SOURCE_CLASSES.TRUCK_FORUM, trustTier: 3, label: 'Reddit (Truck/Mechanic)' },
  { pattern: /thedieselstop\.com/i,         sourceClass: SOURCE_CLASSES.TRUCK_FORUM,        trustTier: 3, label: 'TheDieselStop' },
  { pattern: /mechanics\.stackexchange\.com/i, sourceClass: SOURCE_CLASSES.QA_SITE,         trustTier: 3, label: 'Mechanics SE' },
  { pattern: /justanswer\.com/i,            sourceClass: SOURCE_CLASSES.QA_SITE,            trustTier: 3, label: 'JustAnswer' },
  { pattern: /truckingtruth\.com/i,         sourceClass: SOURCE_CLASSES.TRUCK_FORUM,        trustTier: 3, label: 'TruckingTruth' },

  // Tier 4: General Marketplaces / Search
  { pattern: /ebay\.com/i,                  sourceClass: SOURCE_CLASSES.MARKETPLACE,        trustTier: 4, label: 'eBay' },
  { pattern: /amazon\.com/i,                sourceClass: SOURCE_CLASSES.MARKETPLACE,        trustTier: 4, label: 'Amazon' },
  { pattern: /google\.com/i,                sourceClass: SOURCE_CLASSES.SEARCH_ENGINE,      trustTier: 4, label: 'Google' },
  { pattern: /yelp\.com/i,                  sourceClass: SOURCE_CLASSES.SERVICE_LOCATOR,    trustTier: 4, label: 'Yelp' },
  { pattern: /reddit\.com/i,                sourceClass: SOURCE_CLASSES.GENERAL_FORUM,      trustTier: 4, label: 'Reddit' },
];

/**
 * Classify a URL or domain into trust tier + source class.
 * @param {string} urlOrDomain - Full URL or bare domain
 * @returns {{ trustTier: number, sourceClass: string, label: string, isKnown: boolean }}
 */
export function classifyDomain(urlOrDomain) {
  if (!urlOrDomain) {
    return { trustTier: 4, sourceClass: SOURCE_CLASSES.SEARCH_ENGINE, label: 'Unknown', isKnown: false };
  }

  const str = urlOrDomain.toLowerCase();

  for (const entry of DOMAIN_REGISTRY) {
    if (entry.pattern.test(str)) {
      return {
        trustTier: entry.trustTier,
        sourceClass: entry.sourceClass,
        label: entry.label,
        isKnown: true,
      };
    }
  }

  return { trustTier: 4, sourceClass: SOURCE_CLASSES.SEARCH_ENGINE, label: extractDomainLabel(str), isKnown: false };
}

/**
 * Extract a friendly label from a URL.
 */
function extractDomainLabel(url) {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url.substring(0, 40);
  }
}

/**
 * Check if a domain is in the OEM manufacturer class.
 */
export function isOEMDomain(urlOrDomain) {
  const { sourceClass } = classifyDomain(urlOrDomain);
  return sourceClass === SOURCE_CLASSES.OEM_MANUFACTURER;
}

/**
 * Check if a domain is a known truck community.
 */
export function isTruckCommunity(urlOrDomain) {
  const { sourceClass } = classifyDomain(urlOrDomain);
  return sourceClass === SOURCE_CLASSES.TRUCK_FORUM || sourceClass === SOURCE_CLASSES.QA_SITE;
}

/**
 * Get the trust tier label for display.
 */
export function getTrustTierLabel(tier) {
  return TRUST_TIER_LABELS[tier] || 'Unknown';
}
