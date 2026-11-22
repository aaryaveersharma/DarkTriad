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

export function extractMimeAndBase64(
  raw?: string,
  explicitMimeType?: string,
): { mimeType: string; data: string } | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (match) {
    return {
      mimeType: explicitMimeType || match[1] || 'image/jpeg',
      data: match[2],
    };
  }
  return {
    mimeType: explicitMimeType || 'image/jpeg',
    data: trimmed,
  };
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
  thinkingLevel?: ThinkingLevel;
}

// Primary model for precision facial landmark & PSL analysis (accurate + quota-balanced)
export const FACIAL_ANALYSIS_MODELS: RetryStep[] = [
  {
    model: 'gemini-4-hydrogen',
    delayMs: 0,
    timeoutMs: 42000,
    thinkingLevel: ThinkingLevel.MEDIUM,
  },
  {
    model: 'gemini-3.1-flash-lite',
    delayMs: 300,
    timeoutMs: 25000,
    thinkingLevel: ThinkingLevel.MINIMAL,
  },
];

// Lowest / fastest model for intake validation and chatbot so facial analysis gets maximum quota focus
export const FAST_VALIDATION_MODELS: RetryStep[] = [
  {
    model: 'gemini-3.1-flash-lite',
    delayMs: 0,
    timeoutMs: 12000,
    thinkingLevel: ThinkingLevel.MINIMAL,
  },
  {
    model: 'gemini-3.1-flash-lite',
    delayMs: 300,
    timeoutMs: 12000,
    thinkingLevel: ThinkingLevel.MINIMAL,
  },
];

export const CHATBOT_MODELS: RetryStep[] = [
  {
    model: 'gemini-3.1-flash-lite',
    delayMs: 0,
    timeoutMs: 18000,
    thinkingLevel: ThinkingLevel.MINIMAL,
  },
  {
    model: 'gemini-3.1-flash-lite',
    delayMs: 350,
    timeoutMs: 18000,
    thinkingLevel: ThinkingLevel.MINIMAL,
  },
];

export async function generateWithRetryCascade(
  paramsFactory: (model: string) => GenerateContentParameters,
  models: RetryStep[] = CHATBOT_MODELS,
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
      const resolvedThinkingLevel =
        step.thinkingLevel ??
        (lowerModel.includes('3.1-flash-lite')
          ? ThinkingLevel.MINIMAL
          : lowerModel.startsWith('gemini-4-')
            ? ThinkingLevel.LOW
            : undefined);

      return await ai.models.generateContent({
        ...baseParams,
        config: {
          ...existingConfig,
          abortSignal: controller.signal,
          ...(resolvedThinkingLevel && !existingConfig.thinkingConfig
            ? { thinkingConfig: { thinkingLevel: resolvedThinkingLevel } }
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
