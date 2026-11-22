'use client';

import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Eye,
  EyeOff,
  History,
  LayoutList,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataService } from '@/lib/storage/dataService';
import {
  AppView,
  DailyProgressEntry,
  FacialAnalysisRecord,
  PSLAnalysisResult,
  StoredPhoto,
  UserProfile,
} from '@/lib/types';
import { CurvedCameraBox } from '@/components/CurvedCameraBox';
import PixelCard from '@/components/PixelCard';
import {
  FrontMeasurementOverlay,
  SideMeasurementOverlay,
} from './FacialMeasurementOverlay';

interface DashboardHomeViewProps {
  ownerId: string;
  profile: UserProfile;
  analyses: FacialAnalysisRecord[];
  selectedRecord: FacialAnalysisRecord | null;
  dailyProgress: DailyProgressEntry[];
  onSelectRecord: (recordId: string) => void;
  onOpenResults: () => void;
  onUpdateSelfie: () => void;
  onNavigate: (view: AppView) => void;
  onDailyProgressSaved: (entries: DailyProgressEntry[]) => void;
  onAnalysisComplete?: (
    frontPhoto: StoredPhoto,
    sidePhoto: StoredPhoto,
    result: PSLAnalysisResult,
  ) => void;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function computeStats(entries: DailyProgressEntry[]) {
  if (entries.length === 0) return null;
  const count = entries.length;
  const totalWater = entries.reduce((acc, e) => acc + (Number(e.waterLitres) || 0), 0);
  const totalSleep = entries.reduce((acc, e) => acc + (Number(e.sleepHours) || 0), 0);
  const totalCalories = entries.reduce((acc, e) => acc + (Number(e.caloriesConsumed) || 0), 0);
  const exerciseDays = entries.filter((e) => e.exercised).length;
  const skincareDays = entries.filter((e) => e.skincareCompleted).length;
  const dietDays = entries.filter((e) => e.dietFollowed).length;

  return {
    daysLogged: count,
    avgWater: (totalWater / count).toFixed(1),
    avgSleep: (totalSleep / count).toFixed(1),
    avgCalories: Math.round(totalCalories / count),
    exercisePct: Math.round((exerciseDays / count) * 100),
    skincarePct: Math.round((skincareDays / count) * 100),
    dietPct: Math.round((dietDays / count) * 100),
  };
}

export function DashboardHomeView({
  ownerId,
  profile,
  analyses,
  selectedRecord,
  dailyProgress,
  onSelectRecord,
  onOpenResults,
  onUpdateSelfie,
  onNavigate,
  onDailyProgressSaved,
  onAnalysisComplete,
}: DashboardHomeViewProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const ratingsSectionRef = useRef<HTMLElement | null>(null);

  const [showOverlayLines, setShowOverlayLines] = useState(true);
  const [cameraTriggerCount, setCameraTriggerCount] = useState(0);

  const latestRecord = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const activeRecord = selectedRecord ?? latestRecord;
  const previousRecord =
    analyses.length > 1 ? analyses[analyses.length - 2] : null;

  const todayDate = getTodayDateString();
  const existingToday = useMemo(
    () => dailyProgress.find((d) => d.date === todayDate) ?? null,
    [dailyProgress, todayDate],
  );

  const [waterLitres, setWaterLitres] = useState<string>(
    existingToday ? String(existingToday.waterLitres) : '',
  );
  const [exercised, setExercised] = useState<boolean>(
    existingToday ? existingToday.exercised : false,
  );
  const [caloriesConsumed, setCaloriesConsumed] = useState<string>(
    existingToday ? String(existingToday.caloriesConsumed) : '',
  );
  const [sleepHours, setSleepHours] = useState<string>(
    existingToday ? String(existingToday.sleepHours) : '',
  );
  const [skincareCompleted, setSkincareCompleted] = useState<boolean>(
    existingToday ? existingToday.skincareCompleted : false,
  );
  const [dietFollowed, setDietFollowed] = useState<boolean>(
    existingToday ? existingToday.dietFollowed : false,
  );
  const [trackerSaved, setTrackerSaved] = useState(false);
  const [trackerTab, setTrackerTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (existingToday) {
      setWaterLitres(String(existingToday.waterLitres));
      setExercised(existingToday.exercised);
      setCaloriesConsumed(String(existingToday.caloriesConsumed));
      setSleepHours(String(existingToday.sleepHours));
      setSkincareCompleted(existingToday.skincareCompleted);
      setDietFollowed(existingToday.dietFollowed);
    } else {
      setWaterLitres('');
      setExercised(false);
      setCaloriesConsumed('');
      setSleepHours('');
      setSkincareCompleted(false);
      setDietFollowed(false);
    }
  }, [existingToday, ownerId]);

  const handleSaveDailyTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: DailyProgressEntry = {
      id: `${ownerId}::${todayDate}`,
      ownerId,
      date: todayDate,
      waterLitres: Math.max(0, Number(waterLitres) || 0),
      exercised,
      caloriesConsumed: Math.max(0, Number(caloriesConsumed) || 0),
      sleepHours: Math.max(0, Number(sleepHours) || 0),
      skincareCompleted,
      dietFollowed,
      updatedAt: new Date().toISOString(),
    };
    await DataService.saveDailyProgress(entry);
    const updatedList = await DataService.getDailyProgress(ownerId);
    onDailyProgressSaved(updatedList);
    setTrackerSaved(true);
    window.setTimeout(() => setTrackerSaved(false), 3200);
  };

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  // Click handlers for top pills:
  // If new user (no scans), smoothly slide down to the selfie camera section so they understand they must take selfie first
  const handleTopUpdateSelfieClick = () => {
    if (!activeRecord) {
      ratingsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      setCameraTriggerCount((c) => c + 1);
      return;
    }
    onUpdateSelfie();
  };

  const handleTopCheckRatingsClick = () => {
    if (!activeRecord) {
      ratingsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    onOpenResults();
  };

  const firstScan = analyses.length > 0 ? analyses[0] : null;
  const weeksSinceStart = useMemo(() => {
    if (!firstScan || !latestRecord) return 0;
    const diffMs =
      new Date(latestRecord.createdAt).getTime() -
      new Date(firstScan.createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }, [firstScan, latestRecord]);

  const ratingDelta = useMemo(() => {
    if (!latestRecord || !previousRecord) return null;
    return Number(
      (latestRecord.result.overallRating - previousRecord.result.overallRating).toFixed(1),
    );
  }, [latestRecord, previousRecord]);

  const featureDeltas = useMemo(() => {
    if (!latestRecord || !previousRecord) return [];
    return latestRecord.result.subScores.map((curr) => {
      const prev = previousRecord.result.subScores.find(
        (p) => p.label.toLowerCase() === curr.label.toLowerCase(),
      );
      const diff = prev ? Number((curr.score - prev.score).toFixed(1)) : null;
      return {
        label: curr.label,
        current: curr.score,
        previous: prev?.score ?? null,
        diff,
      };
    });
  }, [latestRecord, previousRecord]);

  const weeklyStats = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return computeStats(
      dailyProgress.filter((d) => new Date(`${d.date}T12:00:00`).getTime() >= cutoff),
    );
  }, [dailyProgress]);

  const monthlyStats = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return computeStats(
      dailyProgress.filter((d) => new Date(`${d.date}T12:00:00`).getTime() >= cutoff),
    );
  }, [dailyProgress]);

  const FEATURE_CARDS: Array<{
    title: string;
    subtitle: string;
    tag: string;
    icon: typeof Sparkles;
    onClick: () => void;
  }> = [
    {
      title: 'DARK TRIAD AI Chatbot',
      subtitle: 'Ask anything synced with your scans, routines, and daily tracker',
      tag: 'AI CHAT',
      icon: MessageSquare,
      onClick: () => onNavigate('chatbot'),
    },
    {
      title: '4-Step Improve Plan',
      subtitle: 'Feedback, Skincare, Diet & Exercises tailored to your scan',
      tag: 'PROTOCOL',
      icon: Sparkles,
      onClick: () => onNavigate('improve'),
    },
    {
      title: 'PSL Breakdown & Landmarks',
      subtitle: 'Inspect all 15 technical structural categories & ratios',
      tag: 'RATINGS',
      icon: LayoutList,
      onClick: onOpenResults,
    },
    {
      title: 'Update & Compare Selfies',
      subtitle: 'Upload a fresh scan and track structural consistency',
      tag: 'PROGRESS',
      icon: Camera,
      onClick: handleTopUpdateSelfieClick,
    },
    {
      title: 'Community Rankings',
      subtitle: 'Verified opt-in progression benchmarks (Coming Soon)',
      tag: 'RANKINGS',
      icon: Trophy,
      onClick: () => onNavigate('rankings'),
    },
    {
      title: 'Profile & Email Sync',
      subtitle: 'Set age, height, goals & sync your account',
      tag: 'ACCOUNT',
      icon: User,
      onClick: () => onNavigate('profile'),
    },
  ];

  const chartPoints = useMemo(() => {
    if (analyses.length === 0) return [];
    const width = 560;
    const height = 150;
    const padX = 28;
    const padY = 20;
    return analyses.map((rec, idx) => {
      const x =
        analyses.length === 1
          ? width / 2
          : padX + (idx / (analyses.length - 1)) * (width - padX * 2);
      const clampedScore = Math.min(10, Math.max(0, rec.result.overallRating));
      const y = height - padY - (clampedScore / 10) * (height - padY * 2);
      return { x, y, score: clampedScore, date: formatShortDate(rec.createdAt), id: rec.id };
    });
  }, [analyses]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-10 text-left"
    >
      {/* HERO GREETING + TWO PILLS (WHITE OUTLINE CAM & WHITE ARROW) + CHATBOT CTA WITH BLINKING CURSOR */}
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.85rem,4.5vw,2.75rem)] font-normal tracking-[-0.03em] text-[#f4f4f5] leading-tight">
              {profile.name
                ? `Welcome to Dark Triad AI, ${profile.name}`
                : 'Welcome to Dark Triad AI'}
            </h1>
            <p className="mt-1.5 text-xs text-[#9e9ea6]">
              {latestRecord
                ? `${latestRecord.result.faceShape} · ${latestRecord.result.pslTier}`
                : 'Take your front & side selfies below to unlock your facial ratings and metrics.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              historySectionRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            title="Jump to Scan History & Timeline"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-transparent text-[#d4d4d8] hover:border-white/35 hover:text-white transition-colors"
          >
            <History className="h-4 w-4" />
          </button>
        </div>

        {/* Two Action Pill Buttons: White Outline Camera + White Arrow */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTopUpdateSelfieClick}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-medium text-[#e4e4e7] hover:border-white/45 transition-colors"
          >
            {/* White outline camera empty inside */}
            <Camera className="h-3.5 w-3.5 text-white stroke-[1.8]" />
            <span>Update your selfie</span>
          </button>

          <button
            type="button"
            onClick={handleTopCheckRatingsClick}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-medium text-[#e4e4e7] hover:border-white/45 transition-colors"
          >
            {/* White arrow */}
            <ArrowRight className="h-3.5 w-3.5 text-white stroke-[2]" />
            <span>See your current ratings</span>
          </button>
        </div>

        {/* Slim, Wide, Curved-Edge Transparent Chatbot CTA Box with Blinking Cursor "|" right after AI */}
        <button
          type="button"
          onClick={() => onNavigate('chatbot')}
          className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-transparent px-5 py-3.5 text-left transition-all hover:border-white/40 hover:bg-white/[0.03]"
        >
          <span className="truncate text-[15px] sm:text-base font-normal tracking-[-0.02em] text-[#f4f4f5]">
            Try Our Chatbot{' '}
            <span className="font-design-society tracking-normal text-[1.12em]">
              Dark Triad
            </span>{' '}
            AI
            <span className="terminal-blink ml-1 font-mono font-light text-white">
              |
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#a1a1aa] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
        </button>
      </section>

      {/* EXPLORE FEATURES (Transparent curved boxes, lines in between removed) */}
      <section className="border-t border-white/12 pt-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium tracking-tight text-[#f4f4f5]">
            Explore Features
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous features"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-transparent text-[#d4d4d8] hover:border-white/35 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next features"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-transparent text-[#d4d4d8] hover:border-white/35 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar"
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <PixelCard
                key={card.title}
                colors={['#000000', '#09090b', '#18181b']}
                glowColor="#000000"
                shape="square"
                origin="pointer"
                gap={5}
                pixelSize={2.5}
                speed={35}
                revealDuration={550}
                spotlight={0.55}
                glow={0.45}
                opacity={0.95}
                idlePresence={0.38}
                idleOpacity={0.45}
                fade={0.25}
                trigger="hover"
                clickPulse
                intro={false}
                noFocus
                theme="dark"
                className="group snap-start shrink-0 w-[240px] sm:w-[260px] rounded-2xl border border-white/14 bg-white/[0.08] backdrop-blur-sm text-left transition-all hover:border-white/35 hover:bg-white/[0.11] shadow-sm"
              >
                <button
                  type="button"
                  onClick={card.onClick}
                  className="relative z-10 flex h-full w-full flex-col justify-between p-4 text-left cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium tracking-[0.1em] text-[#8e8e95]">
                        {card.tag}
                      </span>
                      <Icon className="h-4 w-4 text-[#8e8e95] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="mt-2.5 text-base font-medium text-[#f4f4f5] leading-snug">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9e9ea6]">
                      {card.subtitle}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[#f4f4f5] opacity-80 group-hover:opacity-100">
                    <span>Open</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </PixelCard>
            );
          })}
        </div>
      </section>

      {/* SECTION 1: CORE METRICS OR NEW USER OVAL CAMERA SCANNER */}
      <section ref={ratingsSectionRef} className="border-t border-white/12 pt-8">
        {activeRecord ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.06em] text-[#9e9ea6]">
                  {activeRecord.result.faceShape}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-medium tracking-tight text-[#f4f4f5] tabular-nums">
                    {activeRecord.result.overallRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-[#8e8e95] tabular-nums">/ 10.0</span>
                  <span className="text-sm font-medium text-[#d4d4d8]">
                    · {activeRecord.result.pslTier}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onUpdateSelfie}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-5 py-2.5 text-xs font-semibold tracking-[0.04em] text-[#0a0a0a] hover:opacity-95 transition-opacity"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>UPDATE YOUR SELFIE</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('improve')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-xs font-medium text-[#f4f4f5] hover:border-white/40 transition-colors"
                >
                  <Dumbbell className="h-3.5 w-3.5" />
                  <span>Open Improve Protocol</span>
                </button>
              </div>
            </div>

            {/* Numbered Open Metrics */}
            <ol className="max-w-3xl">
              <li className="relative flex gap-3.5 pb-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  1
                </div>
                <div className="pt-0.5 flex-1">
                  <h3 className="text-base font-medium text-[#f4f4f5]">
                    Previous Rating &amp; Delta
                  </h3>
                  {previousRecord && ratingDelta !== null ? (
                    <div className="mt-1.5 flex items-center gap-2.5 text-sm">
                      <span className="font-medium text-[#d4d4d8] tabular-nums">
                        Previous: {previousRecord.result.overallRating.toFixed(1)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                          ratingDelta > 0
                            ? 'text-emerald-300'
                            : ratingDelta < 0
                              ? 'text-amber-300'
                              : 'text-[#d4d4d8]'
                        }`}
                      >
                        {ratingDelta > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : ratingDelta < 0 ? (
                          <TrendingDown className="h-3.5 w-3.5" />
                        ) : null}
                        {ratingDelta > 0
                          ? `+${ratingDelta}`
                          : ratingDelta === 0
                            ? '0.0'
                            : ratingDelta}
                      </span>
                      <span className="text-xs text-[#8e8e95]">
                        ({formatShortDate(previousRecord.createdAt)})
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#9e9ea6]">
                      Baseline scan recorded. Submit an updated selfie later to compare score changes.
                    </p>
                  )}
                </div>
              </li>

              <li className="relative flex gap-3.5 pb-0">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                  2
                </div>
                <div className="pt-0.5 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-[#f4f4f5]">
                        Active Structural Reference Portraits
                      </h3>
                      <p className="mt-0.5 text-xs text-[#8e8e95]">
                        Front and side anatomical measurements
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOverlayLines((s) => !s)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-transparent px-3 py-1.5 text-xs text-[#e4e4e7] hover:border-white/35"
                    >
                      {showOverlayLines ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Hide Lines</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Show Lines</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-5 items-start">
                    <FrontMeasurementOverlay
                      photo={activeRecord.frontPhoto}
                      landmarks={activeRecord.result.frontLandmarks}
                      showLines={showOverlayLines}
                      darkTheme
                    />
                    <SideMeasurementOverlay
                      photo={activeRecord.sidePhoto}
                      landmarks={activeRecord.result.sideLandmarks}
                      showLines={showOverlayLines}
                      darkTheme
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenResults}
                      className="group inline-flex items-center gap-3 rounded-full bg-[#f4f4f5] px-6 py-3 text-xs font-semibold tracking-[0.06em] text-[#0a0a0a] hover:opacity-95 transition-opacity"
                    >
                      <span>SEE YOUR CURRENT RATINGS</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        ) : (
          /* NEW USER FLOW: Ask for selfies & display exact oval camera directly inside dashboard! */
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-[#a1a1aa] uppercase">
                FIRST STEP · INITIAL SCAN REQUIRED
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#f4f4f5]">
                Take your selfies to calculate your facial ratings
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-[#9e9ea6]">
                You have not completed a facial scan yet. Use the oval camera or upload straight front and 90° side profile photographs below. Your ratings, symmetry scores, and custom improvement plan will generate automatically.
              </p>
            </div>

            <CurvedCameraBox
              externalTriggerCount={cameraTriggerCount}
              profile={profile}
              className="scroll-mt-24 w-full px-0 pb-6 sm:px-0 sm:pb-8"
              onAnalysisComplete={(front, side, result) => {
                if (onAnalysisComplete) {
                  onAnalysisComplete(front, side, result);
                }
              }}
            />
          </div>
        )}
      </section>

      {/* IMPROVEMENT TIMELINE & SCAN COMPARISON */}
      <section
        ref={historySectionRef}
        className="border-t border-white/12 pt-8 space-y-6"
      >
        <div>
          <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
            Improvement Timeline &amp; Scan Comparison
          </h2>
        </div>

        <ol className="max-w-3xl">
          <li className="relative flex gap-3.5 pb-6">
            <span
              aria-hidden="true"
              className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
            />
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
              1
            </div>
            <div className="flex-1 pt-0.5 grid gap-4 grid-cols-2 sm:grid-cols-4 border-b border-white/10 pb-5">
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Weeks Active</span>
                <span className="mt-1 block text-lg font-medium text-[#f4f4f5] tabular-nums">
                  {analyses.length > 0 ? `${weeksSinceStart} wk` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">First Scan</span>
                <span className="mt-1 block text-sm font-medium text-[#f4f4f5]">
                  {firstScan ? formatShortDate(firstScan.createdAt) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Latest Scan</span>
                <span className="mt-1 block text-sm font-medium text-[#f4f4f5]">
                  {latestRecord ? formatShortDate(latestRecord.createdAt) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#8e8e95]">Total Scans</span>
                <span className="mt-1 block text-lg font-medium text-[#f4f4f5] tabular-nums">
                  {analyses.length}
                </span>
              </div>
            </div>
          </li>

          {analyses.length > 0 && (
            <li className="relative flex gap-3.5 pb-6">
              {(featureDeltas.length > 0 || analyses.length > 0) && (
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
                />
              )}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                2
              </div>
              <div className="flex-1 pt-0.5 border-b border-white/10 pb-5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-[#d4d4d8]">
                    Rating Progression (0 – 10 Scale)
                  </span>
                </div>
                <svg viewBox="0 0 560 150" className="w-full h-36 overflow-visible">
                  {[2.5, 5, 7.5].map((tick) => {
                    const y = 150 - 20 - (tick / 10) * 110;
                    return (
                      <g key={tick}>
                        <line
                          x1={20}
                          y1={y}
                          x2={540}
                          y2={y}
                          stroke="rgba(255,255,255,0.08)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={4}
                          y={y + 3}
                          fill="rgba(255,255,255,0.4)"
                          fontSize="9"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {chartPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth="1.75"
                      points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}

                  {chartPoints.map((pt) => (
                    <g key={pt.id}>
                      <circle cx={pt.x} cy={pt.y} r="7" fill="rgba(255,255,255,0.16)" />
                      <circle cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        fill="#f4f4f5"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {pt.score.toFixed(1)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </li>
          )}

          {featureDeltas.length > 0 && (
            <li className="relative flex gap-3.5 pb-6">
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-8 bottom-0 w-px bg-white/14"
              />
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                3
              </div>
              <div className="flex-1 pt-0.5 space-y-3 border-b border-white/10 pb-5">
                <h3 className="text-base font-medium text-[#f4f4f5]">
                  Feature-by-Feature Comparison (Previous vs. Latest)
                </h3>
                <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {featureDeltas.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b border-white/8 py-2 text-xs"
                    >
                      <span className="text-[#d4d4d8] truncate pr-2">{item.label}</span>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {item.previous !== null && (
                          <span className="text-[#7c7c85]">{item.previous.toFixed(1)} →</span>
                        )}
                        <span className="font-semibold text-[#f4f4f5]">
                          {item.current.toFixed(1)}
                        </span>
                        {item.diff !== null && (
                          <span
                            className={`text-[11px] font-semibold ${
                              item.diff > 0
                                ? 'text-emerald-300'
                                : item.diff < 0
                                  ? 'text-amber-300'
                                  : 'text-[#8e8e95]'
                            }`}
                          >
                            ({item.diff > 0 ? `+${item.diff}` : item.diff})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          )}

          {analyses.length > 0 && (
            <li className="relative flex gap-3.5 pb-0">
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[#1c1c20] text-xs font-medium text-[#f4f4f5] tabular-nums">
                {featureDeltas.length > 0 ? '4' : '3'}
              </div>
              <div className="flex-1 pt-0.5 space-y-3">
                <h3 className="text-base font-medium text-[#f4f4f5]">
                  Historical Scan Log
                </h3>
                <div className="divide-y divide-white/10">
                  {[...analyses].reverse().map((rec, idx) => {
                    const isSelected = activeRecord?.id === rec.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => onSelectRecord(rec.id)}
                        className={`flex w-full items-center justify-between py-3 text-left transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={rec.frontPhoto.dataUrl}
                            alt="Scan thumbnail"
                            className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/15"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#f4f4f5] truncate">
                              Scan #{analyses.length - idx} · {rec.result.faceShape}
                            </p>
                            <p className="text-xs text-[#8e8e95]">
                              {formatShortDate(rec.createdAt)} · {rec.result.pslTier}
                            </p>
                          </div>
                        </div>
                        <span className="text-base font-semibold text-[#f4f4f5] tabular-nums pl-2">
                          {rec.result.overallRating.toFixed(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          )}
        </ol>
      </section>

      {/* DAILY PROGRESS TRACKER */}
      <section className="border-t border-white/12 pt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#9e9ea6]">
              Daily Consistency Log · {todayDate}
            </p>
            <h2 className="mt-1 text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
              Daily Progress Tracker
            </h2>
          </div>

          {trackerSaved && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>SAVED SUCCESSFULLY</span>
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSaveDailyTracker(e)} className="space-y-5 max-w-3xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <label className="block font-medium text-[#e4e4e7]">
                Water intake today (litres)
              </label>
              <input
                type="number"
                step="0.25"
                min={0}
                max={15}
                required
                value={waterLitres}
                onChange={(e) => setWaterLitres(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="block font-medium text-[#e4e4e7]">
                Exercised today?
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setExercised(val)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      exercised === val
                        ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                        : 'border-white/15 bg-transparent text-[#a1a1aa] hover:border-white/30'
                    }`}
                  >
                    {val ? 'YES' : 'NO'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-b border-white/10 pb-4">
              <label className="block font-medium text-[#e4e4e7]">
                Calories consumed today
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={caloriesConsumed}
                onChange={(e) => setCaloriesConsumed(e.target.value)}
                placeholder="e.g. 2100"
                className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-2 border-b border-white/10 pb-4">
              <label className="block font-medium text-[#e4e4e7]">
                Sleep duration (hours)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={24}
                required
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="e.g. 7.5"
                className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="block font-medium text-[#e4e4e7]">
                Skincare routine completed?
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setSkincareCompleted(val)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      skincareCompleted === val
                        ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                        : 'border-white/15 bg-transparent text-[#a1a1aa] hover:border-white/30'
                    }`}
                  >
                    {val ? 'YES' : 'NO'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="block font-medium text-[#e4e4e7]">
                Followed recommended diet?
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setDietFollowed(val)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                      dietFollowed === val
                        ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                        : 'border-white/15 bg-transparent text-[#a1a1aa] hover:border-white/30'
                    }`}
                  >
                    {val ? 'YES' : 'NO'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-[#f4f4f5] px-6 py-2.5 text-xs font-semibold text-[#0a0a0a] hover:opacity-95"
            >
              {existingToday ? "UPDATE TODAY'S RECORD" : 'SAVE DAILY PROGRESS'}
            </button>
            {existingToday && (
              <span className="text-[11px] text-[#8e8e95]">
                Today&apos;s entry exists — saving updates it cleanly.
              </span>
            )}
          </div>
        </form>

        {/* Historical Tracking & Real Summaries */}
        <div className="border-t border-white/10 pt-5 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#9e9ea6]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Completion Statistics</span>
            </div>
            <div className="inline-flex rounded-full border border-white/15 p-1 text-[11px]">
              {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTrackerTab(tab)}
                  className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                    trackerTab === tab
                      ? 'bg-[#f4f4f5] text-[#0a0a0a]'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {trackerTab === 'daily' &&
            (dailyProgress.length === 0 ? (
              <p className="text-xs text-[#8e8e95]">
                No daily entries saved yet. Log today&apos;s metrics above to start building statistics.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {[...dailyProgress]
                  .reverse()
                  .slice(0, 14)
                  .map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                    >
                      <span className="font-medium text-[#f4f4f5] tabular-nums">
                        {row.date} {row.date === todayDate ? '(Today)' : ''}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-[#d4d4d8] tabular-nums">
                        <span>{row.waterLitres}L Water</span>
                        <span>{row.caloriesConsumed} kcal</span>
                        <span>{row.sleepHours}h Sleep</span>
                        <span
                          className={
                            row.exercised ? 'text-emerald-300' : 'text-[#7c7c85]'
                          }
                        >
                          Exercise: {row.exercised ? 'Yes' : 'No'}
                        </span>
                        <span
                          className={
                            row.skincareCompleted ? 'text-emerald-300' : 'text-[#7c7c85]'
                          }
                        >
                          Skincare: {row.skincareCompleted ? 'Yes' : 'No'}
                        </span>
                        <span
                          className={
                            row.dietFollowed ? 'text-emerald-300' : 'text-[#7c7c85]'
                          }
                        >
                          Diet: {row.dietFollowed ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ))}

          {(trackerTab === 'weekly' || trackerTab === 'monthly') &&
            (() => {
              const stats = trackerTab === 'weekly' ? weeklyStats : monthlyStats;
              if (!stats) {
                return (
                  <p className="text-xs text-[#8e8e95]">
                    No entries logged inside this window yet.
                  </p>
                );
              }
              return (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Days Logged</span>
                    <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                      {stats.daysLogged}
                    </p>
                  </div>
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Avg Water</span>
                    <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                      {stats.avgWater} L
                    </p>
                  </div>
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Avg Calories</span>
                    <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                      {stats.avgCalories}
                    </p>
                  </div>
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Avg Sleep</span>
                    <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                      {stats.avgSleep} hrs
                    </p>
                  </div>
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Exercise Rate</span>
                    <p className="mt-1 text-lg font-medium text-emerald-300 tabular-nums">
                      {stats.exercisePct}%
                    </p>
                  </div>
                  <div className="border-l border-white/12 pl-3">
                    <span className="text-[10px] text-[#8e8e95] uppercase">Skincare / Diet</span>
                    <p className="mt-1 text-base font-medium text-emerald-300 tabular-nums">
                      {stats.skincarePct}% / {stats.dietPct}%
                    </p>
                  </div>
                </div>
              );
            })()}
        </div>
      </section>
    </motion.div>
  );
}
