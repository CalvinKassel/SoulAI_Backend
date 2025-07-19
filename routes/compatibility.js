const express = require('express');
const LangChainService = require('../services/LangChainService');

const router = express.Router();

// POST /api/compatibility/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { user1Profile, user2Profile } = req.body;

    if (!user1Profile || !user2Profile) {
      return res.status(400).json({ 
        error: 'Both user profiles are required' 
      });
    }

    console.log('🔍 Analyzing compatibility between:', user1Profile.name, 'and', user2Profile.name);

    // Initialize LangChain service
    const langChainService = new LangChainService();

    // Get AI-powered analysis
    const aiAnalysis = await langChainService.analyzeCompatibility(
      user1Profile, 
      user2Profile
    );

    // Generate conversation starters
    const conversationStarters = await langChainService.generateConversationStarter(
      user1Profile,
      user2Profile,
      aiAnalysis
    );

    console.log('✅ Compatibility analysis complete. Score:', aiAnalysis.overallScore);

    res.json({
      aiAnalysis,
      conversationStarters,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Compatibility analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze compatibility',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/compatibility/conversation-starters
router.post('/conversation-starters', async (req, res) => {
  try {
    const { user1Profile, user2Profile, compatibilityData } = req.body;

    const langChainService = new LangChainService();
    const starters = await langChainService.generateConversationStarter(
      user1Profile,
      user2Profile,
      compatibilityData
    );

    res.json({ conversationStarters: starters });

  } catch (error) {
    console.error('Conversation starters error:', error);
    res.status(500).json({ 
      error: 'Failed to generate conversation starters' 
    });
  }
});

module.exports = router;