// SoulAI_Backend/routes/matchRoutes.js
import express from 'express';
const router = express.Router();

// Basic matching endpoints
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock matches data
    const mockMatches = [
      {
        id: 'match1',
        name: 'Sarah',
        age: 24,
        photos: ['https://i.pravatar.cc/400?img=5'],
        compatibility: 85,
        distance: '2 miles away'
      },
      {
        id: 'match2',
        name: 'Emma',
        age: 26,
        photos: ['https://i.pravatar.cc/400?img=6'],
        compatibility: 78,
        distance: '5 miles away'
      }
    ];
    
    res.json({
      success: true,
      matches: mockMatches,
      total: mockMatches.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get matches',
      details: error.message
    });
  }
});

router.post('/swipe', async (req, res) => {
  try {
    const { userId, targetUserId, action } = req.body; // action: 'like' or 'pass'
    
    // Mock swipe logic
    const isMatch = action === 'like' && Math.random() > 0.7; // 30% match rate
    
    res.json({
      success: true,
      action,
      isMatch,
      message: isMatch ? "It's a match! 🎉" : 'Swipe recorded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process swipe',
      details: error.message
    });
  }
});

router.get('/discovery/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock discovery stack
    const mockProfiles = [
      {
        id: 'profile1',
        name: 'Alex',
        age: 27,
        photos: ['https://i.pravatar.cc/400?img=7'],
        bio: 'Love hiking and good coffee ☕',
        distance: 3
      },
      {
        id: 'profile2',
        name: 'Jordan',
        age: 25,
        photos: ['https://i.pravatar.cc/400?img=8'],
        bio: 'Artist and adventurer 🎨',
        distance: 1
      }
    ];
    
    res.json({
      success: true,
      profiles: mockProfiles,
      total: mockProfiles.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get discovery profiles',
      details: error.message
    });
  }
});

export default router;