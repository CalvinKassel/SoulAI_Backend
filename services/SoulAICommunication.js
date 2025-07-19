// services/SoulAICommunication.js
// Save this in: backend/services/SoulAICommunication.js

const LangChainService = require('./LangChainService');

class SoulAICommunication {
  constructor() {
    this.langChainService = new LangChainService();
    this.userSoulAIs = new Map(); // Store each user's SoulAI instance
    this.activeConversations = new Map(); // SoulAI to SoulAI conversations
    this.matchRecommendations = new Map(); // Store match recommendations
    
    console.log('🤖 SoulAI Communication System initialized');
  }

  // Create a personal SoulAI for a user
  createPersonalSoulAI(userId, userProfile) {
    const personalSoulAI = new PersonalSoulAI(userId, userProfile, this.langChainService);
    this.userSoulAIs.set(userId, personalSoulAI);
    
    console.log(`✨ Created personal SoulAI for user: ${userId}`);
    return personalSoulAI;
  }

  // Get user's personal SoulAI
  getUserSoulAI(userId) {
    return this.userSoulAIs.get(userId);
  }

  // Process user message through their personal SoulAI
  async processUserMessage(userId, message, conversationHistory) {
    const userSoulAI = this.getUserSoulAI(userId);
    
    if (!userSoulAI) {
      console.error(`❌ No SoulAI found for user: ${userId}`);
      return "I'm here to help you find meaningful connections.";
    }

    return await userSoulAI.processMessage(message, conversationHistory);
  }

  // Initiate SoulAI to SoulAI matching conversation
  async initiateSoulAIMatching(userId1, userId2) {
    const soulAI1 = this.getUserSoulAI(userId1);
    const soulAI2 = this.getUserSoulAI(userId2);

    if (!soulAI1 || !soulAI2) {
      console.error('❌ Cannot initiate matching - missing SoulAI instances');
      return null;
    }

    const conversationId = `${userId1}-${userId2}`;
    const matchingConversation = new SoulAIMatchingConversation(
      conversationId, 
      soulAI1, 
      soulAI2
    );

    this.activeConversations.set(conversationId, matchingConversation);
    
    console.log(`🤖➡️🤖 Initiated SoulAI matching conversation: ${conversationId}`);
    
    // Start the conversation
    const result = await matchingConversation.begin();
    return result;
  }

  // Get compatibility analysis between two users
  async analyzeCompatibility(userId1, userId2) {
    const conversationId = `${userId1}-${userId2}`;
    const conversation = this.activeConversations.get(conversationId);
    
    if (!conversation) {
      // Create new conversation if none exists
      return await this.initiateSoulAIMatching(userId1, userId2);
    }

    return conversation.getCurrentAnalysis();
  }

  // Check if users should be presented as matches
  async shouldPresentAsMatch(userId1, userId2) {
    const analysis = await this.analyzeCompatibility(userId1, userId2);
    return analysis && analysis.compatibilityScore >= 0.8;
  }
}

class PersonalSoulAI {
  constructor(userId, userProfile, langChainService) {
    this.userId = userId;
    this.userProfile = userProfile || {};
    this.langChainService = langChainService;
    this.conversationHistory = [];
    this.insights = {
      personality_traits: [],
      values: [],
      interests: [],
      communication_style: 'unknown',
      relationship_goals: '',
      deal_breakers: []
    };
  }

  async processMessage(message, conversationHistory) {
    try {
      // Store the conversation
      this.conversationHistory.push({
        timestamp: new Date(),
        message: message,
        type: 'user_input'
      });

      // Extract insights from the message
      await this.extractInsights(message);

      // Generate contextual response
      if (this.langChainService.enabled) {
        const response = await this.langChainService.suggestChatResponse(
          this.userProfile,
          { name: 'SoulAI', role: 'companion' },
          conversationHistory,
          message
        );
        
        return response[0] || this.getDefaultResponse();
      } else {
        return this.getDefaultResponse();
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      return this.getDefaultResponse();
    }
  }

  async extractInsights(message) {
    // Simple keyword-based insight extraction
    const lowerMessage = message.toLowerCase();
    
    // Extract personality indicators
    if (lowerMessage.includes('introvert') || lowerMessage.includes('quiet') || lowerMessage.includes('alone time')) {
      this.insights.personality_traits.push('introversion');
    }
    if (lowerMessage.includes('extrovert') || lowerMessage.includes('social') || lowerMessage.includes('people')) {
      this.insights.personality_traits.push('extraversion');
    }

    // Extract values
    const valueKeywords = {
      'honesty': ['honest', 'truth', 'authentic'],
      'adventure': ['adventure', 'travel', 'explore'],
      'family': ['family', 'children', 'parents'],
      'growth': ['grow', 'learn', 'development'],
      'creativity': ['creative', 'art', 'music', 'writing']
    };

    for (const [value, keywords] of Object.entries(valueKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        if (!this.insights.values.includes(value)) {
          this.insights.values.push(value);
        }
      }
    }

    // Extract relationship goals
    if (lowerMessage.includes('marriage') || lowerMessage.includes('settle down')) {
      this.insights.relationship_goals = 'long_term_commitment';
    }
    if (lowerMessage.includes('casual') || lowerMessage.includes('fun')) {
      this.insights.relationship_goals = 'casual_dating';
    }

    console.log(`🧠 Extracted insights for user ${this.userId}:`, this.insights);
  }

  getCompatibilityFactors() {
    return {
      personality_traits: this.insights.personality_traits,
      core_values: this.insights.values.slice(0, 3), // Top 3 values
      communication_style: this.insights.communication_style,
      relationship_goals: this.insights.relationship_goals,
      deal_breakers: this.insights.deal_breakers,
      maturity_level: this.calculateMaturityLevel(),
      openness_to_experience: this.calculateOpenness()
    };
  }

  calculateMaturityLevel() {
    // Based on conversation depth and insights
    const insightCount = Object.values(this.insights).flat().length;
    if (insightCount > 10) return 'high';
    if (insightCount > 5) return 'medium';
    return 'developing';
  }

  calculateOpenness() {
    const diverseInterests = this.insights.interests.length;
    if (diverseInterests > 5) return 'high';
    if (diverseInterests > 2) return 'medium';
    return 'low';
  }

  getDefaultResponse() {
    const responses = [
      "That's really interesting. Tell me more about what's important to you.",
      "I'd love to understand more about your perspective on that.",
      "What draws you to that? I'm curious about what resonates with you.",
      "That gives me insight into who you are. What else matters to you?",
      "I appreciate you sharing that with me. What's been on your mind lately?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

class SoulAIMatchingConversation {
  constructor(conversationId, soulAI1, soulAI2) {
    this.conversationId = conversationId;
    this.soulAI1 = soulAI1;
    this.soulAI2 = soulAI2;
    this.stage = 'initial_assessment';
    this.messages = [];
    this.compatibilityAnalysis = null;
  }

  async begin() {
    console.log(`🤖➡️🤖 Beginning SoulAI conversation: ${this.conversationId}`);
    
    // SoulAI 1 gets compatibility factors from SoulAI 2
    const factors1 = this.soulAI1.getCompatibilityFactors();
    const factors2 = this.soulAI2.getCompatibilityFactors();

    // Initial assessment
    const initialAnalysis = await this.assessInitialCompatibility(factors1, factors2);
    
    this.messages.push({
      timestamp: new Date(),
      from: this.soulAI1.userId,
      to: this.soulAI2.userId,
      message: "Analyzing compatibility factors...",
      analysis: initialAnalysis
    });

    if (initialAnalysis.compatibilityScore > 0.6) {
      this.stage = 'deep_analysis';
      return await this.conductDeepAnalysis(factors1, factors2);
    } else {
      this.stage = 'incompatible';
      return {
        compatible: false,
        reason: 'Low initial compatibility score',
        compatibilityScore: initialAnalysis.compatibilityScore
      };
    }
  }

  async assessInitialCompatibility(factors1, factors2) {
    // Calculate basic compatibility
    let score = 0;
    let sharedValues = 0;
    let compatibleTraits = 0;

    // Check shared values
    const values1 = factors1.core_values || [];
    const values2 = factors2.core_values || [];
    const sharedValuesList = values1.filter(value => values2.includes(value));
    sharedValues = sharedValuesList.length;
    score += sharedValues * 0.3; // 30% weight for shared values

    // Check relationship goal compatibility
    if (factors1.relationship_goals === factors2.relationship_goals) {
      score += 0.3; // 30% weight for matching goals
    }

    // Check personality compatibility (opposites can attract)
    const personality1 = factors1.personality_traits || [];
    const personality2 = factors2.personality_traits || [];
    
    if (personality1.includes('introversion') && personality2.includes('extraversion')) {
      compatibleTraits += 0.2; // Complementary personalities
    }
    if (personality1.includes('extraversion') && personality2.includes('introversion')) {
      compatibleTraits += 0.2;
    }

    score += compatibleTraits;

    // Normalize score to 0-1 range
    score = Math.min(score, 1.0);

    return {
      compatibilityScore: score,
      sharedValues: sharedValuesList,
      analysis: {
        values_match: sharedValues > 0,
        goals_align: factors1.relationship_goals === factors2.relationship_goals,
        personality_complement: compatibleTraits > 0
      }
    };
  }

  async conductDeepAnalysis(factors1, factors2) {
    console.log(`🔍 Conducting deep compatibility analysis: ${this.conversationId}`);
    
    const analysis = await this.assessInitialCompatibility(factors1, factors2);
    
    // Enhanced analysis with more factors
    const enhancedScore = this.calculateEnhancedCompatibility(factors1, factors2, analysis);
    
    this.compatibilityAnalysis = {
      compatibilityScore: enhancedScore,
      recommendation: enhancedScore >= 0.8 ? 'strong_match' : enhancedScore >= 0.6 ? 'potential_match' : 'low_compatibility',
      factors: {
        shared_values: analysis.sharedValues,
        complementary_traits: this.findComplementaryTraits(factors1, factors2),
        potential_challenges: this.identifyPotentialChallenges(factors1, factors2)
      },
      timestamp: new Date()
    };

    return this.compatibilityAnalysis;
  }

  calculateEnhancedCompatibility(factors1, factors2, basicAnalysis) {
    let enhancedScore = basicAnalysis.compatibilityScore;
    
    // Communication style compatibility
    if (factors1.communication_style === factors2.communication_style) {
      enhancedScore += 0.1;
    }

    // Maturity level compatibility
    if (factors1.maturity_level === factors2.maturity_level) {
      enhancedScore += 0.1;
    }

    // Openness compatibility
    const openness1 = factors1.openness_to_experience;
    const openness2 = factors2.openness_to_experience;
    
    if (openness1 === openness2) {
      enhancedScore += 0.05;
    }

    // Ensure score doesn't exceed 1.0
    return Math.min(enhancedScore, 1.0);
  }

  findComplementaryTraits(factors1, factors2) {
    const complementary = [];
    
    const traits1 = factors1.personality_traits || [];
    const traits2 = factors2.personality_traits || [];
    
    if (traits1.includes('introversion') && traits2.includes('extraversion')) {
      complementary.push('social_energy_balance');
    }
    
    if (factors1.openness_to_experience === 'high' && factors2.openness_to_experience === 'medium') {
      complementary.push('adventure_stability_balance');
    }

    return complementary;
  }

  identifyPotentialChallenges(factors1, factors2) {
    const challenges = [];
    
    // Check for conflicting deal breakers
    const dealBreakers1 = factors1.deal_breakers || [];
    const dealBreakers2 = factors2.deal_breakers || [];
    
    if (dealBreakers1.length > 0 && dealBreakers2.length > 0) {
      challenges.push('potential_value_conflicts');
    }

    // Check for mismatched relationship goals
    if (factors1.relationship_goals !== factors2.relationship_goals) {
      challenges.push('different_relationship_expectations');
    }

    return challenges;
  }

  getCurrentAnalysis() {
    return this.compatibilityAnalysis;
  }
}

module.exports = {
  SoulAICommunication,
  PersonalSoulAI,
  SoulAIMatchingConversation
};