import { GoogleGenAI } from '@google/genai';
import { recordUsage } from '@/lib/usage/recordUsage';

// Thin wrapper over @google/genai that keeps the old getGenerativeModel().generateContent() call shape,
// so call sites did not have to change. New code (search grounding, URL context) should use `.ai` directly.
type ModelConfig = { model: string; systemInstruction?: string; generationConfig?: Record<string, unknown> };

export class GeminiClient {
  private client?: GoogleGenAI;
  constructor(private apiKey: string) {}

  /** The native SDK client, created on first use (an empty key must not throw at import time). */
  get ai(): GoogleGenAI {
    return (this.client ??= new GoogleGenAI({ apiKey: this.apiKey }));
  }

  getGenerativeModel({ model, systemInstruction, generationConfig }: ModelConfig) {
    return {
      generateContent: async (input: string | any[]) => {
        const r = await this.ai.models.generateContent({
          model,
          contents: typeof input === 'string' ? input : [{ role: 'user', parts: input }],
          config: { ...generationConfig, ...(systemInstruction ? { systemInstruction } : {}) },
        });
        await recordUsage(model, r.usageMetadata); // awaited: inside after() a fire-and-forget write can be lost when the function freezes
        return { response: { text: () => r.text ?? '', candidates: r.candidates } };
      },
    };
  }
}
