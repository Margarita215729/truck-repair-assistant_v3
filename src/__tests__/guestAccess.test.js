import { describe, it, expect } from 'vitest';
import { GUEST_CHAT_MESSAGE_LIMIT, PUBLIC_ROUTES, isPublicRoute } from '@/lib/guestAccess';

describe('Guest access configuration', () => {
  it('guest chat message limit is 10', () => {
    expect(GUEST_CHAT_MESSAGE_LIMIT).toBe(10);
  });

  it('PUBLIC_ROUTES includes expected routes', () => {
    expect(PUBLIC_ROUTES).toContain('/');
    expect(PUBLIC_ROUTES).toContain('/Diagnostics');
    expect(PUBLIC_ROUTES).toContain('/Pricing');
    expect(PUBLIC_ROUTES).toContain('/Policies');
    expect(PUBLIC_ROUTES).toContain('/auth/confirm');
    expect(PUBLIC_ROUTES).toContain('/PartsCatalog');
    expect(PUBLIC_ROUTES).toContain('/ServiceFinder');
    expect(PUBLIC_ROUTES).toContain('/Community');
  });

  it('isPublicRoute returns true for public routes', () => {
    expect(isPublicRoute('/Diagnostics')).toBe(true);
  });

  it('isPublicRoute returns false for protected routes', () => {
    expect(isPublicRoute('/Reports')).toBe(false);
  });

  it('isPublicRoute returns true for PartsCatalog', () => {
    expect(isPublicRoute('/PartsCatalog')).toBe(true);
  });
});
