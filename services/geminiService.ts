
import { GoogleGenAI } from "@google/genai";

/**
 * Melhora o conteúdo de uma nota usando o modelo Gemini 3 Flash.
 * Assume que process.env.API_KEY está configurado no ambiente (Vercel).
 */
export const enhanceNote = async (content: string): Promise<string> => {
  // Inicializa o cliente dentro da função para garantir o acesso ao estado mais recente do ambiente
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY não encontrada no ambiente. Verifique as configurações do Vercel.");
    return content;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Melhore este texto de nota adesiva. Deixe-o mais organizado e claro, mas mantenha o tom original. RESPONDA APENAS COM O TEXTO MELHORADO EM PORTUGUÊS: \n\n"${content}"`,
    });
    
    // O SDK retorna o texto diretamente através da propriedade .text
    const improvedText = response.text;
    return improvedText || content;
  } catch (error) {
    console.error("Erro ao chamar a Gemini API:", error);
    return content;
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
      contents: `Resuma esta nota em uma única frase curta em PORTUGUÊS: \n\n"${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    console.error("Erro no resumo Gemini:", error);
    return content;
  }
};
