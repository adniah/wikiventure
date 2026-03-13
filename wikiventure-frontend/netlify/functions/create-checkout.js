const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const headers = { 'Content-Type': 'application/json' };

  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const { plan } = JSON.parse(event.body);
  const priceId = plan === 'monthly' ? process.env.STRIPE_MONTHLY_PRICE_ID : process.env.STRIPE_ANNUAL_PRICE_ID;
  if (!priceId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid plan' }) };

  const { data: tierData } = await supabase.from('user_tiers').select('stripe_customer_id').eq('user_id', user.id).single();
  let customerId = tierData?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('user_tiers').upsert(
      { user_id: user.id, tier: 'free', stripe_customer_id: customerId },
      { onConflict: 'user_id' }
    );
  }

  const siteUrl = process.env.URL || 'https://wikiventure.netlify.app';
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/?upgraded=true`,
    cancel_url: `${siteUrl}/`,
    currency: 'gbp',
  });

  return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
};
