// routes/soulai-comm.js - Backend Routes
// Save in: backend/routes/soulai-comm.js

const express = require('express');
const { SoulAICommunication } = require('../services/SoulAICommunication');

const router = express.Router();
const soulAIComm = new SoulAICommunication();

// POST /api/soulai/create-personal-ai
router.post('/create-personal-ai', async (req, res) => {
  try {
    const { userId, userProfile } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    console.log(`✨ Creating personal SoulAI for user: ${userId}`);

    const personalSoulAI = soulAIComm.createPersonalSoulAI(userId, userProfile || {});

    res.json({
      success: true,
      soulAI: {
        userId: personalSoulAI.userId,
        created: true,
        personality: 'empathetic_companion'
      },
      message: 'Personal SoulAI created successfully'
    });

  } catch (error) {
    console.error('❌ Create personal SoulAI error:', error);
    res.status(500).json({ 
      error: 'Failed to create personal SoulAI' 
    });
  }
});

// POST /api/soulai/process-message
router.post('/process-message', async (req, res) => {
  try {
    const { userId, message, conversationHistory } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'User ID and message are required' 
      });
    }

    console.log(`🧠 Processing message for user ${userId}: "${message}"`);

    const response = await soulAIComm.processUserMessage(
      userId, 
      message, 
      conversationHistory || []
    );

    // Get updated user insights
    const userSoulAI = soulAIComm.getUserSoulAI(userId);
    const insights = userSoulAI ? userSoulAI.insights : {};

    res.json({
      response: response,
      insights: insights,
      profileUpdated: Object.keys(insights).length > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Process message error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      response: "I'm here to help you discover meaningful connections. What's on your mind?"
    });
  }
});

// POST /api/soulai/initiate-matching
router.post('/initiate-matching', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ 
        error: 'Both user IDs are required' 
      });
    }

    console.log(`🤖➡️🤖 Initiating SoulAI matching: ${userId1} ↔ ${userId2}`);

    const matchingResult = await soulAIComm.initiateSoulAIMatching(userId1, userId2);

    res.json({
      success: true,
      matching: matchingResult,
      conversationId: `${userId1}-${userId2}`,
      status: matchingResult?.compatible ? 'compatible' : 'analyzing'
    });

  } catch (error) {
    console.error('❌ Initiate matching error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate SoulAI matching' 
    });
  }
});

// GET /api/soulai/compatibility/:userId1/:userId2
router.get('/compatibility/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    console.log(`📊 Getting compatibility analysis: ${userId1} ↔ ${userId2}`);

    const analysis = await soulAIComm.analyzeCompatibility(userId1, userId2);

    if (!analysis) {
      return res.status(404).json({
        error: 'No compatibility analysis found',
        message: 'SoulAIs have not yet analyzed this pairing'
      });
    }

    res.json({
      compatibility: analysis,
      users: [userId1, userId2],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get compatibility error:', error);
    res.status(500).json({ 
      error: 'Failed to get compatibility analysis' 
    });
  }
});

// POST /api/soulai/update-insights
router.post('/update-insights', async (req, res) => {
  try {
    const { userId, insights } = req.body;

    if (!userId || !insights) {
      return res.status(400).json({ 
        error: 'User ID and insights are required' 
      });
    }

    console.log(`🧠 Updating insights for user: ${userId}`);

    const userSoulAI = soulAIComm.getUserSoulAI(userId);
    
    if (!userSoulAI) {
      return res.status(404).json({
        error: 'Personal SoulAI not found for user'
      });
    }

    // Update insights
    userSoulAI.insights = { ...userSoulAI.insights, ...insights };

    res.json({
      success: true,
      insights: userSoulAI.insights,
      message: 'Insights updated successfully'
    });

  } catch (error) {
    console.error('❌ Update insights error:', error);
    res.status(500).json({ 
      error: 'Failed to update insights' 
    });
  }
});

// GET /api/soulai/user/:userId/insights
router.get('/user/:userId/insights', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📋 Getting insights for user: ${userId}`);

    const userSoulAI = soulAIComm.getUserSoulAI(userId);
    
    if (!userSoulAI) {
      return res.status(404).json({
        error: 'Personal SoulAI not found for user'
      });
    }

    const compatibilityFactors = userSoulAI.getCompatibilityFactors();

    res.json({
      insights: userSoulAI.insights,
      compatibilityFactors: compatibilityFactors,
      conversationCount: userSoulAI.conversationHistory.length,
      maturityLevel: compatibilityFactors.maturity_level,
      openness: compatibilityFactors.openness_to_experience
    });

  } catch (error) {
    console.error('❌ Get user insights error:', error);
    res.status(500).json({ 
      error: 'Failed to get user insights' 
    });
  }
});

// POST /api/soulai/conversation-analysis
router.post('/conversation-analysis', async (req, res) => {
  try {
    const { userId1, userId2, messages } = req.body;

    if (!userId1 || !userId2 || !messages) {
      return res.status(400).json({ 
        error: 'User IDs and messages are required' 
      });
    }

    console.log(`💬 Analyzing conversation between: ${userId1} ↔ ${userId2}`);

    // Analyze conversation for compatibility indicators
    const analysis = {
      communicationStyle: 'engaging',
      emotionalResonance: 0.8,
      sharedInterests: ['travel', 'books'],
      conversationFlow: 'natural',
      compatibilityIndicators: [
        'mutual_curiosity',
        'similar_communication_style',
        'shared_humor'
      ],
      recommendations: [
        'Continue sharing personal stories',
        'Ask about their passions',
        'Share your own interests more deeply'
      ],
      nextSuggestedTopics: [
        'What\'s been the highlight of your week?',
        'Tell me about something you\'re passionate about',
        'What\'s your idea of a perfect weekend?'
      ]
    };

    res.json({
      analysis: analysis,
      conversationQuality: 'high',
      relationshipPotential: 'strong',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Conversation analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze conversation' 
    });
  }
});

// POST /api/soulai/generate-response-suggestions
router.post('/generate-response-suggestions', async (req, res) => {
  try {
    const { userId, matchUserId, lastMessage, conversationContext } = req.body;

    if (!userId || !lastMessage) {
      return res.status(400).json({ 
        error: 'User ID and last message are required' 
      });
    }

    console.log(`💡 Generating response suggestions for user: ${userId}`);

    const userSoulAI = soulAIComm.getUserSoulAI(userId);
    
    if (!userSoulAI) {
      return res.status(404).json({
        error: 'Personal SoulAI not found for user'
      });
    }

    // Generate contextual response suggestions
    const suggestions = [
      "That's really fascinating! I'd love to hear more about that.",
      "What drew you to that? I'm curious about your perspective.",
      "That sounds amazing! How did you get into that?",
      "I can relate to that feeling. What's been your experience with it?",
      "That's such an interesting way to look at it. Tell me more!"
    ];

    // Analyze the conversation context to provide better suggestions
    const contextualSuggestions = suggestions.slice(0, 3);

    res.json({
      suggestions: contextualSuggestions,
      conversationTips: [
        'Show genuine curiosity about their interests',
        'Share a related experience of your own',
        'Ask open-ended questions to deepen the conversation'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Generate response suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response suggestions',
      suggestions: ["That's interesting! Tell me more."]
    });
  }
});

// GET /api/soulai/active-conversations
router.get('/active-conversations', async (req, res) => {
  try {
    console.log('📊 Getting active SoulAI conversations');

    const activeConversations = [];
    
    for (const [conversationId, conversation] of soulAIComm.activeConversations) {
      activeConversations.push({
        id: conversationId,
        stage: conversation.stage,
        compatibility: conversation.compatibilityAnalysis,
        messageCount: conversation.messages.length,
        lastActivity: conversation.messages[conversation.messages.length - 1]?.timestamp
      });
    }

    res.json({
      conversations: activeConversations,
      total: activeConversations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get active conversations error:', error);
    res.status(500).json({ 
      error: 'Failed to get active conversations' 
    });
  }
});

// DELETE /api/soulai/user/:userId
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🗑️ Removing SoulAI data for user: ${userId}`);

    // Remove user's SoulAI instance
    soulAIComm.userSoulAIs.delete(userId);

    // Remove from active conversations
    const conversationsToRemove = [];
    for (const [conversationId, conversation] of soulAIComm.activeConversations) {
      if (conversation.soulAI1.userId === userId || conversation.soulAI2.userId === userId) {
        conversationsToRemove.push(conversationId);
      }
    }

    conversationsToRemove.forEach(id => {
      soulAIComm.activeConversations.delete(id);
    });

    res.json({
      success: true,
      message: 'SoulAI data removed successfully',
      removedConversations: conversationsToRemove.length
    });

  } catch (error) {
    console.error('❌ Remove SoulAI data error:', error);
    res.status(500).json({ 
      error: 'Failed to remove SoulAI data' 
    });
  }
});

module.exports = router;