import { adminDb } from '@/lib/firebase-admin';
import { currentUsage } from './context';

/** Writes one geminiUsage doc. Never throws: a logging failure must not fail the Gemini call. */
export async function recordUsage(model: string, u: {
  promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number;
} | undefined): Promise<void> {
  try {
    const ctx = currentUsage();
    await adminDb.collection('geminiUsage').add({
      at: new Date().toISOString(),
      uid: ctx?.uid ?? 'unattributed',
      refId: ctx?.refId ?? null,
      route: ctx?.route ?? 'unattributed',
      step: ctx?.step ?? 'unattributed',
      model,
      inputTokens: u?.promptTokenCount ?? 0,
      outputTokens: u?.candidatesTokenCount ?? 0,
      thinkingTokens: u?.thoughtsTokenCount ?? 0,
      totalTokens: u?.totalTokenCount ?? 0,
    });
  } catch (e) {
    console.warn('[usage] could not record Gemini usage:', e);
  }
}
