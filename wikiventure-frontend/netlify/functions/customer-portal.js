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

  const { data: tierData } = await supabase.from('user_tiers').select('stripe_customer_id').eq('user_id', user.id).single();
  if (!tierData?.stripe_customer_id)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No subscription found' }) };

  const siteUrl = process.env.URL || 'https://wikiventure.netlify.app';
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tierData.stripe_customer_id,
    return_url: siteUrl,
  });

  return { statusCode: 200, headers, body: JSON.stringify({ url: portalSession.url }) };
};
