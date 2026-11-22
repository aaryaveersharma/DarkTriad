'use client';

import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { FacialAnalysisRecord, ImproveStepKey } from '@/lib/types';

interface ImprovementStepperViewProps {
  record: FacialAnalysisRecord | null;
  onStartScan: () => void;
  onDiscussInChatbot: () => void;
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
  onDiscussInChatbot,
}: ImprovementStepperViewProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!record) {
    return (
      <div className="py-6 text-left">
        <h1 className="text-2xl font-medium tracking-tight text-[#f4f4f5]">
          Your 4-Step Improvement Plan Awaits
        </h1>
        <p className="mt-2 max-w-md text-sm text-[#9e9ea6]">
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10 text-left"
    >
      {/* Top-Left Open Header + Clean 4 Step Buttons (No Icons, No Extra Descriptions) */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-medium text-[#9e9ea6]">
            Personalized Improvement Protocol · {record.result.faceShape}
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
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
                className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                    : 'border-white/15 bg-transparent text-[#d4d4d8] hover:border-white/35'
                }`}
              >
                <span className="block text-xs font-semibold tracking-[0.02em]">
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Open Numbered Step Content */}
      <section className="border-t border-white/12 pt-8 space-y-8">
        {activeStep.key === 'FEEDBACK' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium tracking-tight text-[#f4f4f5]">
              Step 1 — Structural Feedback &amp; Grooming Priorities
            </h2>

            <ol className="max-w-3xl">
              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Strong Characteristics
                  </h3>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.feedback.strongFeatures.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Primary Focus Areas
                  </h3>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.feedback.weakFeatures.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Structural Balance &amp; Realistic Potential
                  </h3>
                  <p className="text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.feedback.structuralProsCons}
                  </p>
                  <p className="text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.feedback.improvementPotential}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-0">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  4
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Bloating, Hydration &amp; Grooming Habits
                  </h3>
                  <p className="text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.feedback.bloatingPuffinessNotes}
                  </p>
                  <ul className="space-y-1 text-sm text-[#d4d4d8] pt-1">
                    {plan.feedback.groomingImprovements.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                    {plan.feedback.lifestyleAndDeBloating.map((l, i) => (
                      <li key={i}>• {l}</li>
                    ))}
                  </ul>
                  <p className="pt-1 text-xs text-[#8e8e95]">
                    Gua Sha Note: {plan.feedback.guaShaGuidance}
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {activeStep.key === 'SKINCARE' && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium tracking-tight text-[#f4f4f5]">
              Step 2 — Targeted Skincare Routine &amp; Products
            </h2>

            <ol className="max-w-3xl">
              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Visible Concerns
                  </h3>
                  <p className="text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.skincare.visibleConcerns.join(' · ')}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Morning Routine
                  </h3>
                  <ol className="space-y-1.5 text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.skincare.morningRoutine.map((r, i) => (
                      <li key={i}>
                        {i + 1}. {r}
                      </li>
                    ))}
                  </ol>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-7">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Night Routine
                  </h3>
                  <ol className="space-y-1.5 text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.skincare.nightRoutine.map((r, i) => (
                      <li key={i}>
                        {i + 1}. {r}
                      </li>
                    ))}
                  </ol>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-0">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  4
                </div>
                <div className="flex-1 pt-0.5 space-y-4">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Recommended Formulations &amp; Usage
                  </h3>
                  <div className="divide-y divide-white/10">
                    {plan.skincare.products.map((prod, idx) => (
                      <div key={idx} className="py-4 first:pt-0 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-sm font-medium text-[#f4f4f5]">
                            {prod.brand} — {prod.name}
                          </h4>
                          <span className="text-[11px] text-[#9e9ea6]">
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
                  <div className="pt-2 text-xs text-[#9e9ea6] space-y-1">
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
            <h2 className="text-xl font-medium tracking-tight text-[#f4f4f5]">
              Step 3 — Personalized Nutrition &amp; Anti-Bloat Strategy
            </h2>

            <p className="max-w-3xl text-sm leading-relaxed text-[#d4d4d8]">
              {plan.diet.summary}
            </p>

            <ol className="max-w-3xl">
              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Calorie Guidance
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.diet.calorieGuidance}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Protein Target
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.diet.proteinTarget}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Hydration &amp; Electrolytes
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.diet.hydrationTarget}
                  </p>
                  <p className="mt-2 text-xs text-[#d4d4d8]">
                    <strong className="text-[#f4f4f5]">Potassium / Sodium Balance:</strong>{' '}
                    {plan.diet.potassiumSodiumBalance}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-0">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  4
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Practical Meal Ideas
                  </h3>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.diet.balancedMealIdeas.map((m, i) => (
                      <li key={i}>• {m}</li>
                    ))}
                  </ul>
                  <p className="pt-2 text-xs text-[#8e8e95]">{plan.diet.safetyNote}</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {activeStep.key === 'EXERCISES' && (
          <div className="space-y-7">
            <h2 className="text-xl font-medium tracking-tight text-[#f4f4f5]">
              Step 4 — Training, Cardio &amp; Neck Posture Protocol
            </h2>

            <ol className="max-w-3xl">
              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Cardio, Walking &amp; Running
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.exercises.cardioPlan}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Resistance Training
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                    {plan.exercises.resistancePlan}
                  </p>
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-0">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  3
                </div>
                <div className="flex-1 pt-0.5 space-y-2">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Jaw, Masseter &amp; Recovery Guidance
                  </h3>
                  <p className="text-sm leading-relaxed text-[#d4d4d8]">
                    {plan.exercises.jawAndMasseterGuidance}
                  </p>
                  <p className="text-xs text-[#9e9ea6]">
                    <strong className="text-[#e4e4e7]">Recovery &amp; Schedule:</strong>{' '}
                    {plan.exercises.recoveryAndSchedule}
                  </p>
                </div>
              </li>
            </ol>

            {/* Neck & Posture Exercises — Horizontal Numbered Grid (1 to 4) */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-medium text-[#f4f4f5]">
                Neck &amp; Posture Exercises (Sets, Reps &amp; Safety)
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {plan.exercises.neckExercises.map((ex, i) => (
                  <div
                    key={i}
                    className="border-t border-white/12 pt-3 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-[11px] font-medium text-[#f4f4f5] tabular-nums">
                        {i + 1}
                      </span>
                      <h4 className="font-medium text-[#f4f4f5] leading-snug">
                        {ex.name}
                      </h4>
                    </div>
                    <p className="text-[11px] font-medium text-[#d4d4d8]">
                      {ex.setsReps}
                    </p>
                    <p className="leading-relaxed text-[#9e9ea6]">{ex.safetyCue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stepper Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-transparent px-5 py-2.5 text-xs font-medium text-[#f4f4f5] hover:border-white/35 disabled:opacity-35"
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
              onClick={onDiscussInChatbot}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discuss Plan in DARK TRIAD AI</span>
            </button>
          )}
        </div>
      </section>

      {/* Open Numbered Hair Framing Recommendation (No Outer Card, No Broken Preview Button) */}
      <section className="border-t border-white/12 pt-8 space-y-5">
        <div>
          <p className="text-xs font-medium text-[#9e9ea6]">
            Hair Framing Recommendation
          </p>
          <h2 className="mt-1 text-xl font-medium text-[#f4f4f5]">
            {plan.hairstyle.recommendedStyle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#a1a1aa]">
            {plan.hairstyle.whyItSuits}
          </p>
        </div>

        <ol className="max-w-3xl">
          <li className="relative flex gap-3.5 pb-6">
            <span
              aria-hidden="true"
              className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
            />
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              1
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="text-base font-medium text-[#f4f4f5]">
                Barber Specifications
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                {plan.hairstyle.barberInstructions}
              </p>
            </div>
          </li>

          <li className="relative flex gap-3.5 pb-6">
            {plan.hairstyle.alternativeStyles?.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
              />
            )}
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              2
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="text-base font-medium text-[#f4f4f5]">
                Daily Styling
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                {plan.hairstyle.stylingRoutine}
              </p>
            </div>
          </li>

          {plan.hairstyle.alternativeStyles?.length > 0 && (
            <li className="relative flex gap-3.5 pb-0">
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                3
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="text-base font-medium text-[#f4f4f5]">
                  Alternative Styles
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#a1a1aa]">
                  {plan.hairstyle.alternativeStyles.join(' · ')}
                </p>
              </div>
            </li>
          )}
        </ol>
      </section>
    </motion.div>
  );
}
