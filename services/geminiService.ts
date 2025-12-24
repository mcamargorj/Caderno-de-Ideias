
import { GoogleGenAI } from "@google/genai";

/**
 * Melhora o conteúdo de uma nota usando o modelo Gemini 3 Flash.
 */
export const enhanceNote = async (content: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Chave de API não configurada. Por favor, clique no botão de vincular chave.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Melhore este texto de nota adesiva para torná-lo mais profissional e organizado. Responda apenas com o texto melhorado em Português: "${content}"`,
    });
    
    const improvedText = response.text;
    if (!improvedText) throw new Error("A IA não retornou conteúdo.");
    
    return improvedText;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    
    if (error.status === 429) {
      throw new Error("Limite de uso atingido (Nível Gratuito). Aguarde um momento e tente novamente.");
    }

    if (error.message?.includes("Requested entity was not found") || error.status === 404) {
      throw new Error("Chave de API inválida ou não encontrada. Tente vincular novamente.");
    }
    
    throw new Error("Erro na conexão com a IA. Verifique sua chave e tente novamente.");
  }
};

/**
 * Cria um resumo curto para a nota.
 */
export const summarizeNote = async (content: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return content;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resuma em uma frase curta: "${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    return content;
  }
};
