'use client';

import {
  ArrowLeft,
  Home,
  LayoutList,
  LogOut,
  MessageSquare,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppView, AuthSession } from '@/lib/types';

interface StitchShellProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  session: AuthSession | null;
  scanCount: number;
  onBackToLanding?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

const BOTTOM_NAV_ITEMS: Array<{
  key: Extract<AppView, 'dashboard' | 'chatbot' | 'rankings'>;
  label: string;
  icon: typeof Home;
}> = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'chatbot', label: 'DARK TRIAD AI', icon: MessageSquare },
  { key: 'rankings', label: 'Rankings', icon: Trophy },
];

export function StitchShell({
  activeView,
  onNavigate,
  session,
  scanCount,
  onBackToLanding,
  onLogout,
  children,
}: StitchShellProps) {
  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : 'DT';

  return (
    <div className="stitch-dark-bg min-h-screen flex flex-col">
      {/* Clean Single-Row Top Bar (No Hamburger Menu) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121213]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-baseline gap-2 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span className="font-design-society text-xl sm:text-[22px] font-medium leading-none text-[#f4f4f5] whitespace-nowrap shrink-0">
              Dark Triad
            </span>
            <span className="text-[11px] font-semibold tracking-[0.14em] text-[#a1a1aa] uppercase">
              AI
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('improve')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'improve'
                  ? 'bg-[#f4f4f5] text-[#0a0a0a]'
                  : 'border border-white/15 bg-[#1b1b1e] text-[#e4e4e7] hover:bg-[#252529]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Improve</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('results')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'results'
                  ? 'bg-[#f4f4f5] text-[#0a0a0a]'
                  : 'border border-white/15 bg-[#1b1b1e] text-[#e4e4e7] hover:bg-[#252529]'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Scans ({scanCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              title={session?.email ?? 'Profile & Settings'}
              aria-label="Profile"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors shrink-0 ${
                activeView === 'profile'
                  ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                  : 'border-white/20 bg-[#27272a] text-[#f4f4f5] hover:border-white/40'
              }`}
            >
              {initials}
            </button>

            {!session && onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                title="Back to landing page"
                aria-label="Back to landing page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#1b1b1e] text-[#d4d4d8] hover:text-white shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}

            {session && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Log out"
                aria-label="Log out"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#1b1b1e] text-[#d4d4d8] hover:text-white shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Smooth animated view switching */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:px-6 sm:pt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Navigation Bar (Icons Only: Home, Chatbot, Rankings) */}
      <nav
        aria-label="Primary dashboard navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#121213]/92 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-around px-6">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeView === item.key ||
              (item.key === 'dashboard' && activeView === 'results');

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex h-11 w-14 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active-bg"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-1 rounded-xl bg-white/12 border border-white/18"
                  />
                )}
                <motion.span
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative z-10 ${
                    isActive ? 'text-[#f4f4f5]' : 'text-[#8e8e95] hover:text-[#d4d4d8]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
