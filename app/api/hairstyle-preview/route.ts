import { NextResponse } from 'next/server';
import {
  ai,
  extractBase64,
  extractReadableGeminiError,
} from '@/lib/geminiServer';

interface PreviewBody {
  frontImageBase64?: string;
  sideImageBase64?: string;
  hairstyleSpec?: string;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured in Settings > Secrets.' },
      { status: 500 },
    );
  }

  let body: PreviewBody;
  try {
    body = (await req.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid preview payload.' }, { status: 400 });
  }

  const frontB64 = extractBase64(body.frontImageBase64);
  const sideB64 = extractBase64(body.sideImageBase64);
  const styleSpec = (body.hairstyleSpec ?? '').trim();

  if (!frontB64) {
    return NextResponse.json(
      { error: 'Please complete a facial scan first so we have your reference portrait.' },
      { status: 400 },
    );
  }

  if (!styleSpec) {
    return NextResponse.json(
      { error: 'A hairstyle specification is required.' },
      { status: 400 },
    );
  }

  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];

  if (sideB64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: sideB64 } });
  }

  parts.push({
    text: `Edit the person's hair in the first portrait photograph ONLY to wear this hairstyle: "${styleSpec}".
CRITICAL REQUIREMENTS:
- Strictly preserve the exact same person, facial bone structure, eye area, nose, lips, skin tone, glasses/facial hair if any, background, and lighting.
- Keep natural Indian/South Asian hair texture and realistic barber-cut volume and tapering.
- Do not change facial proportions or apply beauty filters.`,
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        return NextResponse.json({
          imageDataUrl: `data:${mime};base64,${part.inlineData.data}`,
          caption: `Preview: ${styleSpec}`,
        });
      }
    }

    return NextResponse.json(
      {
        error:
          'No edited portrait image was returned by the image model. Please try specifying the cut more clearly.',
      },
      { status: 502 },
    );
  } catch (err) {
    const msg = extractReadableGeminiError(err);
    const isQuotaOrPaid = /429|403|RESOURCE_EXHAUSTED|PERMISSION_DENIED|billing|paid/i.test(
      msg,
    );
    return NextResponse.json(
      {
        error: isQuotaOrPaid
          ? 'AI Hairstyle Preview uses image-editing (`gemini-3.1-flash-lite-image`), which requires a billing-enabled Gemini API key in Settings > Secrets. All text hairstyle guidance and barber specs remain free.'
          : `Hairstyle preview unavailable: ${msg}`,
      },
      { status: isQuotaOrPaid ? 402 : 500 },
    );
  }
}
