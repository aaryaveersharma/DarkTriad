'use client';

import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { FaceAvatarsCluster } from './TriadEmblems';

interface HeroSectionProps {
  onGetRatingsClick: () => void;
}

const BEFORE_IMAGE =
  '/assets/aistudio/file_0000000056b48208aa316170016496cf_9b540523.png';
const AFTER_IMAGE =
  '/assets/aistudio/file_000000003f4c8208a0a21b06553c34e0_8e8752ec.png';

export function HeroSection({ onGetRatingsClick }: HeroSectionProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(96, Math.max(4, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPos((p) => Math.max(4, p - 4));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPos((p) => Math.min(96, p + 4));
    }
  };

  const phaseState =
    sliderPos < 42 ? 'after' : sliderPos > 58 ? 'before' : 'split';

  return (
    <section
      id="top"
      className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-5 pb-8 text-center sm:px-6 sm:pt-7 sm:pb-12"
    >
      {/* Hero paragraph directly below navbar */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl text-balance text-[clamp(1.6rem,3.6vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.035em] text-[#0a0a0a]"
      >
        Helping Indians sharpen facial harmony, jawline balance, and presence
      </motion.h1>

      {/* Curved Before / After Glow-Up Comparison Box with <|> slider */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 w-full max-w-2xl"
      >
        <div
          ref={containerRef}
          role="slider"
          tabIndex={0}
          aria-label="Slide left or right to compare before and after glow-up"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPos)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="group relative aspect-[16/10] sm:aspect-[16/9] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[28px] sm:rounded-[34px] border border-[#0a0a0a]/15 bg-[#141414] shadow-[0_24px_56px_-26px_rgba(10,10,10,0.34)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
        >
          {/* Base Layer: AFTER (Glow-Up) */}
          <img
            src={AFTER_IMAGE}
            alt="After facial harmony and jawline refinement"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_22%]"
          />

          {/* Top-right AFTER badge anchored on the After side */}
          <span
            className={`pointer-events-none absolute top-3.5 right-3.5 z-10 rounded-full border border-white/25 bg-[#0a0a0a]/80 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#f3f3f1] backdrop-blur-md shadow-md transition-all duration-200 ${
              sliderPos > 80
                ? 'opacity-0 translate-x-1'
                : 'opacity-100 translate-x-0'
            }`}
          >
            AFTER
          </span>

          {/* Clipped Overlay Layer: BEFORE */}
          <div
            aria-hidden="true"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            className="pointer-events-none absolute inset-0"
          >
            <img
              src={BEFORE_IMAGE}
              alt="Before facial baseline"
              draggable={false}
              className="h-full w-full object-cover object-[50%_22%]"
            />

            {/* Top-left BEFORE badge clipped to the Before half */}
            <span
              className={`absolute top-3.5 left-3.5 rounded-full border border-white/25 bg-[#0a0a0a]/80 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#f3f3f1] backdrop-blur-md shadow-md transition-all duration-200 ${
                sliderPos < 20
                  ? 'opacity-0 -translate-x-1'
                  : 'opacity-100 translate-x-0'
              }`}
            >
              BEFORE
            </span>
          </div>

          {/* Subtle bottom vignette so transitioning text stays crystal clear */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
          />

          {/* Dynamic Transitioning Phase Text (Before <-> Glow-Up After) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3.5 z-20 flex justify-center px-3">
            <div className="relative h-7 min-w-[172px] overflow-hidden rounded-full border border-white/25 bg-[#0a0a0a]/85 px-3.5 backdrop-blur-md shadow-lg">
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-[0.11em] text-[#f3f3f1] uppercase transition-all duration-200 ${
                  phaseState === 'before'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-2'
                }`}
              >
                Before · Baseline
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-[0.11em] text-[#f3f3f1] uppercase transition-all duration-200 ${
                  phaseState === 'split'
                    ? 'opacity-100 translate-y-0'
                    : phaseState === 'after'
                      ? 'opacity-0 -translate-y-2'
                      : 'opacity-0 translate-y-2'
                }`}
              >
                Before ← Slide → After
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold tracking-[0.11em] text-[#f3f3f1] uppercase transition-all duration-200 ${
                  phaseState === 'after'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2'
                }`}
              >
                After · Glow-Up
              </span>
            </div>
          </div>

          {/* Vertical Divider Line + <|> Grab Handle */}
          <div
            aria-hidden="true"
            style={{ left: `${sliderPos}%` }}
            className="pointer-events-none absolute inset-y-0 z-30 -translate-x-1/2"
          >
            <div className="h-full w-[2px] bg-white/95 shadow-[0_0_12px_rgba(0,0,0,0.65)]" />
            <div
              className={`absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#0a0a0a]/25 bg-[#f3f3f1] text-[#0a0a0a] shadow-[0_6px_22px_rgba(0,0,0,0.45)] transition-transform duration-150 ${
                isDragging ? 'scale-110' : 'group-hover:scale-105'
              }`}
            >
              <ChevronLeft className="h-3.5 w-3.5 -mr-0.5 stroke-[2.4]" />
              <span className="h-3.5 w-[1.5px] rounded-full bg-[#0a0a0a]" />
              <ChevronRight className="h-3.5 w-3.5 -ml-0.5 stroke-[2.4]" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="mt-7"
      >
        <button
          type="button"
          onClick={onGetRatingsClick}
          className="tactile-cta group inline-flex items-center gap-3.5 rounded-full py-2.5 pl-3 pr-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
        >
          <FaceAvatarsCluster count={3} size="md" ringColor="ring-[#141414]" />
          <span className="text-sm sm:text-base font-medium tracking-tight text-[#f3f3f1] whitespace-nowrap">
            Get your ratings
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-[#f3f3f1] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </button>
      </motion.div>
    </section>
  );
}
