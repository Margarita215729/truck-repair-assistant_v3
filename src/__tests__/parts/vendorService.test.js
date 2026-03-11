/**
 * Repair Parts — Unit Tests: vendorService.js
 *
 * Tests aggregation, tier grouping, filtering, and API interaction.
 * fetch() and supabase are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock supabase ───────────────────────────────────────────────────
vi.mock('@/api/supabaseClient', () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const {
  searchVendors,
  searchVendorsForPart,
  aggregateListings,
  groupByTier,
  filterBySourceType,
  hasListings,
  VENDOR_INFO,
  SOURCE_TIER_LABELS,
  vendorKeys,
} = await import('@/services/vendorService');

// ─── Helper data ─────────────────────────────────────────────────────

function listing(overrides = {}) {
  return {
    title: 'EGR Valve',
    price: 245.99,
    vendor: 'FleetPride',
    condition: 'New',
    availability: 'In Stock',
    partNumber: 'CUM-4352857',
    imageUrl: null,
    itemUrl: 'https://www.fleetpride.com/egr-valve',
    sourceTier: 2,
    sourceType: 'cse_ai',
    ...overrides,
  };
}

// ─── aggregateListings ───────────────────────────────────────────────

describe('vendorService — aggregateListings', () => {
  it('returns listings array from new response shape', () => {
    const input = { listings: [listing(), listing({ title: 'B' })] };
    const result = aggregateListings(input);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('EGR Valve');
  });

  it('returns empty array for empty listings', () => {
    expect(aggregateListings({ listings: [] })).toEqual([]);
  });

  it('handles legacy shape (named arrays)', () => {
    const input = {
      fleetpride: [listing({ vendor: 'FleetPride' })],
      ebay: [listing({ vendor: 'eBay', price: 150 })],
    };
    const result = aggregateListings(input);
    expect(result).toHaveLength(2);
    // Sorted by price
    expect(result[0].price).toBe(150);
  });

  it('handles null input gracefully', () => {
    expect(aggregateListings(null)).toEqual([]);
    expect(aggregateListings(undefined)).toEqual([]);
  });

  it('returns a new array (no mutation)', () => {
    const original = [listing()];
    const input = { listings: original };
    const result = aggregateListings(input);
    expect(result).not.toBe(original);
  });
});

// ─── groupByTier ─────────────────────────────────────────────────────

describe('vendorService — groupByTier', () => {
  it('groups listings into 4 tiers', () => {
    const input = [
      listing({ sourceTier: 1 }),
      listing({ sourceTier: 2 }),
      listing({ sourceTier: 2 }),
      listing({ sourceTier: 3 }),
      listing({ sourceTier: 4 }),
      listing({ sourceTier: 4 }),
      listing({ sourceTier: 4 }),
    ];
    const grouped = groupByTier(input);
    expect(grouped[1]).toHaveLength(1);
    expect(grouped[2]).toHaveLength(2);
    expect(grouped[3]).toHaveLength(1);
    expect(grouped[4]).toHaveLength(3);
  });

  it('defaults to tier 4 for missing sourceTier', () => {
    const grouped = groupByTier([listing({ sourceTier: undefined })]);
    expect(grouped[4]).toHaveLength(1);
  });

  it('returns empty groups for no listings', () => {
    const grouped = groupByTier([]);
    expect(grouped).toEqual({ 1: [], 2: [], 3: [], 4: [] });
  });
});

// ─── filterBySourceType ──────────────────────────────────────────────

describe('vendorService — filterBySourceType', () => {
  const items = [
    listing({ sourceType: 'cse_ai' }),
    listing({ sourceType: 'cse_fallback' }),
    listing({ sourceType: 'cse_ai' }),
  ];

  it('returns all when sourceType is "all"', () => {
    expect(filterBySourceType(items, 'all')).toEqual(items);
  });

  it('returns all when sourceType is falsy', () => {
    expect(filterBySourceType(items, '')).toEqual(items);
    expect(filterBySourceType(items, null)).toEqual(items);
  });

  it('filters by specific sourceType', () => {
    const result = filterBySourceType(items, 'cse_fallback');
    expect(result).toHaveLength(1);
    expect(result[0].sourceType).toBe('cse_fallback');
  });

  it('returns empty for unknown sourceType', () => {
    expect(filterBySourceType(items, 'unknown')).toEqual([]);
  });
});

// ─── hasListings ─────────────────────────────────────────────────────

describe('vendorService — hasListings', () => {
  it('true when listings present', () => {
    expect(hasListings({ listings: [listing()] })).toBe(true);
  });

  it('false when empty', () => {
    expect(hasListings({ listings: [] })).toBe(false);
  });

  it('false when null', () => {
    expect(hasListings(null)).toBe(false);
    expect(hasListings(undefined)).toBe(false);
  });
});

// ─── SOURCE_TIER_LABELS ─────────────────────────────────────────────

describe('vendorService — SOURCE_TIER_LABELS', () => {
  it('has labels for all 4 tiers', () => {
    expect(Object.keys(SOURCE_TIER_LABELS)).toHaveLength(4);
    expect(SOURCE_TIER_LABELS[1]).toContain('OEM');
    expect(SOURCE_TIER_LABELS[2]).toContain('Dealer');
    expect(SOURCE_TIER_LABELS[3]).toContain('Aftermarket');
    expect(SOURCE_TIER_LABELS[4]).toContain('Marketplace');
  });
});

// ─── vendorKeys (query key factories) ────────────────────────────────

describe('vendorService — vendorKeys', () => {
  it('generates search key', () => {
    const key = vendorKeys.search('turbo', { make: 'Freightliner' });
    expect(key).toEqual(['vendor-search', 'turbo', { make: 'Freightliner' }]);
  });

  it('generates part key', () => {
    expect(vendorKeys.part('part-123')).toEqual(['vendor-part', 'part-123']);
  });
});

// ─── VENDOR_INFO ─────────────────────────────────────────────────────

describe('vendorService — VENDOR_INFO', () => {
  it('has entries for all 4 vendors', () => {
    expect(Object.keys(VENDOR_INFO)).toEqual(
      expect.arrayContaining(['fleetpride', 'finditparts', 'rockauto', 'ebay'])
    );
  });

  it('each entry has name and icon', () => {
    for (const v of Object.values(VENDOR_INFO)) {
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('icon');
      expect(typeof v.name).toBe('string');
      expect(typeof v.icon).toBe('string');
    }
  });
});

// ─── searchVendors (fetch mock) ──────────────────────────────────────

describe('vendorService — searchVendors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends POST with auth token and body', async () => {
    const mockResponse = {
      listings: [listing()],
      meta: { query: 'turbo', totalResults: 1 },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await searchVendors('turbo', { make: 'Freightliner' });

    expect(fetch).toHaveBeenCalledWith('/api/parts/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: expect.any(String),
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.query).toBe('turbo');
    expect(body.make).toBe('Freightliner');
    expect(result.listings).toHaveLength(1);
  });

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'CSE not configured' }),
    });

    await expect(searchVendors('turbo')).rejects.toThrow('CSE not configured');
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(searchVendors('turbo')).rejects.toThrow('Network error');
  });

  it('includes HTTP status in error when no body message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(searchVendors('turbo')).rejects.toThrow('HTTP 503');
  });
});

// ─── searchVendorsForPart ────────────────────────────────────────────

describe('vendorService — searchVendorsForPart', () => {
  it('builds query from part metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ listings: [], meta: {} }),
    });

    await searchVendorsForPart({
      name: 'EGR Valve',
      oem_part_number: 'CUM-123',
      truck_context: { make: 'Freightliner', model: 'Cascadia', year: 2019 },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.query).toBe('EGR Valve');
    expect(body.partNumber).toBe('CUM-123');
    expect(body.make).toBe('Freightliner');
    expect(body.model).toBe('Cascadia');
    expect(body.year).toBe(2019);
  });
});
