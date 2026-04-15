import { describe, it, expect } from 'vitest';
import { PLANS, LIMITS } from '@/config/stripe';

describe('Stripe configuration', () => {
  it('has exactly two plans: free and premium', () => {
    expect(Object.keys(PLANS)).toEqual(['free', 'premium']);
  });

  it('free plan allows 10 AI requests per day', () => {
    expect(LIMITS.free.ai_requests_per_day).toBe(10);
  });

  it('premium plan has unlimited AI requests', () => {
    expect(LIMITS.premium.ai_requests_per_day).toBe(-1);
  });

  it('premium price is $1 promo', () => {
    expect(PLANS.premium.price).toBe(1);
  });

  it('premium original price is $14.99', () => {
    expect(PLANS.premium.originalPrice).toBe(14.99);
  });

  it('has backward-compatible LIMITS for legacy plans', () => {
    expect(LIMITS.pro).toBeDefined();
    expect(LIMITS.owner).toBeDefined();
    expect(LIMITS.fleet).toBeDefined();
    expect(LIMITS.lifetime).toBeDefined();
  });

  it('free plan allows max 3 trucks', () => {
    expect(LIMITS.free.max_trucks).toBe(3);
  });
});
