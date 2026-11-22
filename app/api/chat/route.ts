import { NextResponse } from 'next/server';
import {
  extractBase64,
  extractReadableGeminiError,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';
import { ChatMode } from '@/lib/types';

interface ChatRequestBody {
  mode?: ChatMode;
  message?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  attachmentImageBase64?: string;
  userContext?: {
    profile?: Record<string, unknown>;
    latestAnalysisSummary?: Record<string, unknown> | null;
    progressSummary?: Record<string, unknown> | null;
    frontImageBase64?: string;
    sideImageBase64?: string;
  };
}

const UNIFIED_SYSTEM_INSTRUCTION = `You are DARK TRIAD AI, a unified personal aesthetics, facial harmony, grooming, skincare, hairstyle, nutrition, and fitness assistant.
Respond directly and helpfully to ALL topics in this single interface:
- Facial structure analysis, PSL proportions, symmetry, angularity, strengths, focus areas, and realistic appearance improvements
- Targeted morning/night skincare routines, active ingredients, and Indian-accessible product guidance (non-diagnostic)
- Personalized hairstyle recommendations based on visible face shape, hairline, and proportions, including barber instructions and styling
- Nutrition, calorie/protein guidance, hydration, sodium/potassium de-bloating balance, and practical Indian meals (never infer body fat from a face photo or prescribe extreme deficits, especially for under-18 users)
- Training, cardio/steps, posture, neck exercises, and safe jaw/masseter guidance (never claim exercises reshape adult bone)

Strict accuracy rules:
- Use ONLY the verified profile, scan analysis, photos, and daily progress data provided in context.
- Never invent measurements, age, height, weight, or personal stats that are missing; clearly note what is missing if needed.
- Never mention chat modes or ask the user to switch modes.
Keep responses structured, practical, concise, grounded in observable facts, and free of flattering hype.`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured in Settings > Secrets.' },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid chat payload.' }, { status: 400 });
  }

  const userMessage = (body.message ?? '').trim();

  if (!userMessage) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }

  const ctx = body.userContext ?? {};
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  const frontB64 = extractBase64(ctx.frontImageBase64);
  const sideB64 = extractBase64(ctx.sideImageBase64);
  const attachB64 = extractBase64(body.attachmentImageBase64);

  if (frontB64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frontB64 } });
  }
  if (sideB64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: sideB64 } });
  }
  if (attachB64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachB64 } });
  }

  const historyText = (body.history ?? [])
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'DARK TRIAD AI'}: ${m.text}`)
    .join('\n');

  const contextSnapshot = JSON.stringify(
    {
      profile: ctx.profile ?? null,
      latestAnalysis: ctx.latestAnalysisSummary ?? null,
      dailyProgressSummary: ctx.progressSummary ?? null,
      hasFrontPhoto: Boolean(frontB64),
      hasSidePhoto: Boolean(sideB64),
    },
    null,
    2,
  );

  parts.push({
    text: `VERIFIED USER CONTEXT (do not fabricate missing fields):
${contextSnapshot}

RECENT CONVERSATION:
${historyText || '(none)'}

CURRENT USER QUESTION:
${userMessage}`,
  });

  try {
    const response = await generateWithRetryCascade((model) => ({
      model,
      contents: { parts },
      config: {
        systemInstruction: UNIFIED_SYSTEM_INSTRUCTION,
      },
    }));

    return NextResponse.json({
      reply: (response.text ?? 'Unable to generate response right now.').trim(),
      mode: 'GENERAL',
    });
  } catch (err) {
    const status = isTransientGeminiError(err) ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'DARK TRIAD AI is experiencing temporary high traffic. Please resend in a moment.'
            : extractReadableGeminiError(err),
      },
      { status },
    );
  }
}
