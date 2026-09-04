import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('api/ingest-infrastructure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.INGEST_ENABLED;
    process.env.INGEST_API_KEY = 'rotated-test-key';
  });

  afterEach(() => {
    delete process.env.INGEST_ENABLED;
    delete process.env.INGEST_API_KEY;
  });

  it('fails closed before auth or database access unless explicitly enabled', async () => {
    const { default: handler } = await import('../../api/ingest-infrastructure.js');
    const res = makeResponse();

    await handler({
      method: 'POST',
      headers: { 'x-ingest-key': 'rotated-test-key' },
      body: { type: 'truck_parking', records: [{ source_id: 'test' }] },
    }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Infrastructure ingestion is disabled' });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('still requires the ingest key when explicitly enabled', async () => {
    process.env.INGEST_ENABLED = 'true';
    const { default: handler } = await import('../../api/ingest-infrastructure.js');
    const res = makeResponse();

    await handler({
      method: 'POST',
      headers: {},
      body: { type: 'truck_parking', records: [{ source_id: 'test' }] },
    }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
