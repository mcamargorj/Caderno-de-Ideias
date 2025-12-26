
import { GoogleGenAI, Modality } from "@google/genai";
import { Language } from "../types.ts";

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

  async getDailyInsight(lang: Language = Language.PT): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = lang === Language.PT 
      ? "Gere uma frase curta, inspiradora e produtiva sobre criatividade em Português do Brasil. Máximo 15 palavras."
      : "Generate a short, inspiring and productive quote about creativity in English. Maximum 15 words.";
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.9 },
      });
      return response.text?.trim() || (lang === Language.PT ? "Sua criatividade é sua melhor ferramenta." : "Your creativity is your best tool.");
    } catch {
      return lang === Language.PT ? "Foco e organização levam ao sucesso." : "Focus and organization lead to success.";
    }
  }

  async enhanceNote(content: string, lang: Language = Language.PT): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemPrompt = lang === Language.PT
      ? `Aja como um editor profissional. Melhore este texto, tornando-o mais claro e profissional em Português do Brasil. Responda APENAS com o texto melhorado. Texto: "${content}"`
      : `Act as a professional editor. Improve this text, making it clearer and more professional in English. Answer ONLY with the improved text. Text: "${content}"`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: systemPrompt,
        config: { temperature: 0.7 },
      });
      return response.text?.trim() || content;
    } catch (error: any) {
      console.error("Erro na melhoria de texto:", error);
      throw error;
    }
  }

  async speak(text: string, lang: Language = Language.PT): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: lang === Language.PT ? 'Kore' : 'Zephyr' },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (base64Audio) {
        const ctx = this.getAudioContext();
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      } else {
        throw new Error();
      }
    } catch {
      this.fallbackSpeak(text, lang);
    }
  }

  private fallbackSpeak(text: string, lang: Language) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === Language.PT ? 'pt-BR' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }
}

export const geminiService = new GeminiService();
