import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import {
  extractBase64,
  extractReadableGeminiError,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';

interface ValidateBody {
  imageBase64?: string;
  mimeType?: string;
  expectedProfile?: 'front' | 'side';
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured in Settings > Secrets.' },
      { status: 500 },
    );
  }

  let body: ValidateBody;
  try {
    body = (await req.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const clean = extractBase64(body.imageBase64);
  const expected = body.expectedProfile === 'side' ? 'side' : 'front';

  if (!clean) {
    return NextResponse.json({ error: 'Image data is required.' }, { status: 400 });
  }

  try {
    const response = await generateWithRetryCascade(
      (model) => ({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: body.mimeType || 'image/jpeg',
                data: clean,
              },
            },
            {
              text: `Strictly validate this uploaded image for a facial anatomy scanner expecting a ${expected.toUpperCase()} profile photo.
Determine:
- singleHumanSubject: true ONLY if there is exactly ONE real human head/face clearly visible (false for landscapes, animals, cartoons, objects, memes, empty room, blurry/unrecognizable dark blobs, or group photos with 2+ people).
- orientation: "front" if the person is looking mostly straight toward the camera (both eyes and nose centered, <30 deg turn); "side" if it is a genuine side-profile view (~65-105 deg sideways showing nasal bridge, chin projection, jawline corner, and neck); "three_quarter" or "none" otherwise.
- qualityOk: true if facial features are reasonably lit and clear enough to inspect.`,
            },
          ],
        },
        config: {
          systemInstruction:
            'You are a strict computer-vision intake validator. Never accept landscapes, objects, animals, group photos, or wrong camera angles.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              singleHumanSubject: { type: Type.BOOLEAN },
              orientation: { type: Type.STRING },
              qualityOk: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ['singleHumanSubject', 'orientation', 'qualityOk', 'reason'],
          },
        },
      }),
      [
        { model: 'gemini-3.1-flash-lite', delayMs: 0 },
        { model: 'gemini-4-hydrogen', delayMs: 700 },
      ],
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      singleHumanSubject?: boolean;
      orientation?: string;
      qualityOk?: boolean;
      reason?: string;
    };

    const normOrientation = (parsed.orientation || '').toLowerCase();
    const isValid =
      Boolean(parsed.singleHumanSubject) &&
      Boolean(parsed.qualityOk) &&
      (expected === 'front'
        ? normOrientation === 'front'
        : normOrientation === 'side');

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        message:
          expected === 'front'
            ? 'Invalid Image. Please upload a clear front-facing photograph.'
            : 'Incorrect Profile. Please upload a genuine side-profile photograph.',
        detail: parsed.reason || '',
      });
    }

    return NextResponse.json({ valid: true, message: 'Validated' });
  } catch (err) {
    const status = isTransientGeminiError(err) ? 503 : 500;
    return NextResponse.json(
      {
        valid: false,
        error:
          status === 503
            ? 'Validation server is briefly busy. Please tap again in a second.'
            : extractReadableGeminiError(err),
      },
      { status },
    );
  }
}
