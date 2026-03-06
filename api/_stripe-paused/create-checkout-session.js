import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing');

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate server config
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[checkout] STRIPE_SECRET_KEY missing');
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[checkout] Supabase env missing:', { url: !!supabaseUrl, key: !!supabaseServiceKey });
      return res.status(500).json({ error: 'Auth system not configured' });
    }

    // Verify JWT from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized — no token provided' });
    }

    const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
    if (authError || !user) {
      console.error('[checkout] Auth error:', authError?.message);
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const { priceId } = req.body;
    if (!priceId) {
      console.error('[checkout] Missing priceId in request body');
      return res.status(400).json({ error: 'Missing price ID. Please refresh the page and try again.' });
    }

    // Resolve plan name from priceId
    const PRICE_TO_PLAN = {
      [process.env.OWNER_PRICE_MONTHLY]: 'owner',
      [process.env.OWNER_PRICE_ANNUAL]: 'owner',
      [process.env.FLEET_PRICE_MONTHLY]: 'fleet',
      [process.env.FLEET_PRICE_ANNUAL]: 'fleet',
    };
    // Validate priceId against known prices to prevent arbitrary Stripe price injection
    const planName = PRICE_TO_PLAN[priceId];
    if (!planName) {
      return res.status(400).json({ error: 'Invalid price ID. Please refresh the page.' });
    }

    // Get or create Stripe customer
    let stripeCustomerId;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (sub?.stripe_customer_id) {
      stripeCustomerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Upsert subscription row — handles case where row doesn't exist yet
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          plan: 'free',
          status: 'active',
        }, { onConflict: 'user_id' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://truck-repair-assistant-v3.vercel.app'}/Pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://truck-repair-assistant-v3.vercel.app'}/Pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_name: planName,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_name: planName,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[checkout] Error:', error.type || error.code, error.message);
    // Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Payment configuration error. Please try again later.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
