'use client';

import { ArrowUpRight, BarChart3, Bot, Menu, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { AppView } from '@/lib/types';

interface TopNavProps {
  onTriggerScan: () => void;
  onNavigateView: (view: AppView) => void;
}

export function TopNav({ onTriggerScan, onNavigateView }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScanClick = () => {
    setMenuOpen(false);
    onTriggerScan();
  };

  const handleNavClick = (view: AppView) => {
    setMenuOpen(false);
    onNavigateView(view);
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

        {/* Zone 2: Desktop Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#0a0a0a]/75"
        >
          <button
            type="button"
            onClick={() => onNavigateView('dashboard')}
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 bg-transparent border-none cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('chatbot')}
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 bg-transparent border-none cursor-pointer"
          >
            Chatbot Support
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('profile')}
            className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 bg-transparent border-none cursor-pointer"
          >
            Profile
          </button>
        </nav>

        {/* Zone 3: Get Ratings + Menu Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleScanClick}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#141414] px-4 py-2 text-xs font-medium text-[#f3f3f1] transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
          >
            <span>Get your ratings</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#0a0a0a]/15 text-[#0a0a0a] md:hidden bg-transparent cursor-pointer"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Silky smooth GPU-composited slide-down menu drawer for mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.985 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top center' }}
            className="absolute inset-x-4 top-full z-50 sm:inset-x-6 md:hidden"
          >
            <div className="glass-nav mx-auto mt-2 flex max-w-5xl flex-col gap-1.5 rounded-2xl p-4 shadow-[0_24px_48px_-16px_rgba(10,10,10,0.28)] border border-[#0a0a0a]/15 bg-[#e8e8e5]/95 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#0a0a0a] hover:bg-black/5 transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-[#0a0a0a]/70" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('chatbot')}
                className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#0a0a0a] hover:bg-black/5 transition-colors"
              >
                <Bot className="h-4 w-4 text-[#0a0a0a]/70" />
                <span>Chatbot Support</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#0a0a0a] hover:bg-black/5 transition-colors"
              >
                <User className="h-4 w-4 text-[#0a0a0a]/70" />
                <span>Profile</span>
              </button>

              <div className="my-1 border-t border-[#0a0a0a]/10" />

              <button
                type="button"
                onClick={handleScanClick}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#141414] px-4 py-3 text-sm font-medium text-[#f3f3f1] shadow-md"
              >
                <span>Get your ratings</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
