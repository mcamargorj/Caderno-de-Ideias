
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

  // @google/genai: Use process.env.API_KEY directly.
  // Initialization must happen with the named parameter apiKey.
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

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
    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Melhore este texto de nota adesiva. Mantenha o sentido original mas torne-o mais claro e profissional. Responda apenas com o texto corrigido em Português: "${content}"`,
      });
      
      // Accessing response.text property directly as per @google/genai guidelines.
      const text = response.text;
      if (!text) throw new Error("Resposta da IA vazia.");
      return text;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      // Robust handling for API errors (e.g., 4xx/5xx).
      if (error.status === 429) {
        throw new Error("Limite de uso atingido. Tente novamente em um minuto.");
      }
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    try {
      const ai = this.getClient();
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
      console.warn("Fallback de voz:", error);
      
      // Native speech fallback.
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const geminiService = new GeminiService();
