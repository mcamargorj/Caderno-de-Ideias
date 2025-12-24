
import { GoogleGenAI, Modality } from "@google/genai";

// Helper: Converte base64 para array de bytes
const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Decodifica Raw PCM (16-bit LE) para AudioBuffer
// Gemini TTS retorna PCM 24kHz, 1 canal (mono)
const decodePCM = (
  bytes: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer => {
  if (bytes.length % 2 !== 0) {
    bytes = bytes.slice(0, bytes.length - 1);
  }

  const pcm16 = new Int16Array(bytes.buffer);
  const frameCount = pcm16.length;
  
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    // Converte 16-bit integer para float [-1.0, 1.0]
    channelData[i] = pcm16[i] / 32768.0;
  }
  
  return buffer;
};

export class GeminiService {
  private audioContext: AudioContext | null = null;

  private get ai() {
    // Sempre pega a chave mais atual do process.env (injetada pelo AI Studio/Vercel)
    const apiKey = process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.warn("AudioContext resume failed", e));
    }
    return this.audioContext;
  }

  /**
   * Melhora o texto de uma nota.
   */
  async enhanceNote(content: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Melhore este texto de nota adesiva para torná-lo mais profissional e organizado. Responda apenas com o texto melhorado em Português: "${content}"`,
      });
      
      const text = response.text;
      if (!text) throw new Error("IA retornou vazio.");
      return text;
    } catch (error: any) {
      console.error("Enhance Error:", error);
      throw error;
    }
  }

  /**
   * Resuma uma nota.
   */
  async summarizeNote(content: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Resuma esta nota em uma única frase curta: "${content}"`,
      });
      return response.text || content;
    } catch (error) {
      console.error("Summarize Error:", error);
      return content;
    }
  }

  /**
   * Transforma texto em fala usando o modelo TTS do Gemini com fallback para o sistema nativo.
   */
  async speak(text: string): Promise<void> {
    try {
      // Tenta usar o Gemini TTS (Alta Qualidade)
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore tem um tom profissional e amigável
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const ctx = this.getAudioContext();
        const audioBytes = base64ToBytes(base64Audio);
        const audioBuffer = decodePCM(audioBytes, ctx, 24000);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      } else {
        throw new Error("Nenhum dado de áudio retornado pelo Gemini.");
      }

    } catch (error) {
      console.warn("Gemini TTS falhou, usando fallback nativo:", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const geminiService = new GeminiService();
