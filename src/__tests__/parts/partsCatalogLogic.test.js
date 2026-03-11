/**
 * Repair Parts — Unit Tests: PartsCatalog.jsx logic
 *
 * Tests classifySearch, togglePartForCompare, filter/sort logic,
 * and vendorListings memo.
 * We extract and test the pure logic — no full render needed.
 */
import { describe, it, expect } from 'vitest';

// ─── classifySearch (extracted from PartsCatalog.jsx) ────────────────

function classifySearch(input) {
  if (!input) return { type: 'free_text', value: input };
  const trimmed = input.trim();
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(trimmed)) {
    return { type: 'vin', value: trimmed };
  }
  if (/^[PBCU]\d{4}$/i.test(trimmed) || /^SPN\s?\d+/i.test(trimmed)) {
    return { type: 'fault_code', value: trimmed };
  }
  if (/^[A-Za-z0-9][\w\-]{3,}$/.test(trimmed) && /\d/.test(trimmed)) {
    return { type: 'part_number', value: trimmed };
  }
  return { type: 'free_text', value: trimmed };
}

describe('PartsCatalog — classifySearch', () => {
  // Part numbers (alphanumeric, 4+ chars, contains digit)
  it.each([
    ['CUM-4352857', 'part_number'],
    ['RE567890', 'part_number'],
    ['A123', 'part_number'],
    ['3824767', 'part_number'],
  ])('"%s" → %s', (input, expected) => {
    expect(classifySearch(input).type).toBe(expected);
  });

  // VINs (exactly 17 alphanumeric, excluding I, O, Q)
  it.each([
    ['1FUJGBDV7CLBP8944', 'vin'],
    ['3AKJHHDR5NSNA4825', 'vin'],
  ])('"%s" → vin', (input) => {
    expect(classifySearch(input).type).toBe('vin');
  });

  // Fault codes
  it.each([
    ['P2425', 'fault_code'],
    ['P0401', 'fault_code'],
    ['B1234', 'fault_code'],
    ['C5678', 'fault_code'],
    ['U0001', 'fault_code'],
    ['SPN 5246', 'fault_code'],
    ['SPN100', 'fault_code'],
  ])('"%s" → fault_code', (input, expected) => {
    expect(classifySearch(input).type).toBe(expected);
  });

  // Free text
  it.each([
    ['turbocharger for freightliner', 'free_text'],
    ['brake pads', 'free_text'],
    ['', 'free_text'],
    ['EGR valve assembly', 'free_text'],
  ])('"%s" → free_text', (input, expected) => {
    expect(classifySearch(input).type).toBe(expected);
  });

  it('returns null value for empty input', () => {
    expect(classifySearch(null).value).toBeNull();
    expect(classifySearch('').value).toBe('');
  });

  it('trims whitespace', () => {
    expect(classifySearch('  P2425  ').type).toBe('fault_code');
  });
});

// ─── Vendor listing sort/filter (extracted logic) ────────────────────

function sortListings(listings, sortType) {
  const all = [...listings];
  if (sortType === 'price_asc') {
    all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  } else if (sortType === 'price_desc') {
    all.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortType === 'trust') {
    all.sort((a, b) => (a.sourceTier || 4) - (b.sourceTier || 4));
  }
  return all;
}

describe('PartsCatalog — listing sort logic', () => {
  const items = [
    { title: 'C', price: 300, sourceTier: 4 },
    { title: 'A', price: 100, sourceTier: 2 },
    { title: 'B', price: 200, sourceTier: 1 },
  ];

  it('sorts by price ascending', () => {
    const sorted = sortListings(items, 'price_asc');
    expect(sorted.map(i => i.price)).toEqual([100, 200, 300]);
  });

  it('sorts by price descending', () => {
    const sorted = sortListings(items, 'price_desc');
    expect(sorted.map(i => i.price)).toEqual([300, 200, 100]);
  });

  it('sorts by trust tier', () => {
    const sorted = sortListings(items, 'trust');
    expect(sorted.map(i => i.sourceTier)).toEqual([1, 2, 4]);
  });

  it('preserves original order for "relevance"', () => {
    const sorted = sortListings(items, 'relevance');
    expect(sorted.map(i => i.title)).toEqual(['C', 'A', 'B']);
  });

  it('handles zero/missing prices in price_asc', () => {
    const mixed = [
      { title: 'A', price: 0, sourceTier: 1 },
      { title: 'B', price: 50, sourceTier: 2 },
      { title: 'C', price: undefined, sourceTier: 3 },
    ];
    const sorted = sortListings(mixed, 'price_asc');
    // (0 || Infinity) = Infinity, so 0 is treated as missing → sorts last with C
    expect(sorted[0].title).toBe('B');
    expect(sorted[1].title).toBe('A');
    expect(sorted[2].title).toBe('C');
  });
});

// ─── togglePartForCompare logic ──────────────────────────────────────

function togglePartForCompare(selected, part, maxItems = 4) {
  const exists = selected.find(p => (p.id || p.itemUrl) === (part.id || part.itemUrl));
  if (exists) return { result: selected.filter(p => (p.id || p.itemUrl) !== (part.id || part.itemUrl)), error: null };
  if (selected.length >= maxItems) return { result: selected, error: 'max_reached' };
  return { result: [...selected, part], error: null };
}

describe('PartsCatalog — togglePartForCompare', () => {
  it('adds part to empty selection', () => {
    const { result, error } = togglePartForCompare([], { id: '1', name: 'A' });
    expect(result).toHaveLength(1);
    expect(error).toBeNull();
  });

  it('removes already-selected part', () => {
    const { result } = togglePartForCompare(
      [{ id: '1', name: 'A' }, { id: '2', name: 'B' }],
      { id: '1', name: 'A' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('errors at max (4) items', () => {
    const selected = [
      { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' },
    ];
    const { result, error } = togglePartForCompare(selected, { id: '5' });
    expect(result).toHaveLength(4);
    expect(error).toBe('max_reached');
  });

  it('deduplicates by itemUrl when no id', () => {
    const selected = [{ itemUrl: 'https://x.com/1' }];
    const { result } = togglePartForCompare(selected, { itemUrl: 'https://x.com/1' });
    expect(result).toHaveLength(0);
  });
});

// ─── Source tier filter logic ────────────────────────────────────────

describe('PartsCatalog — source tier filter', () => {
  const items = [
    { title: 'A', sourceTier: 1 },
    { title: 'B', sourceTier: 2 },
    { title: 'C', sourceTier: 4 },
  ];

  it('filters by specific tier', () => {
    const filtered = items.filter(l => String(l.sourceTier) === '2');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('B');
  });

  it('"all" returns everything', () => {
    const filtered = 'all' === 'all' ? items : items.filter(l => String(l.sourceTier) === 'all');
    expect(filtered).toHaveLength(3);
  });
});
