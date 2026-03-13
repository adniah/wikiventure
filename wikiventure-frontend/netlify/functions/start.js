const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const TIER_LIMITS = {
  free: {
    model: 'claude-haiku-4-5-20251001',
    storiesPerDay: 3,
    turnsPerDay: 10,
    subsequentStoryMaxTurns: 3,
  },
  paid: {
    model: 'claude-sonnet-4-6',
    storiesPerDay: 6,
    turnsPerStory: 25,
  },
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

  if (storiesStarted >= limits.storiesPerDay)
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'STORY_LIMIT_REACHED' }) };

  if (tier === 'free' && totalTurns >= limits.turnsPerDay)
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'TURN_LIMIT_REACHED' }) };

  let maxTurns;
  if (tier === 'free') {
    const remaining = limits.turnsPerDay - totalTurns;
    maxTurns = storiesStarted === 0 ? remaining : Math.min(limits.subsequentStoryMaxTurns, remaining);
  } else {
    maxTurns = limits.turnsPerStory;
  }

  await supabase.from('daily_usage').upsert(
    { user_id: user.id, date: today, stories_started: storiesStarted + 1, total_turns: totalTurns + 1 },
    { onConflict: 'user_id,date' }
  );

  const { title } = JSON.parse(event.body);

  const turnNote = maxTurns === 1
    ? 'CRITICAL: This is a single-turn story. You MUST end it with "ENDING: true" and "ACHIEVEMENT: [name]". Do NOT include CHOICE options.'
    : maxTurns <= 3
      ? `NOTE: This is a short story — maximum ${maxTurns} turns total. Plan a complete narrative arc within these turns.`
      : `NOTE: This adventure will last up to ${maxTurns} turns.`;

  const prompt = `You are a creative storyteller creating an interactive, fact-based adventure game.

The topic is: "${title}" (from Wikipedia)

Create an engaging opening scene for a choose-your-own-adventure game. The adventure should:
- Use real facts, people, places, and events
- Be immersive and engaging
- Stay grounded in reality while being narratively compelling
- Include vivid descriptions
- Wrap any Wikipedia article names you mention in [[double brackets]] like this: [[Marie Curie]] or [[Paris]]
- If there's a relevant location or visual subject, provide an image search query

After the opening scene, provide exactly 3 choices for what the player can do next. Each choice should lead in a different direction while staying true to factual information.

Assess the current scene's vibe/mood and respond with ONE of these vibes: neutral, mysterious, dangerous, peaceful, exciting, eerie

${turnNote}

Format your response EXACTLY as follows:
VIBE: [vibe word]
STORY: [your opening scene text with [[Article Names]] hyperlinked]
IMAGE_QUERY: [optional: location or subject to search for image]
CHOICE_1: [first choice]
CHOICE_2: [second choice]
CHOICE_3: [third choice]

NOTE: When the story reaches a natural conclusion, end it with "ENDING: true" and "ACHIEVEMENT: [creative achievement name]" instead of providing choices.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: limits.model,
      max_tokens: tier === 'free' ? 1000 : 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: response.content[0].text,
        maxTurns,
        tier,
        usage: { stories_started: storiesStarted + 1, total_turns: totalTurns + 1 },
      }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to generate story' }) };
  }
};
