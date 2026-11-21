'use client';

import {
  Home,
  LayoutList,
  MessageSquare,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppView, AuthSession } from '@/lib/types';

interface StitchShellProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  session: AuthSession | null;
  scanCount: number;
  children: React.ReactNode;
}

const BOTTOM_NAV_ITEMS: Array<{
  key: Extract<AppView, 'dashboard' | 'chatbot' | 'rankings'>;
  ariaLabel: string;
  icon: typeof Home;
}> = [
  { key: 'dashboard', ariaLabel: 'Home', icon: Home },
  { key: 'chatbot', ariaLabel: 'DARK TRIAD AI Chatbot', icon: MessageSquare },
  { key: 'rankings', ariaLabel: 'Rankings', icon: Trophy },
];

export function StitchShell({
  activeView,
  onNavigate,
  session,
  scanCount,
  children,
}: StitchShellProps) {
  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : 'DT';

  const isBottomActive = (key: 'dashboard' | 'chatbot' | 'rankings') =>
    activeView === key || (key === 'dashboard' && activeView === 'results');

  return (
    <div className="stitch-dark-bg min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121213]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-left min-w-0"
          >
            <span className="text-base sm:text-lg font-medium tracking-[-0.02em] text-[#f4f4f5] whitespace-nowrap">
              DARK TRIAD AI
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'results'
                  ? 'border-white/40 bg-white/12 text-white'
                  : 'border-white/14 bg-transparent text-[#d4d4d8] hover:border-white/28 hover:text-white'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span className="tabular-nums">Scans ({scanCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('improve')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'improve'
                  ? 'border-white/40 bg-white/12 text-white'
                  : 'border-white/14 bg-transparent text-[#d4d4d8] hover:border-white/28 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span>Improve</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="Profile & Account"
              title={session?.email ?? 'Profile'}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                activeView === 'profile'
                  ? 'border-white bg-[#f4f4f5] text-[#0a0a0a]'
                  : 'border-white/20 bg-white/6 text-[#f4f4f5] hover:border-white/40'
              }`}
            >
              {session?.email ? initials : <User className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:px-6 sm:pt-7 sm:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Icon-Only Navigation Bar (Home · Chatbot · Rankings) */}
      <nav
        aria-label="Primary bottom navigation"
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
      >
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-[#18181b]/92 p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isBottomActive(item.key);
            return (
              <motion.button
                key={item.key}
                type="button"
                aria-label={item.ariaLabel}
                title={item.ariaLabel}
                whileTap={{ scale: 0.92 }}
                onClick={() => onNavigate(item.key)}
                className={`relative flex h-11 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? 'text-[#0a0a0a]' : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottomNavActivePill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-[#f4f4f5]"
                  />
                )}
                <Icon className="relative z-10 h-5 w-5" />
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
