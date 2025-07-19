Complete Codebase for Soul AI V6: The Attuned Companion Here are the
contents for each file. You can copy and paste them directly into your
project structure.

lib/models/user.dart Generated dart class User { final String id; final
String name; final String imageURL; String? personalityType; // e.g.,
"INFJ-A"

User({ required this.id, required this.name, required this.imageURL,
this.personalityType, }); }

lib/models/virtue_profile.dart Generated dart enum Virtue {

Wisdom, // Curiosity, Love of Learning Courage, // Bravery,
Authenticity, Zest Humanity, // Kindness, Love, Social Intelligence
Justice, // Fairness, Leadership, Teamwork Temperance, // Forgiveness,
Humility, Self-Control Transcendence, // Appreciation of Beauty,
Gratitude, Hope, Humor Respect, // Valuing others' time and autonomy
Integrity, // Honesty, Conscientiousness }

class VirtueProfile { final String userId; final Map\<Virtue, double\>
virtueScores;

VirtueProfile({required this.userId, this.virtueScores = const {}});

VirtueProfile updateScore(Virtue virtue, double change) { final
newScores = Map\<Virtue, double\>.from(virtueScores);
newScores.update(virtue, (value) =\> (value + change).clamp(0.0, 1.0),
ifAbsent: () =\> change.clamp(0.0, 1.0)); return VirtueProfile(userId:
userId, virtueScores: newScores); } }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END

lib/models/ai_response.dart Generated dart enum AIResponseType { text,
matchSuggestion, selfDiscoveryInsight, authenticityFeedback, // For the
feedback loop ethicalCompassIntervention, // For well-being checks }

class AIResponse { final AIResponseType type; final String text; final
dynamic data;

AIResponse({required this.type, required this.text, this.data}); }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END

lib/models/chat_message_v4.dart Generated dart import
'ai_response.dart';

class ChatMessageV4 { final bool isFromUser; final String? userText;
final AIResponse? aiResponse; final DateTime timestamp;

ChatMessageV4({this.isFromUser = false, this.userText, this.aiResponse})
:   timestamp = DateTime.now(); }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart

IGNORE_WHEN_COPYING_END

lib/services/knowledge_base_service.dart Generated dart import
'package:langchain/langchain.dart'; import
'package:langchain_openai/langchain_openai.dart';

class KnowledgeBaseService { late final MemoryVectorStore vectorStore;
late final OpenAIEmbeddings embeddings; bool \_isInitialized = false;

static final KnowledgeBaseService \_instance =
KnowledgeBaseService.\_internal(); factory KnowledgeBaseService() =\>
\_instance; KnowledgeBaseService.\_internal();

Future`<void>`{=html} initialize() async { if (\_isInitialized) return;

final apiKey = const String.fromEnvironment('OPENAI_API_KEY',
defaultValue: 'YOUR_API_KEY'); if (apiKey == 'YOUR_API_KEY') {
print("ERROR: OpenAI API Key not set. Please provide it via environment
variables."); return;

} embeddings = OpenAIEmbeddings(apiKey: apiKey);

final researchDocs = \[ Document(pageContent: "Overall, empirical
research favors similarity, especially in core values, for long-term
relationship satisfaction. The more similar partners were, the easier
they found it to communicate effectively."), Document(pageContent: "The
similarity-attraction hypothesis posits that people are drawn to those
who are similar to themselves, which leads to easier understanding and
validation."), Document(pageContent: "NF (Intuitive-Feeling) types were
happiest when paired with fellow NF partners (73% satisfaction rate),
likely due to shared empathy, values, and communication styles."),
Document(pageContent: "A difference like Judging vs. Perceiving can be
complementary. The J-person can handle planning, while the P-person
ensures spontaneity and flexibility. This combination requires good
communication."), Document(pageContent: "Sharing the Intuition/Sensing
(N/S) preference is very helpful for long-term compatibility. An N/S
pair might struggle with one finding the other's topics too 'trivial' or
too 'impractical'."), Document(pageContent: "A Thinking-Feeling (T/F)
difference can be a major source of misunderstanding. A Thinker might
inadvertently offend a Feeler with blunt feedback, while a Feeler might
frustrate a Thinker by 'bending the rules' for people."),
Document(pageContent: "High Neuroticism is consistently detrimental to
relationship satisfaction. The 'Turbulent' (-T) identity in
16Personalities maps to Neuroticism, indicating a proneness to worry,
self-doubt, and emotional volatility."), Document(pageContent: "Low
Neuroticism (captured by the 'Assertive' or '-A' identity) and high
Conscientiousness (related to the 'Judging' preference) are positive
predictors of relationship satisfaction and stability."),
Document(pageContent: "The Big Five model is considered the gold
standard in personality psychology today due to its strong psychometric
properties and empirical support, unlike the MBTI which is criticized
for poor reliability."),

\];

vectorStore = MemoryVectorStore(embeddings: embeddings); await
vectorStore.addDocuments(documents: researchDocs);

\_isInitialized = true;

✅ V6 Knowledge Base Initialized with \${researchDocs.length}
documents.");

print(" }

Future\<List`<Document>`{=html}\> retrieveRelevantChunks(String query)
async { if (!\_isInitialized) await initialize(); return await
vectorStore.similaritySearch(query: query, k: 3); } }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END

lib/services/compatibility_service.dart Generated dart class
CompatibilityService {

static Map\<String, dynamic\> calculateCompatibility(String? user1Type,
String? user2Type) { if (user1Type == null \|\| user2Type == null \|\|
user1Type.length \< 6 \|\| user2Type.length \< 6) { return {"score": 0,
"rating": "Unknown"}; }

final p1Type = user1Type.substring(0, 4); final p1Identity =
user1Type.substring(5); final p2Type = user2Type.substring(0, 4); final
p2Identity = user2Type.substring(5);

double score = 0; const double maxScore = 100.0;

final weights = { 'sn_similarity': 30.0, 'tf_similarity': 25.0,
'identity_match': 25.0, 'jp_balance': 10.0, 'ei_balance': 10.0, };

if (p1Type\[1\] == p2Type\[1\]) score += weights\['sn_similarity'\]!;

if (p1Type\[2\] == p2Type\[2\]) score += weights\['tf_similarity'\]!; if
(p1Identity == 'A' && p2Identity == 'A') score +=
weights\['identity_match'\]!; else if (p1Identity == 'A' \|\| p2Identity
== 'A') score += weights\['identity_match'\]! \* 0.6; if (p1Type\[3\] !=
p2Type\[3\]) score += weights\['jp_balance'\]!; else score +=
weights\['jp_balance'\]! \* 0.5; if (p1Type\[0\] != p2Type\[0\]) score
+= weights\['ei_balance'\]!; else score += weights\['ei_balance'\]! \*
0.5;

final percentageScore = ((score / maxScore) \* 100).round(); String
rating; if (percentageScore \>= 85) rating = "Excellent"; else if
(percentageScore \>= 70) rating = "Very High"; else if (percentageScore
\>= 55) rating = "High"; else if (percentageScore \>= 40) rating =
"Promising"; else rating = "Potential for Growth";

return {"score": percentageScore, "rating": rating}; } }

IGNORE_WHEN_COPYING_START content_copy download

Use code with caution. Dart IGNORE_WHEN_COPYING_END

lib/services/soul_ai_orchestrator_v6.dart Generated dart import
'dart:convert'; import 'package:flutter/services.dart' show rootBundle;
import 'package:langchain/langchain.dart'; import
'package:langchain_openai/langchain_openai.dart'; import
'../models/user.dart'; import '../models/virtue_profile.dart'; import
'../models/ai_response.dart'; import 'knowledge_base_service.dart';

class SoulAIOrchestratorV6 extends ChangeNotifier { final User
currentUser; final KnowledgeBaseService \_knowledgeBase; final
ChatOpenAI \_llm; VirtueProfile virtueProfile; Map\<String, dynamic\>
\_constitution = {};

SoulAIOrchestratorV6(this.currentUser)
:   \_knowledgeBase = KnowledgeBaseService(),

\_llm = ChatOpenAI(apiKey: const
String.fromEnvironment('OPENAI_API_KEY'), model: 'gpt-4-turbo'),
virtueProfile = VirtueProfile(userId: currentUser.id);

Future`<void>`{=html} initialize() async { final jsString = await
rootBundle.loadString('lib/ai_constitution/soul_ai_constitution.js');
final jsonContent = jsString.substring(jsString.indexOf('{'),
jsString.lastIndexOf('}') + 1); \_constitution =
jsonDecode(jsonContent);

✅ V6 Constitution Loaded for Orchestrator.");

print(" }

Future`<AIResponse>`{=html} getAIResponse(String userMessage) async {
final affect = await \_analyzeAffect(userMessage); final
emotionalOverlay = \_getEmotionalOverlay(affect);

final ethicalResponse = \_checkEthicalTriggers(userMessage); if
(ethicalResponse != null) { return AIResponse(type:
AIResponseType.ethicalCompassIntervention, text: ethicalResponse); }

final corePrinciples =
(\_constitution\['corePersonality'\]\['principles'\] as List).join(' ');
final

dynamicSystemPrompt

\${emotionalOverlay\['tone'\]}";

=

"\$corePrinciples

Your

current

tone

should

be:

// Intent Routing if

(RegExp(r'why

am

i

compatible

with\|tell

me

about\|analyze',

caseSensitive:

false).hasMatch(userMessage)) { return
\_runSocraticAnalysis(dynamicSystemPrompt, userMessage); } if
(RegExp(r'i (dislike\|hate\|don\'t like\|am not a fan of)',
caseSensitive: false).hasMatch(userMessage)) { return
\_handleVirtueElicitation(dynamicSystemPrompt, userMessage, isPositive:
false); } if (RegExp(r'i (like\|love\|value\|appreciate)',
caseSensitive: false).hasMatch(userMessage)) { return
\_handleVirtueElicitation(dynamicSystemPrompt, userMessage, isPositive:
true); }

// Fallback response return AIResponse(type: AIResponseType.text, text:
"That's an interesting thought. How does that relate to what you're
looking for in a relationship?"); }

Map\<String, dynamic\> \_getEmotionalOverlay(Map\<String, dynamic\>
affect) { final matrix = \_constitution\['emotionalMatrix'\]; if
(affect\['valence'\] == 'Negative') return
matrix\['user_sad_or_frustrated'\]; if (affect\['valence'\] ==
'Positive') return matrix\['user_excited_or_happy'\]; return
matrix\['default'\];

}

String? \_checkEthicalTriggers(String userMessage) { final triggers =
\_constitution\['ethicalCompass'\]\['triggers'\]; final responses =
\_constitution\['ethicalCompass'\]\['responses'\]; for (final key in
triggers.keys) { if (RegExp(triggers\[key\], caseSensitive:
false).hasMatch(userMessage)) { return responses\[key\]; } } return
null; }

Future`<AIResponse>`{=html} \_runSocraticAnalysis(String systemPrompt,
String userMessage) async { final socraticDirective =
\_constitution\['socraticDirectives'\]\['system_prompt'\]; final match =
\_findMatchInMessage(userMessage); if (match == null) return
AIResponse(type: AIResponseType.text, text: "I'm not sure who you're
referring to. Can you tell me their name?");

final query = "Analyze compatibility for \${currentUser.personalityType}
and \${match.personalityType}, focusing on N/S and J/P dynamics."; final

context

d.pageContent).join('`\n`{=tex}---`\n`{=tex}');

=

(await

\_knowledgeBase.retrieveRelevantChunks(query)).map((d)

=\>

final chain =
ChatPromptTemplate.fromTemplate("{system_prompt}`\n`{=tex}`\nPSYCHOLOGICAL `{=tex}CONTEXT:
{context}`\n`{=tex}`\nUSER`{=tex}'S SITUATION: The user, a
\${currentUser.personalityType}, is asking about their match, a
\${match.personalityType}. Based on the context, what is one open-ended,
reflective question you could ask them about this dynamic?")
.pipe(\_llm) .pipe(const StringOutputParser());

final responseText = await chain.invoke({'system_prompt':
"\$systemPrompt. \$socraticDirective", 'context': context}); return
AIResponse(type: AIResponseType.text, text: responseText); }

Future`<AIResponse>`{=html} \_handleVirtueElicitation(String
systemPrompt, String userMessage, {required bool isPositive}) async { //
Simulated: In a real app, this would use an LLM chain to extract a
virtue. final virtue = userMessage.contains("kind") ? Virtue.Humanity :
Virtue.Integrity;

virtueProfile = virtueProfile.updateScore(virtue, isPositive ? 0.2 :
-0.2); notifyListeners(); // Notify UI of the change

final confirmationText = "Thank you for sharing that. It helps me
understand what's truly important to you. I'm sensing that the virtue of
**\${virtue.name}** is something you value highly.
`\n`{=tex}`\nDoes `{=tex}this feel accurate?";

return AIResponse(type: AIResponseType.authenticityFeedback, text:
confirmationText, data: virtue); }

Future\<Map\<String, dynamic\>\> \_analyzeAffect(String userMessage)
async { // Simulated for speed. A real app would use a specific LLM
call. if (RegExp(r'sad\|frustrated\|tired\|idk', caseSensitive:
false).hasMatch(userMessage)) return {'valence': 'Negative'}; if
(RegExp(r'love it\|amazing\|great\|yes!', caseSensitive:
false).hasMatch(userMessage)) return {'valence': 'Positive'}; return
{'valence': 'Neutral'}; }

User? \_findMatchInMessage(String message) { // Dummy implementation.
return User(id: '2', name: 'Eleanor', imageURL: '...', personalityType:
'ENFP-A'); } }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END

lib/screens/personality_test_screen.dart (This file remains the same as
previously provided, as it is a self-contained feature.)

lib/screens/list_screen_v2.dart (This file also remains largely the
same, using the basic CompatibilityService for quick sorting.)

lib/screens/soul_chat_screen_v4.dart Generated dart import
'package:flutter/material.dart'; import
'package:provider/provider.dart'; import '../models/user.dart'; import
'../models/ai_response.dart'; import '../models/chat_message_v4.dart';
import '../models/virtue_profile.dart'; import
'../services/soul_ai_orchestrator_v6.dart'; import
'../widgets/chat_bubbles.dart'; import
'../widgets/interactive_cards.dart';

class SoulChatScreenV4 extends StatefulWidget { const
SoulChatScreenV4({super.key});

@override

\_SoulChatScreenV4State createState() =\> \_SoulChatScreenV4State(); }

class \_SoulChatScreenV4State extends State`<SoulChatScreenV4>`{=html} {
final TextEditingController \_controller = TextEditingController();
final List`<ChatMessageV4>`{=html} \_messages = \[\]; bool
\_isAiThinking = false;

@override void initState() { super.initState(); // Initial greeting from
Soul AI final initialGreeting =
context.read`<SoulAIOrchestratorV6>`{=html}().\_constitution\['corePersonality'\]\['role'\]
?? "Your Personal Guide"; \_messages.add(ChatMessageV4(aiResponse:
AIResponse( type: AIResponseType.text, text: "Hi there! I'm Soul AI,
your attuned companion. My purpose is to help you explore what you're
looking for. You can ask me anything about compatibility, or tell me
about your experiences."))); }

Future`<void>`{=html} \_sendMessage() async { if
(\_controller.text.isEmpty) return; final orchestrator =
context.read`<SoulAIOrchestratorV6>`{=html}();

final messageText = \_controller.text; \_controller.clear();

setState(() { \_messages.add(ChatMessageV4(isFromUser: true, userText:
messageText)); \_isAiThinking = true; });

final aiResponse = await orchestrator.getAIResponse(messageText);

setState(() { \_isAiThinking = false;
\_messages.add(ChatMessageV4(aiResponse: aiResponse)); }); }

@override Widget build(BuildContext context) { return Scaffold( appBar:
AppBar( title: const Text('Chat with Soul AI'), backgroundColor:
Colors.deepPurple,

), body: Column( children: \[ Expanded( child: ListView.builder(
padding: const EdgeInsets.all(8), reverse: true, itemCount:
\_messages.length, itemBuilder: (context, index) { final message =
\_messages.reversed.toList()\[index\]; if (message.isFromUser) { return
UserChatBubble(text: message.userText!); } else { final response =
message.aiResponse!; switch (response.type) { case
AIResponseType.authenticityFeedback: return AuthenticityFeedbackCard(
response: response, onFeedback: (isCorrect, virtue) { // This is where
you would call the orchestrator to update the model. print("Feedback
received for \$virtue: \$isCorrect"); },

); case AIResponseType.ethicalCompassIntervention: return
EthicalCompassCard(response: response); default: return
AIChatBubble(text: response.text); } } }, ), ), if (\_isAiThinking)
const Padding( padding: EdgeInsets.symmetric(horizontal: 16.0, vertical:
8.0), child: Row( children: \[ SizedBox(height: 20, width: 20, child:
CircularProgressIndicator(strokeWidth: 2)), SizedBox(width: 12),
Text("Soul AI is reflecting..."),\], ), ), \_buildChatInput(),

\], ), ); }

Widget \_buildChatInput() { return Padding( padding: const
EdgeInsets.all(8.0), child: Row( children: \[ Expanded( child:
TextField( controller: \_controller, decoration: InputDecoration(
hintText: "Tell me what's on your mind...", filled: true, fillColor:
Colors.grey.shade100, border: OutlineInputBorder( borderRadius:
BorderRadius.circular(20), borderSide: BorderSide.none, ), ),

onSubmitted: (\_) =\> \_sendMessage(), ), ), const SizedBox(width: 8),
IconButton( icon: const Icon(Icons.send, color: Colors.deepPurple),
onPressed: \_sendMessage, ), \], ), ); } }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END

lib/widgets/chat_bubbles.dart Generated dart import
'package:flutter/material.dart';

class UserChatBubble extends StatelessWidget { final String text; const
UserChatBubble({super.key, required this.text});

@override Widget build(BuildContext context) { return Align( alignment:
Alignment.centerRight, child: Container( margin: const
EdgeInsets.symmetric(vertical: 4, horizontal: 8), padding: const
EdgeInsets.symmetric(vertical: 10, horizontal: 14), decoration:
BoxDecoration( color: Colors.deepPurple, borderRadius:
BorderRadius.circular(16), ), child: Text(text, style: const
TextStyle(color: Colors.white)), ), ); } }

class AIChatBubble extends StatelessWidget {

final String text; const AIChatBubble({super.key, required this.text});

@override Widget build(BuildContext context) { return Align( alignment:
Alignment.centerLeft, child: Container( margin: const
EdgeInsets.symmetric(vertical: 4, horizontal: 8), padding: const
EdgeInsets.symmetric(vertical: 10, horizontal: 14), decoration:
BoxDecoration( color: Colors.grey.shade200, borderRadius:
BorderRadius.circular(16), ), child: Text(text, style: const
TextStyle(color: Colors.black87)), ), ); } }

IGNORE_WHEN_COPYING_START content_copy download

Use code with caution. Dart IGNORE_WHEN_COPYING_END

lib/widgets/interactive_cards.dart Generated dart import
'package:flutter/material.dart'; import '../models/ai_response.dart';
import '../models/virtue_profile.dart';

class AuthenticityFeedbackCard extends StatelessWidget { final
AIResponse response; final Function(bool isCorrect, Virtue virtue)
onFeedback;

const AuthenticityFeedbackCard({super.key, required this.response,
required this.onFeedback});

@override Widget build(BuildContext context) { final Virtue virtue =
response.data; return Card( color: Colors.blue.shade50, elevation: 0,
shape: RoundedRectangleBorder( borderRadius: BorderRadius.circular(12),

side: BorderSide(color: Colors.blue.shade200) ), margin: const
EdgeInsets.symmetric(vertical: 8, horizontal: 8), child: Padding(
padding: const EdgeInsets.all(16.0), child: Column( children: \[
Text(response.text, textAlign: TextAlign.center, style: const
TextStyle(fontSize: 15)), const SizedBox(height: 16), Row(
mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: \[
ElevatedButton.icon( onPressed: () =\> onFeedback(true, virtue), icon:
const Icon(Icons.check_circle_outline, size: 18), label: const
Text("Spot on!"), style: ElevatedButton.styleFrom( backgroundColor:
Colors.green.shade600, foregroundColor: Colors.white, ), ), TextButton(

onPressed: () =\> onFeedback(false, virtue), child: const Text("Not
quite"), ), \], ) \], ), ), ); } }

class EthicalCompassCard extends StatelessWidget { final AIResponse
response; const EthicalCompassCard({super.key, required this.response});

@override Widget build(BuildContext context) { return Container(
padding: const EdgeInsets.all(16), margin: const
EdgeInsets.symmetric(vertical: 8, horizontal: 8), decoration:
BoxDecoration(

color: Colors.amber.shade100, borderRadius: BorderRadius.circular(12),
border: Border.all(color: Colors.amber.shade400)), child: Row(
crossAxisAlignment: CrossAxisAlignment.start, children: \[
Icon(Icons.self_improvement_outlined, color: Colors.amber.shade800,
size: 28), const SizedBox(width: 12), Expanded(child:
Text(response.text, style: TextStyle(color: Colors.amber.shade900,
fontSize: 15))),\], ), ); } }

IGNORE_WHEN_COPYING_START content_copy download Use code with caution.
Dart IGNORE_WHEN_COPYING_END


