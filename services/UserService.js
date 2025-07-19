// services/UserService.js - Backend
// Save in: backend/services/UserService.js

const { SoulAICommunication } = require('./SoulAICommunication');

class UserService {
  constructor() {
    this.users = new Map(); // In production: replace with database
    this.soulAIComm = new SoulAICommunication();
    this.userProfiles = new Map();
    this.userSessions = new Map();
    
    console.log('👥 User Service initialized');
  }

  // Create new user account
  async createUser(userData) {
    const userId = this.generateUserId();
    
    const user = {
      id: userId,
      email: userData.email,
      name: userData.name,
      age: userData.age,
      location: userData.location,
      photos: userData.photos || [],
      createdAt: new Date(),
      lastActive: new Date(),
      isOnline: true,
      profile: {
        personalityType: null,
        interests: [],
        values: [],
        dealBreakers: [],
        relationshipGoals: '',
        aboutMe: '',
        completeness: 0,
        lifestyle: [],
        communicationStyle: 'unknown'
      },
      preferences: {
        ageRange: { min: 22, max: 35 },
        maxDistance: 50,
        dealBreakers: []
      },
      soulAIPersonality: this.generateSoulAIPersonality(),
      matchingStatus: 'new_user' // new_user, building_profile, ready_for_matches, actively_matching
    };

    this.users.set(userId, user);
    this.userProfiles.set(userId, user.profile);
    
    // Create personal SoulAI instance
    const personalSoulAI = this.soulAIComm.createPersonalSoulAI(userId, user.profile);
    
    console.log(`✨ Created user: ${userId} with personal SoulAI`);
    return user;
  }

  // Get user by ID
  async getUserById(userId) {
    return this.users.get(userId);
  }

  // Update user profile
  async updateUserProfile(userId, profileUpdates) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Merge profile updates
    user.profile = { ...user.profile, ...profileUpdates };
    user.profile.completeness = this.calculateProfileCompleteness(user.profile);
    user.lastActive = new Date();

    // Update matching status based on completeness
    if (user.profile.completeness >= 70 && user.matchingStatus === 'building_profile') {
      user.matchingStatus = 'ready_for_matches';
      console.log(`🎯 User ${userId} is now ready for matches!`);
    }

    this.users.set(userId, user);
    this.userProfiles.set(userId, user.profile);

    return user;
  }

  // Process conversation with user's SoulAI
  async processUserConversation(userId, message, conversationHistory) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update last active
    user.lastActive = new Date();
    user.isOnline = true;

    // Process through SoulAI
    const response = await this.soulAIComm.processUserMessage(
      userId, 
      message, 
      conversationHistory
    );

    // Check if profile should be updated based on conversation
    const profileUpdates = await this.extractProfileUpdatesFromConversation(
      message, 
      user.profile
    );

    if (Object.keys(profileUpdates).length > 0) {
      await this.updateUserProfile(userId, profileUpdates);
      console.log(`📊 Updated profile for user ${userId}:`, profileUpdates);
    }

    return {
      response,
      profileUpdates,
      profileCompleteness: user.profile.completeness,
      matchingStatus: user.matchingStatus
    };
  }

  // Find potential matches for a user
  async findPotentialMatches(userId, limit = 10) {
    const user = this.users.get(userId);
    if (!user || user.matchingStatus !== 'ready_for_matches') {
      return [];
    }

    const potentialMatches = [];
    
    for (const [candidateId, candidate] of this.users) {
      if (candidateId === userId) continue;
      if (candidate.matchingStatus !== 'ready_for_matches') continue;
      
      // Basic filtering
      if (!this.meetsBasicCriteria(user, candidate)) continue;

      // Calculate compatibility through SoulAI
      const compatibility = await this.soulAIComm.analyzeCompatibility(userId, candidateId);
      
      if (compatibility && compatibility.compatibilityScore >= 0.6) {
        potentialMatches.push({
          userId: candidateId,
          profile: candidate,
          compatibility: compatibility
        });
      }
    }

    // Sort by compatibility score
    potentialMatches.sort((a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore);
    
    return potentialMatches.slice(0, limit);
  }

  // Get users ready for matching
  async getUsersReadyForMatching() {
    const readyUsers = [];
    
    for (const [userId, user] of this.users) {
      if (user.matchingStatus === 'ready_for_matches' && user.isOnline) {
        readyUsers.push({
          userId,
          profile: user.profile,
          lastActive: user.lastActive
        });
      }
    }

    return readyUsers;
  }

  // Update user's online status
  async updateUserStatus(userId, isOnline) {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastActive = new Date();
      this.users.set(userId, user);
    }
  }

  // Helper methods
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSoulAIPersonality() {
    const personalities = [
      { style: 'empathetic_guide', approach: 'socratic_questioning' },
      { style: 'curious_explorer', approach: 'storytelling' },
      { style: 'wise_mentor', approach: 'reflective_mirroring' },
      { style: 'playful_companion', approach: 'gentle_humor' }
    ];
    
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  calculateProfileCompleteness(profile) {
    const requiredFields = [
      'personalityType', 'interests', 'values', 'relationshipGoals', 
      'aboutMe', 'communicationStyle', 'lifestyle'
    ];
    
    let completedFields = 0;
    
    requiredFields.forEach(field => {
      if (profile[field]) {
        if (Array.isArray(profile[field])) {
          if (profile[field].length > 0) completedFields++;
        } else if (profile[field] !== '' && profile[field] !== 'unknown') {
          completedFields++;
        }
      }
    });
    
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  async extractProfileUpdatesFromConversation(message, currentProfile) {
    const updates = {};
    const lowerMessage = message.toLowerCase();
    
    // Extract interests
    const interestKeywords = {
      'travel': ['travel', 'trip', 'vacation', 'explore'],
      'fitness': ['gym', 'workout', 'exercise', 'fitness'],
      'cooking': ['cook', 'recipe', 'food', 'kitchen'],
      'reading': ['read', 'book', 'novel', 'literature'],
      'music': ['music', 'song', 'concert', 'instrument'],
      'art': ['art', 'painting', 'drawing', 'creative'],
      'technology': ['tech', 'coding', 'computer', 'software'],
      'outdoors': ['hiking', 'camping', 'nature', 'outdoor']
    };

    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        if (!currentProfile.interests.includes(interest)) {
          updates.interests = [...currentProfile.interests, interest];
        }
      }
    }

    // Extract values
    if (lowerMessage.includes('honest') || lowerMessage.includes('truth')) {
      if (!currentProfile.values.includes('honesty')) {
        updates.values = [...currentProfile.values, 'honesty'];
      }
    }

    if (lowerMessage.includes('family') || lowerMessage.includes('children')) {
      if (!currentProfile.values.includes('family')) {
        updates.values = [...currentProfile.values, 'family'];
      }
    }

    // Extract relationship goals
    if (lowerMessage.includes('marriage') || lowerMessage.includes('long term')) {
      updates.relationshipGoals = 'long_term_commitment';
    }

    return updates;
  }

  meetsBasicCriteria(user1, user2) {
    // Age preference check
    const age1 = parseInt(user1.age);
    const age2 = parseInt(user2.age);
    
    if (age1 < user2.preferences.ageRange.min || age1 > user2.preferences.ageRange.max) {
      return false;
    }
    
    if (age2 < user1.preferences.ageRange.min || age2 > user1.preferences.ageRange.max) {
      return false;
    }

    // Location check (simplified - in production use proper distance calculation)
    // For now, just check if they're in the same general area
    return true;
  }

  // Get user statistics
  async getUserStats(userId) {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      profileCompleteness: user.profile.completeness,
      matchingStatus: user.matchingStatus,
      totalConversations: 0, // Would track from conversation history
      potentialMatches: await this.findPotentialMatches(userId),
      lastActive: user.lastActive,
      joinedDate: user.createdAt
    };
  }
}

module.exports = UserService;