'use client';

import {
  ArrowLeft,
  Home,
  LayoutList,
  LogOut,
  Menu,
  MessageSquare,
  Sparkles,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';
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

const QUICK_ACTIONS: Array<{
  key: Extract<AppView, 'dashboard' | 'chatbot' | 'rankings' | 'improve' | 'profile'>;
  label: string;
  icon: typeof Home;
}> = [
  { key: 'dashboard', label: 'HOME', icon: Home },
  { key: 'chatbot', label: 'CHATBOT', icon: MessageSquare },
  { key: 'rankings', label: 'RANKINGS', icon: Trophy },
  { key: 'improve', label: 'IMPROVE', icon: Sparkles },
  { key: 'profile', label: 'PROFILE', icon: User },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : 'DT';

  return (
    <div className="stitch-dark-bg min-h-screen flex flex-col">
      {/* Stitch-inspired Dark Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121213]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Toggle workspace menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1b1b1e] text-[#f4f4f5] hover:bg-[#252529] transition-colors"
            >
              {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-lg sm:text-xl font-medium tracking-[-0.03em] text-[#f4f4f5] truncate">
                Dark Triad
              </span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-[#d4d4d8]">
                AI
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1b1b1e] px-3 py-1.5 text-xs font-medium text-[#e4e4e7] hover:bg-[#252529] transition-colors whitespace-nowrap"
            >
              <LayoutList className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span>Scans ({scanCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              title={session?.email ?? 'Local Session'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#27272a] text-[11px] font-semibold text-[#f4f4f5] hover:border-white/40 transition-colors"
            >
              {initials}
            </button>
          </div>
        </div>

        {/* Quick Actions Horizontal Bar (Exact Order: HOME · CHATBOT · RANKINGS · IMPROVE · PROFILE) */}
        <nav
          aria-label="Quick actions"
          className="border-t border-white/8 bg-[#141416]/90"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 no-scrollbar">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const isActive =
                activeView === action.key ||
                (action.key === 'dashboard' && activeView === 'results');
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => onNavigate(action.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.08em] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#f4f4f5] text-[#0a0a0a]'
                      : 'border border-white/12 bg-[#1c1c1f] text-[#d4d4d8] hover:border-white/25 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Slide-down Stitch Drawer Menu */}
        {drawerOpen && (
          <div className="border-t border-white/10 bg-[#17171a] px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-2">
              <p className="text-[11px] font-medium tracking-[0.1em] text-[#8e8e95] uppercase mb-1">
                Workspace Navigation
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {QUICK_ACTIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onNavigate(item.key);
                      }}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1f1f23] px-3.5 py-2.5 text-left text-xs font-medium text-[#f4f4f5] hover:bg-[#27272c]"
                    >
                      <Icon className="h-4 w-4 text-[#a1a1aa]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onNavigate('results');
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#1f1f23] px-3.5 py-2.5 text-left text-xs font-medium text-[#f4f4f5] hover:bg-[#27272c]"
                >
                  <LayoutList className="h-4 w-4 text-[#a1a1aa]" />
                  <span>CURRENT RATINGS</span>
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                {!session && onBackToLanding && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onBackToLanding();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-[#d4d4d8] hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Public Landing Page</span>
                  </button>
                )}
                {session && onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onLogout();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-3.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out ({session.email})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
