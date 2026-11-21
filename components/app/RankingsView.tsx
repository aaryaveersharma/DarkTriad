'use client';

import { Trophy } from 'lucide-react';

interface RankingsViewProps {
  onBackHome: () => void;
}

export function RankingsView({ onBackHome }: RankingsViewProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-white/12 bg-[#1a1a1d] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#232327]">
        <Trophy className="h-6 w-6 text-[#f4f4f5]" />
      </div>
      <p className="mt-5 text-[11px] font-medium tracking-[0.14em] text-[#9e9ea6] uppercase">
        Dark Triad AI · Community Benchmark
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
        RANKINGS ARE COMING SOON
      </h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-[#9e9ea6]">
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
