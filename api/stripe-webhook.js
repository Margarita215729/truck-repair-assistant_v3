import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN = {
  [process.env.OWNER_PRICE_MONTHLY]: 'owner',
  [process.env.OWNER_PRICE_ANNUAL]: 'owner',
  [process.env.FLEET_PRICE_MONTHLY]: 'fleet',
  [process.env.FLEET_PRICE_ANNUAL]: 'fleet',
};

function resolvePlan(priceId, metadataPlan) {
  if (metadataPlan && ['owner', 'fleet'].includes(metadataPlan)) return metadataPlan;
  if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId];
  return 'owner'; // safe fallback for paid plans
}

// Disable body parsing — Stripe needs raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription;

        if (userId && subscriptionId) {
          // Fetch subscription details from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
          const plan = resolvePlan(priceId, session.metadata?.plan_name);

          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer,
              plan,
              status: 'active',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: false,
            })
            .eq('user_id', userId);
          if (dbError) console.error('DB update failed (checkout.session.completed):', dbError);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'past_due' ? 'past_due'
            : subscription.status === 'canceled' ? 'canceled'
            : subscription.status === 'trialing' ? 'trialing'
            : 'incomplete';

          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = resolvePlan(priceId, subscription.metadata?.plan_name);

          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({
              plan,
              status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('user_id', userId);
          if (dbError) console.error('DB update failed (subscription.updated):', dbError);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const { error: dbError } = await supabase
            .from('subscriptions')
            .update({
              plan: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
              cancel_at_period_end: false,
            })
            .eq('user_id', userId);
          if (dbError) console.error('DB update failed (subscription.deleted):', dbError);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = stripeSubscription.metadata?.supabase_user_id;

          if (userId) {
            const { error: dbError } = await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('user_id', userId);
            if (dbError) console.error('DB update failed (invoice.payment_failed):', dbError);
          }
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
