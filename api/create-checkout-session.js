import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'Missing priceId' });
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

      // Save customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL}/Pricing?success=true`,
      cancel_url: `${req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL}/Pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
