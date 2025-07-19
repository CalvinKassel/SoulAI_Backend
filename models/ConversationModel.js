// SoulAI_Backend/models/ConversationModel.js
// Database model for storing AI conversations and learning data

import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  conversationId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  
  sender: {
    type: String,
    required: true,
    enum: ['user', 'ai']
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  messageType: {
    type: String,
    enum: ['text', 'personality_insight', 'relationship_advice', 'compatibility_analysis', 'conversation_coaching'],
    default: 'text'
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // AI Analysis Metadata
  metadata: {
    // Personality insights extracted from this message
    personalityInsights: {
      mbtiIndicators: {
        E: Number, I: Number, S: Number, N: Number,
        T: Number, F: Number, J: Number, P: Number
      },
      bigFiveScores: {
        openness: Number,
        conscientiousness: Number,
        extraversion: Number,
        agreeableness: Number,
        neuroticism: Number
      },
      detectedValues: [String],
      emotionalPatterns: [String],
      confidence: Number
    },
    
    // Conversation quality analysis
    conversationQuality: {
      questionDepth: Number,
      engagementLevel: Number,
      emotionalIntelligence: Number,
      responseDepth: Number,
      overallScore: Number
    },
    
    // Relationship stage and readiness
    relationshipAnalysis: {
      currentStage: String,
      readinessLevel: Number,
      nextSteps: [String],
      growthAreas: [String]
    },
    
    // AI agent responses and reasoning
    agentResponses: {
      primaryAgent: String,
      personalityAgent: mongoose.Schema.Types.Mixed,
      compatibilityAgent: mongoose.Schema.Types.Mixed,
      conversationAgent: mongoose.Schema.Types.Mixed,
      relationshipAgent: mongoose.Schema.Types.Mixed,
      matchingAgent: mongoose.Schema.Types.Mixed
    },
    
    // Context information
    context: {
      previousMessages: Number,
      conversationTopic: String,
      userMood: String,
      suggestions: [String]
    }
  },
  
  // Flags for important messages
  flags: {
    isPersonalityBreakthrough: { type: Boolean, default: false },
    isRelationshipMilestone: { type: Boolean, default: false },
    isCompatibilityInsight: { type: Boolean, default: false },
    needsFollowUp: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  collection: 'conversations'
});

// Indexes for efficient querying
ConversationSchema.index({ userId: 1, timestamp: -1 });
ConversationSchema.index({ userId: 1, messageType: 1 });
ConversationSchema.index({ 'flags.isPersonalityBreakthrough': 1 });
ConversationSchema.index({ 'metadata.personalityInsights.confidence': -1 });

// Instance methods
ConversationSchema.methods.getPersonalityInsights = function() {
  return this.metadata?.personalityInsights || {};
};

ConversationSchema.methods.getConversationQuality = function() {
  return this.metadata?.conversationQuality?.overallScore || 0.5;
};

ConversationSchema.methods.isHighConfidencePersonality = function() {
  return this.metadata?.personalityInsights?.confidence > 0.7;
};

// Static methods
ConversationSchema.statics.getUserConversationHistory = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

ConversationSchema.statics.getPersonalityBreakthroughs = async function(userId) {
  return this.find({ 
    userId, 
    'flags.isPersonalityBreakthrough': true 
  })
  .sort({ timestamp: -1 })
  .lean();
};

ConversationSchema.statics.getConversationStats = async function(userId) {
  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        userMessages: {
          $sum: { $cond: [{ $eq: ['$sender', 'user'] }, 1, 0] }
        },
        aiMessages: {
          $sum: { $cond: [{ $eq: ['$sender', 'ai'] }, 1, 0] }
        },
        avgConversationQuality: {
          $avg: '$metadata.conversationQuality.overallScore'
        },
        personalityConfidence: {
          $avg: '$metadata.personalityInsights.confidence'
        },
        firstMessage: { $min: '$timestamp' },
        lastMessage: { $max: '$timestamp' }
      }
    }
  ];
  
  const stats = await this.aggregate(pipeline);
  return stats[0] || {};
};

ConversationSchema.statics.getMostRecentPersonalityProfile = async function(userId) {
  const recentMessage = await this.findOne({
    userId,
    'metadata.personalityInsights.confidence': { $gte: 0.5 }
  })
  .sort({ timestamp: -1 })
  .lean();
  
  return recentMessage?.metadata?.personalityInsights || null;
};

ConversationSchema.statics.getTopics = async function(userId) {
  const pipeline = [
    { $match: { userId, sender: 'user' } },
    { $group: { _id: '$metadata.context.conversationTopic', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ];
  
  const topics = await this.aggregate(pipeline);
  return topics.map(t => t._id).filter(Boolean);
};

// Pre-save middleware to analyze and flag important messages
ConversationSchema.pre('save', function(next) {
  // Flag personality breakthroughs
  if (this.metadata?.personalityInsights?.confidence > 0.8) {
    this.flags.isPersonalityBreakthrough = true;
  }
  
  // Flag relationship milestones
  if (this.metadata?.relationshipAnalysis?.currentStage && 
      this.metadata.relationshipAnalysis.readinessLevel > 0.7) {
    this.flags.isRelationshipMilestone = true;
  }
  
  // Flag high-quality conversations that need follow-up
  if (this.metadata?.conversationQuality?.overallScore > 0.8) {
    this.flags.needsFollowUp = true;
  }
  
  next();
});

export const ConversationModel = mongoose.model('Conversation', ConversationSchema);