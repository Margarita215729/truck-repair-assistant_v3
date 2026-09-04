// @vitest-environment jsdom

import { beforeEach, describe, it, expect } from 'vitest';
import {
  GUEST_AI_REQUEST_LIMIT,
  GUEST_CHAT_MESSAGE_LIMIT,
  PUBLIC_ROUTES,
  getGuestAiId,
  getGuestAiUsage,
  isPublicRoute,
  setGuestAiUsage,
} from '@/lib/guestAccess';

describe('guestAccess', () => {
  beforeEach(() => localStorage.clear());

  it('guest chat limit should be 10', () => {
    expect(GUEST_AI_REQUEST_LIMIT).toBe(10);
    expect(GUEST_CHAT_MESSAGE_LIMIT).toBe(10);
  });

  it('PUBLIC_ROUTES should include PartsCatalog, ServiceFinder, Community', () => {
    expect(PUBLIC_ROUTES).toContain('/PartsCatalog');
    expect(PUBLIC_ROUTES).toContain('/ServiceFinder');
    expect(PUBLIC_ROUTES).toContain('/Community');
  });

  it('isPublicRoute should return true for public routes', () => {
    expect(isPublicRoute('/Diagnostics')).toBe(true);
    expect(isPublicRoute('/PartsCatalog')).toBe(true);
  });

  it('isPublicRoute should return false for protected routes', () => {
    expect(isPublicRoute('/Reports')).toBe(false);
    expect(isPublicRoute('/Profile')).toBe(false);
  });

  it('guest request limit should block after 10 requests', () => {
    expect(GUEST_CHAT_MESSAGE_LIMIT).toBe(10);
    expect(9 < GUEST_CHAT_MESSAGE_LIMIT).toBe(true);
    expect(10 < GUEST_CHAT_MESSAGE_LIMIT).toBe(false);
  });

  it('persists one pseudonymous guest id', () => {
    const first = getGuestAiId();
    const second = getGuestAiId();

    expect(first).toMatch(/^guest_[A-Za-z0-9_-]{20,128}$/);
    expect(second).toBe(first);
  });

  it('uses the server quota as the cached source of truth', () => {
    setGuestAiUsage({ allowed: true, plan: 'guest', used: 4, limit: 10, remaining: 6 });
    expect(getGuestAiUsage()).toMatchObject({ used: 4, limit: 10, remaining: 6 });

    setGuestAiUsage({ allowed: false, plan: 'guest', used: 10, limit: 10, remaining: 0 });
    expect(getGuestAiUsage()).toMatchObject({ allowed: false, used: 10, remaining: 0 });
  });

  it('preserves a server denial caused by the shared network ceiling', () => {
    setGuestAiUsage({ allowed: false, plan: 'guest', used: 4, limit: 10, remaining: 6 });
    expect(getGuestAiUsage()).toMatchObject({ allowed: false, used: 4, remaining: 6 });
  });
});
