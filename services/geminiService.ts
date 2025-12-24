
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch {
    return '';
  }
};

export const enhanceNote = async (content: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return content;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Melhore o seguinte conteúdo de nota. Torne-o claro, organizado e profissional, mantendo a intenção original. RESPONDA APENAS EM PORTUGUÊS. Retorne apenas o texto melhorado sem introduções: \n\n"${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return content;
  }
};

export const summarizeNote = async (content: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return content;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Forneça um resumo muito curto de 1 frase para esta nota em PORTUGUÊS: \n\n"${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return content;
  }
};
