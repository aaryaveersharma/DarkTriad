'use client';

import { ArrowUpRight } from 'lucide-react';
import { FaceAvatarsCluster } from './TriadEmblems';

interface BottomSectionProps {
  onGetRatingsClick: () => void;
}

export function BottomSection({
  onGetRatingsClick,
}: BottomSectionProps) {
  return (
    <footer className="mx-auto max-w-5xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12 sm:pb-6">
      {/* Odysser-inspired CTA box (Image 3) with faces in circles + "Get your ratings" */}
      <div className="rounded-[32px] border border-[#0a0a0a]/15 bg-[#e6e6e3] p-7 sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0a0a0a]">
              Ready for an honest structural read?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#3f3f3c]">
              Launch the camera box above to receive your four-pillar rating and a
              practical protocol built around your features.
            </p>
          </div>

          <button
            type="button"
            onClick={onGetRatingsClick}
            className="tactile-cta group inline-flex items-center justify-between gap-4 self-start rounded-full py-2.5 pl-3 pr-2.5 md:self-auto focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
          >
            <FaceAvatarsCluster count={2} size="md" ringColor="ring-[#141414]" />
            <div className="text-left">
              <span className="block text-sm font-medium text-[#f3f3f1] whitespace-nowrap">
                Get your ratings
              </span>
              <span className="block text-[11px] text-[#f3f3f1]/65 whitespace-nowrap">
                Instant camera facial scan
              </span>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-[#f3f3f1] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Large crisp pixel wordmark aligned left without blur */}
      <div className="mt-14 overflow-hidden border-b border-[#0a0a0a]/12 pb-8 text-left">
        <div className="font-design-society text-[clamp(3.25rem,11.5vw,8.25rem)] leading-[0.95] text-[#0a0a0a]">
          Dark Triad
        </div>
      </div>

      {/* Quiet 3-column footer */}
      <div className="mt-8 grid gap-6 text-xs text-[#3f3f3c] sm:grid-cols-3">
        <div className="space-y-1">
          <p className="font-medium text-[#0a0a0a]">Dark Triad</p>
          <p>Facial harmony &amp; grooming protocol for India.</p>
        </div>

        <div className="flex flex-col gap-2">
          <a href="#camera-box" className="hover:text-[#0a0a0a] transition-colors">
            Optical Scan
          </a>
          <a href="#showcase" className="hover:text-[#0a0a0a] transition-colors">
            What Dark Triad Does
          </a>
          <a href="#protocol" className="hover:text-[#0a0a0a] transition-colors">
            Protocol Pillars
          </a>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <p>Camera frames are analyzed on-demand and never stored.</p>
          <p className="font-medium text-[#0a0a0a]">Built for South Asian proportions</p>
        </div>
      </div>

      {/* Bottom of screen: All rights reserved + clickable By Aaryaveer Sharma */}
      <div className="mt-8 border-t border-[#0a0a0a]/10 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#3f3f3c]">
        <p>
          © 2026 Dark Triad. All rights reserved.{' '}
          <span>
            By{' '}
            <a
              href="https://aaryaveersharma.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0a0a0a] underline underline-offset-4 hover:opacity-75 transition-opacity"
            >
              Aaryaveer Sharma
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
