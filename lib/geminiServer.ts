import { GoogleGenAI, GenerateContentParameters, ThinkingLevel } from '@google/genai';

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
  return /503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporarily|timeout|aborted|AbortError|ECONNRESET/i.test(
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

export interface RetryStep {
  model: string;
  delayMs: number;
  timeoutMs?: number;
}

export async function generateWithRetryCascade(
  paramsFactory: (model: string) => GenerateContentParameters,
  models: RetryStep[] = [
    { model: 'gemini-3.1-flash-lite', delayMs: 0, timeoutMs: 22000 },
    { model: 'gemini-4-hydrogen', delayMs: 400, timeoutMs: 22000 },
  ],
) {
  let lastError: unknown = null;

  for (const step of models) {
    if (step.delayMs > 0) {
      await sleep(step.delayMs);
    }

    const controller = new AbortController();
    const timer = step.timeoutMs
      ? setTimeout(() => controller.abort(new Error('Gemini request timeout')), step.timeoutMs)
      : null;

    try {
      const baseParams = paramsFactory(step.model);
      const lowerModel = step.model.toLowerCase();
      const existingConfig = baseParams.config ?? {};
      const defaultThinkingConfig = lowerModel.includes('3.1-flash-lite')
        ? { thinkingLevel: ThinkingLevel.MINIMAL }
        : lowerModel.startsWith('gemini-4-')
          ? { thinkingLevel: ThinkingLevel.LOW }
          : undefined;

      return await ai.models.generateContent({
        ...baseParams,
        config: {
          ...existingConfig,
          abortSignal: controller.signal,
          ...(defaultThinkingConfig && !existingConfig.thinkingConfig
            ? { thinkingConfig: defaultThinkingConfig }
            : {}),
        },
      });
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err)) {
        break;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError ?? new Error('Gemini request failed after retries.');
}
