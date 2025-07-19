Us App Step-by-Step Functionality Plan Phase 1: User Interaction Flow 1.
User Enters Chat Screen - Clean chat interface appears - User can freely
type to the AI 2. AI Handles Onboarding or Conversation - AI greets user
naturally using refined system prompt - Conversationally builds user
profile over time 3. AI Presents Recommendations - AI casually suggests
a profile: "Got this girl... seems funny, into travel... might be worth
a look?" - Profile images appear via smooth Carousel - No heavy profile
details shown initially (age, etc.) 4. User Gives Feedback - User types
natural feedback: "Yeah, I like her style" "Not my vibe" - AI detects
positive or negative sentiment from message - Carousel hides after clear
feedback - Preference logged in preferenceLog 5. Conversation
Continues - AI acknowledges feedback - AI suggests next profile (if
ready) or keeps conversation flowing - No overwhelming decks ---
recommendations are paced

Phase 2: Behind the Scenes Profile Handling - Profiles pulled from
dummyProfiles array (replace with real backend later) - Carousel only
shows during active recommendation Feedback Logging - User preferences (
yes / no ) saved to preferenceLog with profile ID - Enables AI to refine
future suggestions

1

Dismissal Logic - Carousel hides after feedback given - currentProfile
state reset Queue System (Next Build) - Store upcoming suggestions in
queue array - AI presents them one by one, when user ready

Phase 3: Future Features After Queue System • Social profile connections
(Instagram, etc.) • Public Deep Research (with user consent) • AI memory
for personalized evolving recommendations • Backend syncing with
Firebase for persistent storage • AI-to-AI matchmaking logic

Immediate Priority: • Add functional queue system for managing multiple
profile suggestions • Refine AI conversational tone based on user
feedback • Keep UI minimal, calm, focused on intentional introductions

2


