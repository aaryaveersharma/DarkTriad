import { createHash } from 'node:crypto';
import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import {
  extractBase64,
  extractReadableGeminiError,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';
import { FrontLandmarks, Proportions, UserProfile } from '@/lib/types';

export const maxDuration = 60;

interface AnalyzeBody {
  frontImageBase64?: string;
  frontMimeType?: string;
  sideImageBase64?: string;
  sideMimeType?: string;
  profile?: Partial<UserProfile> | null;
  previousAnalysisSummary?: string | null;
  detectedFrontLandmarks?: FrontLandmarks | null;
  detectedProportions?: Partial<Proportions> | null;
}

const analysisCache = new Map<string, Record<string, unknown>>();

function buildCacheKey(
  frontClean: string,
  sideClean: string,
  profileContext: string,
  hasDetectedFront: boolean,
): string {
  return createHash('sha256')
    .update(frontClean)
    .update('|')
    .update(sideClean)
    .update('|')
    .update(profileContext)
    .update('|')
    .update(hasDetectedFront ? 'mp1' : 'mp0')
    .digest('hex');
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
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

const frontLandmarksSchema = {
  type: Type.OBJECT,
  properties: {
    hairlineTop: pointSchema,
    browMid: pointSchema,
    noseBase: pointSchema,
    chinBottom: pointSchema,
    leftEyeOuter: pointSchema,
    leftEyeInner: pointSchema,
    leftPupil: pointSchema,
    rightPupil: pointSchema,
    rightEyeInner: pointSchema,
    rightEyeOuter: pointSchema,
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
    'browMid',
    'noseBase',
    'chinBottom',
    'leftEyeOuter',
    'leftEyeInner',
    'leftPupil',
    'rightPupil',
    'rightEyeInner',
    'rightEyeOuter',
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
};

const sideLandmarksSchema = {
  type: Type.OBJECT,
  properties: {
    foreheadTop: pointSchema,
    nasion: pointSchema,
    noseTip: pointSchema,
    subnasale: pointSchema,
    upperLip: pointSchema,
    lowerLip: pointSchema,
    chinTip: pointSchema,
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
    'earTragus',
    'gonialCorner',
    'neckBase',
    'profileOutline',
    'confidence',
  ],
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

  const hasClientFrontLandmarks = Boolean(
    body.detectedFrontLandmarks?.leftEyeOuter &&
      body.detectedFrontLandmarks?.rightEyeOuter &&
      body.detectedFrontLandmarks?.chinBottom,
  );

  const cacheKey = buildCacheKey(
    frontClean,
    sideClean,
    profileContext,
    hasClientFrontLandmarks,
  );
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const frontPart = {
    inlineData: {
      mimeType: body.frontMimeType || 'image/jpeg',
      data: frontClean,
    },
  };
  const sidePart = {
    inlineData: {
      mimeType: body.sideMimeType || 'image/jpeg',
      data: sideClean,
    },
  };

  const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };
  const measuredHint = body.detectedProportions
    ? `MEASURED FRONT PROPORTIONS FROM LANDMARK DETECTOR: ${JSON.stringify(body.detectedProportions)}`
    : '';

  const analysisParts = [
    frontPart,
    sidePart,
    {
      text: `Evaluate Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE).
USER PROFILE CONTEXT: ${profileContext}
${measuredHint}
${body.previousAnalysisSummary ? `PREVIOUS SCAN CONTEXT (account for lighting/angle differences and do NOT auto-inflate scores): ${body.previousAnalysisSummary}` : ''}

STRICT RULES:
1. STRICT NON-GENEROUS PSL RUBRIC:
   - Never inflate scores (average face is ~4.5–5.5; >6.5 requires strong observable harmony & bone definition; 8+ is top percentile).
   - overallRating MUST mathematically reflect the weighted underlying category scores.
   - Distinguish skeletal structure vs soft tissue vs grooming vs skin quality vs photo lighting/lens distortion.
   - Use observational wording ("appears", "visual appearance suggests"); never diagnose medical conditions.
   - Respect user gender if provided without treating one gender morphology as universally superior.

2. GENERATE ALL 15 TECHNICAL CATEGORIES in \`categories\`:
   Facial Angularity, Sexual Dimorphism, Gonial Angle & Ramus, Infraorbital Support & Under-Eye Contour, Midface & Maxillary Appearance, Jaw & Chin Classification, Eye Area & Canthal Tilt, Nose Projection & Ratio, Lips & Philtrum Ratio, Forehead & Eyebrow Density, Facial Thirds & Proportions, Bilateral Symmetry, Neck-to-Jaw Transition, Skin & Soft-Tissue Quality, Overall Harmony.

3. PERSONALIZED 4-STEP IMPROVEMENT PLAN + HAIRSTYLE:
   - feedback: strengths, weaknesses, structural pros/cons, realistic ceiling, bloating/puffiness notes, grooming fixes, hydration/sleep/sodium-potassium habits, gua sha note (clarify it cannot reshape bone or permanently remove fat).
   - skincare: visible concerns, AM/PM routines, key ingredients, 2 Indian-available drugstore/derma products (Cetaphil, Minimalist, CeraVe, Neutrogena, Bioderma — real products only), usage, precautions, realistic timeline.
   - diet: personalized to user profile (do NOT infer body fat from a face photo; ${isUnder18 ? 'USER IS UNDER 18: strictly avoid calorie deficits, restrictive dieting, or extreme protocols — focus on balanced nutrition, sleep, and hydration' : 'avoid extreme calorie deficits'}).
   - exercises: cardio, resistance training, 4 distinct neck/posture exercises with sets/reps/safety cues, safe jaw/masseter note.
   - hairstyle: specific cut suited to face shape, forehead height, jawline, hairline & texture, exact barber specs, styling routine, alternative styles.

4. HIGH-SIGNAL CONCISE SPEED: Keep every explanation crisp and direct (1–2 punchy sentences per text field, max 2–3 concise bullets per list) so results return fast.`,
    },
  ];

  // Dedicated visual-grounding call for anatomical coordinates on Side Profile (and Front fallback if needed)
  const landmarkParts = [
    ...(hasClientFrontLandmarks ? [] : [frontPart]),
    sidePart,
    {
      text: hasClientFrontLandmarks
        ? `Locate EXACT 0-1000 normalized [x, y] anatomical landmarks on the SIDE PROFILE photograph (0,0 is top-left corner of the image; 1000,1000 is bottom-right corner).
Carefully inspect where the person's head actually sits inside the frame (do NOT guess centered defaults or extend points down onto neck/shirt unless it is neckBase):
- foreheadTop: upper hairline/forehead slope
- nasion: deepest concavity at top of nose bridge between brows
- noseTip: furthest projecting tip of nose
- subnasale: base of nose where upper lip meets columella
- upperLip: anterior vermilion point of upper lip
- lowerLip: anterior vermilion point of lower lip
- chinTip: anterior pogonion/chin prominence (strictly on the chin bone, never neck)
- earTragus: front center of the ear opening on the posterior side
- gonialCorner: visible jaw corner angle below earTragus
- neckBase: lower anterior-lateral cervical neck point below jawline
- profileOutline: 10 ordered points tracing foreheadTop -> nasion -> noseTip -> subnasale -> upperLip -> lowerLip -> chinTip -> gonialCorner -> earTragus`
        : `Locate EXACT 0-1000 normalized [x, y] anatomical landmarks on Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE). Keep every facial landmark pinned tightly to the real facial features inside each image — never drift cheekbones down onto lower cheeks, never place lips on the chin, never drop facial thirds into the neck.`,
    },
  ];

  try {
    const [analysisResponse, landmarkResponse] = await Promise.all([
      generateWithRetryCascade(
        (model) => ({
          model,
          contents: { parts: analysisParts },
          config: {
            systemInstruction:
              'You are DARK TRIAD AI, a strict, evidence-based PSL facial aesthetics analyst and Indian grooming strategist. Return rigorous, mathematically consistent scores and concise non-clinical guidance.',
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
                'postureRating',
                'subScores',
                'categories',
                'improvementPlan',
              ],
            },
          },
        }),
        [
          { model: 'gemini-3.1-flash-lite', delayMs: 0, timeoutMs: 22000 },
          { model: 'gemini-4-hydrogen', delayMs: 250, timeoutMs: 22000 },
        ],
      ),
      generateWithRetryCascade(
        (model) => ({
          model,
          contents: { parts: landmarkParts },
          config: {
            systemInstruction:
              'You are a precision anatomical computer-vision coordinate detector. Locate actual facial landmarks accurately in 0-1000 image coordinates.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: hasClientFrontLandmarks
                ? { sideLandmarks: sideLandmarksSchema }
                : {
                    frontLandmarks: frontLandmarksSchema,
                    sideLandmarks: sideLandmarksSchema,
                  },
              required: hasClientFrontLandmarks
                ? ['sideLandmarks']
                : ['frontLandmarks', 'sideLandmarks'],
            },
          },
        }),
        [
          { model: 'gemini-4-hydrogen', delayMs: 0, timeoutMs: 18000 },
          { model: 'gemini-3.1-flash-lite', delayMs: 200, timeoutMs: 15000 },
        ],
      ),
    ]);

    const analysisJson = JSON.parse(
      stripJsonFences(analysisResponse.text ?? '{}'),
    ) as Record<string, unknown>;
    const landmarkJson = JSON.parse(
      stripJsonFences(landmarkResponse.text ?? '{}'),
    ) as {
      frontLandmarks?: FrontLandmarks;
      sideLandmarks?: unknown;
    };

    const mergedProportions = {
      ...(typeof analysisJson.proportions === 'object' && analysisJson.proportions
        ? (analysisJson.proportions as Record<string, unknown>)
        : {}),
      ...(body.detectedProportions ?? {}),
    };

    const finalPayload: Record<string, unknown> = {
      ...analysisJson,
      proportions: mergedProportions,
      frontLandmarks: hasClientFrontLandmarks
        ? body.detectedFrontLandmarks
        : landmarkJson.frontLandmarks,
      sideLandmarks: landmarkJson.sideLandmarks,
    };

    if (finalPayload.faceDetected) {
      if (analysisCache.size >= 24) {
        const firstKey = analysisCache.keys().next().value;
        if (firstKey) analysisCache.delete(firstKey);
      }
      analysisCache.set(cacheKey, finalPayload);
    }

    return NextResponse.json(finalPayload);
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
