export interface Point2D {
  x: number;
  y: number;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface FrontLandmarks {
  hairlineTop: Point2D;
  browMid: Point2D;
  noseBase: Point2D;
  chinBottom: Point2D;
  leftEyeOuter: Point2D;
  leftEyeInner: Point2D;
  leftPupil: Point2D;
  rightPupil: Point2D;
  rightEyeInner: Point2D;
  rightEyeOuter: Point2D;
  cheekLeft: Point2D;
  cheekRight: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  jawLeft: Point2D;
  jawRight: Point2D;
  chinLeft: Point2D;
  chinRight: Point2D;
  faceOutline: Point2D[];
  confidence: ConfidenceLevel;
}

export interface SideLandmarks {
  foreheadTop: Point2D;
  nasion: Point2D;
  noseTip: Point2D;
  subnasale: Point2D;
  upperLip: Point2D;
  lowerLip: Point2D;
  chinTip: Point2D;
  earTragus: Point2D;
  gonialCorner: Point2D;
  neckBase: Point2D;
  profileOutline: Point2D[];
  confidence: ConfidenceLevel;
}

export interface Proportions {
  upperThirdPct: number;
  middleThirdPct: number;
  lowerThirdPct: number;
  eyeToFaceRatio: string;
  lipToNoseRatio: string;
  gonialAngleEstimate: string;
  facialWidthToHeightEstimate: string;
}

export interface TechnicalCategoryReport {
  id: string;
  title: string;
  score: number | null;
  confidence: ConfidenceLevel;
  classification?: string;
  assessment: string;
  technicalExplanation: string;
  strengths: string[];
  weaknesses: string[];
  realisticImprovements: string[];
}

export interface SkincareProductRecommendation {
  name: string;
  brand: string;
  keyIngredients: string[];
  concernAddressed: string;
  whyRecommended: string;
  howToUse: string;
  precautions: string;
}

export interface HairstyleRecommendation {
  recommendedStyle: string;
  whyItSuits: string;
  barberInstructions: string;
  stylingRoutine: string;
  alternativeStyles: string[];
}

export interface ImprovementPlanData {
  feedback: {
    strongFeatures: string[];
    weakFeatures: string[];
    structuralProsCons: string;
    improvementPotential: string;
    bloatingPuffinessNotes: string;
    groomingImprovements: string[];
    lifestyleAndDeBloating: string[];
    guaShaGuidance: string;
  };
  skincare: {
    visibleConcerns: string[];
    morningRoutine: string[];
    nightRoutine: string[];
    keyIngredients: string[];
    products: SkincareProductRecommendation[];
    precautions: string;
    expectedTimeline: string;
  };
  diet: {
    summary: string;
    calorieGuidance: string;
    proteinTarget: string;
    hydrationTarget: string;
    balancedMealIdeas: string[];
    potassiumSodiumBalance: string;
    safetyNote: string;
  };
  exercises: {
    cardioPlan: string;
    resistancePlan: string;
    neckExercises: Array<{ name: string; setsReps: string; safetyCue: string }>;
    jawAndMasseterGuidance: string;
    recoveryAndSchedule: string;
  };
  hairstyle: HairstyleRecommendation;
}

export interface SubScore {
  label: string;
  score: number;
  tissueType: 'Skeletal' | 'Soft Tissue' | 'Grooming & Skin' | 'Posture & Frame';
  confidence: ConfidenceLevel;
  observation: string;
}

export interface PostureRating {
  score: number;
  neckAlignment: string;
  observation: string;
}

export interface PSLAnalysisResult {
  faceDetected: boolean;
  imageQualityWarning: string;
  overallRating: number;
  pslTier: string;
  faceShape: string;
  overallConfidence: ConfidenceLevel;
  skeletalVsSoftTissueSummary: string;
  lightingAndAngleNote: string;
  proportions: Proportions;
  frontLandmarks: FrontLandmarks;
  sideLandmarks: SideLandmarks;
  postureRating: PostureRating;
  summary: string;
  subScores: SubScore[];
  categories: TechnicalCategoryReport[];
  improvementPlan: ImprovementPlanData;
  disclaimerNote: string;
}

export interface StoredPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

export interface FacialAnalysisRecord {
  id: string;
  ownerId: string;
  createdAt: string;
  frontPhoto: StoredPhoto;
  sidePhoto: StoredPhoto;
  result: PSLAnalysisResult;
  comparisonNote?: string;
}

export type GenderOption = 'male' | 'female' | 'prefer_not_to_say' | '';

export interface UserProfile {
  ownerId: string;
  name: string;
  age: number | null;
  gender: GenderOption;
  heightCm: number | null;
  weightKg: number | null;
  bodyFrame: 'ectomorph_lean' | 'mesomorph_medium' | 'endomorph_broad' | '';
  dietaryPreferences: string;
  fitnessGoals: string;
  updatedAt: string;
}

export interface DailyProgressEntry {
  id: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  waterLitres: number;
  exercised: boolean;
  caloriesConsumed: number;
  sleepHours: number;
  skincareCompleted: boolean;
  dietFollowed: boolean;
  updatedAt: string;
}

export type ChatMode =
  | 'GENERAL'
  | 'FEEDBACK'
  | 'SKINCARE'
  | 'DIET'
  | 'EXERCISES'
  | 'HAIRSTYLE';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageDataUrl?: string;
  mode: ChatMode;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  recoveryCodeHash: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  issuedAt: string;
  expiresAt: string;
}

export type AppView =
  | 'landing'
  | 'results'
  | 'dashboard'
  | 'chatbot'
  | 'rankings'
  | 'improve'
  | 'profile';

export type ImproveStepKey = 'FEEDBACK' | 'SKINCARE' | 'DIET' | 'EXERCISES';
