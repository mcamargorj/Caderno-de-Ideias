
import { GoogleGenAI, Modality } from "@google/genai";

// Helper: Decodifica base64 para Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decodifica Raw PCM (16-bit LE) para AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.warn("Erro ao ativar áudio", e));
    }
    return this.audioContext;
  }

  async enhanceNote(content: string): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Chave de API não configurada no ambiente.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Tentamos primeiro com o modelo Gemini 3 (mais recente)
    try {
      console.log("Iniciando melhoria de texto com Gemini 3...");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Instrução: Melhore este texto de nota adesiva, tornando-o mais claro e profissional em Português. Responda APENAS com o texto melhorado. Texto: "${content}"`,
        config: {
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (text) return text.trim();
      throw new Error("Resposta vazia da IA.");
    } catch (primaryError: any) {
      console.warn("Gemini 3 falhou ou está indisponível. Tentando fallback para Gemini Flash Latest...", primaryError);
      
      try {
        // Fallback para o modelo Flash estável
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: `Aja como um editor. Melhore este texto em Português: "${content}". Retorne apenas o resultado final.`,
        });

        const fallbackText = fallbackResponse.text;
        if (fallbackText) return fallbackText.trim();
        throw new Error("Falha no fallback da IA.");
      } catch (secondaryError: any) {
        console.error("Erro crítico em todos os modelos de IA:", secondaryError);
        
        if (secondaryError?.status === 429) {
          throw new Error("Limite de cota atingido (429). Aguarde um minuto.");
        }
        
        throw new Error("Erro de conexão com o servidor da Google.");
      }
    }
  }

  async speak(text: string): Promise<void> {
    try {
      const apiKey = process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const ctx = this.getAudioContext();
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          ctx,
          24000,
          1
        );

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (error: any) {
      console.warn("TTS Gemini falhou, usando voz nativa do sistema:", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const geminiService = new GeminiService();
