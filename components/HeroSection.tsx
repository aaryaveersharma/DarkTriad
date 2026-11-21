'use client';

import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  FaceAvatarsCluster,
  TriadCrownCrest,
} from './TriadEmblems';

interface HeroSectionProps {
  onGetRatingsClick: () => void;
}

export function HeroSection({ onGetRatingsClick }: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-16 sm:pb-14"
    >
      {/* Top Pixel Crest (Design Society symmetry) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <TriadCrownCrest className="h-14 w-28 sm:h-16 sm:w-32 text-[#0a0a0a]" />
      </motion.div>

      {/* Bracketed Criteria Kicker */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 text-[11px] sm:text-xs font-medium tracking-[0.12em] text-[#0a0a0a]/80"
      >
        [CRITERIA : SYMMETRY, JAWLINE &amp; PRESENCE]
      </motion.p>

      {/* Main Heading: "Dark Triad" in Odysser style with blended top-edge blur */}
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 font-odysser text-[clamp(3.35rem,9vw,6.5rem)] leading-[0.94] text-[#0a0a0a]"
      >
        <span className="relative inline-block">
          <span className="odysser-blur-base block">Dark Triad</span>
          <span
            aria-hidden="true"
            className="odysser-blur-mid pointer-events-none absolute inset-0 block select-none"
          >
            Dark Triad
          </span>
          <span
            aria-hidden="true"
            className="odysser-blur-veil pointer-events-none absolute inset-0 block select-none"
          >
            Dark Triad
          </span>
        </span>
      </motion.h1>

      {/* Sub-headline in attached DM Sans tight-tracked editorial styling */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 max-w-2xl text-balance text-[clamp(1.5rem,3.3vw,2.65rem)] font-medium leading-[1.16] tracking-[-0.035em] text-[#0a0a0a]"
      >
        Helping Indians{' '}
        <span className="inline-flex align-middle mx-1">
          <img
            src="/images/indian_face_male_one_1795203435045.jpg"
            alt="Male facial structure study"
            referrerPolicy="no-referrer"
            className="h-7 w-10 sm:h-8 sm:w-12 rounded-md border border-[#0a0a0a]/25 object-cover object-top"
          />
        </span>{' '}
        sharpen facial harmony,{' '}
        <span className="inline-flex align-middle mx-1">
          <img
            src="/images/indian_face_female_two_1795203434734.jpg"
            alt="Female facial symmetry study"
            referrerPolicy="no-referrer"
            className="h-7 w-10 sm:h-8 sm:w-12 rounded-md border border-[#0a0a0a]/25 object-cover object-top"
          />
        </span>{' '}
        jawline balance, and presence
      </motion.p>

      {/* Bracketed Sub-line */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 text-[11px] sm:text-xs font-medium tracking-[0.12em] text-[#0a0a0a]/75"
      >
        [LIVE OPTICAL SCAN · SOUTH ASIAN CALIBRATION]
      </motion.p>

      {/* Mirrored Bottom Pixel Crest */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4"
      >
        <TriadCrownCrest className="h-12 w-24 sm:h-14 sm:w-28 rotate-180 text-[#0a0a0a]" />
      </motion.div>

      {/* Primary CTA Button: Attractive faces in circles + "Get your ratings" + Image 4 tactile dark pill */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8"
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
