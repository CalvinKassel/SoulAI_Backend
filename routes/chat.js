// routes/chat.js - Complete Fixed Chat Route
// Save in: backend/routes/chat.js

const express = require('express');
const router = express.Router();

// Mock SoulAI responses until you connect the real AI
const soulAIResponses = [
  "That's really interesting! I'd love to learn more about what makes you tick. What are you most passionate about in life?",
  "I appreciate you sharing that with me. Understanding your perspective helps me get to know the real you. What else is important to you?",
  "That gives me great insight into your personality. I'm curious - what kind of connection are you hoping to find?",
  "Thank you for being so open with me. I'm here to help you find someone truly compatible. What qualities do you value most in a partner?",
  "I love how thoughtful you are! Tell me, what does your ideal relationship look like?",
  "That's fascinating! I'm learning so much about what drives you. What are some of your biggest dreams or goals?",
  "You have such an interesting perspective. What experiences have shaped who you are today?",
  "I can tell you're someone who thinks deeply about things. What brings you the most joy in life?",
  "That's wonderful! I'm getting a clear picture of your values. What would you say is your biggest strength in relationships?",
  "I really enjoy our conversations! What's something about yourself that you'd want a potential partner to know?"
];

// POST /api/chat/suggest-response - Match frontend expectations
router.post('/suggest-response', async (req, res) => {
  try {
    const { userProfile, matchProfile, conversationHistory, lastMessage } = req.body;
    
    console.log('🤖 Received chat suggestion request');
    console.log('Last message:', lastMessage);
    
    // Simple logic for now - you can replace with actual SoulAI later
    const randomResponse = soulAIResponses[Math.floor(Math.random() * soulAIResponses.length)];
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    res.json({
      success: true,
      suggestedResponses: [randomResponse],
      response: randomResponse // Also include single response for compatibility
    });
    
  } catch (error) {
    console.error('❌ Error generating chat suggestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response suggestions',
      suggestedResponses: ["I'm here to help you find meaningful connections. What's on your mind?"]
    });
  }
});

// POST /api/chat/soulai - Direct SoulAI chat
router.post('/soulai', async (req, res) => {
  try {
    const { message, userId, conversationHistory } = req.body;
    
    console.log('🧠 SoulAI chat request');
    console.log('User message:', message);
    
    // Enhanced responses based on message content
    let aiResponse;
    const userMsg = message.toLowerCase();
    
    if (userMsg.includes('hello') || userMsg.includes('hi')) {
      aiResponse = "Hello! I'm SoulAI, your personal matchmaking companion. I'm here to help you find meaningful connections by getting to know the real you. What brings you to the world of dating?";
    } else if (userMsg.includes('love') || userMsg.includes('relationship')) {
      aiResponse = "Love is such a beautiful thing! I'd love to understand what you're looking for in a relationship. What does your ideal partnership look like?";
    } else if (userMsg.includes('match') || userMsg.includes('dating')) {
      aiResponse = "Finding the right match is what I'm all about! Tell me about your values and what you find attractive in a person - both inside and out.";
    } else if (userMsg.includes('work') || userMsg.includes('career')) {
      aiResponse = "Your career says a lot about your ambitions and values. How important is it to you that a partner shares similar professional goals or work ethic?";
    } else if (userMsg.includes('hobby') || userMsg.includes('interest')) {
      aiResponse = "Shared interests can be a great foundation for connection! What activities make you lose track of time? And would you want to share these with a partner?";
    } else {
      // Use random response from our pool
      aiResponse = soulAIResponses[Math.floor(Math.random() * soulAIResponses.length)];
    }
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const response = {
      text: aiResponse,
      insights: {
        personality: 'engaged',
        interests: ['communication', 'relationships'],
        mood: 'positive'
      },
      profileUpdated: false,
      readyForMatches: (conversationHistory?.length || 0) > 8, // After 8+ messages
      profileCompleteness: Math.min(((conversationHistory?.length || 0) * 10), 90)
    };
    
    res.json({
      success: true,
      response,
      message: 'SoulAI response generated'
    });
    
  } catch (error) {
    console.error('❌ Error in SoulAI chat:', error);
    res.status(500).json({
      success: false,
      error: 'SoulAI chat failed',
      response: {
        text: "I'm here to help you find meaningful connections. What's on your mind?",
        insights: {},
        profileUpdated: false,
        readyForMatches: false
      }
    });
  }
});

// Health check for chat service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'chat',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;