
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
    if (!apiKey) throw new Error("API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Aja como um editor profissional. Melhore este texto de nota adesiva, tornando-o mais claro e profissional em Português do Brasil. Mantenha o tom original mas melhore a escrita. Responda APENAS com o texto melhorado. Texto: "${content}"`,
        config: { temperature: 0.7 },
      });

      return response.text?.trim() || content;
    } catch (error: any) {
      console.error("Erro na melhoria de texto:", error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key ausente para TTS. Usando voz nativa.");
      this.fallbackSpeak(text);
      return;
    }

    if (!text || text.trim().length === 0) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      // Ajuste do prompt: Adicionando um prefixo diretivo para forçar o modelo a gerar áudio
      // O erro 400 ocorre se o modelo tentar "conversar" em texto em vez de apenas ler.
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga o seguinte texto de forma clara e natural: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
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
      } else {
        // Se a IA retornar texto em vez de áudio (mesmo com Modality.AUDIO), usamos o fallback
        throw new Error("Modelo não retornou dados de áudio.");
      }
    } catch (error: any) {
      console.error("Erro no TTS Gemini (400 ou Recusa):", error);
      this.fallbackSpeak(text);
    }
  }

  private fallbackSpeak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  }
}

export const geminiService = new GeminiService();
