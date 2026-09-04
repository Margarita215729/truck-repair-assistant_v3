import { describe, expect, it, vi } from 'vitest';
import {
  createGuestQuotaKeys,
  getClientIp,
  isValidGuestId,
  releaseGuestRequest,
  reserveGuestRequest,
} from '../../api/lib/guestQuota.js';

describe('guest AI quota helpers', () => {
  it('accepts generated-style ids and rejects arbitrary values', () => {
    expect(isValidGuestId('guest_1234567890abcdefghij')).toBe(true);
    expect(isValidGuestId('short')).toBe(false);
    expect(isValidGuestId('guest_bad value with spaces')).toBe(false);
  });

  it('uses the first trusted forwarded address', () => {
    const req = { headers: { 'x-vercel-forwarded-for': '203.0.113.9, 10.0.0.1' } };
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  it('hashes the raw guest and network identifiers before persistence', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.9' } };
    const guestId = 'guest_1234567890abcdefghij';
    const keys = createGuestQuotaKeys(req, guestId, 'server-secret-for-test');

    expect(keys.guestKey).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.networkKey).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.guestKey).not.toContain(guestId);
    expect(keys.networkKey).not.toContain('203.0.113.9');
    expect(keys.guestKey).not.toBe(keys.networkKey);
  });

  it('calls the service-role reservation and release RPCs', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { allowed: true, used: 1, limit: 10, remaining: 9 }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const supabase = { rpc };
    const keys = { guestKey: 'a'.repeat(64), networkKey: 'b'.repeat(64) };

    await expect(reserveGuestRequest(supabase, keys)).resolves.toMatchObject({ allowed: true, remaining: 9 });
    await expect(releaseGuestRequest(supabase, keys)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenNthCalledWith(1, 'reserve_guest_ai_request', {
      p_guest_key: keys.guestKey,
      p_network_key: keys.networkKey,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'release_guest_ai_request', {
      p_guest_key: keys.guestKey,
      p_network_key: keys.networkKey,
    });
  });
});
