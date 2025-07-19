// SoulAI_Backend/services/SoulAIIntegrationService.js
// Main integration service that connects all AI agents with the app

import { SoulAIOrchestratorAgent } from './AIAgentNetwork.js';
import { loveWisdomDatabase } from '../data/knowledgeBase/loveWisdom.js';
import { UserModel } from '../models/UserModel.js';
import { ConversationModel } from '../models/ConversationModel.js';

export class SoulAIIntegrationService {
  constructor() {
    this.activeOrchestrators = new Map(); // userId -> OrchestratorAgent
    this.conversationCache = new Map();
    this.personalityProfiles = new Map();
  }

  // Initialize SoulAI for a user
  async initializeSoulAI(userId) {
    try {
      // Load user profile
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create orchestrator
      const orchestrator = new SoulAIOrchestratorAgent(userId);
      
      // Load previous conversations if any
      const conversations = await ConversationModel.find({ userId }).limit(50);
      if (conversations.length > 0) {
        orchestrator.conversationHistory = conversations.map(conv => ({
          type: conv.sender === 'user' ? 'user' : 'ai',
          message: conv.message,
          timestamp: conv.timestamp,
          metadata: conv.metadata || {}
        }));
      }

      // Store orchestrator
      this.activeOrchestrators.set(userId, orchestrator);

      return {
        success: true,
        welcomeMessage: this.generateWelcomeMessage(user),
        orchestratorId: userId
      };

    } catch (error) {
      console.error('SoulAI Initialization Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackMessage: "I'm here to help you on your journey of meaningful connection."
      };
    }
  }

  // Process user message through AI network
  async processMessage(userId, message, context = {}) {
    try {
      const orchestrator = this.activeOrchestrators.get(userId);
      if (!orchestrator) {
        await this.initializeSoulAI(userId);
        return this.processMessage(userId, message, context);
      }

      // Process through AI network
      const aiResponse = await orchestrator.processUserMessage(message, context);

      // Save conversation to database
      await this.saveConversation(userId, message, aiResponse);

      // Update user personality profile
      await this.updateUserProfile(userId, aiResponse.metadata);

      return {
        success: true,
        response: aiResponse.text,
        type: aiResponse.type,
        metadata: {
          personalityInsights: aiResponse.metadata.personalityInsights,
          conversationQuality: aiResponse.metadata.conversationQuality,
          suggestions: aiResponse.metadata.suggestions || []
        }
      };

    } catch (error) {
      console.error('Message Processing Error:', error);
      return {
        success: false,
        response: "I'm thinking deeply about what you've shared. Could you tell me more?",
        type: 'fallback',
        error: error.message
      };
    }
  }

  // Get compatibility analysis between two users
  async analyzeCompatibility(userId1, userId2) {
    try {
      const orchestrator1 = this.activeOrchestrators.get(userId1);
      const orchestrator2 = this.activeOrchestrators.get(userId2);

      if (!orchestrator1 || !orchestrator2) {
        throw new Error('One or both users not initialized');
      }

      const compatibilityAgent = orchestrator1.activeAgents.get('compatibility');
      const user1Profile = await this.getUserProfile(userId1);
      const user2Profile = await this.getUserProfile(userId2);

      const compatibility = await compatibilityAgent.analyzeCompatibility(
        user1Profile,
        user2Profile
      );

      return {
        success: true,
        compatibility: compatibility.totalCompatibility,
        breakdown: compatibility.breakdown,
        recommendation: compatibility.recommendation,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Compatibility Analysis Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackCompatibility: 65 // Default moderate compatibility
      };
    }
  }

  // Get conversation coaching suggestions
  async getConversationCoaching(userId, potentialMessage) {
    try {
      const orchestrator = this.activeOrchestrators.get(userId);
      if (!orchestrator) {
        throw new Error('User not initialized');
      }

      const coachingAgent = orchestrator.activeAgents.get('conversation');
      const analysis = await coachingAgent.analyzeConversation(
        potentialMessage,
        orchestrator.conversationHistory
      );

      return {
        success: true,
        suggestions: analysis.suggestions,
        quality: analysis.conversationQuality,
        tips: this.generateConversationTips(analysis)
      };

    } catch (error) {
      console.error('Conversation Coaching Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackTips: ["Be authentic and curious about the other person"]
      };
    }
  }

  // Get personality insights for user
  async getPersonalityInsights(userId) {
    try {
      const orchestrator = this.activeOrchestrators.get(userId);
      if (!orchestrator) {
        throw new Error('User not initialized');
      }

      const personalityAgent = orchestrator.activeAgents.get('personality');
      const profile = personalityAgent.personalityProfile;

      return {
        success: true,
        mbtiType: profile.mbtiType,
        bigFiveScores: profile.bigFiveScores,
        valueSystem: profile.valueSystem,
        communicationStyle: profile.communicationStyle,
        confidence: personalityAgent.calculateConfidence([]),
        insights: personalityAgent.generateInsights([])
      };

    } catch (error) {
      console.error('Personality Insights Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackInsights: "Your personality is still being discovered through our conversations"
      };
    }
  }

  // Get relationship advice
  async getRelationshipAdvice(userId, situation) {
    try {
      const orchestrator = this.activeOrchestrators.get(userId);
      if (!orchestrator) {
        throw new Error('User not initialized');
      }

      const relationshipAgent = orchestrator.activeAgents.get('relationship');
      const advice = await relationshipAgent.generateAdvice(
        situation,
        orchestrator.activeAgents.get('personality').personalityProfile,
        orchestrator.conversationHistory
      );

      return {
        success: true,
        advice,
        stage: relationshipAgent.relationshipStage,
        readiness: await relationshipAgent.assessRelationshipReadiness(
          orchestrator.conversationHistory
        )
      };

    } catch (error) {
      console.error('Relationship Advice Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackAdvice: "Focus on being authentic and practicing self-love. " + 
                       loveWisdomDatabase.keyInsights[0]
      };
    }
  }

  // Generate matching recommendations
  async generateMatchingStrategy(userId) {
    try {
      const orchestrator = this.activeOrchestrators.get(userId);
      if (!orchestrator) {
        throw new Error('User not initialized');
      }

      const matchingAgent = orchestrator.activeAgents.get('matching');
      const personalityAgent = orchestrator.activeAgents.get('personality');

      const strategy = await matchingAgent.generateMatchingAdvice(
        "What kind of person would be compatible with me?",
        personalityAgent.personalityProfile,
        orchestrator.conversationHistory
      );

      return {
        success: true,
        strategy,
        idealPartnerTraits: this.generateIdealPartnerTraits(personalityAgent.personalityProfile),
        matchingTips: this.generateMatchingTips(personalityAgent.personalityProfile)
      };

    } catch (error) {
      console.error('Matching Strategy Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackStrategy: "Focus on finding someone who shares your core values and communication style"
      };
    }
  }

  // Helper method to save conversation
  async saveConversation(userId, userMessage, aiResponse) {
    try {
      // Save user message
      await ConversationModel.create({
        userId,
        sender: 'user',
        message: userMessage,
        timestamp: new Date()
      });

      // Save AI response
      await ConversationModel.create({
        userId,
        sender: 'ai',
        message: aiResponse.text,
        timestamp: new Date(),
        metadata: aiResponse.metadata
      });

    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  // Helper method to update user profile with AI insights
  async updateUserProfile(userId, aiMetadata) {
    try {
      const updates = {};

      // Update personality insights
      if (aiMetadata.personalityInsights) {
        updates.personalityType = aiMetadata.personalityInsights.personalityTraits?.mbtiType;
        updates.bigFiveScores = aiMetadata.personalityInsights.personalityTraits?.bigFiveScores;
        updates.aiInsights = aiMetadata.personalityInsights.insights;
      }

      // Update conversation patterns
      if (aiMetadata.conversationQuality) {
        updates.conversationPatterns = {
          quality: aiMetadata.conversationQuality,
          lastUpdated: new Date()
        };
      }

      await UserModel.findByIdAndUpdate(userId, {
        $set: updates,
        $push: {
          aiLearnings: {
            timestamp: new Date(),
            insights: aiMetadata
          }
        }
      });

    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  // Helper method to get comprehensive user profile
  async getUserProfile(userId) {
    try {
      const user = await UserModel.findById(userId);
      const orchestrator = this.activeOrchestrators.get(userId);

      return {
        id: userId,
        basicInfo: {
          name: user.name,
          age: user.age,
          location: user.location,
          interests: user.interests
        },
        personalityType: user.personalityType,
        bigFiveScores: user.bigFiveScores || {},
        valueSystem: orchestrator?.activeAgents.get('personality').personalityProfile.valueSystem || [],
        communicationStyle: user.communicationStyle,
        relationshipStage: orchestrator?.activeAgents.get('relationship').relationshipStage || 'discovery'
      };

    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Helper method to generate welcome message
  generateWelcomeMessage(user) {
    const welcomeMessages = [
      `Hi ${user.name}! I'm Soul AI, your companion in discovering meaningful connections.`,
      `Welcome back, ${user.name}! Ready to explore the art of authentic connection?`,
      `Hello ${user.name}! I'm here to help you understand yourself and find genuine compatibility.`
    ];

    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  }

  // Helper method to generate conversation tips
  generateConversationTips(analysis) {
    const tips = [];

    if (analysis.conversationQuality < 0.6) {
      tips.push("Try asking more open-ended questions");
      tips.push("Share something personal to encourage reciprocity");
    }

    if (analysis.suggestions) {
      tips.push(...analysis.suggestions);
    }

    // Add wisdom from love database
    tips.push(loveWisdomDatabase.practicalApplications.dailyPractices[
      Math.floor(Math.random() * loveWisdomDatabase.practicalApplications.dailyPractices.length)
    ]);

    return tips;
  }

  // Helper method to generate ideal partner traits
  generateIdealPartnerTraits(personalityProfile) {
    const traits = [];

    if (personalityProfile.mbtiType) {
      // Add complementary MBTI traits
      if (personalityProfile.mbtiType.includes('E')) {
        traits.push("Someone who can appreciate your social energy");
        traits.push("A partner who enjoys shared activities and conversations");
      } else if (personalityProfile.mbtiType.includes('I')) {
        traits.push("Someone who values deep, meaningful conversations");
        traits.push("A partner who respects your need for quiet time");
      }

      if (personalityProfile.mbtiType.includes('N')) {
        traits.push("Someone who shares your love for possibilities and ideas");
        traits.push("A partner who appreciates creativity and innovation");
      } else if (personalityProfile.mbtiType.includes('S')) {
        traits.push("Someone who is practical and grounded");
        traits.push("A partner who enjoys shared experiences and activities");
      }

      if (personalityProfile.mbtiType.includes('F')) {
        traits.push("Someone who values emotional connection and empathy");
        traits.push("A partner who shares your focus on harmony and values");
      } else if (personalityProfile.mbtiType.includes('T')) {
        traits.push("Someone who appreciates logical discussion and analysis");
        traits.push("A partner who can engage in intellectual conversations");
      }
    }

    // Add traits based on values
    if (personalityProfile.valueSystem.includes('family')) {
      traits.push("Someone who values family and close relationships");
    }
    if (personalityProfile.valueSystem.includes('adventure')) {
      traits.push("A partner who enjoys exploring and trying new experiences");
    }
    if (personalityProfile.valueSystem.includes('authenticity')) {
      traits.push("Someone who values honesty and genuine connection");
    }

    return traits.slice(0, 5); // Return top 5 traits
  }

  // Helper method to generate matching tips
  generateMatchingTips(personalityProfile) {
    const tips = [];

    // Add personality-specific tips
    if (personalityProfile.mbtiType) {
      if (personalityProfile.mbtiType.includes('I')) {
        tips.push("Take time to recharge between dates");
        tips.push("Choose activities that allow for meaningful conversation");
      }
      if (personalityProfile.mbtiType.includes('E')) {
        tips.push("Don't be afraid to suggest group activities early on");
        tips.push("Your enthusiasm is attractive - let it show naturally");
      }
      if (personalityProfile.mbtiType.includes('F')) {
        tips.push("Trust your emotional intuition about compatibility");
        tips.push("Look for someone who shares your values and empathy");
      }
      if (personalityProfile.mbtiType.includes('T')) {
        tips.push("Balance logical analysis with emotional connection");
        tips.push("Don't overthink - some things need to be felt");
      }
    }

    // Add general wisdom from love database
    tips.push(...loveWisdomDatabase.practicalApplications.relationshipGuidelines.slice(0, 2));

    return tips;
  }

  // Cleanup method for when user disconnects
  cleanupUser(userId) {
    this.activeOrchestrators.delete(userId);
    this.conversationCache.delete(userId);
    this.personalityProfiles.delete(userId);
  }

  // Get system health and statistics
  getSystemStats() {
    return {
      activeUsers: this.activeOrchestrators.size,
      totalConversations: Array.from(this.activeOrchestrators.values())
        .reduce((sum, orchestrator) => sum + orchestrator.conversationHistory.length, 0),
      averagePersonalityConfidence: this.calculateAverageConfidence(),
      systemHealth: 'optimal'
    };
  }

  calculateAverageConfidence() {
    const orchestrators = Array.from(this.activeOrchestrators.values());
    if (orchestrators.length === 0) return 0;

    const totalConfidence = orchestrators.reduce((sum, orchestrator) => {
      const personalityAgent = orchestrator.activeAgents.get('personality');
      return sum + (personalityAgent?.calculateConfidence([]) || 0);
    }, 0);

    return totalConfidence / orchestrators.length;
  }
}

// Export singleton instance
export const soulAIService = new SoulAIIntegrationService();