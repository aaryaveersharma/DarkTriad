'use client';

import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { FacialAnalysisRecord, ImproveStepKey } from '@/lib/types';

interface ImprovementStepperViewProps {
  record: FacialAnalysisRecord | null;
  onStartScan: () => void;
  onDiscussPlanInAI: () => void;
}

const STEPS: Array<{
  key: ImproveStepKey;
  title: string;
}> = [
  { key: 'FEEDBACK', title: 'Step 1 — Feedback' },
  { key: 'SKINCARE', title: 'Step 2 — Skincare' },
  { key: 'DIET', title: 'Step 3 — Diet' },
  { key: 'EXERCISES', title: 'Step 4 — Exercises' },
];

export function ImprovementStepperView({
  record,
  onStartScan,
  onDiscussPlanInAI,
}: ImprovementStepperViewProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!record) {
    return (
      <div className="max-w-xl py-4 space-y-3 text-left">
        <h1 className="text-2xl font-medium text-[#f4f4f5]">
          Your 4-Step Improvement Plan Awaits
        </h1>
        <p className="text-sm text-[#9e9ea6]">
          Complete your front and side facial scan first to unlock customized
          Feedback, Skincare, Diet, Exercises, and Hairstyle specifications.
        </p>
        <button
          type="button"
          onClick={onStartScan}
          className="mt-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-sm font-medium text-[#0a0a0a]"
        >
          Scan Your Face Now
        </button>
      </div>
    );
  }

  const plan = record.result.improvementPlan;
  const activeStep = STEPS[stepIdx];

  return (
    <div className="space-y-10">
      {/* Header + Icon-Free Top-Left Step Buttons */}
      <section className="space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#8e8e95] uppercase">
            Personalized Improvement Protocol · {record.result.faceShape}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
            4-Step Ascension System
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STEPS.map((s, idx) => {
            const active = idx === stepIdx;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStepIdx(idx)}
                className={`flex items-start justify-start rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                    : 'border-white/14 bg-transparent text-[#d4d4d8] hover:border-white/30'
                }`}
              >
                <span className="text-xs font-semibold tracking-[0.02em]">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Step Numbered Content */}
      <section className="space-y-8 border-t border-white/10 pt-8">
        {activeStep.key === 'FEEDBACK' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 1 — Structural Feedback &amp; Grooming Priorities
            </h2>

            <ol className="space-y-0">
              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="min-w-0 flex-1 grid gap-6 sm:grid-cols-2 pt-0.5">
                  <div>
                    <span className="text-[11px] font-semibold tracking-[0.08em] text-emerald-300 uppercase">
                      Strong Characteristics
                    </span>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#d4d4d8]">
                      {plan.feedback.strongFeatures.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
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
              </li>

              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="min-w-0 flex-1 grid gap-6 sm:grid-cols-2 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
                  <div>
                    <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                      Structural Pros &amp; Cons
                    </span>
                    <p className="mt-1.5">{plan.feedback.structuralProsCons}</p>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                      Realistic Improvement Potential
                    </span>
                    <p className="mt-1.5">{plan.feedback.improvementPotential}</p>
                  </div>
                </div>
              </li>

              <li className="relative flex gap-4">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8] space-y-2">
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
                  <p className="pt-1 text-[11px] text-[#9e9ea6]">
                    Gua Sha Note: {plan.feedback.guaShaGuidance}
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {activeStep.key === 'SKINCARE' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 2 — Targeted Skincare Routine &amp; Products
            </h2>

            <ol className="space-y-0">
              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="min-w-0 flex-1 pt-0.5 space-y-2.5">
                  <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                    Observed Skin Priorities
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {plan.skincare.visibleConcerns.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs text-[#e4e4e7]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </li>

              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="min-w-0 flex-1 grid gap-6 sm:grid-cols-2 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
                  <div>
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
                  <div>
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
              </li>

              <li className="relative flex gap-4">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="min-w-0 flex-1 pt-0.5 space-y-4">
                  <span className="block text-[11px] font-medium text-[#8e8e95] uppercase">
                    Recommended Formulations &amp; Usage
                  </span>
                  <div className="grid gap-6 md:grid-cols-2">
                    {plan.skincare.products.map((prod, idx) => (
                      <div
                        key={idx}
                        className="border-t border-white/10 pt-3 text-xs space-y-1.5"
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
                          <span className="text-[10px] text-[#9e9ea6]">
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
                  <div className="border-t border-white/10 pt-3 text-xs text-[#9e9ea6] space-y-1">
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
              </li>
            </ol>
          </div>
        )}

        {activeStep.key === 'DIET' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 3 — Personalized Nutrition &amp; Anti-Bloat Strategy
            </h2>

            <ol className="space-y-0">
              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="min-w-0 flex-1 pt-0.5 space-y-4">
                  <p className="text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.diet.summary}
                  </p>
                  <div className="grid gap-5 sm:grid-cols-3 border-t border-white/10 pt-4 text-xs">
                    <div>
                      <span className="block text-[10px] text-[#8e8e95] uppercase">
                        Calorie Guidance
                      </span>
                      <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                        {plan.diet.calorieGuidance}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8e8e95] uppercase">
                        Protein Target
                      </span>
                      <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                        {plan.diet.proteinTarget}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8e8e95] uppercase">
                        Hydration &amp; Electrolytes
                      </span>
                      <p className="mt-1.5 text-[#f4f4f5] leading-relaxed">
                        {plan.diet.hydrationTarget}
                      </p>
                    </div>
                  </div>
                </div>
              </li>

              <li className="relative flex gap-4">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-xs text-[#d4d4d8] space-y-2">
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
              </li>
            </ol>
          </div>
        )}

        {activeStep.key === 'EXERCISES' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-[#f4f4f5]">
              Step 4 — Training, Cardio &amp; Neck Posture Protocol
            </h2>

            <ol className="space-y-0">
              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
                  <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                    Cardio, Walking &amp; Running
                  </span>
                  <p className="mt-1.5">{plan.exercises.cardioPlan}</p>
                </div>
              </li>

              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
                  <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                    Resistance Training
                  </span>
                  <p className="mt-1.5">{plan.exercises.resistancePlan}</p>
                </div>
              </li>

              <li className="relative flex gap-4 pb-8">
                <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="min-w-0 flex-1 pt-0.5 space-y-4">
                  <span className="block text-[10px] font-medium text-[#8e8e95] uppercase">
                    Neck &amp; Posture Exercises (Sets, Reps &amp; Safety)
                  </span>

                  {/* Horizontal 1–4 row on desktop */}
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="hidden lg:block absolute left-3 right-3 top-3.5 h-px bg-white/14"
                    />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {plan.exercises.neckExercises.slice(0, 4).map((ex, i) => (
                        <div key={i} className="relative space-y-1.5 text-xs">
                          <span className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-[11px] font-medium text-[#f4f4f5] tabular-nums">
                            {i + 1}
                          </span>
                          <h4 className="pt-1 font-medium text-[#f4f4f5]">{ex.name}</h4>
                          <p className="text-[11px] font-medium text-[#a1a1aa] tabular-nums">
                            {ex.setsReps}
                          </p>
                          <p className="leading-relaxed text-[#9e9ea6]">{ex.safetyCue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </li>

              <li className="relative flex gap-4">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  4
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-xs text-[#d4d4d8] space-y-2">
                  <p>
                    <strong className="text-[#f4f4f5]">Jaw &amp; Masseter Reality Check:</strong>{' '}
                    {plan.exercises.jawAndMasseterGuidance}
                  </p>
                  <p className="text-[#9e9ea6]">
                    <strong className="text-[#e4e4e7]">Recovery &amp; Schedule:</strong>{' '}
                    {plan.exercises.recoveryAndSchedule}
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-medium text-[#f4f4f5] disabled:opacity-40 hover:bg-white/6"
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
              <span>Next: {STEPS[stepIdx + 1].title}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDiscussPlanInAI}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discuss Plan in DARK TRIAD AI</span>
            </button>
          )}
        </div>
      </section>

      {/* Open Left-Aligned Hairstyle Recommendations Section */}
      <section className="border-t border-white/10 pt-8 space-y-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#8e8e95] uppercase">
            Hair Framing Recommendation
          </p>
          <h2 className="mt-1 text-xl font-medium text-[#f4f4f5]">
            {plan.hairstyle.recommendedStyle}
          </h2>
        </div>

        <ol className="space-y-0">
          <li className="relative flex gap-4 pb-7">
            <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              1
            </div>
            <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
              <strong className="block text-[#f4f4f5] mb-1">Why It Suits Your Geometry</strong>
              {plan.hairstyle.whyItSuits}
            </div>
          </li>

          <li className="relative flex gap-4 pb-7">
            <span aria-hidden="true" className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14" />
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              2
            </div>
            <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
              <strong className="block text-[#f4f4f5] mb-1">Barber Specifications</strong>
              {plan.hairstyle.barberInstructions}
            </div>
          </li>

          <li className="relative flex gap-4">
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              3
            </div>
            <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-[#d4d4d8]">
              <strong className="block text-[#f4f4f5] mb-1">Daily Styling</strong>
              {plan.hairstyle.stylingRoutine}
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
