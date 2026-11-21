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
import { motion } from 'motion/react';
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
      <div className="py-8 max-w-xl">
        <h1 className="text-2xl font-medium tracking-tight text-[#f4f4f5]">
          No Facial Analysis Completed Yet
        </h1>
        <p className="mt-2 text-sm text-[#9e9ea6]">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10"
    >
      {/* Top-Left Direct Rating Score & Rubric Header */}
      <section className="space-y-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.08em] text-[#9e9ea6] uppercase">
              {result.faceShape}
            </p>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-medium tracking-tight text-[#f4f4f5] tabular-nums">
                {result.overallRating.toFixed(1)}
              </span>
              <span className="text-sm text-[#9e9ea6] tabular-nums">/ 10.0</span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-[#e4e4e7]">
                {result.pslTier}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#d4d4d8]">
              {result.summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-xs font-medium text-[#f4f4f5] hover:bg-white/6 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={onNewScan}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-xs font-medium text-[#f4f4f5] hover:bg-white/6 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New Scan</span>
            </button>
          </div>
        </div>

        {/* Open Skeletal & Lighting Factors */}
        <div className="grid gap-6 border-t border-white/10 pt-5 sm:grid-cols-2 text-xs">
          <div>
            <span className="block text-[11px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
              Skeletal vs Soft Tissue Separation
            </span>
            <p className="mt-1.5 leading-relaxed text-[#d4d4d8]">
              {result.skeletalVsSoftTissueSummary}
            </p>
          </div>
          <div>
            <span className="block text-[11px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
              Lighting &amp; Angle Factors
            </span>
            <p className="mt-1.5 leading-relaxed text-[#d4d4d8]">
              {result.lightingAndAngleNote}
            </p>
          </div>
        </div>

        {result.imageQualityWarning && (
          <div className="flex items-start gap-2.5 border-l-2 border-amber-400/60 pl-3.5 py-1 text-xs text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.imageQualityWarning}</span>
          </div>
        )}
      </section>

      {/* Numbered Architecture 1–4 */}
      <ol className="space-y-0">
        {/* 1. Anatomical Measurement Overlay */}
        <li className="relative flex gap-4 pb-10">
          <span
            aria-hidden="true"
            className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
          />
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
            1
          </div>

          <div className="min-w-0 flex-1 space-y-5 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-[0.1em] text-[#8e8e95] uppercase">
                  Anatomical Measurement Overlay
                </p>
                <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
                  Front Profile &amp; Side Profile Landmark Map
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowLines((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-[#f4f4f5] hover:bg-white/6 transition-colors"
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
                  Front · Eyes, eyebrows, facial height &amp; thirds, cheekbones, nose, lips &amp; jaw contour
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
                  Side · Nasal bridge &amp; projection, chin projection, ramus, gonial angle &amp; cervical neck line
                </p>
              </div>
            </div>

            {/* Open Proportions Strip */}
            <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-5 text-xs">
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Facial Thirds (U/M/L)</span>
                <span className="mt-1 block font-medium text-[#f4f4f5] tabular-nums">
                  {Math.round(result.proportions.upperThirdPct)}% ·{' '}
                  {Math.round(result.proportions.middleThirdPct)}% ·{' '}
                  {Math.round(result.proportions.lowerThirdPct)}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Eye-to-Face Span</span>
                <span className="mt-1 block font-medium text-[#f4f4f5]">
                  {result.proportions.eyeToFaceRatio}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Lip-to-Nose Ratio</span>
                <span className="mt-1 block font-medium text-[#f4f4f5]">
                  {result.proportions.lipToNoseRatio}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Gonial Angle Est.</span>
                <span className="mt-1 block font-medium text-[#f4f4f5]">
                  {result.proportions.gonialAngleEstimate}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">fWHR Estimate</span>
                <span className="mt-1 block font-medium text-[#f4f4f5]">
                  {result.proportions.facialWidthToHeightEstimate}
                </span>
              </div>
            </div>
          </div>
        </li>

        {/* 2. Core Characteristics & Cervical Posture */}
        <li className="relative flex gap-4 pb-10">
          <span
            aria-hidden="true"
            className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
          />
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
            2
          </div>

          <div className="min-w-0 flex-1 space-y-5 pt-0.5">
            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] text-[#8e8e95] uppercase">
                Structural Sub-Scores
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
                Core Characteristics &amp; Symmetry
              </h2>
            </div>

            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 border-t border-white/10 pt-5">
              {result.subScores.map((item) => (
                <div key={item.label} className="space-y-1.5 border-b border-white/8 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                        {item.tissueType}
                      </span>
                      <h3 className="mt-0.5 text-sm font-medium text-[#f4f4f5]">
                        {item.label}
                      </h3>
                    </div>
                    <span className="text-lg font-medium text-[#f4f4f5] tabular-nums">
                      {item.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#a1a1aa]">
                    {item.observation}
                  </p>
                </div>
              ))}

              <div className="space-y-1.5 border-b border-white/8 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                      Posture &amp; Cervical Line
                    </span>
                    <h3 className="mt-0.5 text-sm font-medium text-[#f4f4f5]">
                      {result.postureRating.neckAlignment}
                    </h3>
                  </div>
                  <span className="text-lg font-medium text-[#f4f4f5] tabular-nums">
                    {result.postureRating.score.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#a1a1aa]">
                  {result.postureRating.observation}
                </p>
              </div>
            </div>
          </div>
        </li>

        {/* 3. Comprehensive 15-Category Technical PSL Breakdown */}
        <li className="relative flex gap-4 pb-10">
          <span
            aria-hidden="true"
            className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
          />
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
            3
          </div>

          <div className="min-w-0 flex-1 space-y-5 pt-0.5">
            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] text-[#8e8e95] uppercase">
                Technical Breakdown
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
                Comprehensive PSL Structural Assessment
              </h2>
            </div>

            <ol className="border-t border-white/10">
              {result.categories.map((cat, idx) => {
                const isOpen = expandedCatId === cat.id;
                const isLast = idx === result.categories.length - 1;
                return (
                  <li
                    key={cat.id}
                    className={`relative flex gap-3.5 ${
                      isLast ? 'pt-4 pb-2' : 'py-4 border-b border-white/8'
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/18 text-[11px] font-medium text-[#a1a1aa] tabular-nums">
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setExpandedCatId(isOpen ? null : cat.id)}
                        className="flex w-full items-start justify-between gap-4 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium text-[#f4f4f5]">
                              {cat.title}
                            </h3>
                            {cat.classification && (
                              <span className="text-[11px] text-[#9e9ea6]">
                                · {cat.classification}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[#a1a1aa]">
                            {cat.assessment}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
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
                        <div className="mt-4 space-y-4 border-t border-white/8 pt-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                              Technical Explanation
                            </span>
                            <p className="mt-1 leading-relaxed text-[#d4d4d8]">
                              {cat.technicalExplanation}
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <span className="block text-[10px] font-semibold tracking-[0.08em] text-emerald-300 uppercase">
                                Strengths
                              </span>
                              <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                                {cat.strengths.map((s, i) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold tracking-[0.08em] text-amber-300 uppercase">
                                Weaknesses / Limits
                              </span>
                              <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                                {cat.weaknesses.map((w, i) => (
                                  <li key={i}>• {w}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold tracking-[0.08em] text-sky-300 uppercase">
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
          </div>
        </li>

        {/* 4. Next Step Improvement Plan CTA */}
        <li className="relative flex gap-4">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
            4
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11px] font-medium tracking-[0.1em] text-[#8e8e95] uppercase">
              Personalized 4-Step Protocol
            </p>
            <h3 className="mt-1 text-2xl font-medium tracking-tight text-[#f4f4f5]">
              Ready to turn your analysis into daily execution?
            </h3>
            <button
              type="button"
              onClick={onDiscoverImprovementPlan}
              className="mt-4 inline-flex items-center gap-3 rounded-full bg-[#f4f4f5] px-7 py-3.5 text-sm font-medium text-[#0a0a0a] hover:opacity-95 transition-opacity"
            >
              <span>Discover Improvement Plan</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-4 max-w-xl text-[11px] leading-relaxed text-[#7c7c84]">
              {result.disclaimerNote ||
                'PSL is a community-derived aesthetic framework, not a clinical or scientific measure of human worth. Photographic measurements reflect visible geometry under current lighting and lens angle.'}
            </p>
          </div>
        </li>
      </ol>
    </motion.div>
  );
}
