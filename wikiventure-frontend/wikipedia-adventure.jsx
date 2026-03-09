import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, RefreshCw, BookOpen } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function WikipediaAdventure() {
  const [gameState, setGameState] = useState('input'); // 'input', 'loading', 'playing', 'saves', 'achievements'
  const [wikiUrl, setWikiUrl] = useState('');
  const [wikiContent, setWikiContent] = useState('');
  const [wikiTitle, setWikiTitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [choices, setChoices] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVibe, setCurrentVibe] = useState('neutral');
  const [error, setError] = useState('');
  const [currentSaveId, setCurrentSaveId] = useState(null);
  const [saves, setSaves] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const storyRef = useRef(null);

  // Load saves and achievements on mount
  useEffect(() => {
    loadSavesFromStorage();
    loadAchievementsFromStorage();
  }, []);

  // Auto-save every time story progresses
  useEffect(() => {
    if (gameState === 'playing' && storyText && currentSaveId) {
      autoSave();
    }
  }, [storyText, conversationHistory, currentVibe]);

  // Load saves from localStorage
  const loadSavesFromStorage = () => {
    try {
      const savedGames = localStorage.getItem('wikiventure_saves');
      if (savedGames) {
        setSaves(JSON.parse(savedGames));
      }
    } catch (err) {
      console.error('Failed to load saves:', err);
    }
  };

  // Load achievements from localStorage
  const loadAchievementsFromStorage = () => {
    try {
      const savedAchievements = localStorage.getItem('wikiventure_achievements');
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    }
  };

  // Save game to localStorage
  const saveGame = (isCompleted = false) => {
    try {
      const saveData = {
        id: currentSaveId || Date.now().toString(),
        wikiUrl,
        wikiTitle,
        storyText,
        conversationHistory,
        currentVibe,
        timestamp: Date.now(),
        completed: isCompleted,
        choiceCount: conversationHistory.length
      };

      const existingSaves = JSON.parse(localStorage.getItem('wikiventure_saves') || '[]');
      const saveIndex = existingSaves.findIndex(s => s.id === saveData.id);
      
      if (saveIndex >= 0) {
        existingSaves[saveIndex] = saveData;
      } else {
        existingSaves.push(saveData);
      }

      localStorage.setItem('wikiventure_saves', JSON.stringify(existingSaves));
      setSaves(existingSaves);
      
      if (!currentSaveId) {
        setCurrentSaveId(saveData.id);
      }
    } catch (err) {
      console.error('Failed to save game:', err);
    }
  };

  // Auto-save function
  const autoSave = () => {
    if (gameState === 'playing' && currentSaveId) {
      saveGame(false);
    }
  };

  // Load a saved game
  const loadSave = (save) => {
    setWikiUrl(save.wikiUrl);
    setWikiTitle(save.wikiTitle);
    setStoryText(save.storyText);
    setConversationHistory(save.conversationHistory);
    setCurrentVibe(save.currentVibe);
    setCurrentSaveId(save.id);
    setGameState('playing');
    
    // Re-parse the last response to get current choices
    if (save.conversationHistory.length > 0) {
      const lastResponse = save.conversationHistory[save.conversationHistory.length - 1];
      if (lastResponse.role === 'assistant') {
        parseAndApplyResponse(lastResponse.content, true);
      }
    }
  };

  // Delete a save
  const deleteSave = (saveId) => {
    try {
      const existingSaves = JSON.parse(localStorage.getItem('wikiventure_saves') || '[]');
      const filtered = existingSaves.filter(s => s.id !== saveId);
      localStorage.setItem('wikiventure_saves', JSON.stringify(filtered));
      setSaves(filtered);
    } catch (err) {
      console.error('Failed to delete save:', err);
    }
  };

  // Award achievement
  const awardAchievement = (achievementData) => {
    try {
      const existingAchievements = JSON.parse(localStorage.getItem('wikiventure_achievements') || '[]');
      
      // Check if achievement already exists
      if (existingAchievements.some(a => a.id === achievementData.id)) {
        return;
      }

      const newAchievement = {
        ...achievementData,
        timestamp: Date.now()
      };

      existingAchievements.push(newAchievement);
      localStorage.setItem('wikiventure_achievements', JSON.stringify(existingAchievements));
      setAchievements(existingAchievements);
      
      // Show achievement notification
      setShowAchievement(newAchievement);
      setTimeout(() => setShowAchievement(null), 5000);
    } catch (err) {
      console.error('Failed to save achievement:', err);
    }
  };

  // Color themes based on vibe
  const vibeThemes = {
    neutral: {
      bg: '#F5F1E8',
      text: '#2C2416',
      accent: '#8B7355',
      accentLight: '#C4B5A0',
      shadow: 'rgba(139, 115, 85, 0.15)'
    },
    mysterious: {
      bg: '#1A1625',
      text: '#E8DFF5',
      accent: '#8B5CF6',
      accentLight: '#A78BFA',
      shadow: 'rgba(139, 92, 246, 0.25)'
    },
    dangerous: {
      bg: '#1F1311',
      text: '#FFE5E5',
      accent: '#DC2626',
      accentLight: '#EF4444',
      shadow: 'rgba(220, 38, 38, 0.25)'
    },
    peaceful: {
      bg: '#E8F4F1',
      text: '#1E3A32',
      accent: '#10B981',
      accentLight: '#34D399',
      shadow: 'rgba(16, 185, 129, 0.15)'
    },
    exciting: {
      bg: '#FFF8E7',
      text: '#3A2817',
      accent: '#F59E0B',
      accentLight: '#FBBF24',
      shadow: 'rgba(245, 158, 11, 0.2)'
    },
    eerie: {
      bg: '#0F1419',
      text: '#D1D5DB',
      accent: '#4B5563',
      accentLight: '#6B7280',
      shadow: 'rgba(75, 85, 99, 0.3)'
    }
  };

  const theme = vibeThemes[currentVibe] || vibeThemes.neutral;

  // Auto-scroll to bottom when new story text appears
  useEffect(() => {
    if (storyRef.current && gameState === 'playing') {
      storyRef.current.scrollTop = storyRef.current.scrollHeight;
    }
  }, [storyText, gameState]);

  // Extract Wikipedia article title from URL
  const extractWikiTitle = (url) => {
    try {
      const match = url.match(/\/wiki\/([^#?]+)/);
      return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : null;
    } catch (e) {
      return null;
    }
  };

  // Start the adventure
const startAdventure = async () => {
    if (!wikiUrl.trim()) {
      setError('Please enter a Wikipedia URL');
      return;
    }

    const title = extractWikiTitle(wikiUrl);
    if (!title) {
      setError('Invalid Wikipedia URL.');
      return;
    }

    setError('');
    setGameState('loading');
    setWikiTitle(title);
    setCurrentSaveId(Date.now().toString());
    
    try {
      // 🚨 UPDATED: Calling YOUR backend instead of Anthropic
      const response = await fetch(`${API_BASE}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
      });

      if (!response.ok) throw new Error('Failed to connect to game server');

      const data = await response.json();
      const responseText = data.content;
      
      parseAndApplyResponse(responseText);
      
      setConversationHistory([
        { role: 'user', content: `Start adventure for: ${title}` },
        { role: 'assistant', content: responseText }
      ]);

      setGameState('playing');
    } catch (err) {
      console.error('Adventure start error:', err);
      setError(err.message || 'Failed to start adventure. Please try again.');
      setGameState('input');
    }
  };

  // Parse Claude's response
  const parseAndApplyResponse = (text, isLoadingSave = false) => {
    const vibeMatch = text.match(/VIBE:\s*(\w+)/);
    const storyMatch = text.match(/STORY:\s*([\s\S]*?)(?=CHOICE_|IMAGE_|ENDING_|$)/);
    const choiceMatches = [...text.matchAll(/CHOICE_\d+:\s*([^\n]+)/g)];
    const imageMatch = text.match(/IMAGE_QUERY:\s*([^\n]+)/);
    const endingMatch = text.match(/ENDING:\s*(true|yes)/i);
    const achievementMatch = text.match(/ACHIEVEMENT:\s*([^\n]+)/);

    if (vibeMatch) {
      const vibe = vibeMatch[1].toLowerCase();
      if (vibeThemes[vibe]) {
        setCurrentVibe(vibe);
      }
    }

    if (storyMatch && !isLoadingSave) {
      setStoryText(prev => prev + '\n\n' + storyMatch[1].trim());
    }

    if (choiceMatches.length > 0) {
      setChoices(choiceMatches.map(match => match[1].trim()));
    } else if (endingMatch || text.toLowerCase().includes('the end')) {
      // This is an ending - no more choices
      setChoices([]);
      
      // Award achievement
      const achievementTitle = achievementMatch 
        ? achievementMatch[1].trim() 
        : `Completed: ${wikiTitle}`;
      
      awardAchievement({
        id: `${wikiTitle}_${Date.now()}`,
        title: achievementTitle,
        topic: wikiTitle,
        icon: '🏆'
      });

      // Mark save as completed
      saveGame(true);
    }

    // Try to fetch image if query provided
    if (imageMatch) {
      const query = imageMatch[1].trim();
      fetchSceneImage(query);
    }
  };

  // Fetch image for the scene
  const fetchSceneImage = async (query) => {
    try {
      // Use Wikimedia Commons API for free, relevant images
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=600&origin=*`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.query && data.query.pages) {
        const pages = Object.values(data.query.pages);
        if (pages[0]?.imageinfo?.[0]?.thumburl) {
          setStoryText(prev => prev + `\n\n[IMAGE: ${pages[0].imageinfo[0].thumburl}]`);
        }
      }
    } catch (err) {
      // Silently fail if image fetch doesn't work
      console.log('Image fetch failed:', err);
    }
  };

  // Process story text to add Wikipedia hyperlinks and display images
  const processStoryText = (text) => {
    if (!text) return null;

    const parts = [];
    let lastIndex = 0;

    // First, extract and display images
    const imageRegex = /\[IMAGE:\s*([^\]]+)\]/g;
    const textWithoutImages = text.split('\n\n').map((paragraph, pIndex) => {
      const imageMatch = paragraph.match(imageRegex);
      
      if (imageMatch) {
        const imageUrl = imageMatch[0].match(/\[IMAGE:\s*([^\]]+)\]/)[1];
        return (
          <div key={`img-${pIndex}`} style={{ margin: '1.5rem 0' }}>
            <img
              src={imageUrl}
              alt="Scene illustration"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                boxShadow: `0 4px 16px ${theme.shadow}`,
                border: `2px solid ${theme.accentLight}`
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        );
      }

      // Process paragraph for Wikipedia links
      // Match [[Article_Name]] format
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      const parts = [];
      let lastIdx = 0;
      let match;

      while ((match = linkRegex.exec(paragraph)) !== null) {
        // Add text before the link
        if (match.index > lastIdx) {
          parts.push(paragraph.slice(lastIdx, match.index));
        }

        // Add the link
        const articleName = match[1];
        const wikiUrl = `https://en.wikipedia.org/wiki/${articleName.replace(/ /g, '_')}`;
        parts.push(
          <a
            key={`link-${pIndex}-${match.index}`}
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.accent,
              textDecoration: 'none',
              borderBottom: `2px solid ${theme.accent}66`,
              paddingBottom: '2px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderBottomColor = theme.accent;
              e.target.style.color = theme.accentLight;
            }}
            onMouseLeave={(e) => {
              e.target.style.borderBottomColor = `${theme.accent}66`;
              e.target.style.color = theme.accent;
            }}
          >
            {articleName}
            <ExternalLink size={14} style={{ opacity: 0.6 }} />
          </a>
        );

        lastIdx = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIdx < paragraph.length) {
        parts.push(paragraph.slice(lastIdx));
      }

      return (
        <p key={`p-${pIndex}`} style={{ marginBottom: '1rem' }}>
          {parts.length > 0 ? parts : paragraph}
        </p>
      );
    });

    return textWithoutImages;
  };

  // Handle choice selection
const handleChoice = async (choiceIndex) => {
    const selectedChoice = choices[choiceIndex];
    setIsGenerating(true);
    setChoices([]);
    setStoryText(prev => prev + `\n\n→ ${selectedChoice}\n`);

    try {
      // 🚨 UPDATED: Calling YOUR backend with the history
      const response = await fetch(`${API_BASE}/api/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: wikiTitle,
          selectedChoice: selectedChoice,
          history: conversationHistory
        })
      });

      if (!response.ok) throw new Error('Failed to continue story');

      const data = await response.json();
      const responseText = data.content;
      
      parseAndApplyResponse(responseText);
      
      setConversationHistory([
        ...conversationHistory,
        { role: 'user', content: `Player chose: ${selectedChoice}` },
        { role: 'assistant', content: responseText }
      ]);
    } catch (err) {
      console.error('Story continuation error:', err);
      setError('Failed to generate next part of the story.');
      setChoices(['Try again', 'Go back', 'Start over']); 
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset game
  const resetGame = () => {
    setGameState('input');
    setWikiUrl('');
    setWikiContent('');
    setWikiTitle('');
    setStoryText('');
    setChoices([]);
    setConversationHistory([]);
    setCurrentVibe('neutral');
    setError('');
    setCurrentSaveId(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        color: theme.text,
        transition: 'background-color 1s ease, color 1s ease',
        fontFamily: "'Crimson Text', 'Georgia', serif",
        padding: '0',
        margin: '0'
      }}
    >
      {/* Background texture */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, ${theme.shadow} 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${theme.shadow} 0%, transparent 50%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              ${theme.shadow} 2px,
              ${theme.shadow} 4px
            )
          `,
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <header
          style={{
            padding: '2rem',
            borderBottom: `2px solid ${theme.accent}`,
            backgroundColor: `${theme.bg}dd`,
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <BookOpen size={32} color={theme.accent} />
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      fontFamily: "'Playfair Display', 'Georgia', serif",
                      color: theme.accent,
                      letterSpacing: '0.02em',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (gameState !== 'playing') {
                        setGameState('input');
                      }
                    }}
                  >
                    WikiVenture
                  </h1>
                  <p
                    style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '1rem',
                      opacity: 0.7,
                      fontStyle: 'italic'
                    }}
                  >
                    Choose your own fact-based adventure
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={() => setGameState('saves')}
                  style={{
                    backgroundColor: gameState === 'saves' ? theme.accent : 'transparent',
                    color: gameState === 'saves' ? theme.bg : theme.accent,
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    border: `2px solid ${theme.accent}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (gameState !== 'saves') {
                      e.target.style.backgroundColor = theme.accent + '22';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (gameState !== 'saves') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  📚 Saves ({saves.length})
                </button>
                
                <button
                  onClick={() => setGameState('achievements')}
                  style={{
                    backgroundColor: gameState === 'achievements' ? theme.accent : 'transparent',
                    color: gameState === 'achievements' ? theme.bg : theme.accent,
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    border: `2px solid ${theme.accent}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (gameState !== 'achievements') {
                      e.target.style.backgroundColor = theme.accent + '22';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (gameState !== 'achievements') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  🏆 Achievements ({achievements.length})
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
          {gameState === 'input' && (
            <div
              style={{
                animation: 'fadeIn 0.6s ease-out',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  backgroundColor: `${theme.accentLight}22`,
                  padding: '3rem 2rem',
                  borderRadius: '12px',
                  border: `2px solid ${theme.accentLight}`,
                  boxShadow: `0 8px 32px ${theme.shadow}`
                }}
              >
                <Sparkles
                  size={48}
                  color={theme.accent}
                  style={{ marginBottom: '1rem' }}
                />
                <h2
                  style={{
                    fontSize: '2rem',
                    marginBottom: '1rem',
                    fontWeight: 600
                  }}
                >
                  Begin Your Adventure
                </h2>
                <p style={{ fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  Paste a Wikipedia URL below, and we'll transform it into an interactive
                  adventure. Explore historical events, scientific discoveries, or
                  fascinating people through a fact-based narrative journey.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    value={wikiUrl}
                    onChange={(e) => setWikiUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && startAdventure()}
                    placeholder="https://en.wikipedia.org/wiki/..."
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      border: `2px solid ${theme.accent}`,
                      borderRadius: '8px',
                      backgroundColor: theme.bg,
                      color: theme.text,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {error && (
                  <p style={{ color: '#DC2626', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={startAdventure}
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.bg,
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all 0.3s ease',
                    boxShadow: `0 4px 16px ${theme.shadow}`,
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0 6px 24px ${theme.shadow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = `0 4px 16px ${theme.shadow}`;
                  }}
                >
                  Start Adventure
                </button>

                <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6 }}>
                  <p>Try these examples:</p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {[
                      'Marie_Curie',
                      'Mount_Everest',
                      'Apollo_11',
                      'Ancient_Egypt'
                    ].map(topic => (
                      <button
                        key={topic}
                        onClick={() => setWikiUrl(`https://en.wikipedia.org/wiki/${topic}`)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: 'transparent',
                          border: `1px solid ${theme.accentLight}`,
                          borderRadius: '4px',
                          color: theme.text,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = theme.accentLight + '33';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        {topic.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === 'loading' && (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                animation: 'fadeIn 0.6s ease-out'
              }}
            >
              <RefreshCw
                size={48}
                color={theme.accent}
                style={{
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem'
                }}
              />
              <p style={{ fontSize: '1.2rem' }}>
                Crafting your adventure from the annals of knowledge...
              </p>
            </div>
          )}

          {gameState === 'playing' && (
            <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
              {/* Wikipedia source */}
              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  backgroundColor: `${theme.accentLight}22`,
                  borderRadius: '8px',
                  border: `1px solid ${theme.accentLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0.25rem' }}>
                    Based on Wikipedia article:
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {wikiTitle}
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.accent,
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    border: `1px solid ${theme.accent}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = theme.accent + '22';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <RefreshCw size={16} />
                  New Adventure
                </button>
              </div>

              {/* Story text */}
              <div
                ref={storyRef}
                style={{
                  backgroundColor: `${theme.bg}dd`,
                  padding: '2rem',
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  minHeight: '300px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  fontSize: '1.15rem',
                  lineHeight: 1.8,
                  border: `2px solid ${theme.accent}`,
                  boxShadow: `0 8px 32px ${theme.shadow}`,
                  scrollBehavior: 'smooth'
                }}
              >
                {processStoryText(storyText)}
                {isGenerating && (
                  <span
                    style={{
                      display: 'inline-block',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      marginLeft: '0.5rem',
                      color: theme.accent
                    }}
                  >
                    ⋯
                  </span>
                )}
              </div>

              {/* Choices */}
              {choices.length > 0 && !isGenerating && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: theme.accent
                    }}
                  >
                    What do you do?
                  </div>
                  {choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(index)}
                      style={{
                        padding: '1.2rem 1.5rem',
                        backgroundColor: `${theme.accentLight}22`,
                        border: `2px solid ${theme.accent}`,
                        borderRadius: '8px',
                        color: theme.text,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme.accent + '44';
                        e.target.style.transform = 'translateX(8px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme.accentLight + '22';
                        e.target.style.transform = 'translateX(0)';
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          marginRight: '0.75rem',
                          color: theme.accent,
                          fontWeight: 700,
                          fontSize: '1.2rem'
                        }}
                      >
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {/* Story completed message */}
              {choices.length === 0 && !isGenerating && storyText && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    backgroundColor: `${theme.accent}22`,
                    borderRadius: '12px',
                    border: `2px solid ${theme.accent}`
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎉</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Story Complete!
                  </div>
                  <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                    Your adventure through {wikiTitle} has reached its conclusion.
                  </p>
                  <button
                    onClick={resetGame}
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.bg,
                      padding: '1rem 2rem',
                      fontSize: '1rem',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Start New Adventure
                  </button>
                </div>
              )}
            </div>
          )}

          {gameState === 'saves' && (
            <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                Your Adventures
              </h2>

              {saves.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: `${theme.accentLight}22`,
                    borderRadius: '12px',
                    border: `2px dashed ${theme.accentLight}`
                  }}
                >
                  <BookOpen size={48} color={theme.accent} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>
                    No saved adventures yet.
                  </p>
                  <button
                    onClick={() => setGameState('input')}
                    style={{
                      marginTop: '1rem',
                      backgroundColor: theme.accent,
                      color: theme.bg,
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontFamily: 'inherit'
                    }}
                  >
                    Start Your First Adventure
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {saves.sort((a, b) => b.timestamp - a.timestamp).map((save) => (
                    <div
                      key={save.id}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: `${theme.accentLight}22`,
                        borderRadius: '8px',
                        border: `2px solid ${theme.accent}`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, margin: 0 }}>
                              {save.wikiTitle}
                            </h3>
                            {save.completed && (
                              <span style={{ 
                                fontSize: '0.8rem', 
                                padding: '0.2rem 0.6rem', 
                                backgroundColor: theme.accent, 
                                color: theme.bg,
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                ✓ COMPLETE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                            {new Date(save.timestamp).toLocaleDateString()} • {save.choiceCount} choices made
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => loadSave(save)}
                            style={{
                              backgroundColor: theme.accent,
                              color: theme.bg,
                              padding: '0.6rem 1.2rem',
                              fontSize: '0.9rem',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            {save.completed ? 'Review' : 'Continue'}
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${save.wikiTitle}"?`)) {
                                deleteSave(save.id);
                              }
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#DC2626',
                              padding: '0.6rem 1.2rem',
                              fontSize: '0.9rem',
                              border: `2px solid #DC2626`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#DC262622';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: '0.95rem', 
                        opacity: 0.8, 
                        marginTop: '0.75rem',
                        lineHeight: 1.5,
                        maxHeight: '3em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {save.storyText.substring(0, 150)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {gameState === 'achievements' && (
            <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                Achievements
              </h2>

              {achievements.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: `${theme.accentLight}22`,
                    borderRadius: '12px',
                    border: `2px dashed ${theme.accentLight}`
                  }}
                >
                  <Sparkles size={48} color={theme.accent} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>
                    No achievements unlocked yet.
                  </p>
                  <p style={{ fontSize: '1rem', opacity: 0.6, marginTop: '0.5rem' }}>
                    Complete adventures to earn achievements!
                  </p>
                  <button
                    onClick={() => setGameState('input')}
                    style={{
                      marginTop: '1rem',
                      backgroundColor: theme.accent,
                      color: theme.bg,
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontFamily: 'inherit'
                    }}
                  >
                    Start an Adventure
                  </button>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {achievements.sort((a, b) => b.timestamp - a.timestamp).map((achievement) => (
                    <div
                      key={achievement.id}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: `${theme.accentLight}22`,
                        borderRadius: '8px',
                        border: `2px solid ${theme.accent}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-4px)';
                        e.target.style.boxShadow = `0 8px 24px ${theme.shadow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                        {achievement.icon || '🏆'}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {achievement.title}
                      </h3>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                        {achievement.topic}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                        {new Date(achievement.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Achievement Notification Popup */}
        {showAchievement && (
          <div
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              backgroundColor: theme.bg,
              border: `3px solid ${theme.accent}`,
              borderRadius: '12px',
              padding: '1.5rem',
              minWidth: '300px',
              maxWidth: '400px',
              boxShadow: `0 12px 48px ${theme.shadow}`,
              animation: 'slideInRight 0.5s ease-out, fadeOut 0.5s ease-in 4.5s',
              zIndex: 1000
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {showAchievement.icon || '🏆'}
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: theme.accent, 
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Achievement Unlocked!
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                {showAchievement.title}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                {showAchievement.topic}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:wght@700;900&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(100%);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${theme.bg};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${theme.accent};
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.accentLight};
        }
      `}</style>
    </div>
  );
}
