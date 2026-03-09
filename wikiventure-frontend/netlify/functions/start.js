const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { title } = JSON.parse(event.body);

    const initialPrompt = `You are a creative storyteller creating an interactive, fact-based adventure game.

The topic is: "${title}" (from Wikipedia)

Use web search to find factual information about this topic, then create an engaging opening scene for a choose-your-own-adventure game. The adventure should:
- Use real facts, people, places, and events
- Be immersive and engaging
- Stay grounded in reality while being narratively compelling
- Include vivid descriptions
- Wrap any Wikipedia article names you mention in [[double brackets]] like this: [[Marie Curie]] or [[Paris]]
- If there's a relevant location or visual subject, provide an image search query

After the opening scene, provide exactly 3 choices for what the player can do next. Each choice should lead in a different direction while staying true to factual information.

Also, assess the current scene's vibe/mood and respond with ONE of these vibes: neutral, mysterious, dangerous, peaceful, exciting, eerie

Format your response EXACTLY as follows:
VIBE: [vibe word]
STORY: [your opening scene text with [[Article Names]] hyperlinked]
IMAGE_QUERY: [optional: location or subject to search for image, e.g. "Eiffel Tower Paris" or "Marie Curie laboratory"]
CHOICE_1: [first choice]
CHOICE_2: [second choice]
CHOICE_3: [third choice]

NOTE: When the story reaches a natural conclusion, you can end it by including "ENDING: true" and "ACHIEVEMENT: [creative achievement name]" instead of providing choices.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: initialPrompt }]
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: response.content[0].text })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate story' })
    };
  }
};
