import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('apiUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns relative paths when NEXT_PUBLIC_BASE_URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
    const { apiUrl } = await import('@/config/apiBase');
    expect(apiUrl('/api/ai-proxy')).toBe('/api/ai-proxy');
  });

  it('prefixes paths with NEXT_PUBLIC_BASE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://tra.tools/');
    const { apiUrl, getApiBaseUrl } = await import('@/config/apiBase');
    expect(getApiBaseUrl()).toBe('https://tra.tools');
    expect(apiUrl('/api/ai-proxy')).toBe('https://tra.tools/api/ai-proxy');
  });

  it('normalizes paths without a leading slash', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://tra.tools');
    const { apiUrl } = await import('@/config/apiBase');
    expect(apiUrl('api/geocode')).toBe('https://tra.tools/api/geocode');
  });
});
