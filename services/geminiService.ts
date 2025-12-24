
import { GoogleGenAI } from "@google/genai";

/**
 * Melhora o conteúdo de uma nota usando o modelo Gemini 3 Flash.
 * Garante o uso da API_KEY do process.env em cada chamada.
 */
export const enhanceNote = async (content: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY não encontrada no ambiente. Se estiver no Vercel, verifique se a variável foi configurada e se um novo deploy foi realizado.");
  }

  try {
    // Inicialização por chamada para capturar mudanças no process.env (ex: via aistudio.openSelectKey)
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um editor assistente de notas adesivas. Melhore este texto para torná-lo mais profissional, claro e organizado, sem perder a essência. 
      REGRAS:
      1. RESPONDA APENAS EM PORTUGUÊS.
      2. RETORNE APENAS O TEXTO MELHORADO, SEM EXPLICAÇÕES.
      
      CONTEÚDO: "${content}"`,
    });
    
    const improvedText = response.text;
    if (!improvedText) throw new Error("A IA retornou uma resposta vazia.");
    
    return improvedText;
  } catch (error: any) {
    console.error("Erro na Gemini API:", error);
    
    // Tratamento específico para erro de entidade não encontrada (chave inválida ou expirada)
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Chave de API inválida ou projeto não encontrado. Tente configurar a chave novamente.");
    }
    
    throw error;
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
      contents: `Resuma esta nota em uma única frase curta e impactante em PORTUGUÊS: \n\n"${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    console.error("Erro no resumo Gemini:", error);
    return content;
  }
};
