const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const TIER_LIMITS = {
  free: { model: 'claude-haiku-4-5-20251001', turnsPerDay: 10 },
  paid: { model: 'claude-sonnet-4-6', turnsPerStory: 25 },
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const headers = { 'Content-Type': 'application/json' };

  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const { data: tierData } = await supabase.from('user_tiers').select('tier').eq('user_id', user.id).single();
  const tier = tierData?.tier || 'free';
  const limits = TIER_LIMITS[tier];

  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase.from('daily_usage').select('stories_started, total_turns').eq('user_id', user.id).eq('date', today).single();
  const storiesStarted = usage?.stories_started || 0;
  const totalTurns = usage?.total_turns || 0;

  if (tier === 'free' && totalTurns >= limits.turnsPerDay)
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'TURN_LIMIT_REACHED' }) };

  const { title, selectedChoice, history, storyMaxTurns } = JSON.parse(event.body);
  const currentTurn = Math.floor(history.length / 2) + 1;
  const maxTurns = storyMaxTurns || (tier === 'paid' ? limits.turnsPerStory : limits.turnsPerDay);
  const isFinalTurn = currentTurn >= maxTurns;
  const isNearEnd = currentTurn === maxTurns - 1;

  const turnNote = isFinalTurn
    ? `CRITICAL: This is the FINAL turn (${currentTurn}/${maxTurns}). You MUST end the story now with "ENDING: true" and "ACHIEVEMENT: [name]". Do NOT provide CHOICE options.`
    : isNearEnd
      ? `NOTE: Turn ${currentTurn} of ${maxTurns}. The story must conclude next turn — begin wrapping up naturally.`
      : `NOTE: Turn ${currentTurn} of ${maxTurns}.`;

  const continuePrompt = `Continue the adventure based on the player's choice: "${selectedChoice}"

Remember:
- Stay true to factual information about "${title}"
- Use real facts from the topic and related subjects
- Make the story engaging and immersive
- Wrap any Wikipedia article names in [[double brackets]] like [[Article Name]]
- If there's a relevant location or visual subject, provide an image search query

${turnNote}

${!isFinalTurn ? "Assess the new scene's vibe: neutral, mysterious, dangerous, peaceful, exciting, eerie\n\n" : ''}Format your response EXACTLY as follows:
${!isFinalTurn ? 'VIBE: [vibe word]\n' : ''}STORY: [continuation text with [[Article Names]] hyperlinked]
IMAGE_QUERY: [optional: location or subject for image]
${isFinalTurn
    ? 'ENDING: true\nACHIEVEMENT: [creative achievement name based on what the player accomplished]'
    : 'CHOICE_1: [first choice]\nCHOICE_2: [second choice]\nCHOICE_3: [third choice]'}`;

  await supabase.from('daily_usage').upsert(
    { user_id: user.id, date: today, stories_started: storiesStarted, total_turns: totalTurns + 1 },
    { onConflict: 'user_id,date' }
  );

  const messages = [...history, { role: 'user', content: continuePrompt }];

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: limits.model,
      max_tokens: tier === 'free' ? 800 : 1500,
      messages,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: response.content[0].text,
        currentTurn,
        maxTurns,
        turnsLeft: maxTurns - currentTurn,
        usage: { stories_started: storiesStarted, total_turns: totalTurns + 1 },
      }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to continue story' }) };
  }
};
