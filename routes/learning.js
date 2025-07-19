const express = require('express');
const ProfileLearningService = require('../services/ProfileLearningService');

const router = express.Router();

// POST /api/learning/analyze-conversation
router.post('/analyze-conversation', async (req, res) => {
  try {
    const { conversationHistory, currentProfile } = req.body;

    if (!conversationHistory) {
      return res.status(400).json({ 
        error: 'Conversation history is required' 
      });
    }

    const learningService = new ProfileLearningService();
    const analysis = await learningService.analyzeConversationForProfileData(
      conversationHistory,
      currentProfile
    );

    res.json({ analysis });

  } catch (error) {
    console.error('Profile learning error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze conversation for profile insights' 
    });
  }
});

// POST /api/learning/suggest-questions
router.post('/suggest-questions', async (req, res) => {
  try {
    const { currentProfile, conversationHistory } = req.body;

    const learningService = new ProfileLearningService();
    const questions = await learningService.generateMatchingQuestions(
      currentProfile,
      conversationHistory
    );

    res.json({ questions });

  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions' 
    });
  }
});

// POST /api/learning/strategic-analysis
router.post('/strategic-analysis', async (req, res) => {
  try {
    const { userProfile, conversationHistory, matchingHistory, userBehavior } = req.body;

    // For now, return mock data until MasterMindAgent is implemented
    const analysis = {
      weeklyInsights: "Based on your conversations, you show strong preference for meaningful connections.",
      recommendations: ["Focus on deeper conversations", "Share more about your values"],
      profileOptimizations: ["Add more about your hobbies", "Include what you're looking for"],
      matchingStrategy: "Quality over quantity approach recommended"
    };

    res.json({ analysis });

  } catch (error) {
    console.error('Strategic analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to conduct strategic analysis' 
    });
  }
});

// POST /api/learning/proactive-checkin
router.post('/proactive-checkin', async (req, res) => {
  try {
    const { userProfile, daysSinceLastActive } = req.body;

    // For now, return mock data until MasterMindAgent is implemented
    const checkin = {
      message: "Hey! I noticed you haven't been active lately. How's your dating journey going?",
      suggestions: ["Try updating your profile", "Check out new matches", "Let's have a chat about what you're looking for"],
      tone: "supportive"
    };

    res.json({ checkin });

  } catch (error) {
    console.error('Proactive check-in error:', error);
    res.status(500).json({ 
      error: 'Failed to generate check-in' 
    });
  }
});

module.exports = router;