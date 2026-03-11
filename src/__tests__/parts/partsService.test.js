/**
 * Repair Parts — Unit Tests: partsService.js
 *
 * Tests category inference, save logic, filter logic, stats aggregation.
 * All Supabase calls are mocked via entityService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock entityService ──────────────────────────────────────────────
const mockPartEntity = {
  filter: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
};

vi.mock('@/services/entityService', () => ({
  entities: { Part: mockPartEntity },
}));

vi.mock('@/api/supabaseClient', () => ({
  hasSupabaseConfig: true,
  supabase: null,   // null so getRecommendedStats falls through to entities.Part.list
}));

// Import AFTER mocks
const {
  saveAIPartRecommendations,
  getMyRecommendedParts,
  deleteRecommendation,
  getRecommendedStats,
} = await import('@/services/partsService');

// ─── Helpers ─────────────────────────────────────────────────────────

function makePart(overrides = {}) {
  return {
    name: 'EGR Valve',
    oem_part_number: 'CUM-4352857',
    description: 'Exhaust gas recirculation valve',
    why_needed: 'Code P2425 detected',
    importance: 'required',
    installation_difficulty: 'moderate',
    urgency: 'high',
    driveability: 'reduced_performance',
    action_type: 'replace',
    ...overrides,
  };
}

// ─── inferCategory (tested indirectly via save) ──────────────────────

describe('partsService — inferCategory (via save)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPartEntity.filter.mockResolvedValue([]);
    mockPartEntity.create.mockImplementation(async (rec) => ({ id: 'new-1', ...rec }));
  });

  const cases = [
    ['EGR Valve', 'exhaust gas recirculation', 'exhaust'],
    ['Turbocharger', 'turbo assembly', 'engine'],
    ['Brake Pad Set', 'front brake pads', 'brakes'],
    ['Alternator', 'battery charging', 'electrical'],
    ['Water Pump', 'cooling system pump', 'cooling'],
    ['Leaf Spring', 'rear suspension spring', 'suspension'],
    ['DPF Filter', 'diesel particulate', 'exhaust'],
    ['Fuel Injector', 'common rail fuel injector', 'fuel_system'],
    ['NOx Sensor', 'nitrogen oxide sensor downstream', 'sensors'],
    ['Clutch Kit', 'transmission clutch assembly', 'transmission'],
    ['Axle Seal', 'rear differential axle', 'drivetrain'],
    ['Oil Filter', 'engine oil filter', 'filters'],
    ['Headlight Assembly', 'left headlight', 'body'],
    ['Widget XYZ', 'some unknown part', 'other'],
  ];

  it.each(cases)('infers "%s" (%s) → category "%s"', async (name, desc, expectedCategory) => {
    await saveAIPartRecommendations([{ name, description: desc }]);
    expect(mockPartEntity.create).toHaveBeenCalledTimes(1);
    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.category).toBe(expectedCategory);
  });
});

// ─── saveAIPartRecommendations ───────────────────────────────────────

describe('partsService — saveAIPartRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPartEntity.filter.mockResolvedValue([]);
    mockPartEntity.create.mockImplementation(async (rec) => ({ id: 'saved-1', ...rec }));
  });

  it('returns empty array when given no parts', async () => {
    expect(await saveAIPartRecommendations([])).toEqual([]);
    expect(await saveAIPartRecommendations(null)).toEqual([]);
  });

  it('skips parts with empty names', async () => {
    const parts = [{ name: '' }, { name: '   ' }, makePart()];
    const result = await saveAIPartRecommendations(parts);
    expect(result).toHaveLength(1);
    expect(mockPartEntity.create).toHaveBeenCalledTimes(1);
  });

  it('upper-cases part numbers', async () => {
    await saveAIPartRecommendations([makePart({ oem_part_number: 'abc-123' })]);
    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.part_number).toBe('ABC-123');
    expect(created.oem_part_number).toBe('ABC-123');
  });

  it('deduplicates by part_number — merges error codes', async () => {
    const existing = { id: 'existing-1', part_number: 'CUM-4352857', related_error_codes: ['P2425'] };
    mockPartEntity.filter.mockResolvedValue([existing]);

    const result = await saveAIPartRecommendations(
      [makePart()],
      {},
      ['P2425', 'P0401'],
    );

    expect(mockPartEntity.create).not.toHaveBeenCalled();
    expect(mockPartEntity.update).toHaveBeenCalledWith('existing-1', {
      related_error_codes: ['P2425', 'P0401'],
    });
    expect(result).toEqual([existing]);
  });

  it('does NOT merge when all error codes already present', async () => {
    const existing = { id: 'e1', part_number: 'CUM-4352857', related_error_codes: ['P2425', 'P0401'] };
    mockPartEntity.filter.mockResolvedValue([existing]);

    await saveAIPartRecommendations([makePart()], {}, ['P2425', 'P0401']);
    expect(mockPartEntity.update).not.toHaveBeenCalled();
  });

  it('generates fallback part_number when none provided', async () => {
    const part = makePart({ oem_part_number: '', part_number: '' });
    await saveAIPartRecommendations([part]);
    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.part_number).toMatch(/^AI-\d+-\d+$/);
  });

  it('stores truck context and error codes', async () => {
    const truck = { make: 'Freightliner', model: 'Cascadia', year: 2019 };
    await saveAIPartRecommendations([makePart()], truck, ['P2425']);

    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.truck_context).toEqual(truck);
    expect(created.compatible_makes).toEqual(['Freightliner']);
    expect(created.related_error_codes).toEqual(['P2425']);
    expect(created.source).toBe('ai_diagnostic');
  });

  it('stores all decision fields', async () => {
    const part = makePart({
      root_cause_confidence: 0.85,
      roadside_possible: true,
      shop_required: false,
      programming_required: true,
      inspection_steps: ['Check wiring', 'Measure resistance'],
      pair_with_parts: ['EGR Cooler'],
      bundle_label: 'EGR Kit',
      fitment_status: 'confirmed',
    });

    await saveAIPartRecommendations([part]);
    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.root_cause_confidence).toBe(0.85);
    expect(created.roadside_possible).toBe(true);
    expect(created.shop_required).toBe(false);
    expect(created.programming_required).toBe(true);
    expect(created.inspection_steps).toEqual(['Check wiring', 'Measure resistance']);
    expect(created.pair_with_parts).toEqual(['EGR Cooler']);
    expect(created.bundle_label).toBe('EGR Kit');
    expect(created.fitment_status).toBe('confirmed');
  });

  it('continues saving other parts when one fails', async () => {
    mockPartEntity.create
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ id: 'ok-1', name: 'Brake Pad' });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await saveAIPartRecommendations([
      makePart({ name: 'Failing Part' }),
      makePart({ name: 'Brake Pad', oem_part_number: 'BP-001' }),
    ]);
    warn.mockRestore();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Brake Pad');
  });

  it('limits error codes to 10', async () => {
    const codes = Array.from({ length: 15 }, (_, i) => `P${String(i).padStart(4, '0')}`);
    await saveAIPartRecommendations([makePart()], {}, codes);
    const created = mockPartEntity.create.mock.calls[0][0];
    expect(created.related_error_codes).toHaveLength(10);
  });
});

// ─── getMyRecommendedParts ───────────────────────────────────────────

describe('partsService — getMyRecommendedParts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns list when no filters', async () => {
    const parts = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
    mockPartEntity.list.mockResolvedValue(parts);

    const result = await getMyRecommendedParts();
    expect(mockPartEntity.list).toHaveBeenCalledWith('-created_at', 100);
    expect(result).toEqual(parts);
  });

  it('uses filter() when server-side filters provided', async () => {
    mockPartEntity.filter.mockResolvedValue([{ id: '1' }]);

    await getMyRecommendedParts({ category: 'engine', importance: 'all' });
    expect(mockPartEntity.filter).toHaveBeenCalledWith({ category: 'engine' });
    expect(mockPartEntity.list).not.toHaveBeenCalled();
  });

  it('applies client-side difficulty filter', async () => {
    mockPartEntity.list.mockResolvedValue([
      { id: '1', installation_difficulty: 'easy' },
      { id: '2', installation_difficulty: 'professional' },
    ]);

    const result = await getMyRecommendedParts({ difficulty: 'easy' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('ignores "all" filter values', async () => {
    mockPartEntity.list.mockResolvedValue([]);
    await getMyRecommendedParts({ category: 'all', urgency: 'all', importance: 'all' });
    expect(mockPartEntity.list).toHaveBeenCalled();
    expect(mockPartEntity.filter).not.toHaveBeenCalled();
  });

  it('returns empty array on error', async () => {
    mockPartEntity.list.mockRejectedValue(new Error('DB down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await getMyRecommendedParts();
    warn.mockRestore();
    expect(result).toEqual([]);
  });
});

// ─── deleteRecommendation ────────────────────────────────────────────

describe('partsService — deleteRecommendation', () => {
  it('delegates to entities.Part.delete', async () => {
    mockPartEntity.delete.mockResolvedValue(true);
    await deleteRecommendation('abc-123');
    expect(mockPartEntity.delete).toHaveBeenCalledWith('abc-123');
  });
});

// ─── getRecommendedStats ─────────────────────────────────────────────

describe('partsService — getRecommendedStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zero stats when count is 0', async () => {
    mockPartEntity.count.mockResolvedValue(0);
    const stats = await getRecommendedStats();
    expect(stats).toEqual({ total: 0, categories: {} });
  });

  it('aggregates categories correctly', async () => {
    mockPartEntity.count.mockResolvedValue(3);
    mockPartEntity.list.mockResolvedValue([
      { category: 'engine' },
      { category: 'engine' },
      { category: 'brakes' },
    ]);

    const stats = await getRecommendedStats();
    expect(stats.total).toBe(3);
    expect(stats.categories).toEqual({ engine: 2, brakes: 1 });
  });

  it('returns default on error', async () => {
    mockPartEntity.count.mockRejectedValue(new Error('fail'));
    const stats = await getRecommendedStats();
    expect(stats).toEqual({ total: 0, categories: {} });
  });
});
