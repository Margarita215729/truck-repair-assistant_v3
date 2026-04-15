import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env module before importing stripe config
vi.mock('@/config/env', () => ({
  env: {
    PREMIUM_PRICE_MONTHLY: 'price_test_premium',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_xxx',
  },
}));

describe('stripe config', () => {
  let PLANS, LIMITS;

  beforeEach(async () => {
    const mod = await import('@/config/stripe');
    PLANS = mod.PLANS;
    LIMITS = mod.LIMITS;
  });

  it('should have exactly two plans: free and premium', () => {
    const planIds = Object.keys(PLANS);
    expect(planIds).toContain('free');
    expect(planIds).toContain('premium');
    expect(planIds).not.toContain('owner');
    expect(planIds).not.toContain('fleet');
  });

  it('free plan should allow 10 AI requests per day', () => {
    expect(LIMITS.free.ai_requests_per_day).toBe(10);
  });

  it('premium plan price should be $1', () => {
    expect(PLANS.premium.price).toBe(1);
  });

  it('premium plan should have unlimited AI requests', () => {
    expect(LIMITS.premium.ai_requests_per_day).toBe(-1);
  });

  it('free plan should allow 3 trucks', () => {
    expect(LIMITS.free.max_trucks).toBe(3);
  });

  it('premium plan should have stripe price ID from env', () => {
    expect(PLANS.premium.stripePriceMonthly).toBe('price_test_premium');
  });

  it('backward compat: LIMITS should include pro/owner/fleet/lifetime', () => {
    expect(LIMITS.pro).toBeDefined();
    expect(LIMITS.owner).toBeDefined();
    expect(LIMITS.fleet).toBeDefined();
    expect(LIMITS.lifetime).toBeDefined();
    // All should be unlimited
    expect(LIMITS.pro.ai_requests_per_day).toBe(-1);
  });
});
