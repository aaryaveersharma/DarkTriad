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
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-8 text-center">
        <h1 className="text-2xl font-medium tracking-tight text-[#f4f4f5]">
          No Facial Analysis Completed Yet
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#9e9ea6]">
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

  const { result, frontPhoto, sidePhoto, createdAt } = record;
  const dateLabel = new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Top Score & Strict Rubric Header */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.1em] text-[#9e9ea6] uppercase">
              <span>{dateLabel}</span>
              <span>·</span>
              <span>{result.faceShape}</span>
              <span>·</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[#e4e4e7]">
                {result.overallConfidence} Confidence
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-medium tracking-tight text-[#f4f4f5] tabular-nums">
                {result.overallRating.toFixed(1)}
              </span>
              <span className="text-sm text-[#9e9ea6] tabular-nums">/ 10.0</span>
              <span className="rounded-full border border-white/15 bg-[#252529] px-3 py-1 text-xs font-medium text-[#f4f4f5]">
                {result.pslTier}
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
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#232327] px-4 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2d2d32]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={onNewScan}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#232327] px-4 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2d2d32]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New Scan</span>
            </button>
          </div>
        </div>

        {/* Quality / Lighting / Skeletal vs Soft Tissue notes */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[11px] font-medium tracking-[0.08em] text-[#9e9ea6] uppercase">
              Skeletal vs Soft Tissue Separation
            </span>
            <p className="mt-1.5 leading-relaxed text-[#d4d4d8]">
              {result.skeletalVsSoftTissueSummary}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[11px] font-medium tracking-[0.08em] text-[#9e9ea6] uppercase">
              Lighting &amp; Angle Factors
            </span>
            <p className="mt-1.5 leading-relaxed text-[#d4d4d8]">
              {result.lightingAndAngleNote}
            </p>
          </div>
        </div>

        {result.imageQualityWarning && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.imageQualityWarning}</span>
          </div>
        )}
      </div>

      {/* Front (Left) + Side (Right) Measurement Visualization */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
              Anatomical Measurement Overlay
            </p>
            <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
              Front Profile &amp; Side Profile Landmark Map
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowLines((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#232327] px-3.5 py-1.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2c2c31]"
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-5 items-start">
          <div className="space-y-2">
            <FrontMeasurementOverlay
              photo={frontPhoto}
              landmarks={result.frontLandmarks}
              showLines={showLines}
              darkTheme
            />
            <p className="text-xs text-[#9e9ea6]">
              Front · Outer eye corners, facial height &amp; thirds, cheekbones, jaw width, chin width &amp; contour
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

        {/* Proportions Summary Row */}
        <div className="grid gap-3 sm:grid-cols-5 rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs">
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

      {/* Core Sub-Scores + Posture */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.subScores.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/12 bg-[#1a1a1d] p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                  {item.tissueType} · {item.confidence} Conf.
                </span>
                <h3 className="mt-1 text-sm font-medium text-[#f4f4f5]">
                  {item.label}
                </h3>
              </div>
              <span className="text-xl font-medium text-[#f4f4f5] tabular-nums">
                {item.score.toFixed(1)}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#a1a1aa]">
              {item.observation}
            </p>
          </div>
        ))}

        <div className="rounded-2xl border border-white/12 bg-[#1a1a1d] p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                Posture &amp; Cervical Line
              </span>
              <h3 className="mt-1 text-sm font-medium text-[#f4f4f5]">
                {result.postureRating.neckAlignment}
              </h3>
            </div>
            <span className="text-xl font-medium text-[#f4f4f5] tabular-nums">
              {result.postureRating.score.toFixed(1)}
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-[#a1a1aa]">
            {result.postureRating.observation}
          </p>
        </div>
      </div>

      {/* Detailed 15-Category Technical PSL Assessment Report */}
      <div className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-5 sm:p-7 space-y-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
            Technical Breakdown
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
            Comprehensive PSL Structural Assessment
          </h2>
        </div>

        <div className="space-y-3">
          {result.categories.map((cat) => {
            const isOpen = expandedCatId === cat.id;
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/10 bg-[#141416] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCatId(isOpen ? null : cat.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-[#f4f4f5]">
                        {cat.title}
                      </h3>
                      {cat.classification && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-[#d4d4d8]">
                          {cat.classification}
                        </span>
                      )}
                      <span className="text-[10px] text-[#8e8e95]">
                        {cat.confidence} Confidence
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#a1a1aa] line-clamp-2">
                      {cat.assessment}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {typeof cat.score === 'number' && (
                      <span className="text-lg font-medium text-[#f4f4f5] tabular-nums">
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
                  <div className="border-t border-white/8 px-4 py-4 space-y-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                        Technical Explanation
                      </span>
                      <p className="mt-1 leading-relaxed text-[#d4d4d8]">
                        {cat.technicalExplanation}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/8 bg-[#1b1b1e] p-3">
                        <span className="block text-[10px] font-semibold tracking-[0.08em] text-emerald-300 uppercase">
                          Strengths
                        </span>
                        <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                          {cat.strengths.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#1b1b1e] p-3">
                        <span className="block text-[10px] font-semibold tracking-[0.08em] text-amber-300 uppercase">
                          Weaknesses / Limits
                        </span>
                        <ul className="mt-1.5 space-y-1 text-[#d4d4d8]">
                          {cat.weaknesses.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-[#1b1b1e] p-3">
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
            );
          })}
        </div>
      </div>

      {/* Prominent CTA to 4-Step Improvement System */}
      <div className="flex flex-col items-center justify-center rounded-[26px] border border-white/15 bg-[#1a1a1d] p-7 text-center">
        <p className="text-xs font-medium tracking-[0.1em] text-[#9e9ea6] uppercase">
          Next Step · Personalized 4-Step Protocol
        </p>
        <h3 className="mt-2 text-2xl font-medium tracking-tight text-[#f4f4f5]">
          Ready to turn your analysis into daily execution?
        </h3>
        <button
          type="button"
          onClick={onDiscoverImprovementPlan}
          className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f4f4f5] px-7 py-3.5 text-sm font-semibold tracking-[0.04em] text-[#0a0a0a] shadow-[0_0_0_5px_rgba(255,255,255,0.1)] hover:opacity-95 transition-opacity"
        >
          <span>DISCOVER YOUR IMPROVEMENT PLAN</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-5 max-w-xl text-[11px] leading-relaxed text-[#7c7c84]">
          {result.disclaimerNote ||
            'PSL is a community-derived aesthetic framework, not a clinical or scientific measure of human worth. Photographic measurements reflect visible geometry under current lighting and lens angle.'}
        </p>
      </div>
    </motion.div>
  );
}
