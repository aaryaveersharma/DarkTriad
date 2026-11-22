'use client';

import {
  Home,
  MessageSquare,
  Trophy,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
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
  children,
}: StitchShellProps) {
  const isChat = activeView === 'chatbot';
  const [vvBox, setVvBox] = useState<{ top: number; height: number } | null>(null);

  // Strictly lock document scroll & sync to visualViewport when in chatbot so mobile keyboard / scroll never pushes header or input bar
  useEffect(() => {
    if (!isChat) {
      setVvBox(null);
      return;
    }

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    window.scrollTo(0, 0);

    const syncViewport = () => {
      window.scrollTo(0, 0);
      const vv = window.visualViewport;
      if (vv) {
        setVvBox({
          top: Math.max(0, Math.round(vv.offsetTop)),
          height: Math.round(vv.height),
        });
      }
    };

    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);

    return () => {
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [isChat]);

  return (
    <div
      style={
        isChat
          ? {
              top: vvBox ? `${vvBox.top}px` : 0,
              height: vvBox ? `${vvBox.height}px` : '100dvh',
            }
          : undefined
      }
      className={`stitch-dark-bg flex flex-col ${
        isChat
          ? 'fixed inset-x-0 z-30 overflow-hidden overscroll-none'
          : 'min-h-screen'
      }`}
    >
      {/* Clean, Minimal Top Bar: Dark Triad wordmark (without AI) + Single Profile Icon */}
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-[#121213]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span className="font-design-society text-xl sm:text-[22px] font-medium leading-none text-[#f4f4f5] whitespace-nowrap shrink-0">
              Dark Triad
            </span>
          </button>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              title={session?.email ? `Profile: ${session.email}` : 'Profile'}
              aria-label="Profile"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors shrink-0 ${
                activeView === 'profile'
                  ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                  : 'border-white/18 bg-[#1a1a1e] text-[#f4f4f5] hover:border-white/35 hover:bg-[#242429]'
              }`}
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Smooth animated view switching */}
      <main
        className={`mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 ${
          isChat
            ? 'min-h-0 flex flex-col pt-2 pb-1.5 overflow-hidden sm:pt-3'
            : 'pt-5 pb-24 sm:pt-7'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={isChat ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={isChat ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={isChat ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={isChat ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : undefined}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar (Pinned inside flex flow on chat, fixed bottom on scrollable pages) */}
      <nav
        aria-label="Primary dashboard navigation"
        className={`border-t border-white/10 bg-[#121213]/92 backdrop-blur-xl ${
          isChat ? 'shrink-0 z-40' : 'fixed inset-x-0 bottom-0 z-40'
        }`}
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
