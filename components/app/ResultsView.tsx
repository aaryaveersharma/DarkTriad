'use client';

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { FacialAnalysisRecord } from '@/lib/types';
import {
  FrontMeasurementOverlay,
  SideMeasurementOverlay,
} from './FacialMeasurementOverlay';

interface ResultsViewProps {
  record: FacialAnalysisRecord | null;
  onDiscoverImprovementPlan: () => void;
  onOpenDashboard: () => void;
  onNewScan: () => void;
}

export function ResultsView({
  record,
  onDiscoverImprovementPlan,
  onOpenDashboard,
  onNewScan,
}: ResultsViewProps) {
  const [showLines, setShowLines] = useState(true);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  if (!record) {
    return (
      <div className="py-6 text-left">
        <h1 className="text-2xl font-medium tracking-tight text-[#f4f4f5]">
          No Facial Analysis Completed Yet
        </h1>
        <p className="mt-2 max-w-md text-sm text-[#9e9ea6]">
          Upload or capture both your front and side profile photographs to generate
          your strict PSL structural breakdown and landmark map.
        </p>
        <button
          type="button"
          onClick={onNewScan}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-3 text-sm font-medium text-[#0a0a0a]"
        >
          <span>Start Facial Scan</span>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const { result, frontPhoto, sidePhoto } = record;

  const assessmentPoints = [
    {
      number: '1',
      title: 'Skeletal Assessment',
      body: result.skeletalVsSoftTissueSummary,
    },
    {
      number: '2',
      title: 'Soft Tissue Assessment',
      body: result.improvementPlan?.feedback?.bloatingPuffinessNotes || result.summary,
    },
    {
      number: '3',
      title: 'Lighting and Angle Factors',
      body: result.lightingAndAngleNote,
    },
  ];

  const proportionItems = [
    {
      number: '1',
      label: 'Facial Thirds (Upper / Middle / Lower)',
      value: `${Math.round(result.proportions.upperThirdPct)}% · ${Math.round(result.proportions.middleThirdPct)}% · ${Math.round(result.proportions.lowerThirdPct)}%`,
    },
    {
      number: '2',
      label: 'Eye-to-Eye Span',
      value: result.proportions.eyeToFaceRatio,
    },
    {
      number: '3',
      label: 'Lip-to-Nose Ratio',
      value: result.proportions.lipToNoseRatio,
    },
    {
      number: '4',
      label: 'Gonial Angle Estimate',
      value: result.proportions.gonialAngleEstimate,
    },
    {
      number: '5',
      label: 'Facial Width-to-Height Ratio',
      value: result.proportions.facialWidthToHeightEstimate,
    },
  ];

  return (
    <div className="space-y-10 text-left">
      {/* Top-Left Open Score & Summary (No Date, No Confidence Pill, No Outer Card) */}
      <section className="space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.06em] text-[#9e9ea6]">
              {result.faceShape}
            </p>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-medium tracking-tight text-[#f4f4f5] tabular-nums">
                {result.overallRating.toFixed(1)}
              </span>
              <span className="text-sm text-[#9e9ea6] tabular-nums">/ 10.0</span>
              <span className="text-sm font-medium text-[#d4d4d8]">
                · {result.pslTier}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d4d4d8]">
              {result.summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1e1e22] px-4 py-2 text-xs font-medium text-[#f4f4f5] hover:bg-[#28282d]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={onNewScan}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1e1e22] px-4 py-2 text-xs font-medium text-[#f4f4f5] hover:bg-[#28282d]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New Scan</span>
            </button>
          </div>
        </div>

        {result.imageQualityWarning && (
          <div className="flex items-start gap-2.5 border-t border-white/10 pt-4 text-xs text-[#a1a1aa]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.imageQualityWarning}</span>
          </div>
        )}
      </section>

      {/* Numbered Skeletal, Soft Tissue, and Lighting Assessment */}
      <section className="border-t border-white/12 pt-8">
        <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
          Structural &amp; Tissue Assessment
        </h2>

        <ol className="mt-6 max-w-3xl">
          {assessmentPoints.map((item, idx) => {
            const isLast = idx === assessmentPoints.length - 1;
            return (
              <li
                key={item.number}
                className={`relative flex gap-3.5 ${isLast ? 'pb-0' : 'pb-7'}`}
              >
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                  />
                )}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  {item.number}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-base font-medium text-[#f4f4f5]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa]">
                    {item.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Front & Side Anatomical Measurement Overlay (Open Layout, Side-by-Side) */}
      <section className="border-t border-white/12 pt-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
              Front Profile &amp; Side Profile Landmark Map
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowLines((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-[#1e1e22] px-3.5 py-1.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#28282d]"
          >
            {showLines ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Hide Measurement Lines</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Show Measurement Lines</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 items-start">
          <div className="space-y-2">
            <FrontMeasurementOverlay
              photo={frontPhoto}
              landmarks={result.frontLandmarks}
              showLines={showLines}
              darkTheme
            />
            <p className="text-xs text-[#9e9ea6]">
              Front · Outer Eye Corner, facial measurements, Facial Thirds, cheekbones, lips &amp; jawline
            </p>
          </div>

          <div className="space-y-2">
            <SideMeasurementOverlay
              photo={sidePhoto}
              landmarks={result.sideLandmarks}
              showLines={showLines}
              darkTheme
            />
            <p className="text-xs text-[#9e9ea6]">
              Side · Forehead, nasal projection, lip &amp; chin projection, jaw angle &amp; cervical neck line
            </p>
          </div>
        </div>

        {/* Facial Proportions — Open Numbered Layout */}
        <div className="pt-4">
          <h3 className="text-base font-medium text-[#f4f4f5]">
            Facial Proportions
          </h3>
          <ol className="mt-4 max-w-2xl">
            {proportionItems.map((prop, idx) => {
              const isLast = idx === proportionItems.length - 1;
              return (
                <li
                  key={prop.number}
                  className={`relative flex gap-3.5 ${isLast ? 'pb-0' : 'pb-5'}`}
                >
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                    />
                  )}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                    {prop.number}
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-0.5 flex-1 border-b border-white/8 pb-3">
                    <span className="text-sm text-[#d4d4d8]">{prop.label}</span>
                    <span className="text-sm font-medium text-[#f4f4f5] tabular-nums">
                      {prop.value}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Facial Characteristics (Core Sub-Scores + Posture — Numbered Open Layout) */}
      <section className="border-t border-white/12 pt-8">
        <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
          Facial Characteristics
        </h2>

        <ol className="mt-6 max-w-3xl">
          {[
            ...result.subScores.map((item) => ({
              title: item.label,
              subtitle: item.tissueType,
              score: item.score,
              observation: item.observation,
            })),
            {
              title: result.postureRating.neckAlignment,
              subtitle: 'Posture & Cervical Line',
              score: result.postureRating.score,
              observation: result.postureRating.observation,
            },
          ].map((item, idx, arr) => {
            const isLast = idx === arr.length - 1;
            return (
              <li
                key={`${item.title}-${idx}`}
                className={`relative flex gap-3.5 ${isLast ? 'pb-0' : 'pb-7'}`}
              >
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                  />
                )}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  {idx + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-base font-medium text-[#f4f4f5]">
                        {item.title}
                      </h3>
                      <span className="text-xs text-[#8e8e95]">{item.subtitle}</span>
                    </div>
                    <span className="text-lg font-medium text-[#f4f4f5] tabular-nums shrink-0">
                      {item.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa]">
                    {item.observation}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Comprehensive PSL Structural Assessment — Open Numbered Layout */}
      <section className="border-t border-white/12 pt-8">
        <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
          Comprehensive PSL Structural Assessment
        </h2>

        <ol className="mt-6 max-w-3xl">
          {result.categories.map((cat, idx) => {
            const isOpen = expandedCatId === cat.id;
            const isLast = idx === result.categories.length - 1;
            return (
              <li
                key={cat.id}
                className={`relative flex gap-3.5 ${isLast ? 'pb-0' : 'pb-6'}`}
              >
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                  />
                )}

                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  {idx + 1}
                </div>

                <div className="flex-1 border-b border-white/10 pb-5">
                  <button
                    type="button"
                    onClick={() => setExpandedCatId(isOpen ? null : cat.id)}
                    className="flex w-full items-start justify-between gap-4 text-left hover:opacity-90 transition-opacity"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-base font-medium text-[#f4f4f5]">
                          {cat.title}
                        </h3>
                        {cat.classification && (
                          <span className="text-xs text-[#8e8e95]">
                            · {cat.classification}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#a1a1aa]">{cat.assessment}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                      {typeof cat.score === 'number' && (
                        <span className="text-base font-medium text-[#f4f4f5] tabular-nums">
                          {cat.score.toFixed(1)}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#8e8e95]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#8e8e95]" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-4 border-t border-white/10 pt-4 text-xs">
                      <div>
                        <span className="block font-medium text-[#9e9ea6]">
                          Technical Explanation
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-[#d4d4d8]">
                          {cat.technicalExplanation}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <span className="block font-semibold text-emerald-300">
                            Strengths
                          </span>
                          <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                            {cat.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="block font-semibold text-amber-300">
                            Weaknesses &amp; Limits
                          </span>
                          <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                            {cat.weaknesses.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="block font-semibold text-sky-300">
                            Realistic Improvements
                          </span>
                          <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                            {cat.realisticImprovements.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Open Ready to Transform CTA Section */}
      <section className="border-t border-white/12 pt-8 pb-4 text-left">
        <p className="text-xs font-medium text-[#9e9ea6]">
          Next Step · Personalized 4-Step Protocol
        </p>
        <h3 className="mt-2 text-2xl font-medium tracking-tight text-[#f4f4f5]">
          Ready to turn your analysis into daily execution?
        </h3>
        <button
          type="button"
          onClick={onDiscoverImprovementPlan}
          className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f4f4f5] px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] shadow-[0_0_0_5px_rgba(255,255,255,0.1)] hover:opacity-95 transition-opacity"
        >
          <span>Discover Improvement Plan</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-5 max-w-xl text-[11px] leading-relaxed text-[#7c7c84]">
          {result.disclaimerNote ||
            'PSL is a community-derived aesthetic framework, not a clinical or scientific measure of human worth. Photographic measurements reflect visible geometry under current lighting and lens angle.'}
        </p>
      </section>
    </div>
  );
}
