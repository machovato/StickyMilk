import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say 'STICKYMILK AI TRANSLATOR ACTIVE'",
    });
    console.log("Success! Gemini output:", response.text);
  } catch (err: unknown) {
    console.error("Test failed:", err);
  }
}

test();
