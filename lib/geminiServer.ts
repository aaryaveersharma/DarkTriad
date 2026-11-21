import { GoogleGenAI, GenerateContentParameters } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export function extractBase64(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
}

export function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporarily|timeout|ECONNRESET/i.test(
    raw,
  );
}

export function extractReadableGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Unable to complete AI request.';
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        error?: { message?: string; status?: string };
      };
      if (parsed?.error?.message) return parsed.error.message;
    }
  } catch {
    // ignore
  }
  return raw;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateWithRetryCascade(
  paramsFactory: (model: string) => GenerateContentParameters,
  models: Array<{ model: string; delayMs: number }> = [
    { model: 'gemini-4-hydrogen', delayMs: 0 },
    { model: 'gemini-4-hydrogen', delayMs: 900 },
    { model: 'gemini-3.1-flash-lite', delayMs: 1200 },
    { model: 'gemini-3.1-flash-lite', delayMs: 1800 },
  ],
) {
  let lastError: unknown = null;

  for (const step of models) {
    if (step.delayMs > 0) {
      await sleep(step.delayMs);
    }
    try {
      return await ai.models.generateContent(paramsFactory(step.model));
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err)) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Gemini request failed after retries.');
}
