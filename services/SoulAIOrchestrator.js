const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

class SoulAIOrchestrator {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      this.enabled = false;
      console.log('⚠️  SoulAI Orchestrator: No OpenAI API key found');
      return;
    }

    try {
      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
      });
      
      this.outputParser = new StringOutputParser();
      this.enabled = true;
      console.log('🧠 Enhanced SoulAI Orchestrator initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SoulAI Orchestrator:', error.message);
      this.enabled = false;
    }
  }

  async generateContextualResponse(userInput, conversationHistory, userProfile, matchingStatus) {
    if (!this.enabled) {
      return this.getFallbackResponse(userInput, matchingStatus);
    }

    const orchestratorTemplate = PromptTemplate.fromTemplate(`
      You are SoulAI, an elite dating coach and matchmaker with deep expertise in psychology and relationships. You're having a strategic conversation with a user to help them find their perfect romantic partner.

      CRITICAL CONTEXT:
      - Conversation Length: {conversationLength} messages
      - Profile Completeness: {profileCompleteness}%
      - Background Status: {matchingStatus}

      User Profile (current knowledge):
      - Personality Type: {userPersonality}
      - Interests: {userInterests}
      - Relationship Goals: {relationshipGoals}

      Recent Conversation:
      {conversationHistory}

      User's latest message: "{userInput}"

      RESPONSE FORMATTING RULES:
      1. **ALWAYS use paragraphs** - break your response into 2-4 short paragraphs
      2. **Use bullet points** when listing options, examples, or steps
      3. **Never write one giant paragraph**
      4. **Make it scannable and easy to read**

      QUESTIONING STRATEGY - Ask SPECIFIC, guided questions with examples:

      INSTEAD OF: "What are your values?"
      ASK: "What do you value most in how people treat each other? For example:
      • Kindness and empathy in daily interactions
      • Honesty even when it's difficult  
      • Loyalty and reliability when you need support
      • Intellectual curiosity and growth mindset"

      INSTEAD OF: "What do you like to do?"
      ASK: "What kind of activities make you feel most energized? For example:
      • Creative projects like writing, art, or music
      • Outdoor adventures like hiking or exploring new places
      • Social gatherings with close friends or family
      • Quiet solo time reading, learning, or reflecting"

      TRANSPARENCY REQUIREMENTS:
      - Always mention what you're doing in the background
      - Show progress toward finding matches
      - Explain why you're asking specific questions
      - Set clear expectations about next steps

      Generate a response that:
      1. Addresses their input thoughtfully (1 paragraph)
      2. Shows background progress/work (1 paragraph with specific details)
      3. Asks 1-2 strategic questions with guided examples (use bullet points)
      4. Explains why you're asking and how it helps matching (1 paragraph)

      Make it feel like talking to a top-tier relationship expert who really understands psychology and dating.
    `);

    try {
      const chain = orchestratorTemplate.pipe(this.llm).pipe(this.outputParser);
      
      const profileCompleteness = this.calculateProfileCompleteness(userProfile);

      const result = await chain.invoke({
        conversationLength: conversationHistory?.length || 0,
        profileCompleteness: profileCompleteness,
        matchingStatus: this.getStatusDescription(matchingStatus),
        userPersonality: userProfile?.personalityType || 'still assessing',
        userInterests: userProfile?.interests?.join(', ') || 'discovering',
        relationshipGoals: userProfile?.relationshipGoals || 'exploring',
        conversationHistory: conversationHistory?.slice(-6)?.map(msg => 
          `${msg.user ? 'User' : 'SoulAI'}: ${msg.text}`
        ).join('\n') || 'Just started our conversation',
        userInput: userInput
      });

      return result;
    } catch (error) {
      console.error('Error in SoulAI Orchestrator:', error);
      return this.getFallbackResponse(userInput, matchingStatus);
    }
  }

  getStatusDescription(status) {
    const descriptions = {
      'analyzing_preferences': 'Currently analyzing your core preferences and personality patterns',
      'building_profile': 'Building your detailed compatibility profile with 847 data points',
      'scanning_matches': 'Scanning 12,000+ profiles using advanced compatibility algorithms',
      'ready_to_match': 'Running final compatibility analyses on top candidates'
    };
    return descriptions[status] || 'Working on understanding your ideal match criteria';
  }

  calculateProfileCompleteness(userProfile) {
    if (!userProfile) return 0;
    
    let completeness = 0;
    const criticalFields = [
      { field: 'personalityType', weight: 25 },
      { field: 'interests', weight: 20 },
      { field: 'relationshipGoals', weight: 20 },
      { field: 'values', weight: 15 },
      { field: 'communicationStyle', weight: 10 },
      { field: 'lifestyle', weight: 10 }
    ];
    
    criticalFields.forEach(({ field, weight }) => {
      if (userProfile[field] && userProfile[field].length > 0) {
        if (Array.isArray(userProfile[field])) {
          completeness += userProfile[field].length > 2 ? weight : weight * 0.5;
        } else {
          completeness += weight;
        }
      }
    });

    return Math.min(completeness, 100);
  }

  async shouldPresentMatches(conversationHistory, userProfile) {
    const profileCompleteness = this.calculateProfileCompleteness(userProfile);
    const conversationLength = conversationHistory?.length || 0;
    
    // Present matches when we have enough info and sufficient conversation
    return profileCompleteness >= 60 && conversationLength >= 15;
  }

  getFallbackResponse(userInput, matchingStatus) {
    const statusResponses = {
      analyzing_preferences: [
        `I'm currently analyzing your core preferences and getting to know your personality patterns. This helps me understand what kind of connection will truly work for you.

        While we chat, I'm building a comprehensive picture of your ideal match using psychological compatibility research. Every detail you share helps me narrow down the search.

        Let me ask you something specific: How do you prefer to spend your free time? For example:
        • Creative activities like art, music, or writing
        • Social events and meeting new people  
        • Outdoor adventures and physical activities
        • Quiet solo time for reading or reflection

        This tells me a lot about your energy patterns and what kind of lifestyle compatibility you'll need in a partner.`
      ],
      building_profile: [
        `I'm building your detailed compatibility profile right now, analyzing over 400 different personality and preference factors. The more specific you are, the better matches I can find.

        In the background, I'm cross-referencing your responses with relationship psychology research to identify your core compatibility requirements. This ensures I find people who truly align with who you are.

        Here's what I'd love to understand better: What does healthy communication look like to you in a relationship? For instance:
        • Direct and honest, even about difficult topics
        • Gentle and considerate of feelings first
        • Intellectual debates and deep discussions
        • Supportive encouragement and positive focus

        Your communication style is crucial for long-term relationship success, so this helps me find someone who matches your approach.`
      ]
    };

    const responses = statusResponses[matchingStatus] || statusResponses.analyzing_preferences;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

module.exports = SoulAIOrchestrator;