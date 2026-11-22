import crypto from 'node:crypto';
import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import {
  extractMimeAndBase64,
  extractReadableGeminiError,
  FACIAL_ANALYSIS_MODELS,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';
import {
  FrontLandmarks,
  Point2D,
  PSLAnalysisResult,
  SideLandmarks,
  UserProfile,
} from '@/lib/types';

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

function normalizeProportionsAndScore(result: PSLAnalysisResult): PSLAnalysisResult {
  const normalized = { ...result };

  // Ensure facial thirds sum cleanly to 100
  if (normalized.proportions) {
    const u = Math.max(15, Math.min(55, Number(normalized.proportions.upperThirdPct) || 33));
    const m = Math.max(15, Math.min(55, Number(normalized.proportions.middleThirdPct) || 33));
    const l = Math.max(15, Math.min(55, Number(normalized.proportions.lowerThirdPct) || 34));
    const total = u + m + l;
    const upperThirdPct = Math.round((u / total) * 100);
    const middleThirdPct = Math.round((m / total) * 100);
    const lowerThirdPct = 100 - upperThirdPct - middleThirdPct;
    normalized.proportions = {
      ...normalized.proportions,
      upperThirdPct,
      middleThirdPct,
      lowerThirdPct,
    };
  }

  // Ensure overallRating strictly aligns mathematically with category scores when present
  const validCategoryScores = (normalized.categories ?? [])
    .map((c) => c.score)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));

  if (validCategoryScores.length >= 6) {
    const avg =
      validCategoryScores.reduce((sum, score) => sum + score, 0) /
      validCategoryScores.length;
    const reported = Number(normalized.overallRating);
    if (!Number.isFinite(reported) || Math.abs(reported - avg) > 0.6) {
      normalized.overallRating = Number(avg.toFixed(1));
    } else {
      normalized.overallRating = Number(reported.toFixed(1));
    }
  }

  normalized.frontLandmarks = sanitizeFrontLandmarks(normalized.frontLandmarks);
  normalized.sideLandmarks = sanitizeSideLandmarks(normalized.sideLandmarks);
  return normalized;
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

  const frontImg = extractMimeAndBase64(body.frontImageBase64, body.frontMimeType);
  const sideImg = extractMimeAndBase64(body.sideImageBase64, body.sideMimeType);

  if (!frontImg || !sideImg) {
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
    .update(frontImg.data)
    .update('|')
    .update(sideImg.data)
    .update('|')
    .update(profileContext)
    .update('|')
    .update(body.previousAnalysisSummary || '')
    .digest('hex');

  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 1000 * 60 * 30) {
    return NextResponse.json(cached.payload);
  }

  const parts = [
    {
      inlineData: {
        mimeType: frontImg.mimeType,
        data: frontImg.data,
      },
    },
    {
      inlineData: {
        mimeType: sideImg.mimeType,
        data: sideImg.data,
      },
    },
    {
      text: `Analyze Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE) of the same person in ONE unified pass: 2D landmark grounding, facial proportions, strict PSL scoring across 15 technical categories, and a personalized 4-step improvement plan + hairstyle.

USER PROFILE CONTEXT: ${profileContext}
${body.previousAnalysisSummary ? `PREVIOUS SCAN CONTEXT (never auto-inflate scores): ${body.previousAnalysisSummary}` : ''}

PART 1 — PRECISION 2D LANDMARKS (0..1000 normalized per respective image):
FRONT (Image 1):
- hairlineTop < browMid < noseBase < chinBottom strictly top-to-bottom (facial thirds STOP at chinBottom, never on neck).
- foreheadLeft, foreheadRight: lateral temple edges midway between hairlineTop and browMid.
- leftBrowInner/Peak/Outer & rightBrowInner/Peak/Outer strictly ABOVE eyes.
- leftEyeOuter < leftPupil < leftEyeInner (viewer left); rightEyeInner < rightPupil < rightEyeOuter (viewer right); include Top & Bottom eyelid points.
- noseBridgeTop between inner eyes, noseTip, noseBase, nostrilLeft/Right flanking noseBase.
- cheekLeft, cheekRight at high zygomatic arch strictly BETWEEN eyeBottom.y and noseBase.y (never near mouth).
- mouthLeft < mouthRight, upperLipTop, lowerLipBottom strictly BETWEEN noseBase.y and chinBottom.y.
- jawLeft, jawRight lateral mandibular angles at mouth-to-chin height (never neck); chinLeft, chinRight.
- faceOutline: 12 clockwise outer contour points.
SIDE (Image 2):
- foreheadTop < nasion < noseTip < chinTip < neckBase; subnasale, upperLip, lowerLip, submentalVertex, earTragus, gonialCorner (below earTragus); profileOutline: 10 ordered contour points.
proportions: upperThirdPct + middleThirdPct + lowerThirdPct = 100; eyeToFaceRatio, lipToNoseRatio, gonialAngleEstimate, facialWidthToHeightEstimate. Set faceDetected: false if no clear human face is visible.

PART 2 — STRICT NON-GENEROUS PSL RATINGS & 15 CATEGORIES:
- Average everyday face scores ~4.5–5.5; >6.5 requires strong harmony & bone definition; 8+ is top percentile. Never inflate scores.
- overallRating MUST mathematically match the mean of the 15 categories.
- Evaluate ALL 15 categories in \`categories\`: Facial Angularity, Sexual Dimorphism, Gonial Angle & Ramus, Infraorbital Support & Under-Eye Contour, Midface & Maxillary Appearance, Jaw & Chin Classification, Eye Area & Canthal Tilt, Nose Projection & Ratio, Lips & Philtrum Ratio, Forehead & Eyebrow Density, Facial Thirds & Proportions, Bilateral Symmetry, Neck-to-Jaw Transition, Skin & Soft-Tissue Quality, Overall Harmony.
- Use observational non-diagnostic phrasing ("appears", "visual appearance suggests"). Separate bone structure vs soft tissue vs grooming/lighting.

PART 3 — PERSONALIZED 4-STEP IMPROVEMENT PLAN & HAIRSTYLE:
- feedback: strongFeatures, weakFeatures, structuralProsCons, improvementPotential, bloatingPuffinessNotes, groomingImprovements, lifestyleAndDeBloating, guaShaGuidance (clarify gua sha cannot reshape bone).
- skincare: visibleConcerns, morningRoutine, nightRoutine, keyIngredients, 2 real Indian-available products (Minimalist, Cetaphil, CeraVe, Neutrogena, Bioderma), precautions, expectedTimeline.
- diet: personalized (${isUnder18 ? 'USER IS UNDER 18: strictly NO calorie deficits or restrictive dieting — focus on whole foods, sleep, hydration' : 'avoid extreme deficits'}), potassiumSodiumBalance, Indian meal ideas, safetyNote.
- exercises: cardioPlan, resistancePlan, EXACTLY 4 neckExercises with setsReps & safetyCue, jawAndMasseterGuidance, recoveryAndSchedule.
- hairstyle: recommendedStyle suited to visible face shape/hairline, whyItSuits, barberInstructions, stylingRoutine, alternativeStyles.

EFFICIENCY RULE: Keep every assessment, explanation, and plan field sharp and direct (1–2 crisp sentences per string field, 2–3 concise bullets per array).`,
    },
  ];

  try {
    const resp = await generateWithRetryCascade(
      (model) => ({
        model,
        contents: { parts },
        config: {
          systemInstruction:
            'You are DARK TRIAD AI, a precision computer-vision facial landmark detector and strict PSL facial aesthetics analyst. Locate accurate 0-1000 coordinates, compute mathematically consistent non-inflated scores across all 15 categories, and deliver concise practical Indian grooming, nutrition, and training guidance.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              faceDetected: { type: Type.BOOLEAN },
              imageQualityWarning: { type: Type.STRING },
              overallRating: { type: Type.NUMBER },
              pslTier: { type: Type.STRING },
              faceShape: { type: Type.STRING },
              overallConfidence: { type: Type.STRING },
              skeletalVsSoftTissueSummary: { type: Type.STRING },
              lightingAndAngleNote: { type: Type.STRING },
              disclaimerNote: { type: Type.STRING },
              summary: { type: Type.STRING },
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
              'faceDetected',
              'imageQualityWarning',
              'overallRating',
              'pslTier',
              'faceShape',
              'overallConfidence',
              'skeletalVsSoftTissueSummary',
              'lightingAndAngleNote',
              'disclaimerNote',
              'summary',
              'proportions',
              'frontLandmarks',
              'sideLandmarks',
              'postureRating',
              'subScores',
              'categories',
              'improvementPlan',
            ],
          },
        },
      }),
      FACIAL_ANALYSIS_MODELS,
    );

    const parsed = JSON.parse(stripJsonFences(resp.text)) as PSLAnalysisResult;
    const normalized = normalizeProportionsAndScore(parsed);
    const combinedPayload = normalized as unknown as Record<string, unknown>;

    if (normalized.faceDetected) {
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
