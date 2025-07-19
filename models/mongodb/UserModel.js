// models/mongodb/UserModel.js - MongoDB User Schema
// Save in: backend/models/mongodb/UserModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'non-binary', 'other']
  },
  sexualOrientation: {
    type: String,
    required: true,
    enum: ['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other']
  },

  // Profile Data
  photos: [{
    url: String,
    order: Number,
    isProfilePicture: Boolean,
    uploadedAt: { type: Date, default: Date.now }
  }],
  aboutMe: {
    type: String,
    maxlength: 500
  },
  occupation: String,
  education: String,
  height: Number, // in cm
  religion: String,
  politicalViews: String,
  personalityType: String, // MBTI, Enneagram, etc.
  interests: [String],
  hobbies: [String],
  languages: [String],

  // Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    city: String,
    state: String,
    country: String
  },

  // Preferences
  preferences: {
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 50 }
    },
    maxDistance: { type: Number, default: 50 }, // km
    genderPreference: [String],
    dealBreakers: [String],
    mustHaves: [String]
  },

  // SoulAI Data
  soulAIProfile: {
    personalityInsights: {
      mbti: String,
      bigFive: {
        openness: Number,
        conscientiousness: Number,
        extraversion: Number,
        agreeableness: Number,
        neuroticism: Number
      },
      communicationStyle: String,
      loveLanguage: String,
      attachmentStyle: String
    },
    conversationHistory: [{
      message: String,
      response: String,
      insights: String,
      timestamp: { type: Date, default: Date.now }
    }],
    profileCompleteness: { type: Number, default: 0 },
    readyForMatching: { type: Boolean, default: false },
    lastSoulAIInteraction: Date
  },

  // Activity Tracking
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },

  // Privacy Settings
  privacy: {
    showAge: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },
    allowMessages: {
      type: String,
      enum: ['everyone', 'matches-only', 'premium-only'],
      default: 'everyone'
    }
  },

  // Push Notifications
  pushTokens: [{
    token: String,
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    addedAt: { type: Date, default: Date.now }
  }],
  notificationSettings: {
    newMatches: { type: Boolean, default: true },
    newMessages: { type: Boolean, default: true },
    profileViews: { type: Boolean, default: true },
    soulAIUpdates: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ location: '2dsphere' });
userSchema.index({ age: 1 });
userSchema.index({ 'preferences.ageRange.min': 1, 'preferences.ageRange.max': 1 });
userSchema.index({ isOnline: 1, lastActive: -1 });
userSchema.index({ 'soulAIProfile.readyForMatching': 1 });

// Virtual for profile completeness calculation
userSchema.virtual('profileCompletenessPercent').get(function() {
  let completeness = 0;
  const fields = [
    'photos', 'aboutMe', 'occupation', 'interests', 
    'location.city', 'soulAIProfile.personalityInsights.mbti'
  ];
  
  fields.forEach(field => {
    if (this.get(field) && this.get(field).length > 0) {
      completeness += 100 / fields.length;
    }
  });
  
  return Math.round(completeness);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

// ==========================================

// models/mongodb/MatchModel.js - MongoDB Match Schema
// Save in: backend/models/mongodb/MatchModel.js

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  // Match Participants
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Match Status
  status: {
    type: String,
    enum: ['pending', 'matched', 'expired', 'unmatched'],
    default: 'pending'
  },
  
  // Like Information
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    },
    superLike: {
      type: Boolean,
      default: false
    }
  }],

  // Match Data
  matchedAt: Date,
  compatibilityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  compatibilityFactors: {
    personalityMatch: Number,
    interestsSimilarity: Number,
    valueAlignment: Number,
    communicationStyle: Number,
    locationCompatibility: Number
  },

  // SoulAI Analysis
  soulAIAnalysis: {
    matchReason: String,
    potentialChallenges: [String],
    conversationStarters: [String],
    compatibilityBreakdown: {
      emotional: Number,
      intellectual: Number,
      lifestyle: Number,
      values: Number
    }
  },

  // Conversation Data
  lastMessageAt: Date,
  messageCount: { type: Number, default: 0 },
  isConversationActive: { type: Boolean, default: false },
  
  // Expiry
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

// Indexes
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });
matchSchema.index({ status: 1, createdAt: -1 });
matchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
matchSchema.index({ compatibilityScore: -1 });

// Methods
matchSchema.methods.getOtherUser = function(userId) {
  return this.user1.toString() === userId.toString() ? this.user2 : this.user1;
};

matchSchema.methods.isUserInMatch = function(userId) {
  return this.user1.toString() === userId.toString() || 
         this.user2.toString() === userId.toString();
};

matchSchema.methods.hasUserLiked = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

module.exports = mongoose.model('Match', matchSchema);

// ==========================================

// models/mongodb/MessageModel.js - MongoDB Message Schema
// Save in: backend/models/mongodb/MessageModel.js

const messageSchema = new mongoose.Schema({
  // Message Participants
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Message Content
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'gif', 'sticker', 'voice', 'video'],
    default: 'text'
  },
  
  // Media Attachments
  attachments: [{
    url: String,
    type: String,
    fileName: String,
    fileSize: Number
  }],

  // Message Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: Date,
  
  // SoulAI Coaching
  soulAICoaching: {
    suggestions: [String],
    sentimentScore: Number,
    responseQuality: Number,
    isCoachingTriggered: { type: Boolean, default: false }
  },

  // Message Flags
  isDeleted: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  reportCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ match: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ status: 1 });

module.exports = mongoose.model('Message', messageSchema);