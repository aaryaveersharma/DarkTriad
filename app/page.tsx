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
import { getActiveSession, logoutLocalAccount } from '@/lib/storage/auth';
import {
  DataService,
  getOrCreateAnonymousOwnerId,
} from '@/lib/storage/dataService';
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
  autoTriggerHairstylePreview?: boolean;
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
    return () => {
      active = false;
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

  // Dark Stitch Workspace Views (Post-scan Results, Dashboard, Chatbot, Rankings, Improve, Profile)
  if (activeView !== 'landing') {
    return (
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
            onOpenChatbotWithPrompt={(mode, prompt) => {
              setChatLaunchConfig({ mode, prompt });
              setActiveView('chatbot');
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
            autoTriggerHairstylePreview={chatLaunchConfig?.autoTriggerHairstylePreview}
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
            onAskHairstylePreview={() => {
              setChatLaunchConfig({
                mode: 'HAIRSTYLE',
                autoTriggerHairstylePreview: true,
              });
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
    </div>
  );
}
