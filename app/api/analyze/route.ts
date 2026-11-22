import crypto from 'node:crypto';
import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import {
  extractBase64,
  extractReadableGeminiError,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';
import { FrontLandmarks, Point2D, SideLandmarks, UserProfile } from '@/lib/types';

export const maxDuration = 60;

interface AnalyzeBody {
  frontImageBase64?: string;
  frontMimeType?: string;
  sideImageBase64?: string;
  sideMimeType?: string;
  profile?: Partial<UserProfile> | null;
  previousAnalysisSummary?: string | null;
}

const pointSchema = {
  type: Type.OBJECT,
  properties: {
    x: {
      type: Type.NUMBER,
      description: 'Horizontal pixel ratio normalized from 0 (left edge) to 1000 (right edge).',
    },
    y: {
      type: Type.NUMBER,
      description: 'Vertical pixel ratio normalized from 0 (top edge) to 1000 (bottom edge).',
    },
  },
  required: ['x', 'y'],
};

const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };

// In-memory LRU cache (max 20 entries) to avoid redundant API calls on identical images/profiles
const analysisCache = new Map<string, { payload: Record<string, unknown>; ts: number }>();
const MAX_CACHE_ENTRIES = 20;

function stripJsonFences(raw: string | undefined): string {
  return (raw ?? '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
}

const INVALID_PT: Point2D = { x: -1, y: -1 };

function isInFrame(pt: Point2D | undefined): pt is Point2D {
  return Boolean(
    pt &&
      Number.isFinite(pt.x) &&
      Number.isFinite(pt.y) &&
      pt.x >= 10 &&
      pt.x <= 990 &&
      pt.y >= 10 &&
      pt.y <= 990,
  );
}

/**
 * Validates anatomical ordering on front profile coordinates.
 * Invalid/drifted coordinates are marked as INVALID_PT (-1, -1) so the UI omits
 * unreliable lines instead of drawing misaligned measurements.
 */
function sanitizeFrontLandmarks(raw: FrontLandmarks): FrontLandmarks {
  const f = { ...raw };
  const faceHeight =
    isInFrame(f.hairlineTop) && isInFrame(f.chinBottom)
      ? f.chinBottom.y - f.hairlineTop.y
      : 0;

  if (faceHeight < 120 || faceHeight > 880) {
    f.hairlineTop = INVALID_PT;
    f.chinBottom = INVALID_PT;
  }

  // Facial thirds vertical ordering: hairlineTop < browMid < noseBase < chinBottom
  if (
    isInFrame(f.hairlineTop) &&
    isInFrame(f.browMid) &&
    isInFrame(f.noseBase) &&
    isInFrame(f.chinBottom)
  ) {
    if (
      !(
        f.hairlineTop.y < f.browMid.y &&
        f.browMid.y < f.noseBase.y &&
        f.noseBase.y < f.chinBottom.y
      )
    ) {
      f.hairlineTop = INVALID_PT;
      f.browMid = INVALID_PT;
    }
  }

  // Eyes must sit left-to-right and between brow and noseBase
  if (isInFrame(f.leftEyeOuter) && isInFrame(f.rightEyeOuter)) {
    if (f.leftEyeOuter.x >= f.rightEyeOuter.x) {
      f.leftEyeOuter = INVALID_PT;
      f.rightEyeOuter = INVALID_PT;
    }
  }
  if (
    isInFrame(f.leftEyeOuter) &&
    isInFrame(f.leftEyeInner) &&
    f.leftEyeOuter.x >= f.leftEyeInner.x
  ) {
    f.leftEyeInner = INVALID_PT;
  }
  if (
    isInFrame(f.rightEyeInner) &&
    isInFrame(f.rightEyeOuter) &&
    f.rightEyeInner.x >= f.rightEyeOuter.x
  ) {
    f.rightEyeInner = INVALID_PT;
  }

  // Cheekbones must lie in upper-midface (between eye level and nose base), NOT below mouth
  const eyeAvgY =
    isInFrame(f.leftEyeOuter) && isInFrame(f.rightEyeOuter)
      ? (f.leftEyeOuter.y + f.rightEyeOuter.y) / 2
      : null;
  if (
    isInFrame(f.cheekLeft) &&
    isInFrame(f.cheekRight) &&
    (f.cheekLeft.x >= f.cheekRight.x ||
      (eyeAvgY !== null && (f.cheekLeft.y <= eyeAvgY || f.cheekRight.y <= eyeAvgY)) ||
      (isInFrame(f.mouthLeft) &&
        (f.cheekLeft.y >= f.mouthLeft.y || f.cheekRight.y >= f.mouthLeft.y)))
  ) {
    f.cheekLeft = INVALID_PT;
    f.cheekRight = INVALID_PT;
  }

  // Nostrils must lie below eyes and above upper lip
  if (
    isInFrame(f.nostrilLeft) &&
    isInFrame(f.nostrilRight) &&
    (f.nostrilLeft.x >= f.nostrilRight.x ||
      (eyeAvgY !== null && f.nostrilLeft.y <= eyeAvgY) ||
      (isInFrame(f.upperLipTop) && f.nostrilLeft.y >= f.upperLipTop.y))
  ) {
    f.nostrilLeft = INVALID_PT;
    f.nostrilRight = INVALID_PT;
  }

  // Mouth must lie between noseBase and chinBottom
  if (
    isInFrame(f.mouthLeft) &&
    isInFrame(f.mouthRight) &&
    (f.mouthLeft.x >= f.mouthRight.x ||
      (isInFrame(f.noseBase) && f.mouthLeft.y <= f.noseBase.y) ||
      (isInFrame(f.chinBottom) && f.mouthLeft.y >= f.chinBottom.y))
  ) {
    f.mouthLeft = INVALID_PT;
    f.mouthRight = INVALID_PT;
  }

  // Jaw corners must sit wider than chin and above/around chinBottom (never on neck)
  if (
    isInFrame(f.jawLeft) &&
    isInFrame(f.jawRight) &&
    (f.jawLeft.x >= f.jawRight.x ||
      (isInFrame(f.chinBottom) &&
        (f.jawLeft.y > f.chinBottom.y + 15 || f.jawRight.y > f.chinBottom.y + 15)))
  ) {
    f.jawLeft = INVALID_PT;
    f.jawRight = INVALID_PT;
  }

  if (
    isInFrame(f.chinLeft) &&
    isInFrame(f.chinRight) &&
    f.chinLeft.x >= f.chinRight.x
  ) {
    f.chinLeft = INVALID_PT;
    f.chinRight = INVALID_PT;
  }

  if (Array.isArray(f.faceOutline)) {
    f.faceOutline = f.faceOutline.filter(isInFrame);
  }

  return f;
}

function sanitizeSideLandmarks(raw: SideLandmarks): SideLandmarks {
  const s = { ...raw };
  if (
    isInFrame(s.foreheadTop) &&
    isInFrame(s.nasion) &&
    s.foreheadTop.y >= s.nasion.y
  ) {
    s.foreheadTop = INVALID_PT;
  }
  if (
    isInFrame(s.nasion) &&
    isInFrame(s.noseTip) &&
    isInFrame(s.chinTip) &&
    !(s.nasion.y < s.noseTip.y && s.noseTip.y < s.chinTip.y)
  ) {
    s.nasion = INVALID_PT;
    s.noseTip = INVALID_PT;
  }
  if (
    isInFrame(s.earTragus) &&
    isInFrame(s.gonialCorner) &&
    s.earTragus.y >= s.gonialCorner.y
  ) {
    s.gonialCorner = INVALID_PT;
  }
  if (
    isInFrame(s.chinTip) &&
    isInFrame(s.neckBase) &&
    s.neckBase.y <= s.chinTip.y
  ) {
    s.neckBase = INVALID_PT;
  }
  if (Array.isArray(s.profileOutline)) {
    s.profileOutline = s.profileOutline.filter(isInFrame);
  }
  return s;
}

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

  const frontClean = extractBase64(body.frontImageBase64);
  const sideClean = extractBase64(body.sideImageBase64);

  if (!frontClean || !sideClean) {
    return NextResponse.json(
      { error: 'Both front-facing and side-profile images are required.' },
      { status: 400 },
    );
  }

  const profile = body.profile ?? {};
  const isUnder18 = typeof profile.age === 'number' && profile.age < 18;
  const profileContext = JSON.stringify({
    name: profile.name || null,
    age: profile.age ?? null,
    gender: profile.gender || null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    bodyFrame: profile.bodyFrame || null,
    dietaryPreferences: profile.dietaryPreferences || null,
    fitnessGoals: profile.fitnessGoals || null,
    isUnder18,
  });

  const cacheKey = crypto
    .createHash('sha256')
    .update(frontClean)
    .update('|')
    .update(sideClean)
    .update('|')
    .update(profileContext)
    .update('|')
    .update(body.previousAnalysisSummary || '')
    .digest('hex');

  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 1000 * 60 * 30) {
    return NextResponse.json(cached.payload);
  }

  const imageParts = [
    {
      inlineData: {
        mimeType: body.frontMimeType || 'image/jpeg',
        data: frontClean,
      },
    },
    {
      inlineData: {
        mimeType: body.sideMimeType || 'image/jpeg',
        data: sideClean,
      },
    },
  ];

  // PASS 1: Dedicated Anatomical Spatial Grounding + Proportions (high spatial precision)
  const landmarkParts = [
    ...imageParts,
    {
      text: `Perform precision 2D anatomical landmark detection on Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE).
Coordinate system: x from 0 (left edge) to 1000 (right edge), y from 0 (top edge) to 1000 (bottom edge) inside EACH respective image.

CRITICAL PLACEMENT RULES FOR IMAGE 1 (FRONT):
- hairlineTop: top border of forehead where hair begins (never above hair top, never on eyebrows).
- foreheadLeft, foreheadRight: lateral temple edges midway between hairlineTop and browMid.
- browMid: center glabella between both eyebrows.
- leftBrowInner, leftBrowPeak, leftBrowOuter & rightBrowInner, rightBrowPeak, rightBrowOuter: exact left/right eyebrow ridges sitting ABOVE the eyes (y < eyeTop.y).
- leftEyeOuter, leftEyeTop, leftEyeInner, leftEyeBottom, leftPupil: exact contours of the eye on the VIEWER'S LEFT side (x_outer < x_pupil < x_inner).
- rightEyeInner, rightEyeTop, rightEyeBottom, rightEyeOuter, rightPupil: exact contours of the eye on the VIEWER'S RIGHT side (x_inner < x_pupil < x_outer).
- noseBridgeTop: nasal root / nasion directly BETWEEN inner eye corners (at eye vertical level, NOT on forehead and NOT on cheeks).
- noseTip: center tip of nose.
- noseBase: bottom center of nose / subnasale above upper lip.
- nostrilLeft, nostrilRight: outer alar wing edges flanking noseBase.
- cheekLeft, cheekRight: HIGH zygomatic cheekbone prominence directly inferior-lateral to outer eye corners (vertical y strictly BETWEEN eyeBottom.y and noseBase.y — NEVER down at mouth/hollow-cheek level!).
- mouthLeft, mouthRight, upperLipTop, lowerLipBottom: exact lip vermilion boundaries strictly BETWEEN noseBase.y and chinBottom.y (NEVER on chin!).
- jawLeft, jawRight: visible lateral mandibular jaw corners at mouth-to-chin vertical height (NEVER down on neck!).
- chinLeft, chinRight, chinBottom: bottom contour & lowest edge of the chin bone ONLY (facial thirds STOP at chinBottom — NEVER extend into the neck!).
- faceOutline: 12 ordered points tracing outer face boundary clockwise starting at forehead top-left -> forehead top-right -> temple right -> cheek right -> jaw right -> chin right -> chinBottom -> chin left -> jaw left -> cheek left -> temple left -> forehead top-left.

CRITICAL PLACEMENT RULES FOR IMAGE 2 (SIDE PROFILE):
- foreheadTop: upper forehead contour at hairline.
- nasion: bridge dip at eye level.
- noseTip: anterior nasal apex.
- subnasale: base where nose meets upper lip.
- upperLip, lowerLip: anterior vermilion edges of upper and lower lips.
- chinTip: anterior-most edge of chin.
- submentalVertex: under-chin angle where submental area meets upper neck.
- earTragus: front of ear canal.
- gonialCorner: posterior-inferior corner of the jawbone below earTragus.
- neckBase: lower mid-anterior neck point to trace cervical alignment.
- profileOutline: 10 ordered points tracing foreheadTop -> nasion -> noseTip -> subnasale -> upperLip -> lowerLip -> chinTip -> submentalVertex -> gonialCorner.

Compute proportions accurately from these landmarks (upperThirdPct + middleThirdPct + lowerThirdPct = 100). If no clear human face is visible, set faceDetected: false.`,
    },
  ];

  // PASS 2: Strict PSL Ratings, 15 Categories, & 4-Step Improvement Plan
  const reportParts = [
    ...imageParts,
    {
      text: `You are evaluating TWO photographs of the same person: Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE).
USER PROFILE CONTEXT: ${profileContext}
${body.previousAnalysisSummary ? `PREVIOUS SCAN CONTEXT (do NOT auto-inflate scores): ${body.previousAnalysisSummary}` : ''}

STRICT INSTRUCTIONS:
1. STRICT NON-GENEROUS PSL RUBRIC:
   - Never inflate ratings or give sympathy scores (average everyday face is ~4.5–5.5; >6.5 requires strong harmony & bone definition; 8+ is top percentile).
   - overallRating MUST mathematically match the weighted category scores.
   - Distinguish skeletal structure vs soft-tissue/body composition vs grooming vs skin quality vs photo lighting/angle distortion.
   - Use observational non-diagnostic phrasing ("appears", "visual appearance suggests"). Respect selected gender morphology.

2. GENERATE ALL 15 TECHNICAL CATEGORIES in \`categories\`:
   Facial Angularity, Sexual Dimorphism, Gonial Angle & Ramus, Infraorbital Support & Under-Eye Contour, Midface & Maxillary Appearance, Jaw & Chin Classification, Eye Area & Canthal Tilt, Nose Projection & Ratio, Lips & Philtrum Ratio, Forehead & Eyebrow Density, Facial Thirds & Proportions, Bilateral Symmetry, Neck-to-Jaw Transition, Skin & Soft-Tissue Quality, Overall Harmony.

3. PERSONALIZED 4-STEP IMPROVEMENT PLAN + HAIRSTYLE:
   - feedback: strengths, weaknesses, structural pros/cons, realistic ceiling, bloating/de-bloating notes, grooming fixes, gua sha note (clarify it cannot reshape bone).
   - skincare: visible concerns, AM/PM routines, key ingredients, 2 real Indian-available products (e.g. Minimalist, Cetaphil, CeraVe, Neutrogena, Bioderma), usage, precautions, timeline.
   - diet: personalized to profile (${isUnder18 ? 'USER IS UNDER 18: strictly no calorie deficits or restrictive dieting — focus on whole foods, sleep, hydration' : 'avoid extreme deficits'}), potassium/sodium balance, Indian meal ideas.
   - exercises: cardio, resistance training, EXACTLY 4 neck & posture exercises with sets/reps/safety cues (so they display cleanly 1-4), realistic jaw/masseter note.
   - hairstyle: cut suited to face shape/hairline, exact barber instructions, daily styling routine, alternative styles.

4. HIGH-SIGNAL CONCISE RULE: Keep every assessment, explanation, and plan field sharp and direct (1–2 concise sentences per text field, max 2–3 bullets per list) for fast response.`,
    },
  ];

  try {
    const [landmarkResp, reportResp] = await Promise.all([
      generateWithRetryCascade(
        (model) => ({
          model,
          contents: { parts: landmarkParts },
          config: {
            systemInstruction:
              'You are a precision 2D facial anatomical landmark detector. Locate exact pixel coordinates (0-1000) directly on visible human eyes, eyebrows, nose, zygomatic cheekbones, lips, jawline, and side profile.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                faceDetected: { type: Type.BOOLEAN },
                imageQualityWarning: { type: Type.STRING },
                proportions: {
                  type: Type.OBJECT,
                  properties: {
                    upperThirdPct: { type: Type.NUMBER },
                    middleThirdPct: { type: Type.NUMBER },
                    lowerThirdPct: { type: Type.NUMBER },
                    eyeToFaceRatio: { type: Type.STRING },
                    lipToNoseRatio: { type: Type.STRING },
                    gonialAngleEstimate: { type: Type.STRING },
                    facialWidthToHeightEstimate: { type: Type.STRING },
                  },
                  required: [
                    'upperThirdPct',
                    'middleThirdPct',
                    'lowerThirdPct',
                    'eyeToFaceRatio',
                    'lipToNoseRatio',
                    'gonialAngleEstimate',
                    'facialWidthToHeightEstimate',
                  ],
                },
                frontLandmarks: {
                  type: Type.OBJECT,
                  properties: {
                    hairlineTop: pointSchema,
                    foreheadLeft: pointSchema,
                    foreheadRight: pointSchema,
                    browMid: pointSchema,
                    leftBrowInner: pointSchema,
                    leftBrowPeak: pointSchema,
                    leftBrowOuter: pointSchema,
                    rightBrowInner: pointSchema,
                    rightBrowPeak: pointSchema,
                    rightBrowOuter: pointSchema,
                    noseBridgeTop: pointSchema,
                    noseTip: pointSchema,
                    noseBase: pointSchema,
                    nostrilLeft: pointSchema,
                    nostrilRight: pointSchema,
                    upperLipTop: pointSchema,
                    lowerLipBottom: pointSchema,
                    chinBottom: pointSchema,
                    leftEyeOuter: pointSchema,
                    leftEyeTop: pointSchema,
                    leftEyeInner: pointSchema,
                    leftEyeBottom: pointSchema,
                    leftPupil: pointSchema,
                    rightPupil: pointSchema,
                    rightEyeInner: pointSchema,
                    rightEyeTop: pointSchema,
                    rightEyeOuter: pointSchema,
                    rightEyeBottom: pointSchema,
                    cheekLeft: pointSchema,
                    cheekRight: pointSchema,
                    mouthLeft: pointSchema,
                    mouthRight: pointSchema,
                    jawLeft: pointSchema,
                    jawRight: pointSchema,
                    chinLeft: pointSchema,
                    chinRight: pointSchema,
                    faceOutline: { type: Type.ARRAY, items: pointSchema },
                    confidence: { type: Type.STRING },
                  },
                  required: [
                    'hairlineTop',
                    'foreheadLeft',
                    'foreheadRight',
                    'browMid',
                    'leftBrowInner',
                    'leftBrowPeak',
                    'leftBrowOuter',
                    'rightBrowInner',
                    'rightBrowPeak',
                    'rightBrowOuter',
                    'noseBridgeTop',
                    'noseTip',
                    'noseBase',
                    'nostrilLeft',
                    'nostrilRight',
                    'upperLipTop',
                    'lowerLipBottom',
                    'chinBottom',
                    'leftEyeOuter',
                    'leftEyeTop',
                    'leftEyeInner',
                    'leftEyeBottom',
                    'leftPupil',
                    'rightPupil',
                    'rightEyeInner',
                    'rightEyeTop',
                    'rightEyeOuter',
                    'rightEyeBottom',
                    'cheekLeft',
                    'cheekRight',
                    'mouthLeft',
                    'mouthRight',
                    'jawLeft',
                    'jawRight',
                    'chinLeft',
                    'chinRight',
                    'faceOutline',
                    'confidence',
                  ],
                },
                sideLandmarks: {
                  type: Type.OBJECT,
                  properties: {
                    foreheadTop: pointSchema,
                    nasion: pointSchema,
                    noseTip: pointSchema,
                    subnasale: pointSchema,
                    upperLip: pointSchema,
                    lowerLip: pointSchema,
                    chinTip: pointSchema,
                    submentalVertex: pointSchema,
                    earTragus: pointSchema,
                    gonialCorner: pointSchema,
                    neckBase: pointSchema,
                    profileOutline: { type: Type.ARRAY, items: pointSchema },
                    confidence: { type: Type.STRING },
                  },
                  required: [
                    'foreheadTop',
                    'nasion',
                    'noseTip',
                    'subnasale',
                    'upperLip',
                    'lowerLip',
                    'chinTip',
                    'submentalVertex',
                    'earTragus',
                    'gonialCorner',
                    'neckBase',
                    'profileOutline',
                    'confidence',
                  ],
                },
              },
              required: [
                'faceDetected',
                'imageQualityWarning',
                'proportions',
                'frontLandmarks',
                'sideLandmarks',
              ],
            },
          },
        }),
        [
          { model: 'gemini-4-hydrogen', delayMs: 0, timeoutMs: 18000 },
          { model: 'gemini-3.1-flash-lite', delayMs: 200, timeoutMs: 14000 },
        ],
      ),
      generateWithRetryCascade(
        (model) => ({
          model,
          contents: { parts: reportParts },
          config: {
            systemInstruction:
              'You are DARK TRIAD AI, a strict, evidence-based PSL facial aesthetics analyst and Indian grooming strategist. Output mathematically consistent scores and concise non-clinical guidance.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallRating: { type: Type.NUMBER },
                pslTier: { type: Type.STRING },
                faceShape: { type: Type.STRING },
                overallConfidence: { type: Type.STRING },
                skeletalVsSoftTissueSummary: { type: Type.STRING },
                lightingAndAngleNote: { type: Type.STRING },
                disclaimerNote: { type: Type.STRING },
                summary: { type: Type.STRING },
                postureRating: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    neckAlignment: { type: Type.STRING },
                    observation: { type: Type.STRING },
                  },
                  required: ['score', 'neckAlignment', 'observation'],
                },
                subScores: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      tissueType: { type: Type.STRING },
                      confidence: { type: Type.STRING },
                      observation: { type: Type.STRING },
                    },
                    required: ['label', 'score', 'tissueType', 'confidence', 'observation'],
                  },
                },
                categories: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      confidence: { type: Type.STRING },
                      classification: { type: Type.STRING },
                      assessment: { type: Type.STRING },
                      technicalExplanation: { type: Type.STRING },
                      strengths: stringArray,
                      weaknesses: stringArray,
                      realisticImprovements: stringArray,
                    },
                    required: [
                      'id',
                      'title',
                      'score',
                      'confidence',
                      'classification',
                      'assessment',
                      'technicalExplanation',
                      'strengths',
                      'weaknesses',
                      'realisticImprovements',
                    ],
                  },
                },
                improvementPlan: {
                  type: Type.OBJECT,
                  properties: {
                    feedback: {
                      type: Type.OBJECT,
                      properties: {
                        strongFeatures: stringArray,
                        weakFeatures: stringArray,
                        structuralProsCons: { type: Type.STRING },
                        improvementPotential: { type: Type.STRING },
                        bloatingPuffinessNotes: { type: Type.STRING },
                        groomingImprovements: stringArray,
                        lifestyleAndDeBloating: stringArray,
                        guaShaGuidance: { type: Type.STRING },
                      },
                      required: [
                        'strongFeatures',
                        'weakFeatures',
                        'structuralProsCons',
                        'improvementPotential',
                        'bloatingPuffinessNotes',
                        'groomingImprovements',
                        'lifestyleAndDeBloating',
                        'guaShaGuidance',
                      ],
                    },
                    skincare: {
                      type: Type.OBJECT,
                      properties: {
                        visibleConcerns: stringArray,
                        morningRoutine: stringArray,
                        nightRoutine: stringArray,
                        keyIngredients: stringArray,
                        products: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              brand: { type: Type.STRING },
                              keyIngredients: stringArray,
                              concernAddressed: { type: Type.STRING },
                              whyRecommended: { type: Type.STRING },
                              howToUse: { type: Type.STRING },
                              precautions: { type: Type.STRING },
                            },
                            required: [
                              'name',
                              'brand',
                              'keyIngredients',
                              'concernAddressed',
                              'whyRecommended',
                              'howToUse',
                              'precautions',
                            ],
                          },
                        },
                        precautions: { type: Type.STRING },
                        expectedTimeline: { type: Type.STRING },
                      },
                      required: [
                        'visibleConcerns',
                        'morningRoutine',
                        'nightRoutine',
                        'keyIngredients',
                        'products',
                        'precautions',
                        'expectedTimeline',
                      ],
                    },
                    diet: {
                      type: Type.OBJECT,
                      properties: {
                        summary: { type: Type.STRING },
                        calorieGuidance: { type: Type.STRING },
                        proteinTarget: { type: Type.STRING },
                        hydrationTarget: { type: Type.STRING },
                        balancedMealIdeas: stringArray,
                        potassiumSodiumBalance: { type: Type.STRING },
                        safetyNote: { type: Type.STRING },
                      },
                      required: [
                        'summary',
                        'calorieGuidance',
                        'proteinTarget',
                        'hydrationTarget',
                        'balancedMealIdeas',
                        'potassiumSodiumBalance',
                        'safetyNote',
                      ],
                    },
                    exercises: {
                      type: Type.OBJECT,
                      properties: {
                        cardioPlan: { type: Type.STRING },
                        resistancePlan: { type: Type.STRING },
                        neckExercises: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              setsReps: { type: Type.STRING },
                              safetyCue: { type: Type.STRING },
                            },
                            required: ['name', 'setsReps', 'safetyCue'],
                          },
                        },
                        jawAndMasseterGuidance: { type: Type.STRING },
                        recoveryAndSchedule: { type: Type.STRING },
                      },
                      required: [
                        'cardioPlan',
                        'resistancePlan',
                        'neckExercises',
                        'jawAndMasseterGuidance',
                        'recoveryAndSchedule',
                      ],
                    },
                    hairstyle: {
                      type: Type.OBJECT,
                      properties: {
                        recommendedStyle: { type: Type.STRING },
                        whyItSuits: { type: Type.STRING },
                        barberInstructions: { type: Type.STRING },
                        stylingRoutine: { type: Type.STRING },
                        alternativeStyles: stringArray,
                      },
                      required: [
                        'recommendedStyle',
                        'whyItSuits',
                        'barberInstructions',
                        'stylingRoutine',
                        'alternativeStyles',
                      ],
                    },
                  },
                  required: ['feedback', 'skincare', 'diet', 'exercises', 'hairstyle'],
                },
              },
              required: [
                'overallRating',
                'pslTier',
                'faceShape',
                'overallConfidence',
                'skeletalVsSoftTissueSummary',
                'lightingAndAngleNote',
                'disclaimerNote',
                'summary',
                'postureRating',
                'subScores',
                'categories',
                'improvementPlan',
              ],
            },
          },
        }),
        [
          { model: 'gemini-3.1-flash-lite', delayMs: 0, timeoutMs: 18000 },
          { model: 'gemini-4-hydrogen', delayMs: 250, timeoutMs: 20000 },
        ],
      ),
    ]);

    const landmarkJson = JSON.parse(stripJsonFences(landmarkResp.text)) as {
      faceDetected: boolean;
      imageQualityWarning: string;
      proportions: Record<string, unknown>;
      frontLandmarks: FrontLandmarks;
      sideLandmarks: SideLandmarks;
    };

    const reportJson = JSON.parse(stripJsonFences(reportResp.text)) as Record<
      string,
      unknown
    >;

    const combinedPayload: Record<string, unknown> = {
      ...reportJson,
      faceDetected: landmarkJson.faceDetected,
      imageQualityWarning: landmarkJson.imageQualityWarning,
      proportions: landmarkJson.proportions,
      frontLandmarks: sanitizeFrontLandmarks(landmarkJson.frontLandmarks),
      sideLandmarks: sanitizeSideLandmarks(landmarkJson.sideLandmarks),
    };

    if (landmarkJson.faceDetected) {
      if (analysisCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = analysisCache.keys().next().value;
        if (oldestKey) analysisCache.delete(oldestKey);
      }
      analysisCache.set(cacheKey, { payload: combinedPayload, ts: Date.now() });
    }

    return NextResponse.json(combinedPayload);
  } catch (err) {
    const readable = extractReadableGeminiError(err);
    const status = isTransientGeminiError(err) ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'Servers are temporarily busy right now. Please tap Retry Analysis in a few seconds.'
            : `Analysis failed: ${readable}`,
      },
      { status },
    );
  }
}
