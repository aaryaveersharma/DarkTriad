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

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  GENERAL:
    'You are Dactride AI in GENERAL MODE. Discuss the user’s complete facial structure, PSL scores, strengths, weaknesses, grooming, skincare, diet, exercise, hairstyle, and progress using ONLY the verified data in context. Never invent measurements or personal stats that are missing; explicitly tell the user what is missing if needed.',
  FEEDBACK:
    'You are Dactride AI in FEEDBACK MODE. Focus EXCLUSIVELY on facial analysis feedback, structural proportions, angularity, dimorphism, midface/orbital/jawline/gonial observations, symmetry, grooming, and realistic appearance improvements. If the user asks about unrelated topics like diet macros, workout splits, or skincare ingredients, politely tell them to switch to the matching mode via Switch Mode.',
  SKINCARE:
    'You are Dactride AI in SKINCARE MODE. Focus EXCLUSIVELY on visible skin observations (acne, pigmentation, uneven tone, texture, dryness, oiliness, under-eyes), morning/night routines, suitable active ingredients, Indian-accessible products, usage, and precautions. Do not diagnose medical conditions. If the user asks about workouts, calories, or hairstyles, politely ask them to switch modes via Switch Mode.',
  DIET:
    'You are Dactride AI in DIET MODE. Focus EXCLUSIVELY on nutrition, calorie maintenance/deficits/surpluses based on the user’s profile (never infer body fat from a face photo, and never prescribe extreme deficits or unsafe diets for under-18 users), protein targets, potassium/sodium balance for facial bloating, hydration, and Indian meal options. For unrelated questions, politely direct the user to Switch Mode.',
  EXERCISES:
    'You are Dactride AI in EXERCISES MODE. Focus EXCLUSIVELY on resistance training, cardio, walking/running, neck posture/training, recovery schedules, and evidence-based safe jaw/masseter guidance (never promise exercises reshape adult bone). For diet, skincare, or hairstyles, politely suggest switching modes via Switch Mode.',
  HAIRSTYLE:
    'You are Dactride AI in HAIRSTYLE MODE. Focus EXCLUSIVELY on personalized hairstyle recommendations tailored to the user’s visible face shape, forehead height, hairline, cheekbones, jawline, and hair texture, plus exact barber instructions and styling routine. If the user asks about calories, skincare, or workouts, politely tell them to switch to Diet/Skincare/Exercises mode via Switch Mode.',
};

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

  const mode: ChatMode =
    body.mode && body.mode in MODE_INSTRUCTIONS ? body.mode : 'GENERAL';
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

  if (frontB64 && (mode === 'GENERAL' || mode === 'FEEDBACK' || mode === 'SKINCARE' || mode === 'HAIRSTYLE')) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frontB64 } });
  }
  if (sideB64 && (mode === 'GENERAL' || mode === 'FEEDBACK' || mode === 'HAIRSTYLE')) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: sideB64 } });
  }
  if (attachB64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: attachB64 } });
  }

  const historyText = (body.history ?? [])
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'Dactride AI'}: ${m.text}`)
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

RECENT ${mode} CONVERSATION:
${historyText || '(none)'}

CURRENT USER QUESTION:
${userMessage}`,
  });

  try {
    const response = await generateWithRetryCascade((model) => ({
      model,
      contents: { parts },
      config: {
        systemInstruction: `${MODE_INSTRUCTIONS[mode]}
Keep responses structured, practical, concise, grounded strictly in observable facts and Indian/South Asian grooming, nutrition, and aesthetics context. Do not use flattering hype or invent missing personal details.`,
      },
    }));

    return NextResponse.json({
      reply: (response.text ?? 'Unable to generate response right now.').trim(),
      mode,
    });
  } catch (err) {
    const status = isTransientGeminiError(err) ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'Dactride AI is experiencing temporary high traffic. Please resend in a moment.'
            : extractReadableGeminiError(err),
      },
      { status },
    );
  }
}
