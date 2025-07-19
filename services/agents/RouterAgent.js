class RouterAgent {
  constructor() {
    this.initialized = true;
    console.log('🧭 Router Agent initialized');
  }

  async routeRequest(userInput, context = {}) {
    try {
      // Simple intent detection for now
      const intent = this.determineIntent(userInput);
      
      console.log(`🔀 Routing request: "${userInput}" → ${intent}`);
      
      return {
        type: intent,
        shouldLearnFromThis: this.shouldExtractProfileInfo(userInput),
        message: `Processed as ${intent}`,
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error in RouterAgent.routeRequest:', error);
      return {
        type: 'general_conversation',
        shouldLearnFromThis: false,
        message: 'Fallback response',
        confidence: 0.5
      };
    }
  }

  determineIntent(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return 'general_conversation';
    }

    const lower = userInput.toLowerCase();
    
    if (lower.includes('compatible') || lower.includes('match with')) {
      return 'compatibility_analysis';
    }
    if (lower.includes('advice') || lower.includes('help') || lower.includes('tip')) {
      return 'dating_advice';
    }
    if (lower.includes('like') || lower.includes('dislike') || lower.includes('not interested')) {
      return 'match_feedback';
    }
    if (lower.includes('value') || lower.includes('important') || lower.includes('prefer')) {
      return 'profile_question';
    }
    
    return 'general_conversation';
  }

  shouldExtractProfileInfo(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return false;
    }

    const learningKeywords = ['love', 'hate', 'prefer', 'enjoy', 'dislike', 'value', 'important', 'want', 'need'];
    return learningKeywords.some(keyword => userInput.toLowerCase().includes(keyword));
  }
}

module.exports = RouterAgent;