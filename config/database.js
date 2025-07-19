// config/database.js - MongoDB Connection
// Save in: backend/config/database.js

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soulai';
      
      console.log('🔌 Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });

      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('📴 MongoDB disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  // Health check
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    
    return {
      state: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }
}

module.exports = new Database();

// ==========================================
// models/UserModel.js - MongoDB User Schema
// Save in: backend/models/UserModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  
  // Location with geospatial indexing
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    city: String,
    state: String,
    country: { type: String, default: 'US' }
  },

  // Photos with cloud storage URLs
  photos: [{
    url: { type: String, required: true },
    publicId: String, // For Cloudinary
    isProfile: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
  }],

  // Profile information
  profile: {
    personalityType: {
      type: String,
      enum: ['INTJ-A', 'INTJ-T', 'INTP-A', 'INTP-T', 'ENTJ-A', 'ENTJ-T', 'ENTP-A', 'ENTP-T',
             'INFJ-A', 'INFJ-T', 'INFP-A', 'INFP-T', 'ENFJ-A', 'ENFJ-T', 'ENFP-A', 'ENFP-T',
             'ISTJ-A', 'ISTJ-T', 'ISFJ-A', 'ISFJ-T', 'ESTJ-A', 'ESTJ-T', 'ESFJ-A', 'ESFJ-T',
             'ISTP-A', 'ISTP-T', 'ISFP-A', 'ISFP-T', 'ESTP-A', 'ESTP-T', 'ESFP-A', 'ESFP-T']
    },
    interests: [{
      type: String,
      trim: true
    }],
    values: [{
      type: String,
      trim: true
    }],
    dealBreakers: [{
      type: String,
      trim: true
    }],
    relationshipGoals: {
      type: String,
      enum: ['casual_dating', 'serious_relationship', 'marriage', 'friendship', 'not_sure']
    },
    aboutMe: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    lifestyle: [{
      type: String,
      trim: true
    }],
    communicationStyle: {
      type: String,
      enum: ['direct', 'thoughtful', 'playful', 'deep', 'casual', 'unknown'],
      default: 'unknown'
    },
    educationLevel: String,
    occupation: String,
    height: Number, // in cm
    ethnicities: [String],
    languages: [String],
    religiousBeliefs: String,
    politicalViews: String,
    drinkingHabits: {
      type: String,
      enum: ['never', 'rarely', 'socially', 'regularly', 'prefer_not_to_say']
    },
    smokingHabits: {
      type: String,
      enum: ['never', 'rarely', 'socially', 'regularly', 'prefer_not_to_say']
    },
    fitnessLevel: {
      type: String,
      enum: ['low', 'moderate', 'active', 'very_active']
    },
    wantsChildren: {
      type: String,
      enum: ['yes', 'no', 'maybe', 'have_and_want_more', 'have_and_done']
    },
    hasChildren: { type: Boolean, default: false },
    completeness: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Matching preferences
  preferences: {
    ageRange: {
      min: { type: Number, default: 22, min: 18 },
      max: { type: Number, default: 35, max: 100 }
    },
    maxDistance: { type: Number, default: 50, min: 1, max: 500 }, // km
    dealBreakers: [String],
    mustHaves: [String],
    preferredEducation: [String],
    preferredEthnicity: [String],
    preferredReligion: [String]
  },

  // SoulAI configuration
  soulAI: {
    personality: {
      style: {
        type: String,
        enum: ['empathetic_guide', 'curious_explorer', 'wise_mentor', 'playful_companion'],
        default: 'empathetic_guide'
      },
      approach: {
        type: String,
        enum: ['socratic_questioning', 'storytelling', 'reflective_mirroring', 'gentle_humor'],
        default: 'socratic_questioning'
      }
    },
    insights: {
      personality_traits: [String],
      values: [String],
      interests: [String],
      communication_style: String,
      relationship_goals: String,
      deal_breakers: [String],
      lastUpdated: { type: Date, default: Date.now }
    },
    conversationCount: { type: Number, default: 0 },
    lastInteraction: Date
  },

  // User state
  status: {
    type: String,
    enum: ['new_user', 'building_profile', 'ready_for_matches', 'actively_matching', 'paused', 'banned'],
    default: 'new_user'
  },
  
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  
  // Subscription
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'plus'],
      default: 'free'
    },
    expiresAt: Date,
    autoRenew: { type: Boolean, default: false }
  },

  // Privacy settings
  privacy: {
    showAge: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    showLastActive: { type: Boolean, default: false },
    allowMessagePreviews: { type: Boolean, default: true },
    discoverable: { type: Boolean, default: true }
  },

  // Analytics
  analytics: {
    profileViews: { type: Number, default: 0 },
    likesGiven: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    matchesTotal: { type: Number, default: 0 },
    conversationsStarted: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // minutes
    joinSource: String
  },

  // Moderation
  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    description: String,
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
  }],

  // Device info for push notifications
  devices: [{
    deviceId: String,
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    pushToken: String,
    lastUsed: { type: Date, default: Date.now }
  }]

}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ status: 1, isOnline: 1 });
userSchema.index({ 'profile.personalityType': 1 });
userSchema.index({ 'profile.interests': 1 });
userSchema.index({ age: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ createdAt: -1 });

// Instance methods
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.calculateProfileCompleteness = function() {
  const requiredFields = [
    'profile.personalityType', 'profile.interests', 'profile.values', 
    'profile.relationshipGoals', 'profile.aboutMe', 'profile.communicationStyle'
  ];
  
  let score = 0;
  const totalFields = requiredFields.length;
  
  requiredFields.forEach(field => {
    const value = this.get(field);
    if (value) {
      if (Array.isArray(value)) {
        score += value.length > 0 ? 1 : 0;
      } else {
        score += value !== '' && value !== 'unknown' ? 1 : 0;
      }
    }
  });
  
  // Bonus for photos
  if (this.photos.length >= 2) score += 0.5;
  if (this.photos.length >= 4) score += 0.5;
  
  this.profile.completeness = Math.round((score / (totalFields + 1)) * 100);
  return this.profile.completeness;
};

userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  this.isOnline = true;
  return this.save();
};

userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    age: this.privacy.showAge ? this.age : null,
    photos: this.photos.filter(photo => photo.approved),
    location: this.privacy.showLocation ? {
      city: this.location.city,
      state: this.location.state
    } : null,
    profile: {
      personalityType: this.profile.personalityType,
      interests: this.profile.interests,
      values: this.profile.values,
      relationshipGoals: this.profile.relationshipGoals,
      aboutMe: this.profile.aboutMe,
      lifestyle: this.profile.lifestyle,
      educationLevel: this.profile.educationLevel,
      occupation: this.profile.occupation
    },
    lastActive: this.privacy.showLastActive ? this.lastActive : null,
    isOnline: this.isOnline
  };
};

// Static methods
userSchema.statics.findNearby = function(coordinates, maxDistance = 50, excludeIds = []) {
  return this.find({
    _id: { $nin: excludeIds },
    status: 'ready_for_matches',
    'privacy.discoverable': true,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  });
};

userSchema.statics.findByPersonalityType = function(personalityType) {
  return this.find({ 'profile.personalityType': personalityType });
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2a$')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  
  // Update profile completeness
  this.calculateProfileCompleteness();
  
  // Update status based on completeness
  if (this.profile.completeness >= 70 && this.status === 'building_profile') {
    this.status = 'ready_for_matches';
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);