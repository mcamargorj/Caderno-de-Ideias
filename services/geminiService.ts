
import { GoogleGenAI } from "@google/genai";

/**
 * Melhora o conteúdo de uma nota usando o modelo Gemini 3 Flash.
 * Reinicializa o cliente a cada chamada para garantir o uso da chave atualizada (window.aistudio).
 */
export const enhanceNote = async (content: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY não encontrada. Clique no botão de IA para configurar sua chave de acesso.");
  }

  try {
    // IMPORTANTE: Criar nova instância para pegar a chave do diálogo de seleção
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Atue como um editor de textos profissional. Melhore e organize esta nota adesiva para que fique mais clara e objetiva. 
      Mantenha o idioma original (Português). 
      Responda APENAS com o texto melhorado, sem comentários adicionais:
      
      "${content}"`,
    });
    
    const improvedText = response.text;
    if (!improvedText) throw new Error("A IA não retornou conteúdo. Tente novamente.");
    
    return improvedText;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Chave de API inválida ou projeto não encontrado. Tente reconfigurar a chave.");
    }
    
    throw new Error("Não foi possível processar com IA no momento. Verifique sua chave e conexão.");
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
      contents: `Resuma esta nota em uma única frase curta: \n\n"${content}"`,
    });
    
    return response.text || content;
  } catch (error) {
    return content;
  }
};
