import {
  ChatMessage,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  PSLAnalysisResult,
  UserProfile,
} from '../types';
import { getSupabaseClient } from './supabaseClient';

const SELFIES_BUCKET = 'user-selfies';

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 350 * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function dataUrlToBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  return await res.blob();
}

async function signedUrlToDataUrl(signedUrl: string | undefined): Promise<string> {
  if (!signedUrl) return '';
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function pushProfileRemote(
  userId: string,
  email: string | undefined,
  profile: UserProfile,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await withRetry(async () => {
    const payload: Record<string, unknown> = {
      id: userId,
      name: profile.name || '',
      age: profile.age,
      gender: profile.gender || '',
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      body_frame: profile.bodyFrame || '',
      dietary_preferences: profile.dietaryPreferences || '',
      fitness_goals: profile.fitnessGoals || '',
    };
    if (email) payload.email = email;

    const { error } = await supabase.from('profiles').upsert(payload, {
      onConflict: 'id',
    });
    if (error) throw error;
  });
}

export async function pullProfileRemote(
  userId: string,
): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ownerId: userId,
    name: data.name ?? '',
    age: data.age ?? null,
    gender: data.gender ?? '',
    heightCm: data.height_cm !== null ? Number(data.height_cm) : null,
    weightKg: data.weight_kg !== null ? Number(data.weight_kg) : null,
    bodyFrame: data.body_frame ?? '',
    dietaryPreferences: data.dietary_preferences ?? '',
    fitnessGoals: data.fitness_goals ?? '',
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

export async function pushAnalysisRemote(
  record: FacialAnalysisRecord,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const userId = record.ownerId;
  const frontPath = `${userId}/${record.id}/front.jpg`;
  const sidePath = `${userId}/${record.id}/side.jpg`;

  await withRetry(async () => {
    // Check if analysis already synced to make retries idempotent
    const { data: existing } = await supabase
      .from('facial_analyses')
      .select('id')
      .eq('id', record.id)
      .maybeSingle();

    if (existing) return;

    // 1. Upload Front & Side selfies to private user-selfies bucket
    let frontSelfieId: string | null = null;
    let sideSelfieId: string | null = null;

    if (record.frontPhoto?.dataUrl) {
      const frontBlob = await dataUrlToBlob(record.frontPhoto.dataUrl);
      const { error: upFrontErr } = await supabase.storage
        .from(SELFIES_BUCKET)
        .upload(frontPath, frontBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (!upFrontErr) {
        const { data: frontRow } = await supabase
          .from('selfies')
          .insert({
            user_id: userId,
            profile_type: 'front',
            storage_path: frontPath,
            width: record.frontPhoto.width,
            height: record.frontPhoto.height,
          })
          .select('id')
          .single();
        frontSelfieId = frontRow?.id ?? null;
      }
    }

    if (record.sidePhoto?.dataUrl) {
      const sideBlob = await dataUrlToBlob(record.sidePhoto.dataUrl);
      const { error: upSideErr } = await supabase.storage
        .from(SELFIES_BUCKET)
        .upload(sidePath, sideBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (!upSideErr) {
        const { data: sideRow } = await supabase
          .from('selfies')
          .insert({
            user_id: userId,
            profile_type: 'side',
            storage_path: sidePath,
            width: record.sidePhoto.width,
            height: record.sidePhoto.height,
          })
          .select('id')
          .single();
        sideSelfieId = sideRow?.id ?? null;
      }
    }

    const r = record.result;

    // 2. Insert facial_analyses (triggers progress_history insert automatically)
    const { error: analysisErr } = await supabase.from('facial_analyses').insert({
      id: record.id,
      user_id: userId,
      front_selfie_id: frontSelfieId,
      side_selfie_id: sideSelfieId,
      overall_rating: Number(r.overallRating.toFixed(1)),
      psl_tier: r.pslTier,
      face_shape: r.faceShape,
      overall_confidence: r.overallConfidence,
      summary: r.summary,
      skeletal_vs_soft_tissue_summary: r.skeletalVsSoftTissueSummary,
      lighting_and_angle_note: r.lightingAndAngleNote,
      posture_score: Number((r.postureRating?.score ?? 5).toFixed(1)),
      neck_alignment: r.postureRating?.neckAlignment ?? '',
      comparison_note: record.comparisonNote ?? null,
      raw_report_json: r,
      created_at: record.createdAt,
    });
    if (analysisErr) throw analysisErr;

    // 3. Insert 15 facial_feature_ratings rows
    if (Array.isArray(r.categories) && r.categories.length > 0) {
      await supabase.from('facial_feature_ratings').insert(
        r.categories.map((cat) => ({
          analysis_id: record.id,
          user_id: userId,
          category_key: cat.id,
          category_title: cat.title,
          score: typeof cat.score === 'number' ? Number(cat.score.toFixed(1)) : null,
          confidence: cat.confidence,
          classification: cat.classification ?? null,
          assessment: cat.assessment,
          technical_explanation: cat.technicalExplanation,
          strengths: cat.strengths,
          weaknesses: cat.weaknesses,
          realistic_improvements: cat.realisticImprovements,
        })),
      );
    }

    // 4. Insert facial_measurements row
    if (r.proportions) {
      await supabase.from('facial_measurements').insert({
        analysis_id: record.id,
        user_id: userId,
        upper_third_pct: r.proportions.upperThirdPct,
        middle_third_pct: r.proportions.middleThirdPct,
        lower_third_pct: r.proportions.lowerThirdPct,
        eye_to_face_ratio: r.proportions.eyeToFaceRatio,
        lip_to_nose_ratio: r.proportions.lipToNoseRatio,
        gonial_angle_estimate: r.proportions.gonialAngleEstimate,
        fwhr_estimate: r.proportions.facialWidthToHeightEstimate,
        front_landmarks_json: r.frontLandmarks,
        side_landmarks_json: r.sideLandmarks,
      });
    }

    // 5. Insert improvement_plans + child skincare, diet, exercise tables
    if (r.improvementPlan) {
      const { data: planRow } = await supabase
        .from('improvement_plans')
        .insert({
          user_id: userId,
          analysis_id: record.id,
          feedback_json: r.improvementPlan.feedback,
          hairstyle_json: r.improvementPlan.hairstyle,
        })
        .select('id')
        .single();

      if (planRow?.id) {
        const planId = planRow.id;
        await Promise.all([
          supabase.from('skincare_recommendations').insert({
            plan_id: planId,
            user_id: userId,
            visible_concerns: r.improvementPlan.skincare.visibleConcerns,
            morning_routine: r.improvementPlan.skincare.morningRoutine,
            night_routine: r.improvementPlan.skincare.nightRoutine,
            key_ingredients: r.improvementPlan.skincare.keyIngredients,
            products: r.improvementPlan.skincare.products,
            precautions: r.improvementPlan.skincare.precautions,
            expected_timeline: r.improvementPlan.skincare.expectedTimeline,
          }),
          supabase.from('diet_recommendations').insert({
            plan_id: planId,
            user_id: userId,
            summary: r.improvementPlan.diet.summary,
            calorie_guidance: r.improvementPlan.diet.calorieGuidance,
            protein_target: r.improvementPlan.diet.proteinTarget,
            hydration_target: r.improvementPlan.diet.hydrationTarget,
            balanced_meal_ideas: r.improvementPlan.diet.balancedMealIdeas,
            potassium_sodium_balance: r.improvementPlan.diet.potassiumSodiumBalance,
            safety_note: r.improvementPlan.diet.safetyNote,
          }),
          supabase.from('exercise_recommendations').insert({
            plan_id: planId,
            user_id: userId,
            cardio_plan: r.improvementPlan.exercises.cardioPlan,
            resistance_plan: r.improvementPlan.exercises.resistancePlan,
            neck_exercises: r.improvementPlan.exercises.neckExercises,
            jaw_masseter_guidance: r.improvementPlan.exercises.jawAndMasseterGuidance,
            recovery_schedule: r.improvementPlan.exercises.recoveryAndSchedule,
          }),
        ]);
      }
    }
  });
}

export async function pullAnalysesRemote(
  userId: string,
  cachedById?: Map<string, FacialAnalysisRecord>,
): Promise<FacialAnalysisRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: rows, error } = await supabase
    .from('facial_analyses')
    .select(
      `
      id,
      user_id,
      created_at,
      comparison_note,
      raw_report_json,
      front_selfie:selfies!facial_analyses_front_selfie_id_fkey (storage_path, width, height),
      side_selfie:selfies!facial_analyses_side_selfie_id_fkey (storage_path, width, height)
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !rows) return null;

  const records = await Promise.all(
    rows.map(async (row) => {
      const cached = cachedById?.get(row.id);
      const frontMeta = Array.isArray(row.front_selfie)
        ? row.front_selfie[0]
        : (row.front_selfie as { storage_path?: string; width?: number; height?: number } | null);
      const sideMeta = Array.isArray(row.side_selfie)
        ? row.side_selfie[0]
        : (row.side_selfie as { storage_path?: string; width?: number; height?: number } | null);

      let frontDataUrl = cached?.frontPhoto?.dataUrl?.startsWith('data:')
        ? cached.frontPhoto.dataUrl
        : '';
      let sideDataUrl = cached?.sidePhoto?.dataUrl?.startsWith('data:')
        ? cached.sidePhoto.dataUrl
        : '';

      if (!frontDataUrl || !sideDataUrl) {
        const frontPath = frontMeta?.storage_path || `${userId}/${row.id}/front.jpg`;
        const sidePath = sideMeta?.storage_path || `${userId}/${row.id}/side.jpg`;

        const [frontSigned, sideSigned] = await Promise.all([
          !frontDataUrl
            ? supabase.storage.from(SELFIES_BUCKET).createSignedUrl(frontPath, 3600)
            : Promise.resolve({ data: null }),
          !sideDataUrl
            ? supabase.storage.from(SELFIES_BUCKET).createSignedUrl(sidePath, 3600)
            : Promise.resolve({ data: null }),
        ]);

        const [dlFront, dlSide] = await Promise.all([
          !frontDataUrl ? signedUrlToDataUrl(frontSigned.data?.signedUrl) : Promise.resolve(frontDataUrl),
          !sideDataUrl ? signedUrlToDataUrl(sideSigned.data?.signedUrl) : Promise.resolve(sideDataUrl),
        ]);
        frontDataUrl = dlFront;
        sideDataUrl = dlSide;
      }

      return {
        id: row.id,
        ownerId: row.user_id,
        createdAt: row.created_at,
        frontPhoto: {
          dataUrl: frontDataUrl,
          width: frontMeta?.width ?? cached?.frontPhoto?.width ?? 720,
          height: frontMeta?.height ?? cached?.frontPhoto?.height ?? 960,
        },
        sidePhoto: {
          dataUrl: sideDataUrl,
          width: sideMeta?.width ?? cached?.sidePhoto?.width ?? 720,
          height: sideMeta?.height ?? cached?.sidePhoto?.height ?? 960,
        },
        result: row.raw_report_json as PSLAnalysisResult,
        comparisonNote: row.comparison_note ?? undefined,
      } satisfies FacialAnalysisRecord;
    }),
  );

  return records;
}

export async function pushDailyProgressRemote(
  entry: DailyProgressEntry,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await withRetry(async () => {
    const { error } = await supabase.from('daily_progress').upsert(
      {
        user_id: entry.ownerId,
        log_date: entry.date,
        water_litres: entry.waterLitres,
        exercised: entry.exercised,
        calories_consumed: entry.caloriesConsumed,
        sleep_hours: entry.sleepHours,
        skincare_completed: entry.skincareCompleted,
        diet_followed: entry.dietFollowed,
      },
      { onConflict: 'user_id,log_date' },
    );
    if (error) throw error;
  });
}

export async function pullDailyProgressRemote(
  userId: string,
): Promise<DailyProgressEntry[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: true });

  if (error || !data) return null;

  return data.map((row) => ({
    id: `${userId}::${row.log_date}`,
    ownerId: userId,
    date: row.log_date,
    waterLitres: Number(row.water_litres ?? 0),
    exercised: Boolean(row.exercised),
    caloriesConsumed: Number(row.calories_consumed ?? 0),
    sleepHours: Number(row.sleep_hours ?? 0),
    skincareCompleted: Boolean(row.skincare_completed),
    dietFollowed: Boolean(row.diet_followed),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }));
}

async function getOrCreateConversationId(
  userId: string,
  mode: ChatMode,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('chatbot_conversations')
    .upsert({ user_id: userId, mode }, { onConflict: 'user_id,mode' })
    .select('id')
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function pushChatMessagesRemote(
  userId: string,
  mode: ChatMode,
  messages: ChatMessage[],
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || messages.length === 0) return;

  await withRetry(async () => {
    const convId = await getOrCreateConversationId(userId, mode);
    if (!convId) return;

    const rows = await Promise.all(
      messages.map(async (msg) => {
        let previewStoragePath: string | null = null;
        if (msg.imageDataUrl?.startsWith('data:')) {
          const path = `${userId}/chat/${msg.id}.jpg`;
          const blob = await dataUrlToBlob(msg.imageDataUrl);
          const { error: upErr } = await supabase.storage
            .from(SELFIES_BUCKET)
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          if (!upErr) {
            previewStoragePath = path;
          }
        }
        return {
          id: msg.id,
          conversation_id: convId,
          user_id: userId,
          role: msg.role,
          content: msg.text,
          preview_storage_path: previewStoragePath,
          created_at: msg.createdAt,
        };
      }),
    );

    const { error } = await supabase
      .from('chatbot_messages')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  });
}

export async function pullChatHistoryRemote(
  userId: string,
  mode: ChatMode,
): Promise<ChatMessage[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: conv } = await supabase
    .from('chatbot_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('mode', mode)
    .maybeSingle();

  if (!conv?.id) return [];

  const { data: msgs, error } = await supabase
    .from('chatbot_messages')
    .select('*')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  if (error || !msgs) return null;

  return Promise.all(
    msgs.map(async (row) => {
      let imgDataUrl: string | undefined;
      if (row.preview_storage_path) {
        const { data: signed } = await supabase.storage
          .from(SELFIES_BUCKET)
          .createSignedUrl(row.preview_storage_path, 3600);
        const resolved = await signedUrlToDataUrl(signed?.signedUrl);
        imgDataUrl = resolved || undefined;
      }
      return {
        id: row.id,
        role: row.role as 'user' | 'assistant',
        text: row.content,
        imageDataUrl: imgDataUrl,
        mode,
        createdAt: row.created_at,
      } satisfies ChatMessage;
    }),
  );
}

export async function clearChatHistoryRemote(
  userId: string,
  mode: ChatMode,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: conv } = await supabase
    .from('chatbot_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('mode', mode)
    .maybeSingle();

  if (conv?.id) {
    await supabase.from('chatbot_messages').delete().eq('conversation_id', conv.id);
  }
}

export async function pushPreferencesRemote(
  userId: string,
  prefs: { showLandmarkLines: boolean; preferredChatMode: ChatMode },
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      show_landmark_lines: prefs.showLandmarkLines,
      preferred_chat_mode: prefs.preferredChatMode,
    },
    { onConflict: 'user_id' },
  );
}
