import { GoogleGenAI } from "@google/genai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function analyzeMessages(messages: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:
      "Привет. На основе сообщений приведенных сообщений ниже проанализируй стиль общения человека (формальный/неформальный). Дай свои комментарии. " +
      messages,
  });
  return response.text || "";
}

export async function psychologicalPortraitByUsername(
  username: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:
      "Привет. На основе одного никнейма постарайся составить психологический портрет человека. " +
      username,
  });
  return response.text || "";
}
