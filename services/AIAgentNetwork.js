// SoulAI_Backend/services/AIAgentNetwork.js
// Advanced Multi-Agent AI System for SoulAI Dating App

import { loveWisdomDatabase } from '../data/knowledgeBase/loveWisdom.js';

// ===== MAIN ORCHESTRATOR AGENT =====
export class SoulAIOrchestratorAgent {
  constructor(userId) {
    this.userId = userId;
    this.conversationHistory = [];
    this.userProfile = {};
    this.activeAgents = new Map();
    
    // Initialize sub-agents
    this.initializeAgentNetwork();
  }

  initializeAgentNetwork() {
    // Team Leader Agents
    this.activeAgents.set('personality', new PersonalityAnalysisAgent(this.userId));
    this.activeAgents.set('compatibility', new CompatibilityAgent(this.userId));
    this.activeAgents.set('conversation', new ConversationCoachAgent(this.userId));
    this.activeAgents.set('relationship', new RelationshipAdviceAgent(this.userId));
    this.activeAgents.set('matching', new MatchingStrategyAgent(this.userId));
  }

  async processUserMessage(message, context = {}) {
    try {
      // 1. Log conversation
      this.conversationHistory.push({
        type: 'user',
        message,
        timestamp: new Date(),
        context
      });

      // 2. Analyze message with multiple agents
      const analyses = await Promise.all([
        this.activeAgents.get('personality').analyzeMessage(message, this.conversationHistory),
        this.activeAgents.get('conversation').analyzeConversation(message, this.conversationHistory),
        this.activeAgents.get('relationship').assessRelationshipReadiness(this.conversationHistory)
      ]);

      // 3. Synthesize response using all agent insights
      const response = await this.synthesizeResponse(message, analyses, context);

      // 4. Log AI response
      this.conversationHistory.push({
        type: 'ai',
        message: response.text,
        timestamp: new Date(),
        metadata: response.metadata
      });

      return response;

    } catch (error) {
      console.error('SoulAI Orchestrator Error:', error);
      return {
        text: "I'm processing your message deeply. Let me share something meaningful with you...",
        type: 'fallback',
        metadata: { error: true }
      };
    }
  }

  async synthesizeResponse(userMessage, agentAnalyses, context) {
    const [personalityAnalysis, conversationAnalysis, relationshipAnalysis] = agentAnalyses;

    // Determine primary response strategy
    let primaryAgent = 'conversation';
    let responseText = '';
    let metadata = {};

    // Decision tree for which agent takes the lead
    if (conversationAnalysis.needsRelationshipAdvice) {
      primaryAgent = 'relationship';
      responseText = await this.activeAgents.get('relationship').generateAdvice(
        userMessage, 
        personalityAnalysis, 
        this.conversationHistory
      );
    } else if (conversationAnalysis.needsMatchingGuidance) {
      primaryAgent = 'matching';
      responseText = await this.activeAgents.get('matching').generateMatchingAdvice(
        userMessage,
        personalityAnalysis,
        this.conversationHistory
      );
    } else if (personalityAnalysis.needsPersonalityInsight) {
      primaryAgent = 'personality';
      responseText = await this.activeAgents.get('personality').generatePersonalityInsight(
        userMessage,
        this.conversationHistory
      );
    } else {
      // Default conversation handling
      responseText = await this.activeAgents.get('conversation').generateResponse(
        userMessage,
        personalityAnalysis,
        this.conversationHistory
      );
    }

    return {
      text: responseText,
      type: primaryAgent,
      metadata: {
        primaryAgent,
        personalityInsights: personalityAnalysis,
        conversationQuality: conversationAnalysis,
        relationshipReadiness: relationshipAnalysis
      }
    };
  }
}

// ===== TEAM LEADER AGENTS =====

// 1. PERSONALITY ANALYSIS TEAM LEADER
export class PersonalityAnalysisAgent {
  constructor(userId) {
    this.userId = userId;
    this.personalityProfile = {
      mbtiType: null,
      bigFiveScores: {},
      communicationStyle: null,
      valueSystem: [],
      emotionalPatterns: []
    };
    
    // Initialize worker agents
    this.workers = {
      mbtiAnalyzer: new MBTIAnalyzerWorker(),
      bigFiveAnalyzer: new BigFiveAnalyzerWorker(),
      valuesAnalyzer: new ValuesAnalyzerWorker(),
      emotionalAnalyzer: new EmotionalPatternWorker()
    };
  }

  async analyzeMessage(message, conversationHistory) {
    const analyses = await Promise.all([
      this.workers.mbtiAnalyzer.analyze(message, conversationHistory),
      this.workers.bigFiveAnalyzer.analyze(message, conversationHistory),
      this.workers.valuesAnalyzer.analyze(message, conversationHistory),
      this.workers.emotionalAnalyzer.analyze(message, conversationHistory)
    ]);

    // Update personality profile
    this.updatePersonalityProfile(analyses);

    return {
      needsPersonalityInsight: this.shouldProvidePersonalityInsight(analyses),
      personalityTraits: this.personalityProfile,
      confidence: this.calculateConfidence(analyses),
      insights: this.generateInsights(analyses)
    };
  }

  async generatePersonalityInsight(message, conversationHistory) {
    const insights = await this.workers.mbtiAnalyzer.generateInsight(
      message, 
      this.personalityProfile,
      loveWisdomDatabase
    );
    
    return `Based on our conversations, I'm sensing you might resonate with ${insights.type} characteristics. ${insights.explanation} What do you think about this observation?`;
  }

  updatePersonalityProfile(analyses) {
    // Synthesize all worker analyses into unified personality profile
    const [mbti, bigFive, values, emotional] = analyses;
    
    this.personalityProfile = {
      ...this.personalityProfile,
      mbtiType: mbti.likelyType,
      bigFiveScores: { ...this.personalityProfile.bigFiveScores, ...bigFive.scores },
      valueSystem: [...new Set([...this.personalityProfile.valueSystem, ...values.detectedValues])],
      emotionalPatterns: [...this.personalityProfile.emotionalPatterns, ...emotional.patterns]
    };
  }

  shouldProvidePersonalityInsight(analyses) {
    // Logic to determine if user would benefit from personality insight
    return analyses.some(analysis => analysis.confidence > 0.7 && analysis.newInsight);
  }

  calculateConfidence(analyses) {
    return analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / analyses.length;
  }

  generateInsights(analyses) {
    return analyses.flatMap(analysis => analysis.insights || []);
  }
}

// 2. COMPATIBILITY ANALYSIS TEAM LEADER
export class CompatibilityAgent {
  constructor(userId) {
    this.userId = userId;
    this.compatibilityMatrix = {};
    
    this.workers = {
      personalityCompatibility: new PersonalityCompatibilityWorker(),
      valuesCompatibility: new ValuesCompatibilityWorker(),
      communicationCompatibility: new CommunicationCompatibilityWorker(),
      lifestyleCompatibility: new LifestyleCompatibilityWorker()
    };
  }

  async analyzeCompatibility(userProfile, potentialMatch) {
    const compatibilityScores = await Promise.all([
      this.workers.personalityCompatibility.analyze(userProfile, potentialMatch),
      this.workers.valuesCompatibility.analyze(userProfile, potentialMatch),
      this.workers.communicationCompatibility.analyze(userProfile, potentialMatch),
      this.workers.lifestyleCompatibility.analyze(userProfile, potentialMatch)
    ]);

    return this.synthesizeCompatibilityScore(compatibilityScores);
  }

  synthesizeCompatibilityScore(scores) {
    const weights = {
      personality: 0.3,
      values: 0.35,
      communication: 0.2,
      lifestyle: 0.15
    };

    const totalScore = scores.reduce((sum, score, index) => {
      const weight = Object.values(weights)[index];
      return sum + (score.score * weight);
    }, 0);

    return {
      totalCompatibility: Math.round(totalScore * 100),
      breakdown: {
        personality: scores[0],
        values: scores[1], 
        communication: scores[2],
        lifestyle: scores[3]
      },
      recommendation: this.generateCompatibilityRecommendation(totalScore, scores)
    };
  }

  generateCompatibilityRecommendation(totalScore, scores) {
    if (totalScore > 0.8) return "Exceptional compatibility - strong potential for meaningful connection";
    if (totalScore > 0.65) return "Good compatibility - worth exploring further";
    if (totalScore > 0.5) return "Moderate compatibility - focus on shared values";
    return "Lower compatibility - consider if growth areas align";
  }
}

// 3. CONVERSATION COACHING TEAM LEADER
export class ConversationCoachAgent {
  constructor(userId) {
    this.userId = userId;
    this.conversationPatterns = {};
    
    this.workers = {
      questionQuality: new QuestionQualityWorker(),
      responseDepth: new ResponseDepthWorker(),
      engagementLevel: new EngagementLevelWorker(),
      emotionalIntelligence: new EmotionalIntelligenceWorker()
    };
  }

  async analyzeConversation(message, conversationHistory) {
    const analyses = await Promise.all([
      this.workers.questionQuality.analyze(message, conversationHistory),
      this.workers.responseDepth.analyze(message, conversationHistory),
      this.workers.engagementLevel.analyze(message, conversationHistory),
      this.workers.emotionalIntelligence.analyze(message, conversationHistory)
    ]);

    return {
      needsConversationCoaching: this.shouldProvideCoaching(analyses),
      needsRelationshipAdvice: this.shouldProvideRelationshipAdvice(analyses),
      needsMatchingGuidance: this.shouldProvideMatchingGuidance(analyses),
      conversationQuality: this.assessConversationQuality(analyses),
      suggestions: this.generateSuggestions(analyses)
    };
  }

  async generateResponse(message, personalityAnalysis, conversationHistory) {
    const coaching = await this.workers.questionQuality.generateCoaching(
      message,
      personalityAnalysis,
      loveWisdomDatabase
    );

    return `${coaching.response} ${coaching.tip ? `💡 ${coaching.tip}` : ''}`;
  }

  shouldProvideCoaching(analyses) {
    return analyses.some(analysis => analysis.needsImprovement);
  }

  shouldProvideRelationshipAdvice(analyses) {
    return analyses.some(analysis => analysis.topic === 'relationship' && analysis.needsGuidance);
  }

  shouldProvideMatchingGuidance(analyses) {
    return analyses.some(analysis => analysis.topic === 'matching' && analysis.needsGuidance);
  }

  assessConversationQuality(analyses) {
    const scores = analyses.map(a => a.score || 0.5);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  generateSuggestions(analyses) {
    return analyses.flatMap(analysis => analysis.suggestions || []);
  }
}

// 4. RELATIONSHIP ADVICE TEAM LEADER
export class RelationshipAdviceAgent {
  constructor(userId) {
    this.userId = userId;
    this.relationshipStage = 'discovery';
    
    this.workers = {
      stageDetector: new RelationshipStageWorker(),
      adviceGenerator: new RelationshipAdviceWorker(),
      boundaryHelper: new BoundarySettingWorker(),
      conflictResolver: new ConflictResolutionWorker()
    };
  }

  async assessRelationshipReadiness(conversationHistory) {
    const stage = await this.workers.stageDetector.detectStage(conversationHistory);
    const readiness = await this.workers.adviceGenerator.assessReadiness(conversationHistory);

    return {
      currentStage: stage,
      readinessLevel: readiness.level,
      nextSteps: readiness.nextSteps,
      areas_for_growth: readiness.growthAreas
    };
  }

  async generateAdvice(message, personalityAnalysis, conversationHistory) {
    const advice = await this.workers.adviceGenerator.generateAdvice(
      message,
      personalityAnalysis,
      this.relationshipStage,
      loveWisdomDatabase
    );

    return advice.text;
  }
}

// 5. MATCHING STRATEGY TEAM LEADER  
export class MatchingStrategyAgent {
  constructor(userId) {
    this.userId = userId;
    this.matchingPreferences = {};
    
    this.workers = {
      preferenceDetector: new PreferenceDetectionWorker(),
      strategyOptimizer: new MatchingStrategyWorker(),
      feedbackAnalyzer: new MatchingFeedbackWorker()
    };
  }

  async generateMatchingAdvice(message, personalityAnalysis, conversationHistory) {
    const strategy = await this.workers.strategyOptimizer.generateStrategy(
      message,
      personalityAnalysis,
      this.matchingPreferences
    );

    return strategy.advice;
  }
}

// ===== WORKER AGENTS (Specialized Tasks) =====

// MBTI Analysis Worker
class MBTIAnalyzerWorker {
  async analyze(message, conversationHistory) {
    // Analyze message for MBTI indicators
    const indicators = this.extractMBTIIndicators(message);
    const confidence = this.calculateConfidence(indicators, conversationHistory.length);
    
    return {
      likelyType: this.determineLikelyType(indicators),
      confidence,
      indicators,
      newInsight: confidence > 0.6
    };
  }

  extractMBTIIndicators(message) {
    // Look for E/I, S/N, T/F, J/P indicators in message
    const indicators = {
      E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
    };

    // Extroversion indicators
    if (message.includes('people') || message.includes('social') || message.includes('party')) {
      indicators.E += 0.1;
    }

    // Introversion indicators  
    if (message.includes('quiet') || message.includes('alone') || message.includes('peace')) {
      indicators.I += 0.1;
    }

    // Sensing indicators
    if (message.includes('practical') || message.includes('details') || message.includes('facts')) {
      indicators.S += 0.1;
    }

    // Intuition indicators
    if (message.includes('possibilities') || message.includes('future') || message.includes('creative')) {
      indicators.N += 0.1;
    }

    // Thinking indicators
    if (message.includes('logical') || message.includes('analysis') || message.includes('objective')) {
      indicators.T += 0.1;
    }

    // Feeling indicators
    if (message.includes('feelings') || message.includes('values') || message.includes('harmony')) {
      indicators.F += 0.1;
    }

    // Judging indicators
    if (message.includes('plan') || message.includes('organized') || message.includes('decided')) {
      indicators.J += 0.1;
    }

    // Perceiving indicators
    if (message.includes('flexible') || message.includes('open') || message.includes('spontaneous')) {
      indicators.P += 0.1;
    }

    return indicators;
  }

  determineLikelyType(indicators) {
    const type = [
      indicators.E > indicators.I ? 'E' : 'I',
      indicators.S > indicators.N ? 'S' : 'N', 
      indicators.T > indicators.F ? 'T' : 'F',
      indicators.J > indicators.P ? 'J' : 'P'
    ].join('');

    return type;
  }

  calculateConfidence(indicators, conversationLength) {
    const totalIndicators = Object.values(indicators).reduce((sum, val) => sum + val, 0);
    const lengthFactor = Math.min(conversationLength / 10, 1); // More confidence with more conversation
    return Math.min(totalIndicators * lengthFactor, 1);
  }

  async generateInsight(message, personalityProfile, loveWisdom) {
    const type = personalityProfile.mbtiType;
    if (!type) return { type: 'Unknown', explanation: "I'm still learning about your personality." };

    const typeDescriptions = {
      'ENFP': 'a creative and enthusiastic spirit who values authentic connections',
      'INTJ': 'a strategic thinker who appreciates depth and meaningful conversations',
      'ESFJ': 'a caring and harmonious person who values relationships and community',
      'ISTP': 'a practical and adaptable person who values freedom and authenticity'
      // Add more types as needed
    };

    return {
      type,
      explanation: typeDescriptions[type] || 'someone with unique and valuable traits'
    };
  }
}

// Big Five Analysis Worker
class BigFiveAnalyzerWorker {
  async analyze(message, conversationHistory) {
    const scores = {
      openness: this.analyzeOpenness(message),
      conscientiousness: this.analyzeConscientiousness(message),
      extraversion: this.analyzeExtraversion(message),
      agreeableness: this.analyzeAgreeableness(message),
      neuroticism: this.analyzeNeuroticism(message)
    };

    return {
      scores,
      confidence: this.calculateConfidence(scores),
      insights: this.generateInsights(scores)
    };
  }

  analyzeOpenness(message) {
    let score = 0.5; // baseline
    
    if (message.includes('creative') || message.includes('art') || message.includes('new')) score += 0.1;
    if (message.includes('traditional') || message.includes('practical')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  analyzeConscientiousness(message) {
    let score = 0.5;
    
    if (message.includes('organized') || message.includes('plan') || message.includes('goal')) score += 0.1;
    if (message.includes('spontaneous') || message.includes('flexible')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  analyzeExtraversion(message) {
    let score = 0.5;
    
    if (message.includes('social') || message.includes('people') || message.includes('party')) score += 0.1;
    if (message.includes('quiet') || message.includes('alone') || message.includes('solitude')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  analyzeAgreeableness(message) {
    let score = 0.5;
    
    if (message.includes('help') || message.includes('kind') || message.includes('caring')) score += 0.1;
    if (message.includes('competitive') || message.includes('argue')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  analyzeNeuroticism(message) {
    let score = 0.5;
    
    if (message.includes('stress') || message.includes('worry') || message.includes('anxious')) score += 0.1;
    if (message.includes('calm') || message.includes('stable') || message.includes('relaxed')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  calculateConfidence(scores) {
    // Confidence based on how far scores are from neutral (0.5)
    const deviations = Object.values(scores).map(score => Math.abs(score - 0.5));
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    return avgDeviation * 2; // Scale to 0-1
  }

  generateInsights(scores) {
    const insights = [];
    
    if (scores.openness > 0.7) insights.push("Highly open to new experiences");
    if (scores.conscientiousness > 0.7) insights.push("Very organized and goal-oriented");
    if (scores.extraversion > 0.7) insights.push("Energized by social interaction");
    if (scores.agreeableness > 0.7) insights.push("Highly empathetic and cooperative");
    if (scores.neuroticism < 0.3) insights.push("Emotionally stable and calm");
    
    return insights;
  }
}

// Values Analysis Worker
class ValuesAnalyzerWorker {
  async analyze(message, conversationHistory) {
    const values = this.extractValues(message);
    
    return {
      detectedValues: values,
      confidence: values.length > 0 ? 0.8 : 0.2,
      insights: this.generateValueInsights(values)
    };
  }

  extractValues(message) {
    const valueKeywords = {
      'family': ['family', 'parents', 'siblings', 'children', 'home'],
      'career': ['work', 'job', 'career', 'professional', 'ambition'],
      'adventure': ['travel', 'explore', 'adventure', 'new places', 'freedom'],
      'creativity': ['art', 'create', 'music', 'design', 'creative'],
      'health': ['fitness', 'health', 'wellness', 'exercise', 'nutrition'],
      'spirituality': ['spiritual', 'meditation', 'faith', 'purpose', 'meaning'],
      'learning': ['learn', 'education', 'growth', 'knowledge', 'study'],
      'authenticity': ['authentic', 'genuine', 'real', 'honest', 'true'],
      'community': ['community', 'friends', 'social', 'helping', 'service'],
      'security': ['security', 'stable', 'safe', 'reliable', 'consistent']
    };

    const detectedValues = [];
    const messageLower = message.toLowerCase();

    for (const [value, keywords] of Object.entries(valueKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedValues.push(value);
      }
    }

    return detectedValues;
  }

  generateValueInsights(values) {
    const insights = [];
    
    if (values.includes('family')) insights.push("Values close relationships and family bonds");
    if (values.includes('adventure')) insights.push("Seeks new experiences and freedom");
    if (values.includes('authenticity')) insights.push("Prioritizes genuine connections");
    if (values.includes('creativity')) insights.push("Values self-expression and creativity");
    
    return insights;
  }
}

// Emotional Pattern Analysis Worker
class EmotionalPatternWorker {
  async analyze(message, conversationHistory) {
    const patterns = this.detectEmotionalPatterns(message);
    const tone = this.analyzeTone(message);
    
    return {
      patterns,
      tone,
      confidence: 0.6,
      insights: this.generateEmotionalInsights(patterns, tone)
    };
  }

  detectEmotionalPatterns(message) {
    const patterns = [];
    const messageLower = message.toLowerCase();

    // Optimism indicators
    if (messageLower.includes('excited') || messageLower.includes('love') || messageLower.includes('amazing')) {
      patterns.push('optimistic');
    }

    // Anxiety indicators
    if (messageLower.includes('worried') || messageLower.includes('nervous') || messageLower.includes('stressed')) {
      patterns.push('anxious');
    }

    // Reflective indicators
    if (messageLower.includes('think') || messageLower.includes('wonder') || messageLower.includes('consider')) {
      patterns.push('reflective');
    }

    // Empathetic indicators
    if (messageLower.includes('understand') || messageLower.includes('feel for') || messageLower.includes('empathy')) {
      patterns.push('empathetic');
    }

    return patterns;
  }

  analyzeTone(message) {
    const messageLower = message.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    const positiveWords = ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great', 'awesome'];
    const negativeWords = ['sad', 'worried', 'frustrated', 'angry', 'disappointed', 'stressed'];

    positiveWords.forEach(word => {
      if (messageLower.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (messageLower.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  generateEmotionalInsights(patterns, tone) {
    const insights = [];
    
    if (patterns.includes('optimistic')) insights.push("Generally optimistic outlook");
    if (patterns.includes('reflective')) insights.push("Thoughtful and introspective");
    if (patterns.includes('empathetic')) insights.push("High emotional intelligence");
    if (tone === 'positive') insights.push("Positive communication style");
    
    return insights;
  }
}

// ===== COMPATIBILITY WORKERS =====

class PersonalityCompatibilityWorker {
  async analyze(userProfile, potentialMatch) {
    const mbtiCompatibility = this.analyzeMBTICompatibility(
      userProfile.personalityType, 
      potentialMatch.personalityType
    );
    
    const bigFiveCompatibility = this.analyzeBigFiveCompatibility(
      userProfile.bigFiveScores,
      potentialMatch.bigFiveScores
    );

    return {
      score: (mbtiCompatibility + bigFiveCompatibility) / 2,
      details: {
        mbti: mbtiCompatibility,
        bigFive: bigFiveCompatibility
      },
      explanation: this.generateCompatibilityExplanation(mbtiCompatibility, bigFiveCompatibility)
    };
  }

  analyzeMBTICompatibility(type1, type2) {
    if (!type1 || !type2) return 0.5;

    // MBTI compatibility matrix (simplified)
    const compatibilityMatrix = {
      'ENFP': { 'INTJ': 0.9, 'INFJ': 0.8, 'ENTP': 0.7, 'ENFP': 0.6 },
      'INTJ': { 'ENFP': 0.9, 'ENTP': 0.8, 'INFJ': 0.7, 'INTJ': 0.6 },
      'INFJ': { 'ENTP': 0.9, 'ENFP': 0.8, 'INTJ': 0.7, 'INFJ': 0.6 },
      'ENTP': { 'INFJ': 0.9, 'INTJ': 0.8, 'ENFP': 0.7, 'ENTP': 0.6 }
      // Add more combinations as needed
    };

    return compatibilityMatrix[type1]?.[type2] || 0.5;
  }

  analyzeBigFiveCompatibility(scores1, scores2) {
    if (!scores1 || !scores2) return 0.5;

    let totalCompatibility = 0;
    let comparedTraits = 0;

    for (const trait in scores1) {
      if (scores2[trait] !== undefined) {
        // Some traits benefit from similarity, others from complementarity
        let compatibility;
        
        if (trait === 'agreeableness' || trait === 'conscientiousness') {
          // These traits benefit from similarity
          compatibility = 1 - Math.abs(scores1[trait] - scores2[trait]);
        } else if (trait === 'extraversion') {
          // Extraversion can benefit from moderate difference
          const difference = Math.abs(scores1[trait] - scores2[trait]);
          compatibility = difference > 0.3 && difference < 0.7 ? 0.8 : 0.6;
        } else {
          // Default: moderate similarity is good
          compatibility = 1 - (Math.abs(scores1[trait] - scores2[trait]) * 0.5);
        }
        
        totalCompatibility += compatibility;
        comparedTraits++;
      }
    }

    return comparedTraits > 0 ? totalCompatibility / comparedTraits : 0.5;
  }

  generateCompatibilityExplanation(mbtiScore, bigFiveScore) {
    if (mbtiScore > 0.8 && bigFiveScore > 0.7) {
      return "Excellent personality compatibility with complementary strengths";
    } else if (mbtiScore > 0.6 || bigFiveScore > 0.6) {
      return "Good personality compatibility with some areas of harmony";
    } else {
      return "Moderate personality compatibility - focus on shared interests";
    }
  }
}

class ValuesCompatibilityWorker {
  async analyze(userProfile, potentialMatch) {
    const sharedValues = this.findSharedValues(
      userProfile.valueSystem, 
      potentialMatch.valueSystem
    );
    
    const conflictingValues = this.findConflictingValues(
      userProfile.valueSystem,
      potentialMatch.valueSystem
    );

    const score = this.calculateValuesScore(sharedValues, conflictingValues);

    return {
      score,
      sharedValues,
      conflictingValues,
      explanation: this.generateValuesExplanation(sharedValues, conflictingValues)
    };
  }

  findSharedValues(values1, values2) {
    return values1.filter(value => values2.includes(value));
  }

  findConflictingValues(values1, values2) {
    const conflictMap = {
      'adventure': ['security'],
      'security': ['adventure'],
      'career': ['family'], // potential conflict if extreme
      'spirituality': ['materialism']
    };

    const conflicts = [];
    values1.forEach(value1 => {
      values2.forEach(value2 => {
        if (conflictMap[value1]?.includes(value2)) {
          conflicts.push([value1, value2]);
        }
      });
    });

    return conflicts;
  }

  calculateValuesScore(shared, conflicts) {
    const sharedBonus = shared.length * 0.15;
    const conflictPenalty = conflicts.length * 0.2;
    const baseScore = 0.5;
    
    return Math.max(0, Math.min(1, baseScore + sharedBonus - conflictPenalty));
  }

  generateValuesExplanation(shared, conflicts) {
    if (shared.length > 2 && conflicts.length === 0) {
      return `Strong values alignment with shared priorities in ${shared.join(', ')}`;
    } else if (shared.length > 0) {
      return `Good values compatibility with shared focus on ${shared.join(', ')}`;
    } else {
      return "Different value systems - explore areas of mutual interest";
    }
  }
}

// ===== CONVERSATION WORKERS =====

class QuestionQualityWorker {
  async analyze(message, conversationHistory) {
    const isQuestion = message.includes('?');
    const questionDepth = this.analyzeQuestionDepth(message);
    const encouragesDialogue = this.checkDialogueEncouragement(message);

    return {
      isQuestion,
      depth: questionDepth,
      encouragesDialogue,
      score: this.calculateQuestionScore(isQuestion, questionDepth, encouragesDialogue),
      needsImprovement: questionDepth < 0.3,
      suggestions: this.generateQuestionSuggestions(questionDepth)
    };
  }

  analyzeQuestionDepth(message) {
    const surfaceIndicators = ['what', 'where', 'when', 'who'];
    const deepIndicators = ['why', 'how', 'what if', 'imagine', 'feel', 'think'];
    
    let depth = 0.5; // baseline
    
    surfaceIndicators.forEach(indicator => {
      if (message.toLowerCase().includes(indicator)) depth -= 0.1;
    });
    
    deepIndicators.forEach(indicator => {
      if (message.toLowerCase().includes(indicator)) depth += 0.15;
    });
    
    return Math.max(0, Math.min(1, depth));
  }

  checkDialogueEncouragement(message) {
    const encouragingPhrases = [
      'what do you think',
      'how do you feel',
      'tell me about',
      'what\'s your experience',
      'what matters to you'
    ];
    
    return encouragingPhrases.some(phrase => 
      message.toLowerCase().includes(phrase)
    );
  }

  calculateQuestionScore(isQuestion, depth, encouragesDialogue) {
    let score = 0.5;
    
    if (isQuestion) score += 0.2;
    score += depth * 0.4;
    if (encouragesDialogue) score += 0.3;
    
    return Math.min(1, score);
  }

  generateQuestionSuggestions(depth) {
    if (depth < 0.3) {
      return [
        "Try asking 'why' or 'how' questions for deeper connection",
        "Ask about feelings, experiences, and values",
        "Show curiosity about their perspective"
      ];
    }
    return [];
  }

  async generateCoaching(message, personalityAnalysis, loveWisdom) {
    // Use love wisdom to generate response
    const wisdom = loveWisdom.practicalApplications.dailyPractices;
    const insight = loveWisdom.keyInsights[Math.floor(Math.random() * loveWisdom.keyInsights.length)];

    return {
      response: `That's a thoughtful perspective. ${insight}`,
      tip: "Remember, authentic curiosity about the other person creates deeper connection."
    };
  }
}

// ===== RELATIONSHIP WORKERS =====

class RelationshipStageWorker {
  async detectStage(conversationHistory) {
    const messageCount = conversationHistory.length;
    const topics = this.extractTopics(conversationHistory);
    
    if (messageCount < 10) return 'introduction';
    if (topics.includes('values') || topics.includes('goals')) return 'discovery';
    if (topics.includes('relationship') || topics.includes('dating')) return 'exploration';
    if (topics.includes('feelings') || topics.includes('connection')) return 'deepening';
    
    return 'discovery'; // default
  }

  extractTopics(conversationHistory) {
    const allMessages = conversationHistory.map(msg => msg.message).join(' ').toLowerCase();
    const topics = [];
    
    if (allMessages.includes('value') || allMessages.includes('important')) topics.push('values');
    if (allMessages.includes('goal') || allMessages.includes('future')) topics.push('goals');
    if (allMessages.includes('relationship') || allMessages.includes('dating')) topics.push('relationship');
    if (allMessages.includes('feel') || allMessages.includes('emotion')) topics.push('feelings');
    
    return topics;
  }
}

class RelationshipAdviceWorker {
  async assessReadiness(conversationHistory) {
    const selfAwareness = this.assessSelfAwareness(conversationHistory);
    const communicationSkills = this.assessCommunicationSkills(conversationHistory);
    const emotionalMaturity = this.assessEmotionalMaturity(conversationHistory);
    
    const overallLevel = (selfAwareness + communicationSkills + emotionalMaturity) / 3;
    
    return {
      level: overallLevel,
      nextSteps: this.generateNextSteps(overallLevel),
      growthAreas: this.identifyGrowthAreas(selfAwareness, communicationSkills, emotionalMaturity)
    };
  }

  assessSelfAwareness(conversationHistory) {
    // Look for self-reflective language
    const reflectiveWords = ['i realize', 'i learned', 'i understand', 'i notice'];
    const allMessages = conversationHistory.map(msg => msg.message).join(' ').toLowerCase();
    
    let score = 0.5;
    reflectiveWords.forEach(word => {
      if (allMessages.includes(word)) score += 0.1;
    });
    
    return Math.min(1, score);
  }

  assessCommunicationSkills(conversationHistory) {
    // Look for good communication patterns
    const questions = conversationHistory.filter(msg => msg.message.includes('?')).length;
    const total = conversationHistory.length;
    
    return Math.min(1, (questions / total) * 2); // Good ratio of questions to statements
  }

  assessEmotionalMaturity(conversationHistory) {
    // Look for emotional vocabulary and awareness
    const emotionalWords = ['feel', 'emotion', 'understand', 'empathy', 'perspective'];
    const allMessages = conversationHistory.map(msg => msg.message).join(' ').toLowerCase();
    
    let score = 0.5;
    emotionalWords.forEach(word => {
      if (allMessages.includes(word)) score += 0.08;
    });
    
    return Math.min(1, score);
  }

  generateNextSteps(level) {
    if (level > 0.8) return ["Continue building authentic connections", "Trust your intuition"];
    if (level > 0.6) return ["Practice deeper self-reflection", "Focus on emotional awareness"];
    return ["Work on self-understanding", "Practice mindful communication"];
  }

  identifyGrowthAreas(selfAwareness, communication, emotional) {
    const areas = [];
    
    if (selfAwareness < 0.6) areas.push("Self-awareness and reflection");
    if (communication < 0.6) areas.push("Communication skills");
    if (emotional < 0.6) areas.push("Emotional intelligence");
    
    return areas;
  }

  async generateAdvice(message, personalityAnalysis, relationshipStage, loveWisdom) {
    // Use love wisdom to generate contextual advice
    const advice = loveWisdom.relationshipWisdom;
    const principles = loveWisdom.corePrinciples;
    
    if (relationshipStage === 'discovery') {
      return `${advice.perfectRelationship.foundation} Remember: ${principles.masteryOfLove.keyInsight}`;
    } else if (relationshipStage === 'exploration') {
      return `${advice.communication.loveBasedCommunication[0]} ${principles.twoTracks.loveTrack.mindset}`;
    } else {
      return `Focus on ${advice.perfectRelationship.keyPrinciple} ${loveWisdom.keyInsights[0]}`;
    }
  }
}

// ===== EXPORT THE COMPLETE SYSTEM =====

export default {
  SoulAIOrchestratorAgent,
  PersonalityAnalysisAgent,
  CompatibilityAgent,
  ConversationCoachAgent,
  RelationshipAdviceAgent,
  MatchingStrategyAgent
};