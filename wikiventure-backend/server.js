// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Endpoint 1: Start the Adventure
app.post('/api/start', async (req, res) => {
  try {
    const { title } = req.body;

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: initialPrompt }]
    });

    res.json({ content: response.content[0].text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

// Endpoint 2: Continue the Adventure
app.post('/api/continue', async (req, res) => {
  try {
    const { title, selectedChoice, history } = req.body;

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


    // Add the new prompt to the history
    const messages = [...history, { role: 'user', content: continuePrompt }];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: messages
    });

    res.json({ content: response.content[0].text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to continue story' });
  }
});

// Serve built React frontend in production
const frontendDist = path.join(__dirname, '../wikiventure-frontend/dist');
app.use(express.static(frontendDist));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});