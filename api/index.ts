import express from "express";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
app.use(express.json());

function getApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) throw new Error("API key not configured in environment");
  return key;
}

app.post("/api/gemini/daily-insight", async (req, res) => {
  try {
    const { lang } = req.body;
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const prompt = lang === "PT" 
      ? "Gere uma frase curta, inspiradora e produtiva sobre criatividade em Português do Brasil. Máximo 15 palavras."
      : "Generate a short, inspiring and productive quote about creativity in English. Maximum 15 words.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.9 },
    });
    res.json({ text: response.text?.trim() });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate insight" });
  }
});

app.post("/api/gemini/enhance-note", async (req, res) => {
  try {
    const { content, lang } = req.body;
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const systemPrompt = lang === "PT"
      ? `Aja como um editor profissional. Melhore este texto, tornando-o mais claro e profissional em Português do Brasil. Responda APENAS com o texto melhorado. Texto: "${content}"`
      : `Act as a professional editor. Improve this text, making it clearer and more professional in English. Answer ONLY with the improved text. Text: "${content}"`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: systemPrompt,
      config: { temperature: 0.7 },
    });
    res.json({ text: response.text?.trim() || content });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to enhance note" });
  }
});

app.post("/api/gemini/speak", async (req, res) => {
  try {
    const { text, lang } = req.body;
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: lang === "PT" ? 'Kore' : 'Zephyr' },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      throw new Error("No audio generated");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate audio" });
  }
});

export default app;
