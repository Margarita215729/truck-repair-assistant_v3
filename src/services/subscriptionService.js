/**
 * Subscription Service
 * Manages user subscriptions, Stripe checkout, promo codes
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

// ─── Stripe payments paused ────────────────────────────────────────────
// Stripe serverless functions moved to api/_stripe-paused/ to stay within
// Vercel free tier limit (12 functions). To re-enable:
//   1. Move files from api/_stripe-paused/ back to api/
//   2. Restore "api/stripe-webhook.js" entry in vercel.json functions
//   3. Set STRIPE_PAUSED = false below
// ────────────────────────────────────────────────────────────────────────
const STRIPE_PAUSED = false;

export const subscriptionService = {
  /**
   * Get current user's subscription
   */
  async getCurrentSubscription() {
    if (!hasSupabaseConfig || !supabase) return { plan: 'free', status: 'active' };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { plan: 'free', status: 'active' };

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return { plan: 'free', status: 'active', user_id: user.id, _source: 'no_record' };
      return { ...data, _source: 'confirmed' };
    } catch (err) {
      console.error('getCurrentSubscription failed:', err);
      throw err;
    }
  },

  /**
   * Check AI usage limits
   */
  async checkAiLimit() {
    if (!hasSupabaseConfig || !supabase) {
      return { allowed: true, plan: 'free', used: 0, limit: 10, remaining: 10 };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { allowed: false, plan: 'free', used: 0, limit: 0, remaining: 0 };

      const { data, error } = await supabase.rpc('check_ai_limit', { p_user_id: user.id });
      if (error) {
        console.error('Failed to check AI limit:', error);
        throw new Error(error.message || 'Failed to check AI limit');
      }

      return { ...data, _source: 'confirmed' };
    } catch (err) {
      console.error('checkAiLimit failed:', err);
      throw err;
    }
  },

  /**
   * Increment AI usage counter
   */
  async incrementAiUsage() {
    if (!hasSupabaseConfig || !supabase) return 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('increment_ai_usage', { p_user_id: user.id });
    if (error) {
      console.error('Failed to increment AI usage:', error);
      return 0;
    }

    return data;
  },

  /**
   * Create Stripe Checkout session via Vercel API route
   */
  async createCheckoutSession(priceId) {
    if (STRIPE_PAUSED) {
      throw new Error('Payments are temporarily unavailable. The feature will be enabled soon.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated. Please log in and try again.');

    if (!priceId) throw new Error('Price not configured. Please refresh the page.');

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ priceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Checkout API error:', response.status, err);
      throw new Error(err.error || `Checkout failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error('No checkout URL returned from server');
    }
    return data.url;
  },

  /**
   * Open Stripe Billing Portal for subscription management
   */
  async openBillingPortal() {
    if (STRIPE_PAUSED) {
      throw new Error('Subscription management is temporarily unavailable. The feature will be enabled soon.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to open billing portal');
    }

    const data = await response.json();
    return data.url;
  },

  /**
   * Redeem a promo code
   */
  async redeemPromoCode(code) {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('Service not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('redeem_promo_code', {
      p_user_id: user.id,
      p_code: code,
    });

    if (error) {
      console.error('Promo code redemption failed:', error);
      throw new Error(error.message || 'Failed to redeem promo code');
    }

    return data;
  },

  /**
   * Get user's truck count (for limit checks)
   */
  async getTruckCount() {
    if (!hasSupabaseConfig || !supabase) return 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_user_truck_count', { p_user_id: user.id });
    if (error) return 0;

    return data || 0;
  },
};

export default subscriptionService;
