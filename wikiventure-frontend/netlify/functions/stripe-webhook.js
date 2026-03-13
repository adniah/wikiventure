const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        const isActive = ['active', 'trialing'].includes(sub.status);
        await supabase.from('user_tiers').upsert(
          {
            user_id: userId,
            tier: isActive ? 'paid' : 'free',
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
          },
          { onConflict: 'user_id' }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        await supabase.from('user_tiers').upsert(
          {
            user_id: userId,
            tier: 'free',
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
            subscription_status: 'canceled',
          },
          { onConflict: 'user_id' }
        );
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
