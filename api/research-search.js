/**
 * Vercel Serverless Function — Shared Research / Retrieval API
 *
 * POST /api/research-search
 *
 * Unified entry point for all research/retrieval operations:
 *   action: 'search'        — Google CSE search with mode routing
 *   action: 'verify_links'  — Batch HEAD-request link verification
 *
 * Search modes (when action='search'):
 *   mode: 'forums'         — Forum/community search (replaces raw forum-search calls)
 *   mode: 'official_links' — OEM/manufacturer link resolution
 *   mode: 'dealers'        — Dealer/service locator search
 *   mode: 'parts_sources'  — Parts vendor web search
 *   mode: 'services'       — Service provider search
 *   mode: 'issue_research' — Mixed mode: forums + official links + parts
 *
 * Returns normalized ResearchResult[] + ResolvedLink[] in a ResearchPacket shape.
 * Graceful degradation everywhere — partial results with error flags, never 500.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Supabase singleton ─────────────────────────────────────────────

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ─── CORS allowlist ─────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://truck-repair-assistant-v3.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean);

// ─── Domain trust registry (server-side mirror of domainTrust.js) ───

const SOURCE_MAP = {
  'www.truckersreport.com': { source: 'TruckersReport', sourceClass: 'truck_forum', tier: 3 },
  'truckersreport.com':     { source: 'TruckersReport', sourceClass: 'truck_forum', tier: 3 },
  'www.reddit.com':         { source: 'Reddit',         sourceClass: 'general_forum', tier: 4 },
  'reddit.com':             { source: 'Reddit',         sourceClass: 'general_forum', tier: 4 },
  'www.thedieselstop.com':  { source: 'TheDieselStop',  sourceClass: 'truck_forum', tier: 3 },
  'thedieselstop.com':      { source: 'TheDieselStop',  sourceClass: 'truck_forum', tier: 3 },
  'www.justanswer.com':     { source: 'JustAnswer',     sourceClass: 'qa_site', tier: 3 },
  'justanswer.com':         { source: 'JustAnswer',     sourceClass: 'qa_site', tier: 3 },
  'mechanics.stackexchange.com': { source: 'Mechanics SE', sourceClass: 'qa_site', tier: 3 },
  'www.truckingtruth.com':  { source: 'TruckingTruth',  sourceClass: 'truck_forum', tier: 3 },
  'truckingtruth.com':      { source: 'TruckingTruth',  sourceClass: 'truck_forum', tier: 3 },
  // OEM / Manufacturer
  'www.freightliner.com':   { source: 'Freightliner',   sourceClass: 'oem_manufacturer', tier: 1 },
  'freightliner.com':       { source: 'Freightliner',   sourceClass: 'oem_manufacturer', tier: 1 },
  'www.peterbilt.com':      { source: 'Peterbilt',      sourceClass: 'oem_manufacturer', tier: 1 },
  'www.kenworth.com':       { source: 'Kenworth',       sourceClass: 'oem_manufacturer', tier: 1 },
  'www.volvotrucks.us':     { source: 'Volvo Trucks',   sourceClass: 'oem_manufacturer', tier: 1 },
  'www.macktrucks.com':     { source: 'Mack Trucks',    sourceClass: 'oem_manufacturer', tier: 1 },
  'www.cummins.com':        { source: 'Cummins',        sourceClass: 'oem_manufacturer', tier: 1 },
  'www.nhtsa.gov':          { source: 'NHTSA',          sourceClass: 'gov_recall', tier: 1 },
  // Specialist vendors
  'www.fleetpride.com':     { source: 'FleetPride',     sourceClass: 'specialist_vendor', tier: 2 },
  'www.truckpro.com':       { source: 'TruckPro',       sourceClass: 'specialist_vendor', tier: 2 },
  'www.finditparts.com':    { source: 'FinditParts',    sourceClass: 'specialist_vendor', tier: 2 },
  'www.rockauto.com':       { source: 'RockAuto',       sourceClass: 'aftermarket_vendor', tier: 3 },
  // Marketplaces
  'www.ebay.com':           { source: 'eBay',           sourceClass: 'marketplace', tier: 4 },
  'www.amazon.com':         { source: 'Amazon',         sourceClass: 'marketplace', tier: 4 },
};

function classifyUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SOURCE_MAP[hostname] || { source: hostname, sourceClass: 'search_engine', tier: 4 };
  } catch {
    return { source: 'Unknown', sourceClass: 'search_engine', tier: 4 };
  }
}

// ─── Main handler ───────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth — JWT verification
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const body = req.body || {};
  const { action = 'search' } = body;

  try {
    if (action === 'verify_links') {
      return await handleVerifyLinks(body, res);
    }
    return await handleSearch(body, res);
  } catch (error) {
    console.error('Research search error:', error);
    return res.status(200).json({
      results: [],
      officialLinks: [],
      dealerLinks: [],
      stats: { total: 0, byTier: {}, byType: {} },
      error: 'Research search temporarily unavailable',
    });
  }
}

// ─── Search handler ─────────────────────────────────────────────────

async function handleSearch(body, res) {
  const {
    mode = 'issue_research',
    query = '',
    context = {},
    num = 5,
  } = body;

  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return res.status(400).json({ error: 'Query too short (min 3 chars)' });
  }

  const results = [];
  const officialLinks = [];
  const dealerLinks = [];
  const errors = [];

  // Route by mode
  const shouldSearchForums = ['forums', 'issue_research'].includes(mode);
  const shouldResolveLinks = ['official_links', 'issue_research'].includes(mode);
  const shouldSearchParts  = ['parts_sources', 'issue_research'].includes(mode);
  const shouldSearchDealers = ['dealers', 'services'].includes(mode);

  // Parallel execution of independent searches
  const tasks = [];

  if (shouldSearchForums) {
    tasks.push(
      searchGoogleCSE(query, Math.min(num, 8))
        .then(forumResults => {
          for (const r of forumResults) results.push(r);
        })
        .catch(err => errors.push(`Forum search: ${err.message}`))
    );
  }

  if (shouldResolveLinks && context.make) {
    tasks.push(Promise.resolve().then(() => {
      const oemLinks = resolveOEMLinksServer(context.make);
      for (const link of oemLinks) officialLinks.push(link);
    }));
  }

  if (shouldSearchParts && (context.partNumber || context.partName)) {
    tasks.push(Promise.resolve().then(() => {
      const vendorLinks = buildVerifiedVendorLinks(context.partNumber, context.partName);
      for (const link of vendorLinks) dealerLinks.push(link);
    }));
  }

  if (shouldSearchDealers && context.make) {
    tasks.push(
      searchGoogleCSE(`${context.make} truck ${context.serviceType || 'repair'} dealer near me`, 5)
        .then(dealerResults => {
          for (const r of dealerResults) {
            r.resultType = 'dealer_link';
            results.push(r);
          }
        })
        .catch(err => errors.push(`Dealer search: ${err.message}`))
    );
  }

  await Promise.all(tasks);

  // Sort results by trust tier (lower = better), then confidence
  results.sort((a, b) => (a.trustTier - b.trustTier) || (b.confidence - a.confidence));

  // Build stats
  const byTier = {};
  const byType = {};
  for (const r of results) {
    byTier[r.trustTier] = (byTier[r.trustTier] || 0) + 1;
    byType[r.resultType] = (byType[r.resultType] || 0) + 1;
  }

  return res.status(200).json({
    results,
    officialLinks,
    dealerLinks,
    stats: { total: results.length, byTier, byType },
    query,
    mode,
    error: errors.length > 0 ? errors.join('; ') : null,
  });
}

// ─── Google CSE search (shared) ─────────────────────────────────────

async function searchGoogleCSE(query, num = 5) {
  const API_KEY = process.env.GOOGLE_CSE_API_KEY;
  const CSE_ID = process.env.GOOGLE_CSE_ID;

  if (!API_KEY || !CSE_ID) {
    return []; // Graceful: not configured
  }

  const clampedNum = Math.min(Math.max(1, num), 10);
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('cx', CSE_ID);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(clampedNum));

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 429) {
      return []; // Quota exceeded — degrade silently
    }
    throw new Error(`Google CSE HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.items || []).map(item => {
    const domain = classifyUrl(item.link || '');
    return {
      id: `cse-${hashStr(item.link)}`,
      resultType: domain.sourceClass.includes('forum') || domain.sourceClass === 'qa_site'
        ? 'forum_post' : 'article',
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      source: domain.source,
      sourceClass: domain.sourceClass,
      trustTier: domain.tier,
      trustLabel: domain.source,
      isKnownSource: !!SOURCE_MAP[tryHostname(item.link)],
      verifiedLive: true, // CSE only returns live indexed pages
      confidence: domain.tier <= 2 ? 0.85 : domain.tier === 3 ? 0.7 : 0.5,
      date: item.pagemap?.metatags?.[0]?.['article:published_time']
        || item.pagemap?.metatags?.[0]?.['og:updated_time']
        || null,
      meta: {},
    };
  });
}

// ─── OEM link resolution (server-side) ──────────────────────────────

const OEM_LINKS = {
  freightliner: {
    label: 'Freightliner (Daimler)',
    partsPortal: 'https://dtna.com/parts-and-service',
    dealerLocator: 'https://freightliner.com/dealer-locator/',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=freightliner',
  },
  peterbilt: {
    label: 'Peterbilt',
    partsPortal: 'https://www.peterbilt.com/parts',
    dealerLocator: 'https://www.peterbilt.com/dealer-locator',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=peterbilt',
  },
  kenworth: {
    label: 'Kenworth',
    partsPortal: 'https://www.kenworth.com/parts-and-services',
    dealerLocator: 'https://www.kenworth.com/dealer-locator',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=kenworth',
  },
  volvo: {
    label: 'Volvo Trucks',
    partsPortal: 'https://www.volvotrucks.us/parts/',
    dealerLocator: 'https://www.volvotrucks.us/dealer-locator/',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=volvo+truck',
  },
  mack: {
    label: 'Mack Trucks',
    partsPortal: 'https://www.macktrucks.com/parts-and-services/',
    dealerLocator: 'https://www.macktrucks.com/dealer-locator/',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=mack',
  },
  international: {
    label: 'International (Navistar)',
    partsPortal: 'https://www.internationaltrucks.com/parts-and-service',
    dealerLocator: 'https://www.internationaltrucks.com/dealer-locator',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=international',
  },
  westernstar: {
    label: 'Western Star',
    partsPortal: 'https://www.westernstartrucks.com/parts-and-service',
    dealerLocator: 'https://www.westernstartrucks.com/dealer-locator',
    recallLookup: 'https://www.nhtsa.gov/recalls?nhtsaId=&query=western+star',
  },
  cummins: {
    label: 'Cummins',
    partsPortal: 'https://parts.cummins.com/',
    dealerLocator: 'https://www.cummins.com/support/find-dealer',
    techDocs: 'https://quickserve.cummins.com/',
  },
};

function resolveOEMLinksServer(make) {
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
      verifiedOfficial: true,
      confidence: 0.85,
    });
  }
  if (oem.recallLookup) {
    links.push({
      url: oem.recallLookup,
      linkType: 'recall',
      label: `NHTSA Recalls — ${oem.label}`,
      source: 'NHTSA',
      trustTier: 1,
      verifiedOfficial: true,
      confidence: 0.95,
    });
  }
  return links;
}

// ─── Verified vendor links ──────────────────────────────────────────

function buildVerifiedVendorLinks(partNumber, partName) {
  const term = partNumber || partName || '';
  if (!term) return [];
  const encoded = encodeURIComponent(term);
  const fullEncoded = encodeURIComponent([partNumber, partName].filter(Boolean).join(' '));

  return [
    {
      url: `https://www.fleetpride.com/parts/search?q=${encoded}`,
      linkType: 'oem_parts', label: 'FleetPride', source: 'FleetPride',
      trustTier: 2, verifiedOfficial: true, confidence: 0.8,
    },
    {
      url: `https://www.finditparts.com/search?q=${encoded}`,
      linkType: 'oem_parts', label: 'FinditParts', source: 'FinditParts',
      trustTier: 2, verifiedOfficial: true, confidence: 0.8,
    },
    {
      url: `https://www.rockauto.com/en/partsearch/?partnum=${encoded}`,
      linkType: 'oem_parts', label: 'RockAuto', source: 'RockAuto',
      trustTier: 3, verifiedOfficial: true, confidence: 0.7,
    },
    {
      url: `https://www.ebay.com/sch/i.html?_nkw=${fullEncoded}&_sacat=6028`,
      linkType: 'general', label: 'eBay (Truck Parts)', source: 'eBay',
      trustTier: 4, verifiedOfficial: false, confidence: 0.6,
    },
    {
      url: `https://www.google.com/search?tbm=shop&q=${fullEncoded}`,
      linkType: 'general', label: 'Google Shopping', source: 'Google',
      trustTier: 4, verifiedOfficial: false, confidence: 0.5,
    },
  ];
}

// ─── Link verification handler ──────────────────────────────────────

async function handleVerifyLinks(body, res) {
  const { urls = [] } = body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' });
  }

  const results = {};
  const checks = urls.slice(0, 10).map(async (url) => {
    try {
      // Validate URL structure before making request
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        results[url] = { reachable: false, statusCode: null, redirectUrl: null };
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'TruckRepairAssistant/1.0 LinkVerifier' },
      });

      clearTimeout(timeout);
      results[url] = {
        reachable: resp.ok,
        statusCode: resp.status,
        redirectUrl: resp.redirected ? resp.url : null,
      };
    } catch {
      results[url] = { reachable: false, statusCode: null, redirectUrl: null };
    }
  });

  await Promise.all(checks);
  return res.status(200).json({ results });
}

// ─── Helpers ────────────────────────────────────────────────────────

function tryHostname(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function hashStr(str) {
  if (!str) return Math.random().toString(36).slice(2, 8);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
