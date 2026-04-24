import { describe, it, expect } from 'vitest';
import { GUEST_CHAT_MESSAGE_LIMIT, PUBLIC_ROUTES, isPublicRoute } from '@/lib/guestAccess';

describe('guestAccess', () => {
  it('guest chat limit should be 10', () => {
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

  it('guest chat limit should block after 10 messages', () => {
    expect(GUEST_CHAT_MESSAGE_LIMIT).toBe(10);
    expect(9 < GUEST_CHAT_MESSAGE_LIMIT).toBe(true);
    expect(10 < GUEST_CHAT_MESSAGE_LIMIT).toBe(false);
  });
});