// routes/matching.js - Backend Routes
// Save in: backend/routes/matching.js

const express = require('express');
const MatchingService = require('../services/MatchingService');

const router = express.Router();
const matchingService = new MatchingService();

// POST /api/matching/find-matches
router.post('/find-matches', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    console.log(`🔍 Finding matches for user: ${userId}`);

    // Add user to matching queue if ready
    await matchingService.addToMatchingQueue(userId);

    // Get current matches
    const userMatches = await matchingService.getUserMatches(userId);

    res.json({
      matches: userMatches.matches,
      pending: userMatches.pending,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Find matches error:', error);
    res.status(500).json({ 
      error: 'Failed to find matches',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/matching/user/:userId/matches
router.get('/user/:userId/matches', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📋 Getting matches for user: ${userId}`);

    const userMatches = await matchingService.getUserMatches(userId);

    res.json({
      matches: userMatches.matches,
      pending: userMatches.pending,
      total: userMatches.matches.length + userMatches.pending.length
    });

  } catch (error) {
    console.error('❌ Get user matches error:', error);
    res.status(500).json({ 
      error: 'Failed to get user matches' 
    });
  }
});

// POST /api/matching/start-conversation
router.post('/start-conversation', async (req, res) => {
  try {
    const { matchId, userId } = req.body;

    if (!matchId || !userId) {
      return res.status(400).json({ 
        error: 'Match ID and User ID are required' 
      });
    }

    console.log(`💬 Starting conversation: ${matchId} for user: ${userId}`);

    const match = await matchingService.startConversation(matchId, userId);

    res.json({
      success: true,
      match: match,
      message: 'Conversation started successfully'
    });

  } catch (error) {
    console.error('❌ Start conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to start conversation',
      details: error.message
    });
  }
});

// POST /api/matching/evaluate-compatibility
router.post('/evaluate-compatibility', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ 
        error: 'Both user IDs are required' 
      });
    }

    console.log(`🔍 Evaluating compatibility: ${userId1} ↔ ${userId2}`);

    await matchingService.evaluateMatch(userId1, userId2);

    res.json({
      success: true,
      message: 'Compatibility evaluation initiated'
    });

  } catch (error) {
    console.error('❌ Evaluate compatibility error:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate compatibility' 
    });
  }
});

// GET /api/matching/stats
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Getting matching statistics');

    const stats = await matchingService.getMatchingStats();

    res.json({
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get matching stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get matching statistics' 
    });
  }
});

// POST /api/matching/update-preferences
router.post('/update-preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({ 
        error: 'User ID and preferences are required' 
      });
    }

    console.log(`⚙️ Updating matching preferences for user: ${userId}`);

    // Update user preferences through UserService
    const updatedUser = await matchingService.userService.updateUserProfile(userId, {
      preferences: preferences
    });

    // Re-add to matching queue with new preferences
    await matchingService.addToMatchingQueue(userId);

    res.json({
      success: true,
      user: updatedUser,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('❌ Update preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences' 
    });
  }
});

// POST /api/matching/like-user
router.post('/like-user', async (req, res) => {
  try {
    const { userId, likedUserId } = req.body;

    if (!userId || !likedUserId) {
      return res.status(400).json({ 
        error: 'Both user IDs are required' 
      });
    }

    console.log(`👍 User ${userId} liked user ${likedUserId}`);

    // Trigger immediate compatibility evaluation
    await matchingService.evaluateMatch(userId, likedUserId);

    // Check if it resulted in a match
    const userMatches = await matchingService.getUserMatches(userId);
    const newMatch = userMatches.matches.find(match => 
      match.user.id === likedUserId
    ) || userMatches.pending.find(match => 
      match.user.id === likedUserId
    );

    res.json({
      success: true,
      match: newMatch,
      isMatch: !!newMatch,
      message: newMatch ? 'It\'s a match!' : 'Like recorded'
    });

  } catch (error) {
    console.error('❌ Like user error:', error);
    res.status(500).json({ 
      error: 'Failed to process like' 
    });
  }
});

// POST /api/matching/pass-user
router.post('/pass-user', async (req, res) => {
  try {
    const { userId, passedUserId, reason } = req.body;

    if (!userId || !passedUserId) {
      return res.status(400).json({ 
        error: 'Both user IDs are required' 
      });
    }

    console.log(`👎 User ${userId} passed on user ${passedUserId}`);

    // Record the pass (in production, store in database to avoid future suggestions)
    // For now, just acknowledge
    res.json({
      success: true,
      message: 'Pass recorded'
    });

  } catch (error) {
    console.error('❌ Pass user error:', error);
    res.status(500).json({ 
      error: 'Failed to process pass' 
    });
  }
});

// DELETE /api/matching/user/:userId
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🗑️ Removing user from matching: ${userId}`);

    await matchingService.removeUserFromMatching(userId);

    res.json({
      success: true,
      message: 'User removed from matching successfully'
    });

  } catch (error) {
    console.error('❌ Remove user from matching error:', error);
    res.status(500).json({ 
      error: 'Failed to remove user from matching' 
    });
  }
});

// GET /api/matching/debug/queue
router.get('/debug/queue', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Debug endpoints only available in development' });
    }

    const stats = await matchingService.getMatchingStats();
    
    res.json({
      queue: Array.from(matchingService.matchingQueue),
      stats: stats,
      activeProcesses: Array.from(matchingService.activeMatchingProcess.keys())
    });

  } catch (error) {
    console.error('❌ Debug queue error:', error);
    res.status(500).json({ 
      error: 'Failed to get debug info' 
    });
  }
});

module.exports = router;