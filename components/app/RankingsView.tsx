'use client';

import { Trophy } from 'lucide-react';

interface RankingsViewProps {
  onBackHome: () => void;
}

export function RankingsView({ onBackHome }: RankingsViewProps) {
  return (
    <div className="py-4 text-left max-w-2xl">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#1b1b1e]">
        <Trophy className="h-5 w-5 text-[#f4f4f5]" />
      </div>
      <p className="mt-5 text-xs font-medium tracking-[0.1em] text-[#9e9ea6] uppercase">
        DARK TRIAD AI · Community Benchmark
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
        Rankings Are Coming Soon
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#9e9ea6]">
        Verified opt-in progression benchmarks will be unlocked once cloud storage
        and identity verification are enabled. We do not publish synthetic leaderboards.
      </p>
      <button
        type="button"
        onClick={onBackHome}
        className="mt-6 rounded-full border border-white/20 bg-[#232327] px-5 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2d2d32]"
      >
        Return to Home
      </button>
    </div>
  );
}
