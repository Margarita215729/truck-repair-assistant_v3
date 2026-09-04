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
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

function makeRequest(headers = {}) {
  return {
    method: 'POST',
    headers,
    socket: { remoteAddress: '203.0.113.2' },
    body: {
      messages: [
        { role: 'system', content: 'Return json.' },
        { role: 'user', content: 'Test diagnostic request' },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 16000,
    },
  };
}

function makeSupabase({ guestQuota, userQuota } = {}) {
  const rpc = vi.fn(async (name) => {
    if (name === 'reserve_guest_ai_request') {
      return { data: guestQuota || { allowed: true, plan: 'guest', used: 1, limit: 10, remaining: 9 }, error: null };
    }
    if (name === 'reserve_user_ai_request') {
      return { data: userQuota || { allowed: true, plan: 'free', used: 1, limit: 10, remaining: 9 }, error: null };
    }
    return { data: null, error: null };
  });

  const subscriptionQuery = {
    select: vi.fn(() => subscriptionQuery),
    eq: vi.fn(() => subscriptionQuery),
    maybeSingle: vi.fn(async () => ({ data: { plan: 'free', status: 'active' }, error: null })),
  };

  return {
    rpc,
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } }, error: null })),
    },
    from: vi.fn(() => subscriptionQuery),
  };
}

describe('api/ai-proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.STORAGE_SUPABASE_SUPABASE_SECRET_KEY = 'sb_secret_test_value';
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    delete process.env.GEMINI_TEXT_MODEL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps requests with neither auth nor a valid guest id closed', async () => {
    const supabase = makeSupabase();
    mocks.createClient.mockReturnValue(supabase);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('../../api/ai-proxy.js');
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('GUEST_ID_REQUIRED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves a guest through Gemini and returns authoritative remaining usage', async () => {
    const supabase = makeSupabase();
    mocks.createClient.mockReturnValue(supabase);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"response":"ok"}' } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('../../api/ai-proxy.js');
    const res = makeResponse();

    await handler(makeRequest({
      'x-tra-guest-id': 'guest_1234567890abcdefghij',
      'x-vercel-forwarded-for': '203.0.113.9',
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.limit).toMatchObject({ used: 1, limit: 10, remaining: 9 });
    expect(supabase.rpc).toHaveBeenCalledWith('reserve_guest_ai_request', expect.objectContaining({
      p_guest_key: expect.stringMatching(/^[0-9a-f]{64}$/),
      p_network_key: expect.stringMatching(/^[0-9a-f]{64}$/),
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const providerRequest = fetchMock.mock.calls[0][1];
    expect(providerRequest.headers.Authorization).toBe('Bearer gemini-test-key');
    expect(JSON.parse(providerRequest.body)).toMatchObject({ model: 'gemini-2.5-flash' });
  });

  it('returns 429 without calling Gemini when the guest quota is exhausted', async () => {
    const supabase = makeSupabase({
      guestQuota: { allowed: false, plan: 'guest', used: 10, limit: 10, remaining: 0 },
    });
    mocks.createClient.mockReturnValue(supabase);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('../../api/ai-proxy.js');
    const res = makeResponse();

    await handler(makeRequest({ 'x-tra-guest-id': 'guest_1234567890abcdefghij' }), res);

    expect(res.statusCode).toBe(429);
    expect(res.body.limit.remaining).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refunds the guest reservation when Gemini fails', async () => {
    const supabase = makeSupabase();
    mocks.createClient.mockReturnValue(supabase);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'provider limit' } }),
    })));
    const { default: handler } = await import('../../api/ai-proxy.js');
    const res = makeResponse();

    await handler(makeRequest({ 'x-tra-guest-id': 'guest_1234567890abcdefghij' }), res);

    expect(res.statusCode).toBe(502);
    expect(supabase.rpc).toHaveBeenCalledWith('release_guest_ai_request', expect.any(Object));
  });

  it('keeps registered free users on the same atomic ten-request quota', async () => {
    const supabase = makeSupabase();
    mocks.createClient.mockReturnValue(supabase);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    })));
    const { default: handler } = await import('../../api/ai-proxy.js');
    const res = makeResponse();

    await handler(makeRequest({ authorization: 'Bearer valid-user-token' }), res);

    expect(res.statusCode).toBe(200);
    expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-user-token');
    expect(supabase.rpc).toHaveBeenCalledWith('reserve_user_ai_request', { p_user_id: 'user-123' });
    expect(res.body.limit.limit).toBe(10);
  });
});
