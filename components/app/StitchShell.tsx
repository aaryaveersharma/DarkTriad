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

function getViewOrderIndex(view: AppView): number {
  switch (view) {
    case 'dashboard':
    case 'results':
      return 0;
    case 'chatbot':
      return 1;
    case 'rankings':
      return 2;
    case 'improve':
      return 3;
    case 'profile':
      return 4;
    default:
      return 0;
  }
}

const VIEW_SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 32 : -32,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -28 : 28,
  }),
};

export function StitchShell({
  activeView,
  onNavigate,
  session,
  children,
}: StitchShellProps) {
  const isChat = activeView === 'chatbot';
  const [vvBox, setVvBox] = useState<{
    top: number;
    height: number;
    keyboardOffset: number;
  } | null>(null);

  const [prevView, setPrevView] = useState<AppView>(activeView);
  const [direction, setDirection] = useState<number>(1);

  if (activeView !== prevView) {
    const nextIdx = getViewOrderIndex(activeView);
    const prevIdx = getViewOrderIndex(prevView);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setPrevView(activeView);
  }

  const activeNavIndex = BOTTOM_NAV_ITEMS.findIndex(
    (item) =>
      activeView === item.key ||
      (item.key === 'dashboard' && activeView === 'results'),
  );

  // Lock document scroll & sync to visualViewport when in chatbot so mobile keyboard never pushes header or input bar
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
        const keyboardOffset = Math.max(
          0,
          Math.round(window.innerHeight - (vv.offsetTop + vv.height)),
        );
        setVvBox({
          top: Math.max(0, Math.round(vv.offsetTop)),
          height: Math.round(vv.height),
          keyboardOffset,
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

  const navBottomOffset = isChat && vvBox ? vvBox.keyboardOffset : 0;
  const chatContentHeight = vvBox
    ? `${Math.max(240, vvBox.height - 134)}px`
    : 'calc(100dvh - 134px)';

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
      className={`stitch-dark-bg flex flex-col overflow-x-clip ${
        isChat
          ? 'fixed inset-x-0 z-30 overflow-hidden overscroll-none'
          : 'min-h-screen'
      }`}
    >
      {/* Clean, Minimal Top Bar: Dark Triad wordmark + Single Profile Icon */}
      <header className="sticky top-0 z-40 h-[60px] shrink-0 border-b border-white/10 bg-[#121213]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
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

      {/* Directional horizontal slide switching across views (no vertical jumping) */}
      <main
        className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-3 sm:px-6 overflow-x-clip ${
          isChat ? 'min-h-0 flex flex-col pb-16 overflow-hidden' : 'pb-24'
        }`}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeView}
            custom={direction}
            variants={VIEW_SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
            style={isChat ? { height: chatContentHeight } : undefined}
            className={isChat ? 'flex flex-col overflow-hidden' : undefined}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar: Always fixed bottom so quick buttons stay anchored and slide strictly horizontally */}
      <nav
        aria-label="Primary dashboard navigation"
        style={navBottomOffset > 0 ? { bottom: `${navBottomOffset}px` } : undefined}
        className="fixed inset-x-0 bottom-0 z-40 h-14 border-t border-white/10 bg-[#121213]/92 backdrop-blur-xl"
      >
        <div className="relative mx-auto grid h-full max-w-5xl grid-cols-3 items-center px-6">
          {activeNavIndex !== -1 && (
            <motion.div
              aria-hidden="true"
              initial={false}
              animate={{ x: `${activeNavIndex * 100}%` }}
              transition={{ type: 'spring', stiffness: 440, damping: 34, mass: 0.85 }}
              className="pointer-events-none absolute inset-y-1.5 left-6 flex w-[calc((100%-3rem)/3)] items-center justify-center"
            >
              <div className="h-9 w-12 rounded-xl border border-white/18 bg-white/12" />
            </motion.div>
          )}

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
                className="relative z-10 mx-auto flex h-11 w-14 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <motion.span
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className={
                    isActive ? 'text-[#f4f4f5]' : 'text-[#8e8e95] hover:text-[#d4d4d8]'
                  }
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
