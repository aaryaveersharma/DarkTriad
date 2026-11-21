import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface AnalyzeBody {
  frontImageBase64?: string;
  frontMimeType?: string;
  sideImageBase64?: string;
  sideMimeType?: string;
  imageBase64?: string;
  mimeType?: string;
}

function extractBase64(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
}

const pointSchema = {
  type: Type.OBJECT,
  properties: {
    x: {
      type: Type.NUMBER,
      description: 'Horizontal coordinate normalized from 0 (left edge) to 1000 (right edge).',
    },
    y: {
      type: Type.NUMBER,
      description: 'Vertical coordinate normalized from 0 (top edge) to 1000 (bottom edge).',
    },
  },
  required: ['x', 'y'],
};

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error:
          'GEMINI_API_KEY is not configured. Add your API key in Settings > Secrets to enable live facial analysis.',
      },
      { status: 500 },
    );
  }

  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const frontClean = extractBase64(body.frontImageBase64 || body.imageBase64);
  const sideClean = extractBase64(body.sideImageBase64);

  if (!frontClean) {
    return NextResponse.json(
      { error: 'Front-facing portrait image is required.' },
      { status: 400 },
    );
  }

  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [
    {
      inlineData: {
        mimeType: body.frontMimeType || body.mimeType || 'image/jpeg',
        data: frontClean,
      },
    },
  ];

  if (sideClean) {
    parts.push({
      inlineData: {
        mimeType: body.sideMimeType || 'image/jpeg',
        data: sideClean,
      },
    });
  }

  parts.push({
    text: sideClean
      ? `You are given TWO portraits of the same person: Image 1 is the FRONT profile, and Image 2 is the SIDE profile showing jawline and neck.
1. Detect accurate normalized 0-1000 pixel coordinates on Image 1 (frontLandmarks) for:
   - hairlineTop (center of hairline), browMid (glabella between eyebrows), noseBase (subnasale), chinBottom (lowest chin edge)
   - leftEyeOuter, leftPupil, rightPupil, rightEyeOuter (viewer's left = smaller x, viewer's right = larger x)
   - cheekLeft, cheekRight (widest cheekbone/zygomatic points)
   - mouthLeft, mouthRight (left & right lip corners)
   - jawLeft, jawRight (left & right gonial jaw corners)
2. Detect accurate normalized 0-1000 pixel coordinates on Image 2 (sideLandmarks) for:
   - earTragus (ear canal/tragus), gonialCorner (jaw angle corner), chinTip (most forward chin point), neckBase (base of neck/shoulder line)
3. Compute realistic proportions (upperThirdPct, middleThirdPct, lowerThirdPct summing ~100, eyeToFaceRatio, lipToNoseRatio, gonialAngleEstimate).
4. Evaluate objective PSL & facial harmony calibrated for South Asian / Indian proportions:
   - overallRating (1.0–10.0), pslTier (e.g. "5.8 PSL · High-Tier Normie"), faceShape, postureRating (from Image 2 neck/cervical alignment), 5 subScores (Jawline & Lower Third, Orbital & Brow Frame, Midface & Symmetry, Neck & Cervical Posture, Skin & Hair Framing), and 4 actionable protocolSteps.
If no clear human face is visible in Image 1, set faceDetected to false and explain briefly in summary.`
      : `Analyze Image 1 (front portrait) for facial landmarks (0-1000 coordinates), proportions, PSL rating, and 5 subScores. If no clear face is visible, set faceDetected to false.`,
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are a precision facial landmark & PSL aesthetics analyst for Dark Triad, calibrated for South Asian / Indian facial proportions. Always pinpoint accurate 0-1000 normalized coordinates for every visible facial landmark so measurement lines align directly onto the user portrait.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceDetected: { type: Type.BOOLEAN },
            overallRating: { type: Type.NUMBER },
            pslTier: { type: Type.STRING },
            faceShape: { type: Type.STRING },
            proportions: {
              type: Type.OBJECT,
              properties: {
                upperThirdPct: { type: Type.NUMBER },
                middleThirdPct: { type: Type.NUMBER },
                lowerThirdPct: { type: Type.NUMBER },
                eyeToFaceRatio: { type: Type.STRING },
                lipToNoseRatio: { type: Type.STRING },
                gonialAngleEstimate: { type: Type.STRING },
              },
              required: [
                'upperThirdPct',
                'middleThirdPct',
                'lowerThirdPct',
                'eyeToFaceRatio',
                'lipToNoseRatio',
                'gonialAngleEstimate',
              ],
            },
            frontLandmarks: {
              type: Type.OBJECT,
              properties: {
                hairlineTop: pointSchema,
                browMid: pointSchema,
                noseBase: pointSchema,
                chinBottom: pointSchema,
                leftEyeOuter: pointSchema,
                leftPupil: pointSchema,
                rightPupil: pointSchema,
                rightEyeOuter: pointSchema,
                cheekLeft: pointSchema,
                cheekRight: pointSchema,
                mouthLeft: pointSchema,
                mouthRight: pointSchema,
                jawLeft: pointSchema,
                jawRight: pointSchema,
              },
              required: [
                'hairlineTop',
                'browMid',
                'noseBase',
                'chinBottom',
                'leftEyeOuter',
                'leftPupil',
                'rightPupil',
                'rightEyeOuter',
                'cheekLeft',
                'cheekRight',
                'mouthLeft',
                'mouthRight',
                'jawLeft',
                'jawRight',
              ],
            },
            sideLandmarks: {
              type: Type.OBJECT,
              properties: {
                earTragus: pointSchema,
                gonialCorner: pointSchema,
                chinTip: pointSchema,
                neckBase: pointSchema,
              },
              required: ['earTragus', 'gonialCorner', 'chinTip', 'neckBase'],
            },
            postureRating: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                neckAlignment: { type: Type.STRING },
                observation: { type: Type.STRING },
              },
              required: ['score', 'neckAlignment', 'observation'],
            },
            summary: { type: Type.STRING },
            subScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  observation: { type: Type.STRING },
                },
                required: ['label', 'score', 'observation'],
              },
            },
            protocolSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  action: { type: Type.STRING },
                  impact: { type: Type.STRING },
                },
                required: ['area', 'action', 'impact'],
              },
            },
          },
          required: [
            'faceDetected',
            'overallRating',
            'pslTier',
            'faceShape',
            'proportions',
            'frontLandmarks',
            'sideLandmarks',
            'postureRating',
            'summary',
            'subScores',
            'protocolSteps',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return NextResponse.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to complete facial analysis.';
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 },
    );
  }
}
