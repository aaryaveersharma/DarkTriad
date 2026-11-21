'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  MessageSquare,
  Scissors,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { useState } from 'react';
import { FacialAnalysisRecord, ImproveStepKey } from '@/lib/types';

interface ImprovementStepperViewProps {
  record: FacialAnalysisRecord | null;
  onStartScan: () => void;
  onAskHairstylePreview: () => void;
}

const STEPS: Array<{
  key: ImproveStepKey;
  number: string;
  label: string;
  icon: typeof Sparkles;
}> = [
  { key: 'FEEDBACK', number: '01', label: 'FEEDBACK', icon: Sparkles },
  { key: 'SKINCARE', number: '02', label: 'SKINCARE', icon: Check },
  { key: 'DIET', number: '03', label: 'DIET', icon: Utensils },
  { key: 'EXERCISES', number: '04', label: 'EXERCISES', icon: Dumbbell },
];

export function ImprovementStepperView({
  record,
  onStartScan,
  onAskHairstylePreview,
}: ImprovementStepperViewProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!record) {
    return (
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-8 text-center">
        <h1 className="text-2xl font-medium text-[#f4f4f5]">
          Your 4-Step Improvement Plan Awaits
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#9e9ea6]">
          Complete your front and side facial scan first to unlock customized
          Feedback, Skincare, Diet, Exercises, and Hairstyle specifications.
        </p>
        <button
          type="button"
          onClick={onStartScan}
          className="mt-6 rounded-full bg-[#f4f4f5] px-6 py-3 text-sm font-medium text-[#0a0a0a]"
        >
          Scan Your Face Now
        </button>
      </div>
    );
  }

  const plan = record.result.improvementPlan;
  const activeStep = STEPS[stepIdx];

  return (
    <div className="space-y-6">
      {/* Header & Hair Framing Banner */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
              Personalized Improvement Protocol · {record.result.faceShape}
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
              4-Step Ascension System
            </h1>
          </div>

          <button
            type="button"
            onClick={onAskHairstylePreview}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#232327] px-4 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2d2d32]"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Hairstyle: {plan.hairstyle.recommendedStyle} · Preview in AI</span>
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STEPS.map((s, idx) => {
            const active = idx === stepIdx;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStepIdx(idx)}
                className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                    : 'border-white/10 bg-[#141416] text-[#d4d4d8] hover:border-white/25'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <span
                    className={`block text-[10px] font-medium ${
                      active ? 'text-[#0a0a0a]/65' : 'text-[#8e8e95]'
                    }`}
                  >
                    STEP {s.number}
                  </span>
                  <span className="block text-xs font-semibold tracking-[0.06em]">
                    {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8 space-y-6">
        {activeStep.key === 'FEEDBACK' && (
          <div className="space-y-5">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 1 — Structural Feedback &amp; Grooming Priorities
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-emerald-300 uppercase">
                  Strong Characteristics
                </span>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#d4d4d8]">
                  {plan.feedback.strongFeatures.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="text-[11px] font-semibold tracking-[0.08em] text-amber-300 uppercase">
                  Primary Weaknesses / Focus Areas
                </span>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#d4d4d8]">
                  {plan.feedback.weakFeatures.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-[#d4d4d8]">
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                  Structural Pros &amp; Cons
                </span>
                <p className="mt-1.5">{plan.feedback.structuralProsCons}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                  Realistic Improvement Potential
                </span>
                <p className="mt-1.5">{plan.feedback.improvementPotential}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs leading-relaxed text-[#d4d4d8] space-y-2">
              <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                Bloating, Hydration &amp; Grooming Habits
              </span>
              <p>{plan.feedback.bloatingPuffinessNotes}</p>
              <ul className="space-y-1 pt-1">
                {plan.feedback.groomingImprovements.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
                {plan.feedback.lifestyleAndDeBloating.map((l, i) => (
                  <li key={i}>• {l}</li>
                ))}
              </ul>
              <p className="pt-2 text-[11px] text-[#9e9ea6]">
                Gua Sha Note: {plan.feedback.guaShaGuidance}
              </p>
            </div>
          </div>
        )}

        {activeStep.key === 'SKINCARE' && (
          <div className="space-y-5">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 2 — Targeted Skincare Routine &amp; Products
            </h2>

            <div className="flex flex-wrap gap-2">
              {plan.skincare.visibleConcerns.map((c, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/15 bg-[#141416] px-3 py-1 text-xs text-[#e4e4e7]"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-[#d4d4d8]">
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[11px] font-semibold tracking-[0.08em] text-[#f4f4f5] uppercase">
                  Morning Routine
                </span>
                <ol className="mt-2 space-y-1.5">
                  {plan.skincare.morningRoutine.map((r, i) => (
                    <li key={i}>
                      {i + 1}. {r}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[11px] font-semibold tracking-[0.08em] text-[#f4f4f5] uppercase">
                  Night Routine
                </span>
                <ol className="mt-2 space-y-1.5">
                  {plan.skincare.nightRoutine.map((r, i) => (
                    <li key={i}>
                      {i + 1}. {r}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium tracking-[0.1em] text-[#9e9ea6] uppercase mb-3">
                Recommended Formulations &amp; Usage
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {plan.skincare.products.map((prod, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-medium text-[#9e9ea6] uppercase">
                          {prod.brand}
                        </span>
                        <h4 className="text-sm font-medium text-[#f4f4f5]">
                          {prod.name}
                        </h4>
                      </div>
                      <span className="rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] text-[#d4d4d8]">
                        {prod.concernAddressed}
                      </span>
                    </div>
                    <p className="text-[#a1a1aa]">
                      <strong className="text-[#e4e4e7]">Ingredients:</strong>{' '}
                      {prod.keyIngredients.join(', ')}
                    </p>
                    <p className="text-[#d4d4d8]">
                      <strong className="text-[#e4e4e7]">Why:</strong>{' '}
                      {prod.whyRecommended}
                    </p>
                    <p className="text-[#d4d4d8]">
                      <strong className="text-[#e4e4e7]">How to use:</strong>{' '}
                      {prod.howToUse}
                    </p>
                    <p className="text-[11px] text-amber-200/90">
                      Precaution: {prod.precautions}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs text-[#9e9ea6] space-y-1">
              <p>
                <strong className="text-[#e4e4e7]">Timeline:</strong>{' '}
                {plan.skincare.expectedTimeline}
              </p>
              <p>
                <strong className="text-[#e4e4e7]">Non-Diagnostic Note:</strong>{' '}
                {plan.skincare.precautions}
              </p>
            </div>
          </div>
        )}

        {activeStep.key === 'DIET' && (
          <div className="space-y-5">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 3 — Personalized Nutrition &amp; Anti-Bloat Strategy
            </h2>

            <p className="text-sm leading-relaxed text-[#d4d4d8]">
              {plan.diet.summary}
            </p>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[10px] text-[#8e8e95] uppercase">
                  Calorie Guidance
                </span>
                <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                  {plan.diet.calorieGuidance}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[10px] text-[#8e8e95] uppercase">
                  Protein Target
                </span>
                <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                  {plan.diet.proteinTarget}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[10px] text-[#8e8e95] uppercase">
                  Hydration &amp; Electrolytes
                </span>
                <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                  {plan.diet.hydrationTarget}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs text-[#d4d4d8] space-y-2">
              <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                Practical Meal Ideas
              </span>
              <ul className="space-y-1.5">
                {plan.diet.balancedMealIdeas.map((m, i) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
              <p className="pt-2 text-[#a1a1aa]">
                <strong className="text-[#e4e4e7]">Potassium / Sodium Balance:</strong>{' '}
                {plan.diet.potassiumSodiumBalance}
              </p>
              <p className="text-[11px] text-[#8e8e95]">{plan.diet.safetyNote}</p>
            </div>
          </div>
        )}

        {activeStep.key === 'EXERCISES' && (
          <div className="space-y-5">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 4 — Training, Cardio &amp; Neck Posture Protocol
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-[#d4d4d8]">
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                  Cardio, Walking &amp; Running
                </span>
                <p className="mt-1.5">{plan.exercises.cardioPlan}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
                <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                  Resistance Training
                </span>
                <p className="mt-1.5">{plan.exercises.resistancePlan}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-medium tracking-[0.1em] text-[#9e9ea6] uppercase mb-3">
                Neck &amp; Posture Exercises (Sets, Reps &amp; Safety)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.exercises.neckExercises.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs space-y-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-medium text-[#f4f4f5]">{ex.name}</h4>
                      <span className="text-[11px] text-[#a1a1aa]">{ex.setsReps}</span>
                    </div>
                    <p className="text-[#9e9ea6]">{ex.safetyCue}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs text-[#d4d4d8] space-y-1.5">
              <p>
                <strong className="text-[#f4f4f5]">Jaw &amp; Masseter Reality Check:</strong>{' '}
                {plan.exercises.jawAndMasseterGuidance}
              </p>
              <p className="text-[#9e9ea6]">
                <strong className="text-[#e4e4e7]">Recovery &amp; Schedule:</strong>{' '}
                {plan.exercises.recoveryAndSchedule}
              </p>
            </div>
          </div>
        )}

        {/* Stepper Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#141416] px-5 py-2.5 text-xs font-medium text-[#f4f4f5] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a]"
            >
              <span>Next: {STEPS[stepIdx + 1].label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onAskHairstylePreview}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discuss Plan in Dactride AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Dedicated Hairstyle Framing Summary Card */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
              Hair Framing Recommendation
            </p>
            <h3 className="mt-1 text-lg font-medium text-[#f4f4f5]">
              {plan.hairstyle.recommendedStyle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onAskHairstylePreview}
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-4 py-2 text-xs font-semibold text-[#0a0a0a]"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Preview Hairstyle in Dactride AI</span>
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[#d4d4d8]">
          {plan.hairstyle.whyItSuits}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 text-xs pt-1">
          <div className="rounded-xl border border-white/10 bg-[#141416] p-3.5 text-[#d4d4d8]">
            <strong className="block text-[#f4f4f5] mb-1">Barber Spec</strong>
            {plan.hairstyle.barberInstructions}
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141416] p-3.5 text-[#d4d4d8]">
            <strong className="block text-[#f4f4f5] mb-1">Daily Styling</strong>
            {plan.hairstyle.stylingRoutine}
          </div>
        </div>
      </div>
    </div>
  );
}
