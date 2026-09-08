import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/gemini/daily-insight", async (req, res) => {
    try {
      const { lang } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("API key not configured");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = lang === "PT" 
        ? "Gere uma frase curta, inspiradora e produtiva sobre criatividade em Português do Brasil. Máximo 15 palavras."
        : "Generate a short, inspiring and productive quote about creativity in English. Maximum 15 words.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.9 },
      });
      res.json({ text: response.text?.trim() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  app.post("/api/gemini/enhance-note", async (req, res) => {
    try {
      const { content, lang } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("API key not configured");
      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = lang === "PT"
        ? `Aja como um editor profissional. Melhore este texto, tornando-o mais claro e profissional em Português do Brasil. Responda APENAS com o texto melhorado. Texto: "${content}"`
        : `Act as a professional editor. Improve this text, making it clearer and more professional in English. Answer ONLY with the improved text. Text: "${content}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: systemPrompt,
        config: { temperature: 0.7 },
      });
      res.json({ text: response.text?.trim() || content });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to enhance note" });
    }
  });

  app.post("/api/gemini/speak", async (req, res) => {
    try {
      const { text, lang } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("API key not configured");
      const ai = new GoogleGenAI({ apiKey });
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
