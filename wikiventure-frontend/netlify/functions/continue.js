const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { title, selectedChoice, history } = JSON.parse(event.body);

    const continuePrompt = `Continue the adventure based on the player's choice: "${selectedChoice}"

Remember:
- Stay true to factual information about "${title}"
- Use real facts and information from the topic and related subjects
- Make the story engaging and immersive
- Provide 3 new choices for the player
- Wrap any Wikipedia article names in [[double brackets]] like [[Article Name]]
- If there's a relevant location or visual subject in this scene, provide an image search query

Assess the new scene's vibe and respond with one of: neutral, mysterious, dangerous, peaceful, exciting, eerie

Format your response EXACTLY as follows:
VIBE: [vibe word]
STORY: [continuation text with [[Article Names]] hyperlinked]
IMAGE_QUERY: [optional: location or subject for image]
CHOICE_1: [first choice]
CHOICE_2: [second choice]
CHOICE_3: [third choice]

NOTE: If this choice leads to a natural conclusion of the story, you can end it by including "ENDING: true" and "ACHIEVEMENT: [creative achievement name based on what the player accomplished]" instead of providing choices.`;

    const messages = [...history, { role: 'user', content: continuePrompt }];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: messages
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
      body: JSON.stringify({ error: 'Failed to continue story' })
    };
  }
};
