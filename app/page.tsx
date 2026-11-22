'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSection } from '@/components/BottomSection';
import { CurvedCameraBox } from '@/components/CurvedCameraBox';
import { DesignSocietyShowcase } from '@/components/DesignSocietyShowcase';
import { HeroSection } from '@/components/HeroSection';
import { ProtocolPillars } from '@/components/ProtocolPillars';
import { TopNav } from '@/components/TopNav';
import { AuthModal } from '@/components/app/AuthModal';
import { ChatbotView } from '@/components/app/ChatbotView';
import { DashboardHomeView } from '@/components/app/DashboardHomeView';
import { ImprovementStepperView } from '@/components/app/ImprovementStepperView';
import { ProfileView } from '@/components/app/ProfileView';
import { RankingsView } from '@/components/app/RankingsView';
import { ResultsView } from '@/components/app/ResultsView';
import { StitchShell } from '@/components/app/StitchShell';
import {
  getActiveSession,
  logoutLocalAccount,
  updateSupabasePassword,
} from '@/lib/storage/auth';
import {
  DataService,
  getOrCreateAnonymousOwnerId,
  isRemoteSupabaseConfigured,
} from '@/lib/storage/dataService';
import { getSupabaseClient } from '@/lib/storage/supabaseClient';
import {
  AppView,
  AuthSession,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  PSLAnalysisResult,
  StoredPhoto,
  UserProfile,
} from '@/lib/types';

interface ChatLaunchConfig {
  mode: ChatMode;
  prompt?: string;
}

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ownerId, setOwnerId] = useState<string>('anon-init');
  const [activeView, setActiveView] = useState<AppView>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    ownerId: 'anon-init',
    name: '',
    age: null,
    gender: '',
    heightCm: null,
    weightKg: null,
    bodyFrame: '',
    dietaryPreferences: '',
    fitnessGoals: '',
    updatedAt: '',
  });
  const [analyses, setAnalyses] = useState<FacialAnalysisRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressEntry[]>([]);

  const [cameraTriggerCount, setCameraTriggerCount] = useState(0);
  const [isUpdatingSelfie, setIsUpdatingSelfie] = useState(false);
  const [chatLaunchConfig, setChatLaunchConfig] = useState<ChatLaunchConfig | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySaving, setRecoverySaving] = useState(false);

  const loadWorkspaceData = useCallback(async (targetOwnerId: string) => {
    const [loadedProfile, loadedAnalyses, loadedProgress] = await Promise.all([
      DataService.getProfile(targetOwnerId),
      DataService.getAnalyses(targetOwnerId),
      DataService.getDailyProgress(targetOwnerId),
    ]);
    setOwnerId(targetOwnerId);
    setProfile(loadedProfile);
    setAnalyses(loadedAnalyses);
    setDailyProgress(loadedProgress);
    setSelectedRecordId(
      loadedAnalyses.length > 0
        ? loadedAnalyses[loadedAnalyses.length - 1].id
        : null,
    );
  }, []);

  // Section 13: Automatically restore persistent logged-in users directly into Dashboard
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const activeSession = await getActiveSession();
        const resolvedOwner = activeSession
          ? activeSession.userId
          : getOrCreateAnonymousOwnerId();
        if (!active) return;

        if (activeSession) {
          await DataService.associateAnonymousData(
            activeSession.userId,
            activeSession.email,
          );
        }

        setSession(activeSession);
        await loadWorkspaceData(resolvedOwner);
        if (!active) return;

        if (activeSession) {
          setActiveView('dashboard');
        }
      } finally {
        if (active) setHydrated(true);
      }
    };
    void init();

    const supabase = isRemoteSupabaseConfigured() ? getSupabaseClient() : null;
    const subscription = supabase?.auth.onAuthStateChange((event, sbSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryOpen(true);
      } else if (event === 'SIGNED_IN' && sbSession?.user) {
        const nextSession: AuthSession = {
          userId: sbSession.user.id,
          email: sbSession.user.email ?? '',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(
            (sbSession.expires_at ?? Math.floor(Date.now() / 1000) + 86400) * 1000,
          ).toISOString(),
        };
        setSession(nextSession);
        void DataService.associateAnonymousData(nextSession.userId, nextSession.email).then(
          () => loadWorkspaceData(nextSession.userId),
        );
        setActiveView('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [loadWorkspaceData]);

  const scrollToAndOpenScanner = useCallback(() => {
    setActiveView('landing');
    window.setTimeout(() => {
      const box = document.getElementById('camera-box');
      if (box) {
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setCameraTriggerCount((c) => c + 1);
    }, 60);
  }, []);

  const handleGetRatingsClick = useCallback(() => {
    setIsUpdatingSelfie(false);
    const box = document.getElementById('camera-box');
    if (box) {
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCameraTriggerCount((c) => c + 1);
  }, []);

  // Section 12: Hero DASHBOARD button Cases A, B, C, D
  const handleDashboardClick = useCallback(() => {
    if (session) {
      setActiveView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setAuthModalOpen(true);
  }, [session]);

  const handleAuthenticated = useCallback(
    async (newSession: AuthSession) => {
      setAuthModalOpen(false);
      setSession(newSession);
      await DataService.associateAnonymousData(newSession.userId, newSession.email);
      await loadWorkspaceData(newSession.userId);
      setActiveView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [loadWorkspaceData],
  );

  const handleMoveForwardWithoutLogin = useCallback(() => {
    setAuthModalOpen(false);
    if (analyses.length > 0) {
      setActiveView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsUpdatingSelfie(false);
    scrollToAndOpenScanner();
  }, [analyses.length, scrollToAndOpenScanner]);

  const latestRecord = useMemo(
    () => (analyses.length > 0 ? analyses[analyses.length - 1] : null),
    [analyses],
  );

  const selectedRecord = useMemo(
    () =>
      analyses.find((r) => r.id === selectedRecordId) ?? latestRecord,
    [analyses, selectedRecordId, latestRecord],
  );

  const previousSummaryText = useMemo(() => {
    if (!latestRecord) return null;
    const r = latestRecord.result;
    return `Previous scan (${latestRecord.createdAt}): Overall ${r.overallRating}/10 (${r.pslTier}), face shape ${r.faceShape}, confidence ${r.overallConfidence}. Lighting/Angle note: ${r.lightingAndAngleNote}`;
  }, [latestRecord]);

  const handleAnalysisComplete = useCallback(
    async (
      frontPhoto: StoredPhoto,
      sidePhoto: StoredPhoto,
      result: PSLAnalysisResult,
    ) => {
      const targetOwner = DataService.resolveOwnerId(session);
      const record: FacialAnalysisRecord = {
        id: crypto.randomUUID(),
        ownerId: targetOwner,
        createdAt: new Date().toISOString(),
        frontPhoto,
        sidePhoto,
        result,
      };
      await DataService.saveAnalysis(record);
      const refreshed = await DataService.getAnalyses(targetOwner);
      setAnalyses(refreshed);
      setSelectedRecordId(record.id);
      setIsUpdatingSelfie(false);
      setActiveView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [session],
  );

  const handleUpdateSelfie = useCallback(() => {
    setIsUpdatingSelfie(true);
    scrollToAndOpenScanner();
  }, [scrollToAndOpenScanner]);

  const handleLogout = useCallback(async () => {
    await logoutLocalAccount();
    setSession(null);
    const anonId = getOrCreateAnonymousOwnerId();
    await loadWorkspaceData(anonId);
    setActiveView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadWorkspaceData]);

  // Prevent landing flash for logged-in users while verifying local IndexedDB session
  if (!hydrated) {
    return (
      <div className="stitch-dark-bg min-h-screen flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-white/60 animate-pulse" />
      </div>
    );
  }

  const handleSaveRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySaving(true);
    try {
      await updateSupabasePassword(recoveryNewPassword);
      setRecoveryNewPassword('');
      setPasswordRecoveryOpen(false);
      const activeSession = await getActiveSession();
      if (activeSession) {
        setSession(activeSession);
        await loadWorkspaceData(activeSession.userId);
        setActiveView('dashboard');
      }
    } catch (err) {
      setRecoveryError(
        err instanceof Error ? err.message : 'Unable to update password.',
      );
    } finally {
      setRecoverySaving(false);
    }
  };

  const recoveryModalNode = passwordRecoveryOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Set new password"
    >
      <form
        onSubmit={(e) => void handleSaveRecoveredPassword(e)}
        className="stitch-dark-bg w-full max-w-md rounded-[28px] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-4"
      >
        <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
          Dark Triad AI · Password Reset
        </p>
        <h2 className="text-xl font-medium tracking-[-0.02em] text-[#f4f4f5]">
          SET A NEW PASSWORD
        </h2>
        {recoveryError && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-200">
            {recoveryError}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#d4d4d8]">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={recoveryNewPassword}
            onChange={(e) => setRecoveryNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-white/15 bg-[#1a1a1d] px-3.5 py-2.5 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={recoverySaving}
            className="flex-1 rounded-full bg-[#f4f4f5] py-2.5 text-xs font-semibold text-[#0a0a0a] disabled:opacity-50"
          >
            {recoverySaving ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
          <button
            type="button"
            onClick={() => setPasswordRecoveryOpen(false)}
            className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-[#d4d4d8]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  ) : null;

  // Dark Stitch Workspace Views (Post-scan Results, Dashboard, Chatbot, Rankings, Improve, Profile)
  if (activeView !== 'landing') {
    return (
      <>
      <StitchShell
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        session={session}
        scanCount={analyses.length}
        onBackToLanding={() => {
          setIsUpdatingSelfie(false);
          setActiveView('landing');
        }}
        onLogout={() => void handleLogout()}
      >
        {activeView === 'results' && (
          <ResultsView
            record={selectedRecord}
            onDiscoverImprovementPlan={() => {
              setActiveView('improve');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenDashboard={() => {
              setActiveView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNewScan={handleUpdateSelfie}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardHomeView
            ownerId={ownerId}
            profile={profile}
            analyses={analyses}
            selectedRecord={selectedRecord}
            dailyProgress={dailyProgress}
            onSelectRecord={(id) => {
              setSelectedRecordId(id);
              setActiveView('results');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenResults={() => {
              setActiveView('results');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateSelfie={handleUpdateSelfie}
            onNavigate={(view) => {
              setActiveView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDailyProgressSaved={(entries) => setDailyProgress(entries)}
          />
        )}

        {activeView === 'chatbot' && (
          <ChatbotView
            ownerId={ownerId}
            profile={profile}
            latestRecord={selectedRecord}
            dailyProgress={dailyProgress}
            initialMode={chatLaunchConfig?.mode}
            initialPrompt={chatLaunchConfig?.prompt}
            onConsumedLaunchTrigger={() => setChatLaunchConfig(null)}
          />
        )}

        {activeView === 'rankings' && (
          <RankingsView
            onBackHome={() => {
              setActiveView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeView === 'improve' && (
          <ImprovementStepperView
            record={selectedRecord}
            onStartScan={handleUpdateSelfie}
            onDiscussInChatbot={() => {
              setChatLaunchConfig({ mode: 'GENERAL' });
              setActiveView('chatbot');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            profile={profile}
            session={session}
            onProfileSaved={(updated) => setProfile(updated)}
            onAccountLinked={(newSession) => {
              setSession(newSession);
              void loadWorkspaceData(newSession.userId);
            }}
            onLogout={() => void handleLogout()}
          />
        )}
      </StitchShell>
      {recoveryModalNode}
      </>
    );
  }

  // Public Landing Page (Preserves existing design system, copy, Before/After slider, Showcase & Pillars)
  return (
    <div className="relative min-h-screen">
      <TopNav onTriggerScan={handleGetRatingsClick} />

      <main>
        <HeroSection
          onGetRatingsClick={handleGetRatingsClick}
          onDashboardClick={handleDashboardClick}
        />
        <CurvedCameraBox
          externalTriggerCount={cameraTriggerCount}
          profile={profile}
          previousAnalysisSummary={previousSummaryText}
          isUpdatingSelfie={isUpdatingSelfie}
          onCancelUpdate={() => {
            setIsUpdatingSelfie(false);
            setActiveView('dashboard');
          }}
          onAnalysisComplete={(front, side, result) =>
            void handleAnalysisComplete(front, side, result)
          }
        />
        <DesignSocietyShowcase />
        <ProtocolPillars />
      </main>

      <BottomSection onGetRatingsClick={handleGetRatingsClick} />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(newSession) => void handleAuthenticated(newSession)}
        onMoveForwardWithoutLogin={handleMoveForwardWithoutLogin}
        hasLocalScans={analyses.length > 0}
      />
      {recoveryModalNode}
    </div>
  );
}
