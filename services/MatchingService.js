// services/MatchingService.js - Backend
// Save in: backend/services/MatchingService.js

const UserService = require('./UserService');
const { SoulAICommunication } = require('./SoulAICommunication');

class MatchingService {
  constructor() {
    this.userService = new UserService();
    this.soulAIComm = new SoulAICommunication();
    this.matches = new Map(); // Store match relationships
    this.pendingMatches = new Map(); // Store pending matches
    this.matchingQueue = new Set(); // Users ready for matching
    this.activeMatchingProcess = new Map(); // Track ongoing matching processes
    
    console.log('💕 Matching Service initialized');
    
    // Start background matching process
    this.startBackgroundMatching();
  }

  // Add user to matching queue
  async addToMatchingQueue(userId) {
    const user = await this.userService.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.profile.completeness >= 70) {
      this.matchingQueue.add(userId);
      console.log(`🎯 Added user ${userId} to matching queue`);
      
      // Trigger immediate matching attempt
      await this.processUserMatching(userId);
    } else {
      console.log(`⏳ User ${userId} profile not complete enough for matching (${user.profile.completeness}%)`);
    }
  }

  // Process matching for a specific user
  async processUserMatching(userId) {
    if (this.activeMatchingProcess.has(userId)) {
      console.log(`⚠️ Matching already in progress for user ${userId}`);
      return;
    }

    this.activeMatchingProcess.set(userId, true);

    try {
      console.log(`🔍 Processing matches for user: ${userId}`);
      
      const potentialMatches = await this.userService.findPotentialMatches(userId, 5);
      
      for (const potentialMatch of potentialMatches) {
        await this.evaluateMatch(userId, potentialMatch.userId, potentialMatch.compatibility);
      }
      
    } catch (error) {
      console.error(`❌ Error processing matches for user ${userId}:`, error);
    } finally {
      this.activeMatchingProcess.delete(userId);
    }
  }

  // Evaluate if two users should be matched
  async evaluateMatch(userId1, userId2, existingCompatibility = null) {
    const matchId = this.generateMatchId(userId1, userId2);
    
    // Check if already evaluated
    if (this.matches.has(matchId) || this.pendingMatches.has(matchId)) {
      return;
    }

    console.log(`🤖➡️🤖 Evaluating match: ${userId1} ↔ ${userId2}`);

    // Get or calculate compatibility through SoulAI communication
    let compatibility = existingCompatibility;
    if (!compatibility) {
      compatibility = await this.soulAIComm.analyzeCompatibility(userId1, userId2);
    }

    if (!compatibility) {
      console.log(`❌ Could not analyze compatibility: ${matchId}`);
      return;
    }

    // Determine match status based on compatibility
    if (compatibility.compatibilityScore >= 0.8) {
      // High compatibility - create confirmed match
      await this.createMatch(userId1, userId2, compatibility, 'confirmed');
    } else if (compatibility.compatibilityScore >= 0.6) {
      // Medium compatibility - create pending match
      await this.createPendingMatch(userId1, userId2, compatibility);
    } else {
      // Low compatibility - no match
      console.log(`📊 Low compatibility (${compatibility.compatibilityScore}): ${matchId}`);
    }
  }

  // Create a confirmed match
  async createMatch(userId1, userId2, compatibility, status = 'confirmed') {
    const matchId = this.generateMatchId(userId1, userId2);
    
    const match = {
      id: matchId,
      users: [userId1, userId2],
      status: status, // confirmed, pending, expired
      compatibility: compatibility,
      createdAt: new Date(),
      lastInteraction: new Date(),
      conversationStarted: false,
      soulAIRecommendation: compatibility.recommendation || 'strong_match'
    };

    this.matches.set(matchId, match);
    
    // Remove from pending if it exists
    this.pendingMatches.delete(matchId);

    console.log(`💕 Created ${status} match: ${matchId} (score: ${compatibility.compatibilityScore})`);

    // Notify both users
    await this.notifyUsersOfMatch(userId1, userId2, match);

    return match;
  }

  // Create a pending match (waiting for additional confirmation)
  async createPendingMatch(userId1, userId2, compatibility) {
    const matchId = this.generateMatchId(userId1, userId2);
    
    const pendingMatch = {
      id: matchId,
      users: [userId1, userId2],
      status: 'pending',
      compatibility: compatibility,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      reason: 'awaiting_additional_analysis',
      soulAIRecommendation: 'potential_match'
    };

    this.pendingMatches.set(matchId, pendingMatch);

    console.log(`⏳ Created pending match: ${matchId} (score: ${compatibility.compatibilityScore})`);

    // Schedule re-evaluation
    setTimeout(() => {
      this.reevaluatePendingMatch(matchId);
    }, 6 * 60 * 60 * 1000); // Re-evaluate in 6 hours

    return pendingMatch;
  }

  // Re-evaluate a pending match
  async reevaluatePendingMatch(matchId) {
    const pendingMatch = this.pendingMatches.get(matchId);
    
    if (!pendingMatch) return;

    const [userId1, userId2] = pendingMatch.users;
    
    console.log(`🔄 Re-evaluating pending match: ${matchId}`);

    // Get updated compatibility (users may have had more conversations)
    const updatedCompatibility = await this.soulAIComm.analyzeCompatibility(userId1, userId2);

    if (updatedCompatibility.compatibilityScore >= 0.8) {
      // Promote to confirmed match
      await this.createMatch(userId1, userId2, updatedCompatibility, 'confirmed');
    } else if (new Date() > pendingMatch.expiresAt) {
      // Expired - remove from pending
      this.pendingMatches.delete(matchId);
      console.log(`⏰ Pending match expired: ${matchId}`);
    }
  }

  // Get matches for a user
  async getUserMatches(userId) {
    const userMatches = [];
    const userPending = [];

    // Get confirmed matches
    for (const [matchId, match] of this.matches) {
      if (match.users.includes(userId)) {
        const otherUserId = match.users.find(id => id !== userId);
        const otherUser = await this.userService.getUserById(otherUserId);
        
        userMatches.push({
          matchId,
          user: otherUser,
          match: match,
          status: 'confirmed'
        });
      }
    }

    // Get pending matches
    for (const [matchId, pendingMatch] of this.pendingMatches) {
      if (pendingMatch.users.includes(userId)) {
        const otherUserId = pendingMatch.users.find(id => id !== userId);
        const otherUser = await this.userService.getUserById(otherUserId);
        
        userPending.push({
          matchId,
          user: otherUser,
          match: pendingMatch,
          status: 'pending'
        });
      }
    }

    return {
      matches: userMatches,
      pending: userPending
    };
  }

  // Start conversation between matched users
  async startConversation(matchId, userId) {
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    if (!match.users.includes(userId)) {
      throw new Error('User not part of this match');
    }

    match.conversationStarted = true;
    match.lastInteraction = new Date();
    
    this.matches.set(matchId, match);

    console.log(`💬 Conversation started for match: ${matchId}`);

    return match;
  }

  // Background matching process
  startBackgroundMatching() {
    setInterval(async () => {
      try {
        await this.runBackgroundMatching();
      } catch (error) {
        console.error('❌ Background matching error:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  async runBackgroundMatching() {
    const readyUsers = await this.userService.getUsersReadyForMatching();
    
    console.log(`🔄 Background matching: ${readyUsers.length} users ready`);

    // Process users in matching queue
    for (const userId of this.matchingQueue) {
      if (!this.activeMatchingProcess.has(userId)) {
        await this.processUserMatching(userId);
      }
    }

    // Clean up expired pending matches
    await this.cleanupExpiredMatches();
  }

  async cleanupExpiredMatches() {
    const now = new Date();
    const expiredMatches = [];

    for (const [matchId, pendingMatch] of this.pendingMatches) {
      if (now > pendingMatch.expiresAt) {
        expiredMatches.push(matchId);
      }
    }

    expiredMatches.forEach(matchId => {
      this.pendingMatches.delete(matchId);
      console.log(`🗑️ Removed expired pending match: ${matchId}`);
    });
  }

  // Analytics and reporting
  async getMatchingStats() {
    return {
      totalMatches: this.matches.size,
      pendingMatches: this.pendingMatches.size,
      usersInQueue: this.matchingQueue.size,
      activeProcesses: this.activeMatchingProcess.size,
      averageCompatibilityScore: this.calculateAverageCompatibility(),
      matchingSuccessRate: this.calculateSuccessRate()
    };
  }

  calculateAverageCompatibility() {
    if (this.matches.size === 0) return 0;
    
    let totalScore = 0;
    for (const [_, match] of this.matches) {
      totalScore += match.compatibility.compatibilityScore;
    }
    
    return totalScore / this.matches.size;
  }

  calculateSuccessRate() {
    const total = this.matches.size + this.pendingMatches.size;
    return total === 0 ? 0 : (this.matches.size / total) * 100;
  }

  // Helper methods
  generateMatchId(userId1, userId2) {
    // Ensure consistent ID regardless of user order
    const sortedUsers = [userId1, userId2].sort();
    return `match_${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  async notifyUsersOfMatch(userId1, userId2, match) {
    // In production, this would send push notifications or update real-time UI
    console.log(`📧 Notifying users of new match: ${userId1}, ${userId2}`);
    
    // Here you would:
    // 1. Send push notifications
    // 2. Update user's app state via WebSocket
    // 3. Log the event for analytics
  }

  // Remove user from matching (when they delete account, etc.)
  async removeUserFromMatching(userId) {
    this.matchingQueue.delete(userId);
    this.activeMatchingProcess.delete(userId);
    
    // Remove matches involving this user
    const matchesToRemove = [];
    for (const [matchId, match] of this.matches) {
      if (match.users.includes(userId)) {
        matchesToRemove.push(matchId);
      }
    }
    
    matchesToRemove.forEach(matchId => {
      this.matches.delete(matchId);
      console.log(`🗑️ Removed match due to user deletion: ${matchId}`);
    });
  }
}

module.exports = MatchingService;