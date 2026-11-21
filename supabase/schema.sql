-- ============================================================================
-- DARK TRIAD AI — COMPLETE IDEMPOTENT POSTGRESQL / SUPABASE SCHEMA
-- Paste this entire script into the Supabase SQL Editor (New Query) and click Run.
-- Safe to run on an empty database or re-run safely without duplicate errors.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function: auto-update updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT DEFAULT '',
  age INTEGER CHECK (age IS NULL OR (age >= 13 AND age <= 100)),
  gender TEXT DEFAULT '' CHECK (gender IN ('male', 'female', 'prefer_not_to_say', '')),
  height_cm NUMERIC(5,2) CHECK (height_cm IS NULL OR (height_cm >= 80 AND height_cm <= 260)),
  weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR (weight_kg >= 25 AND weight_kg <= 350)),
  body_frame TEXT DEFAULT '' CHECK (body_frame IN ('ectomorph_lean', 'mesomorph_medium', 'endomorph_broad', '')),
  dietary_preferences TEXT DEFAULT '',
  fitness_goals TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 2. SELFIES (Private storage path references — never public URLs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.selfies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('front', 'side')),
  storage_path TEXT NOT NULL,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selfies_user_created
  ON public.selfies(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. FACIAL ANALYSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facial_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_selfie_id UUID REFERENCES public.selfies(id) ON DELETE SET NULL,
  side_selfie_id UUID REFERENCES public.selfies(id) ON DELETE SET NULL,
  overall_rating NUMERIC(3,1) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 10),
  psl_tier TEXT NOT NULL,
  face_shape TEXT NOT NULL,
  overall_confidence TEXT NOT NULL CHECK (overall_confidence IN ('High', 'Medium', 'Low')),
  summary TEXT NOT NULL,
  skeletal_vs_soft_tissue_summary TEXT,
  lighting_and_angle_note TEXT,
  posture_score NUMERIC(3,1) CHECK (posture_score IS NULL OR (posture_score >= 0 AND posture_score <= 10)),
  neck_alignment TEXT,
  comparison_note TEXT,
  raw_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facial_analyses_user_date
  ON public.facial_analyses(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_facial_analyses_updated_at ON public.facial_analyses;
CREATE TRIGGER trg_facial_analyses_updated_at
  BEFORE UPDATE ON public.facial_analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. FACIAL FEATURE RATINGS (15 PSL Categories per scan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facial_feature_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.facial_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  category_title TEXT NOT NULL,
  score NUMERIC(3,1) CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  confidence TEXT NOT NULL CHECK (confidence IN ('High', 'Medium', 'Low')),
  classification TEXT,
  assessment TEXT NOT NULL,
  technical_explanation TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  realistic_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_ratings_analysis
  ON public.facial_feature_ratings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feature_ratings_user
  ON public.facial_feature_ratings(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. FACIAL MEASUREMENTS (0-1000 Normalized Landmarks & Proportions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facial_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.facial_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upper_third_pct NUMERIC(5,2),
  middle_third_pct NUMERIC(5,2),
  lower_third_pct NUMERIC(5,2),
  eye_to_face_ratio TEXT,
  lip_to_nose_ratio TEXT,
  gonial_angle_estimate TEXT,
  fwhr_estimate TEXT,
  front_landmarks_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  side_landmarks_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facial_measurements_analysis
  ON public.facial_measurements(analysis_id);

-- ----------------------------------------------------------------------------
-- 6. IMPROVEMENT PLANS & DOMAIN RECOMMENDATION TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.facial_analyses(id) ON DELETE CASCADE,
  feedback_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  hairstyle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvement_plans_user_analysis
  ON public.improvement_plans(user_id, analysis_id);

DROP TRIGGER IF EXISTS trg_improvement_plans_updated_at ON public.improvement_plans;
CREATE TRIGGER trg_improvement_plans_updated_at
  BEFORE UPDATE ON public.improvement_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.skincare_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.improvement_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visible_concerns JSONB NOT NULL DEFAULT '[]'::jsonb,
  morning_routine JSONB NOT NULL DEFAULT '[]'::jsonb,
  night_routine JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  precautions TEXT,
  expected_timeline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skincare_plan
  ON public.skincare_recommendations(plan_id);

CREATE TABLE IF NOT EXISTS public.diet_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.improvement_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  calorie_guidance TEXT,
  protein_target TEXT,
  hydration_target TEXT,
  balanced_meal_ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
  potassium_sodium_balance TEXT,
  safety_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diet_plan
  ON public.diet_recommendations(plan_id);

CREATE TABLE IF NOT EXISTS public.exercise_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.improvement_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cardio_plan TEXT,
  resistance_plan TEXT,
  neck_exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  jaw_masseter_guidance TEXT,
  recovery_schedule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_plan
  ON public.exercise_recommendations(plan_id);

-- ----------------------------------------------------------------------------
-- 7. DAILY PROGRESS & PROGRESS HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  water_litres NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (water_litres >= 0 AND water_litres <= 20),
  exercised BOOLEAN NOT NULL DEFAULT FALSE,
  calories_consumed INTEGER NOT NULL DEFAULT 0 CHECK (calories_consumed >= 0 AND calories_consumed <= 12000),
  sleep_hours NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  skincare_completed BOOLEAN NOT NULL DEFAULT FALSE,
  diet_followed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
  ON public.daily_progress(user_id, log_date DESC);

DROP TRIGGER IF EXISTS trg_daily_progress_updated_at ON public.daily_progress;
CREATE TRIGGER trg_daily_progress_updated_at
  BEFORE UPDATE ON public.daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.facial_analyses(id) ON DELETE CASCADE,
  recorded_rating NUMERIC(3,1) NOT NULL,
  previous_rating NUMERIC(3,1),
  delta_rating NUMERIC(3,1),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_history_user_date
  ON public.progress_history(user_id, recorded_at DESC);

-- Auto-log rating timeline delta whenever a facial_analyses row is inserted
CREATE OR REPLACE FUNCTION public.record_analysis_progress_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_rating NUMERIC(3,1);
BEGIN
  SELECT overall_rating
    INTO v_prev_rating
    FROM public.facial_analyses
   WHERE user_id = NEW.user_id
     AND id <> NEW.id
   ORDER BY created_at DESC
   LIMIT 1;

  INSERT INTO public.progress_history (
    user_id,
    analysis_id,
    recorded_rating,
    previous_rating,
    delta_rating,
    notes
  )
  VALUES (
    NEW.user_id,
    NEW.id,
    NEW.overall_rating,
    v_prev_rating,
    CASE WHEN v_prev_rating IS NULL THEN NULL ELSE NEW.overall_rating - v_prev_rating END,
    NEW.comparison_note
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_facial_analyses_progress_history ON public.facial_analyses;
CREATE TRIGGER trg_facial_analyses_progress_history
  AFTER INSERT ON public.facial_analyses
  FOR EACH ROW EXECUTE FUNCTION public.record_analysis_progress_history();

-- ----------------------------------------------------------------------------
-- 8. CHATBOT CONVERSATIONS & MESSAGES (Per-Mode History for Dactride AI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('GENERAL', 'FEEDBACK', 'SKINCARE', 'DIET', 'EXERCISES', 'HAIRSTYLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_mode
  ON public.chatbot_conversations(user_id, mode);

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON public.chatbot_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  preview_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_time
  ON public.chatbot_messages(conversation_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 9. USER PREFERENCES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_chat_mode TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK (preferred_chat_mode IN ('GENERAL', 'FEEDBACK', 'SKINCARE', 'DIET', 'EXERCISES', 'HAIRSTYLE')),
  show_landmark_lines BOOLEAN NOT NULL DEFAULT TRUE,
  local_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile + preferences row whenever a Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (STRICT OWNER-ONLY ACCESS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facial_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facial_feature_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facial_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skincare_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_owner_all" ON public.profiles;
CREATE POLICY "profiles_owner_all" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "selfies_owner_all" ON public.selfies;
CREATE POLICY "selfies_owner_all" ON public.selfies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "analyses_owner_all" ON public.facial_analyses;
CREATE POLICY "analyses_owner_all" ON public.facial_analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_owner_all" ON public.facial_feature_ratings;
CREATE POLICY "ratings_owner_all" ON public.facial_feature_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "measurements_owner_all" ON public.facial_measurements;
CREATE POLICY "measurements_owner_all" ON public.facial_measurements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_owner_all" ON public.improvement_plans;
CREATE POLICY "plans_owner_all" ON public.improvement_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "skincare_owner_all" ON public.skincare_recommendations;
CREATE POLICY "skincare_owner_all" ON public.skincare_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "diet_owner_all" ON public.diet_recommendations;
CREATE POLICY "diet_owner_all" ON public.diet_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "exercise_owner_all" ON public.exercise_recommendations;
CREATE POLICY "exercise_owner_all" ON public.exercise_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_progress_owner_all" ON public.daily_progress;
CREATE POLICY "daily_progress_owner_all" ON public.daily_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_history_owner_all" ON public.progress_history;
CREATE POLICY "progress_history_owner_all" ON public.progress_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_conv_owner_all" ON public.chatbot_conversations;
CREATE POLICY "chat_conv_owner_all" ON public.chatbot_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_msg_owner_all" ON public.chatbot_messages;
CREATE POLICY "chat_msg_owner_all" ON public.chatbot_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prefs_owner_all" ON public.user_preferences;
CREATE POLICY "prefs_owner_all" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 11. PRIVATE STORAGE BUCKET FOR USER SELFIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-selfies', 'user-selfies', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "selfie_objects_owner_select" ON storage.objects;
CREATE POLICY "selfie_objects_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-selfies'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "selfie_objects_owner_insert" ON storage.objects;
CREATE POLICY "selfie_objects_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-selfies'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "selfie_objects_owner_update" ON storage.objects;
CREATE POLICY "selfie_objects_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-selfies'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-selfies'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "selfie_objects_owner_delete" ON storage.objects;
CREATE POLICY "selfie_objects_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-selfies'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
