const LangChainService = require('./LangChainService');

class ProfileLearningService {
  constructor() {
    this.langChainService = new LangChainService();
    console.log('📚 Profile Learning Service initialized');
  }

  async analyzeConversationForProfileData(conversationHistory, currentProfile = {}) {
    try {
      if (!this.langChainService.enabled) {
        return this.getMockProfileAnalysis();
      }

      // Extract insights from conversation
      const insights = await this.extractProfileInsights(conversationHistory);
      
      // Merge with current profile
      const updatedProfile = this.mergeProfileData(currentProfile, insights);
      
      return {
        extractedInsights: insights,
        updatedProfile: updatedProfile,
        confidence: 0.8,
        learningAreas: this.identifyLearningGaps(updatedProfile)
      };

    } catch (error) {
      console.error('Error analyzing conversation for profile data:', error);
      return this.getMockProfileAnalysis();
    }
  }

  async generateMatchingQuestions(currentProfile = {}, conversationHistory = []) {
    try {
      if (!this.langChainService.enabled) {
        return this.getMockQuestions();
      }

      const learningGaps = this.identifyLearningGaps(currentProfile);
      const questions = await this.generateTargetedQuestions(learningGaps, conversationHistory);
      
      return {
        questions: questions,
        priority: 'high',
        category: learningGaps[0] || 'general'
      };

    } catch (error) {
      console.error('Error generating matching questions:', error);
      return this.getMockQuestions();
    }
  }

  extractProfileInsights(conversationHistory) {
    // Simple keyword-based extraction for now
    const insights = {
      interests: [],
      values: [],
      personalityTraits: [],
      relationshipGoals: '',
      dealBreakers: []
    };

    conversationHistory.forEach(message => {
      if (!message.text) return;
      
      const text = message.text.toLowerCase();
      
      // Extract interests
      if (text.includes('love') || text.includes('enjoy') || text.includes('passionate about')) {
        const words = text.split(' ');
        const loveIndex = words.findIndex(word => 
          word.includes('love') || word.includes('enjoy') || word.includes('passionate')
        );
        if (loveIndex >= 0 && words[loveIndex + 1]) {
          insights.interests.push(words[loveIndex + 1]);
        }
      }

      // Extract values
      if (text.includes('important') || text.includes('value') || text.includes('believe')) {
        insights.values.push('extracted from conversation');
      }

      // Extract relationship goals
      if (text.includes('looking for') || text.includes('want in a relationship')) {
        insights.relationshipGoals = 'serious relationship'; // simplified
      }
    });

    return insights;
  }

  mergeProfileData(currentProfile, newInsights) {
    return {
      ...currentProfile,
      interests: [...(currentProfile.interests || []), ...newInsights.interests],
      values: [...(currentProfile.values || []), ...newInsights.values],
      personalityTraits: [...(currentProfile.personalityTraits || []), ...newInsights.personalityTraits],
      relationshipGoals: newInsights.relationshipGoals || currentProfile.relationshipGoals,
      dealBreakers: [...(currentProfile.dealBreakers || []), ...newInsights.dealBreakers],
      lastUpdated: new Date().toISOString()
    };
  }

  identifyLearningGaps(profile) {
    const gaps = [];
    
    if (!profile.interests || profile.interests.length < 3) {
      gaps.push('interests');
    }
    if (!profile.values || profile.values.length < 2) {
      gaps.push('values');
    }
    if (!profile.relationshipGoals) {
      gaps.push('relationship_goals');
    }
    if (!profile.personalityType) {
      gaps.push('personality');
    }
    if (!profile.lifestyle || profile.lifestyle.length < 2) {
      gaps.push('lifestyle');
    }

    return gaps;
  }

  async generateTargetedQuestions(learningGaps, conversationHistory) {
    const questionBank = {
      interests: [
        "What activities make you lose track of time?",
        "What's something you're passionate about that most people don't know?",
        "What's your ideal way to spend a weekend?"
      ],
      values: [
        "What qualities are most important to you in a relationship?",
        "What does a meaningful life look like to you?",
        "What values do you never compromise on?"
      ],
      relationship_goals: [
        "What are you hoping to find in a partner?",
        "Where do you see yourself in a relationship in 5 years?",
        "What does your ideal relationship dynamic look like?"
      ],
      personality: [
        "How do you recharge after a long day?",
        "Are you more of a planner or spontaneous person?",
        "How do you handle conflict in relationships?"
      ],
      lifestyle: [
        "What does your typical week look like?",
        "Are you more of a homebody or always out and about?",
        "What's your approach to work-life balance?"
      ]
    };

    const questions = [];
    learningGaps.forEach(gap => {
      if (questionBank[gap]) {
        questions.push(...questionBank[gap]);
      }
    });

    return questions.slice(0, 3); // Return top 3 questions
  }

  getMockProfileAnalysis() {
    return {
      extractedInsights: {
        interests: ['meaningful conversations'],
        values: ['authenticity'],
        personalityTraits: ['thoughtful'],
        relationshipGoals: 'long-term connection',
        dealBreakers: []
      },
      updatedProfile: {
        interests: ['meaningful conversations'],
        values: ['authenticity'],
        lastUpdated: new Date().toISOString()
      },
      confidence: 0.6,
      learningAreas: ['lifestyle', 'personality']
    };
  }

  getMockQuestions() {
    return {
      questions: [
        "What activities make you lose track of time?",
        "What qualities are most important to you in a partner?",
        "How do you prefer to spend your free time?"
      ],
      priority: 'medium',
      category: 'general'
    };
  }
}

module.exports = ProfileLearningService;