
import { Language } from "../types";

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
    try {
      const response = await fetch("/api/gemini/daily-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: lang === Language.PT ? "PT" : "EN" })
      });
      const data = await response.json();
      if (data.text) {
        return data.text;
      }
      return lang === Language.PT ? "Sua criatividade é sua melhor ferramenta." : "Your creativity is your best tool.";
    } catch {
      return lang === Language.PT ? "Foco e organização levam ao sucesso." : "Focus and organization lead to success.";
    }
  }

  async enhanceNote(content: string, lang: Language = Language.PT): Promise<string> {
    try {
      const response = await fetch("/api/gemini/enhance-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lang: lang === Language.PT ? "PT" : "EN" })
      });
      const data = await response.json();
      return data.text || content;
    } catch (error: any) {
      console.error("Erro na melhoria de texto:", error);
      throw error;
    }
  }

  async speak(text: string, lang: Language = Language.PT): Promise<void> {
    try {
      const response = await fetch("/api/gemini/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: lang === Language.PT ? "PT" : "EN" })
      });
      const data = await response.json();
      
      const base64Audio = data.audio;
      if (base64Audio) {
        const ctx = this.getAudioContext();
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      } else {
        throw new Error("No audio returned");
      }
    } catch (e) {
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
