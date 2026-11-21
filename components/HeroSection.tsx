'use client';

import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { FaceAvatarsCluster } from './TriadEmblems';

interface HeroSectionProps {
  onGetRatingsClick: () => void;
}

export function HeroSection({ onGetRatingsClick }: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-4 pb-8 text-center sm:px-6 sm:pt-6 sm:pb-11"
    >
      {/* Main Heading: crisp uppercase slanted Pomelli style, no blur */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pomelli-display pomelli-slant uppercase text-[clamp(3.2rem,9vw,6.25rem)] leading-[0.94] text-[#0a0a0a]"
      >
        DARK TRIAD
      </motion.h1>

      {/* Sub-headline in DM Sans without inline male/female cutouts */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 max-w-2xl text-balance text-[clamp(1.5rem,3.3vw,2.65rem)] font-medium leading-[1.16] tracking-[-0.035em] text-[#0a0a0a]"
      >
        Helping Indians sharpen facial harmony, jawline balance, and presence
      </motion.p>

      {/* Bracketed Sub-line */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 text-[11px] sm:text-xs font-medium tracking-[0.12em] text-[#0a0a0a]/75"
      >
        [LIVE OPTICAL SCAN · SOUTH ASIAN CALIBRATION]
      </motion.p>

      {/* Primary CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6"
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
