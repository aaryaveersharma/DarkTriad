'use client';

import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface TopNavProps {
  onTriggerScan: () => void;
}

export function TopNav({ onTriggerScan }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScanClick = () => {
    setMobileMenuOpen(false);
    onTriggerScan();
  };

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="glass-nav mx-auto flex max-w-5xl items-center justify-between gap-8 rounded-2xl px-4 py-2.5 sm:px-5">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center text-[#0a0a0a] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
        >
          <span className="font-design-society text-xl sm:text-[22px] font-medium leading-none text-[#0a0a0a] whitespace-nowrap shrink-0">
            Dark Triad
          </span>
        </a>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#0a0a0a]/75"
        >
          <a
            href="#camera-box"
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Scan
          </a>
          <a
            href="#showcase"
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Anatomy
          </a>
          <a
            href="#protocol"
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Protocol
          </a>
          <a
            href="#method"
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Method
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Drawer Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleScanClick}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#141414] px-4 py-2 text-xs font-medium text-[#f3f3f1] transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
          >
            <span>Get Ratings</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#0a0a0a]/15 text-[#0a0a0a] md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="glass-nav mx-auto mt-2 flex max-w-5xl flex-col gap-3 rounded-2xl p-4 md:hidden">
          <a
            href="#camera-box"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-sm font-medium text-[#0a0a0a]"
          >
            Scan
          </a>
          <a
            href="#showcase"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-sm font-medium text-[#0a0a0a]"
          >
            Anatomy
          </a>
          <a
            href="#protocol"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-sm font-medium text-[#0a0a0a]"
          >
            Protocol
          </a>
          <a
            href="#method"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-sm font-medium text-[#0a0a0a]"
          >
            Method
          </a>
          <button
            type="button"
            onClick={handleScanClick}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#141414] px-4 py-2.5 text-sm font-medium text-[#f3f3f1]"
          >
            <span>Get your ratings</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
