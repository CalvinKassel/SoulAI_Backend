const express = require('express');
const router = express.Router();

// POST /api/profile/update
router.post('/update', async (req, res) => {
  try {
    const { userId, profileData } = req.body;

    if (!userId || !profileData) {
      return res.status(400).json({ 
        error: 'User ID and profile data are required' 
      });
    }

    console.log('📝 Updating profile for user:', userId);

    // For now, return mock success - integrate with your database later
    const updatedProfile = {
      ...profileData,
      userId,
      lastUpdated: new Date().toISOString(),
      completeness: calculateProfileCompleteness(profileData)
    };

    res.json({
      success: true,
      profile: updatedProfile
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile' 
    });
  }
});

// GET /api/profile/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📖 Getting profile for user:', userId);

    // For now, return mock profile - integrate with your database later
    const mockProfile = {
      userId,
      name: 'User',
      age: 25,
      personalityType: null,
      interests: [],
      values: [],
      relationshipGoals: '',
      aboutMe: '',
      photos: [],
      completeness: 20,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    res.json({ profile: mockProfile });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile' 
    });
  }
});

// POST /api/profile/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { profileData } = req.body;

    if (!profileData) {
      return res.status(400).json({ 
        error: 'Profile data is required' 
      });
    }

    const analysis = {
      completeness: calculateProfileCompleteness(profileData),
      missingFields: identifyMissingFields(profileData),
      suggestions: generateProfileSuggestions(profileData),
      strengthAreas: identifyStrengthAreas(profileData)
    };

    res.json({ analysis });

  } catch (error) {
    console.error('❌ Profile analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze profile' 
    });
  }
});

function calculateProfileCompleteness(profileData) {
  const fields = [
    'name', 'age', 'personalityType', 'interests', 
    'values', 'relationshipGoals', 'aboutMe', 'photos'
  ];
  
  let completedFields = 0;
  
  fields.forEach(field => {
    if (profileData[field]) {
      if (Array.isArray(profileData[field])) {
        if (profileData[field].length > 0) completedFields++;
      } else {
        completedFields++;
      }
    }
  });
  
  return Math.round((completedFields / fields.length) * 100);
}

function identifyMissingFields(profileData) {
  const missingFields = [];
  
  if (!profileData.name) missingFields.push('name');
  if (!profileData.age) missingFields.push('age');
  if (!profileData.personalityType) missingFields.push('personalityType');
  if (!profileData.interests || profileData.interests.length === 0) missingFields.push('interests');
  if (!profileData.values || profileData.values.length === 0) missingFields.push('values');
  if (!profileData.relationshipGoals) missingFields.push('relationshipGoals');
  if (!profileData.aboutMe) missingFields.push('aboutMe');
  if (!profileData.photos || profileData.photos.length === 0) missingFields.push('photos');
  
  return missingFields;
}

function generateProfileSuggestions(profileData) {
  const suggestions = [];
  
  if (!profileData.personalityType) {
    suggestions.push("Take our personality assessment to help find better matches");
  }
  
  if (!profileData.interests || profileData.interests.length < 3) {
    suggestions.push("Add more interests to show your personality");
  }
  
  if (!profileData.aboutMe || profileData.aboutMe.length < 50) {
    suggestions.push("Write more about yourself to stand out");
  }
  
  if (!profileData.photos || profileData.photos.length < 2) {
    suggestions.push("Add more photos to showcase your personality");
  }
  
  return suggestions;
}

function identifyStrengthAreas(profileData) {
  const strengths = [];
  
  if (profileData.personalityType) {
    strengths.push('Personality type defined');
  }
  
  if (profileData.interests && profileData.interests.length >= 3) {
    strengths.push('Rich interest profile');
  }
  
  if (profileData.aboutMe && profileData.aboutMe.length >= 100) {
    strengths.push('Detailed self-description');
  }
  
  if (profileData.values && profileData.values.length >= 2) {
    strengths.push('Clear value system');
  }
  
  return strengths;
}

module.exports = router;