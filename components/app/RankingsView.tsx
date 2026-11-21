'use client';

import { Trophy } from 'lucide-react';

interface RankingsViewProps {
  onBackHome: () => void;
}

export function RankingsView({ onBackHome }: RankingsViewProps) {
  return (
    <div className="max-w-xl py-2 space-y-4 text-left">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#f4f4f5]">
        <Trophy className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-[#8e8e95] uppercase">
        DARK TRIAD AI · Community Benchmark
      </p>
      <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
        Rankings Are Coming Soon
      </h1>
      <p className="text-sm leading-relaxed text-[#9e9ea6]">
        Verified opt-in progression benchmarks will unlock once identity verification
        and calibrated community baselines are finalized. We never display synthetic
        leaderboards.
      </p>
      <div className="pt-2">
        <button
          type="button"
          onClick={onBackHome}
          className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-white/6 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
