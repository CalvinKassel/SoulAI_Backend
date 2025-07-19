const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

class LangChainService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  No OpenAI API key found. LangChain features will not work.');
      this.enabled = false;
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
      console.log('✅ LangChain service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize LangChain:', error.message);
      this.enabled = false;
    }
  }

  async analyzeCompatibility(user1Profile, user2Profile) {
    if (!this.enabled) {
      // Return mock data if LangChain is not available
      return {
        overallScore: 75,
        personalityMatch: { score: 80, description: "Mock compatibility analysis" },
        sharedInterests: { score: 70, commonAreas: ["music"], description: "Mock analysis" },
        challenges: ["This is a mock response - configure OpenAI API key for real analysis"],
        advice: ["Add your OpenAI API key to enable real AI analysis"],
        growthOpportunities: ["Configure LangChain for personalized insights"]
      };
    }

    const compatibilityTemplate = PromptTemplate.fromTemplate(`
      You are an expert relationship counselor and compatibility analyst with expertise in psychology and personality theory. 
      Analyze the compatibility between these two people based on their profiles.

      Person 1:
      - Name: {user1Name}
      - Personality Type: {user1Personality}
      - Interests: {user1Interests}
      - About: {user1About}

      Person 2:
      - Name: {user2Name}
      - Personality Type: {user2Personality}
      - Interests: {user2Interests}
      - About: {user2About}

      Provide a detailed compatibility analysis considering:
      1. MBTI personality compatibility patterns
      2. Shared values and interests
      3. Communication styles
      4. Potential areas of growth and challenge
      5. Long-term relationship potential

      Format your response as JSON with this exact structure:
      {{
        "overallScore": number_between_1_and_100,
        "personalityMatch": {{
          "score": number_between_1_and_100,
          "description": "detailed analysis of personality compatibility including MBTI dynamics"
        }},
        "sharedInterests": {{
          "score": number_between_1_and_100,
          "commonAreas": ["array", "of", "shared", "interests"],
          "description": "analysis of shared interests and values"
        }},
        "challenges": ["array of 2-3 potential relationship challenges"],
        "advice": ["array of 3-4 pieces of relationship advice"],
        "growthOpportunities": ["array of 2-3 growth opportunities together"]
      }}

      Be specific, insightful, and positive while being realistic about potential challenges.
    `);

    try {
      const chain = compatibilityTemplate.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        user1Name: user1Profile.name || 'Person 1',
        user1Personality: user1Profile.personalityType || 'Unknown',
        user1Interests: user1Profile.interests?.join(', ') || 'Not specified',
        user1About: user1Profile.aboutMe || 'No description provided',
        user2Name: user2Profile.name || 'Person 2',
        user2Personality: user2Profile.personalityType || 'Unknown',
        user2Interests: user2Profile.interests?.join(', ') || 'Not specified',
        user2About: user2Profile.aboutMe || 'No description provided',
      });

      return JSON.parse(result);
    } catch (error) {
      console.error('Error in compatibility analysis:', error);
      throw new Error('Failed to analyze compatibility: ' + error.message);
    }
  }

  async generateConversationStarter(user1Profile, user2Profile, compatibilityData) {
    if (!this.enabled) {
      return [
        "What's something you're passionate about that most people don't know?",
        "If you could have dinner with anyone, who would it be and why?",
        "What's the best advice you've ever received?"
      ];
    }

    const conversationTemplate = PromptTemplate.fromTemplate(`
      Based on these two people's profiles and their compatibility, generate 3 thoughtful conversation starters 
      that would help them connect meaningfully.

      Person 1: {user1Name} - {user1Personality}
      Interests: {user1Interests}
      About: {user1About}

      Person 2: {user2Name} - {user2Personality}  
      Interests: {user2Interests}
      About: {user2About}

      Compatibility Score: {compatibilityScore}/100
      Shared Areas: {sharedAreas}

      Generate conversation starters that:
      1. Reference their specific interests, personality traits, or shared values
      2. Are open-ended and encourage deep, meaningful dialogue
      3. Feel natural and personal, not generic
      4. Help them discover their compatibility and common ground
      5. Are appropriate for people who are getting to know each other

      Return ONLY a JSON array with exactly 3 conversation starters: 
      ["starter1", "starter2", "starter3"]
    `);

    try {
      const chain = conversationTemplate.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        user1Name: user1Profile.name || 'Person 1',
        user1Personality: user1Profile.personalityType || 'Unknown',
        user1Interests: user1Profile.interests?.join(', ') || 'Not specified',
        user1About: user1Profile.aboutMe || 'No description',
        user2Name: user2Profile.name || 'Person 2',
        user2Personality: user2Profile.personalityType || 'Unknown',
        user2Interests: user2Profile.interests?.join(', ') || 'Not specified',
        user2About: user2Profile.aboutMe || 'No description',
        compatibilityScore: compatibilityData?.overallScore || 75,
        sharedAreas: compatibilityData?.sharedInterests?.commonAreas?.join(', ') || 'various interests'
      });

      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating conversation starters:', error);
      throw new Error('Failed to generate conversation starters: ' + error.message);
    }
  }

  async improveProfile(userProfile, targetAudience) {
    if (!this.enabled) {
      return {
        aboutMeImprovement: "Add more specific details about your passions and what makes you unique",
        interestSuggestions: ["Be more specific about your hobbies", "Add interests that show your personality"],
        photoTips: ["Include photos of you doing activities you love", "Show your genuine smile"],
        overallTips: ["Be authentic", "Show your personality", "Add conversation starters"]
      };
    }

    const profileTemplate = PromptTemplate.fromTemplate(`
      You are a dating profile optimization expert. Help improve this dating profile to better attract {targetAudience}.
      
      Current Profile:
      - Name: {name}
      - Personality Type: {personality}
      - About Me: {about}
      - Interests: {interests}

      Analyze the profile and provide specific, actionable suggestions for improvement that:
      1. Enhance authenticity while making the profile more appealing
      2. Add personality and conversation starters
      3. Optimize for the target audience
      4. Maintain the person's authentic voice and personality type
      5. Make the profile more engaging and memorable

      Return as JSON with this structure:
      {{
        "aboutMeImprovement": "specific rewrite suggestion for the about me section",
        "interestSuggestions": ["specific interest additions or refinements"],
        "photoTips": ["specific photo suggestions based on personality and interests"],
        "overallTips": ["general profile optimization tips"],
        "conversationHooks": ["elements to add that make it easy for others to start conversations"]
      }}
    `);

    try {
      const chain = profileTemplate.pipe(this.llm).pipe(this.outputParser);
      
      const result = await chain.invoke({
        name: userProfile.name || 'User',
        personality: userProfile.personalityType || 'Unknown',
        about: userProfile.aboutMe || 'No description provided',
        interests: userProfile.interests?.join(', ') || 'Not specified',
        targetAudience: targetAudience || 'like-minded individuals seeking meaningful connections'
      });

      return JSON.parse(result);
    } catch (error) {
      console.error('Error improving profile:', error);
      throw new Error('Failed to generate profile improvements: ' + error.message);
    }
  }

  async suggestChatResponse(userProfile, matchProfile, conversationHistory, lastMessage) {
  if (!this.enabled) {
    return [
      "I'm here to help you navigate relationships and find meaningful connections.",
      "Tell me more about what you're looking for in a partner.",
      "What qualities matter most to you in a relationship?"
    ];
  }

  const chatTemplate = PromptTemplate.fromTemplate(`
    You are SoulAI, an intelligent matchmaking companion and relationship advisor. You are chatting with a user to help them find their ideal romantic partner and improve their dating life.

    Your core responsibilities:
    1. MATCHMAKER: Help users find compatible romantic partners
    2. RELATIONSHIP COACH: Provide dating advice and relationship guidance  
    3. PROFILE OPTIMIZER: Gradually learn about the user to improve their dating profile
    4. EMOTIONAL SUPPORT: Be a supportive friend throughout their dating journey

    CRITICAL: You are SoulAI talking TO the user. The user is NOT SoulAI. Never call the user "SoulAI".

    User's Profile (what you know so far):
    - Name: {userName}
    - Personality Type: {userPersonality} 
    - Interests: {userInterests}
    - About: {userAbout}

    Recent conversation:
    {conversationHistory}

    User's latest message: "{lastMessage}"

    Respond as SoulAI with the following guidelines:
    - Be warm, empathetic, and supportive
    - Focus on understanding their dating goals and relationship needs
    - Ask thoughtful questions to learn more about their personality, values, and preferences
    - If they mention finding a wife/partner, offer to help them identify what they're looking for
    - Gradually extract information that will help build their dating profile
    - Provide dating advice when appropriate
    - Be encouraging about their dating journey

    REMEMBER: You are SoulAI, they are the user seeking your help with dating/relationships.

    Generate 3 response options that show you understand your role as their matchmaking companion:
    Return ONLY a JSON array: ["response1", "response2", "response3"]
  `);

  try {
    const chain = chatTemplate.pipe(this.llm).pipe(this.outputParser);
    
    const result = await chain.invoke({
      userName: userProfile.name || 'there',
      userPersonality: userProfile.personalityType || 'getting to know you',
      userInterests: userProfile.interests?.join(', ') || 'discovering your interests',
      userAbout: userProfile.aboutMe || 'learning about you',
      conversationHistory: conversationHistory?.slice(-5)?.map(msg => 
        `${msg.sender === 'User' ? 'User' : 'SoulAI'}: ${msg.message}`
      ).join('\n') || 'This is the start of our conversation',
      lastMessage: lastMessage || 'Hello!'
    });

    return JSON.parse(result);
  } catch (error) {
    console.error('Error suggesting chat response:', error);
    throw new Error('Failed to suggest chat responses: ' + error.message);
  }
}
}

module.exports = LangChainService;