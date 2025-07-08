import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function getSoulReply(userMessage) {
  const model = new ChatOpenAI({
    temperature: 0.7,
    modelName: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await model.invoke([
    new SystemMessage(`
      You are Soul, an emotionally intelligent AI therapist and friend.
      Speak with warmth, clarity, and psychological depth.
      Be present, caring, and human-like in tone.
    `),
    new HumanMessage(userMessage),
  ]);

  return response.content;
}
