import { Type } from '@google/genai';
import { NextResponse } from 'next/server';
import {
  extractBase64,
  extractReadableGeminiError,
  generateWithRetryCascade,
  isTransientGeminiError,
} from '@/lib/geminiServer';
import { UserProfile } from '@/lib/types';

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

  const parts = [
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
    {
      text: `You are evaluating TWO photographs of the same person: Image 1 (FRONT PROFILE) and Image 2 (SIDE PROFILE showing jawline and neck).
USER PROFILE CONTEXT: ${profileContext}
${body.previousAnalysisSummary ? `PREVIOUS SCAN CONTEXT (account for lighting/angle differences and do NOT auto-inflate scores): ${body.previousAnalysisSummary}` : ''}

STRICT INSTRUCTIONS:
1. ANATOMICAL LANDMARK DETECTION (0-1000 normalized coordinates matching Image 1 & Image 2 accurately):
   - frontLandmarks: hairlineTop, browMid, noseBase, chinBottom, leftEyeOuter, leftEyeInner, leftPupil, rightPupil, rightEyeInner, rightEyeOuter, cheekLeft, cheekRight, mouthLeft, mouthRight, jawLeft, jawRight, chinLeft, chinRight, faceOutline (12 ordered points tracing outer face perimeter clockwise: forehead top-left -> temple right -> cheek right -> jaw right -> chin -> jaw left -> cheek left -> temple left -> forehead top-left), and confidence ("High"|"Medium"|"Low").
   - sideLandmarks: foreheadTop, nasion, noseTip, subnasale, upperLip, lowerLip, chinTip, earTragus, gonialCorner, neckBase, profileOutline (10 ordered points tracing side facial contour from forehead down bridge/nose tip/lips/chin along jawline to gonialCorner), and confidence ("High"|"Medium"|"Low").
   Never place fake landmarks; if lighting/occlusion limits precision, set confidence to "Low" or "Medium" and state why in imageQualityWarning.

2. STRICT NON-GENEROUS PSL RUBRIC:
   - Never inflate ratings or hand out sympathy scores (average everyday face is ~4.5–5.5; above 6.5 requires strong observable harmony & bone definition; 8+ is top percentile).
   - overallRating MUST mathematically reflect the weighted underlying category scores (never arbitrary).
   - Distinguish skeletal structure vs soft-tissue/body composition vs grooming vs skin quality vs photo lighting/lens distortion.
   - Never diagnose skeletal recession, maxillary bone position, or medical skin conditions with clinical certainty from a 2D photograph; use careful observational wording ("appears", "visual appearance suggests").
   - Contextualize sexual dimorphism strictly without treating one gender morphology as universally superior; respect user's gender if selected.

3. GENERATE ALL 15 TECHNICAL CATEGORIES in \`categories\` (covering: Facial Angularity, Sexual Dimorphism, Gonial Angle & Ramus, Infraorbital Support & Under-Eye Contour, Midface & Maxillary Appearance, Jaw & Chin Classification [wide/narrow/angular/rounded/defined/underdefined], Eye Area & Canthal Tilt, Nose Projection & Ratio, Lips & Philtrum Ratio, Forehead & Eyebrow Density, Facial Thirds & Proportions, Bilateral Symmetry, Neck-to-Jaw Transition, Skin & Soft-Tissue Quality, Overall Harmony).

4. PERSONALIZED 4-STEP IMPROVEMENT PLAN + HAIRSTYLE:
   - feedback: strengths, weaknesses, structural pros/cons, realistic improvement ceiling, bloating/puffiness notes, grooming fixes, hydration/sleep/sodium-potassium habits, and gua sha ONLY if relevant with explicit note that it cannot change bone or permanently remove fat.
   - skincare: visible concerns (non-diagnostic), AM/PM routines, key ingredients, real Indian-available drugstore/derma products (e.g. Cetaphil, Minimalist, CeraVe, Neutrogena, Bioderma — never invent fake brands or prices), usage, precautions, realistic timeline.
   - diet: personalized to user profile (do NOT infer body fat from a face photo; ${isUnder18 ? 'USER IS UNDER 18: strictly avoid calorie deficits, restrictive dieting, or extreme protocols — focus purely on balanced nutrition, whole foods, sleep, and hydration' : 'avoid extreme calorie deficits'}).
   - exercises: cardio, walking/running, resistance training, neck exercises with sets/reps/safety cues, safe jaw/masseter notes (explicitly state exercises cannot reshape adult facial bones).
   - hairstyle: specific cut suited to face shape, forehead height, jawline, hairline & texture, exact barber specs, and styling routine.`,
    },
  ];

  const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };

  try {
    const response = await generateWithRetryCascade((model) => ({
      model,
      contents: { parts },
      config: {
        systemInstruction:
          'You are Dark Triad AI, a strict, evidence-based PSL facial aesthetics analyst and Indian grooming strategist. Output rigorous, mathematically consistent scores, realistic 0-1000 landmark coordinates, and honest non-clinical guidance.',
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
    }));

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return NextResponse.json(parsed);
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
