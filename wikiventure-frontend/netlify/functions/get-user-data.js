const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
  const headers = { 'Content-Type': 'application/json' };

  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const today = new Date().toISOString().split('T')[0];
  const [tierResult, usageResult] = await Promise.all([
    supabase.from('user_tiers').select('tier, subscription_status').eq('user_id', user.id).single(),
    supabase.from('daily_usage').select('stories_started, total_turns').eq('user_id', user.id).eq('date', today).single(),
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      tier: tierResult.data?.tier || 'free',
      subscriptionStatus: tierResult.data?.subscription_status || 'none',
      usage: usageResult.data || { stories_started: 0, total_turns: 0 },
    }),
  };
};
