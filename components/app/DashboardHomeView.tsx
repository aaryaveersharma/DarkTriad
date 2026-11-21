'use client';

import {
  ArrowRight,
  ArrowUp,
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
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataService } from '@/lib/storage/dataService';
import {
  AppView,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  UserProfile,
} from '@/lib/types';
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
  onOpenChatbotWithPrompt: (mode: ChatMode, prompt: string) => void;
  onDailyProgressSaved: (entries: DailyProgressEntry[]) => void;
}

const CHAT_MODES: ChatMode[] = [
  'GENERAL',
  'FEEDBACK',
  'SKINCARE',
  'DIET',
  'EXERCISES',
  'HAIRSTYLE',
];

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
  onOpenChatbotWithPrompt,
  onDailyProgressSaved,
}: DashboardHomeViewProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickMode, setQuickMode] = useState<ChatMode>('GENERAL');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [showOverlayLines, setShowOverlayLines] = useState(true);

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

  const handleQuickPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickPrompt.trim();
    if (!text) {
      onNavigate('chatbot');
      return;
    }
    setQuickPrompt('');
    onOpenChatbotWithPrompt(quickMode, text);
  };

  // Real timeline calculations
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

  // Real feature-by-feature deltas comparing latestRecord vs previousRecord
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
    accent: string;
    onClick: () => void;
  }> = [
    {
      title: 'Dactride AI Chatbot',
      subtitle: 'Ask 6 specialized modes + preview your hairstyle live',
      tag: 'AI CHAT',
      icon: MessageSquare,
      accent: 'from-[#28282f] via-[#1c1c21] to-[#151518]',
      onClick: () => onNavigate('chatbot'),
    },
    {
      title: '4-Step Improve Plan',
      subtitle: 'Feedback, Skincare, Diet & Exercises tailored to your scan',
      tag: 'PROTOCOL',
      icon: Sparkles,
      accent: 'from-[#292622] via-[#1d1c19] to-[#151517]',
      onClick: () => onNavigate('improve'),
    },
    {
      title: 'PSL Breakdown & Landmarks',
      subtitle: 'Inspect all 15 technical structural categories & ratios',
      tag: 'RATINGS',
      icon: LayoutList,
      accent: 'from-[#222829] via-[#191d1e] to-[#141517]',
      onClick: onOpenResults,
    },
    {
      title: 'Update & Compare Selfies',
      subtitle: 'Upload a fresh scan and track structural consistency',
      tag: 'PROGRESS',
      icon: Camera,
      accent: 'from-[#26232b] via-[#1b1a20] to-[#151517]',
      onClick: onUpdateSelfie,
    },
    {
      title: 'Community Rankings',
      subtitle: 'Verified opt-in progression benchmarks (Coming Soon)',
      tag: 'RANKINGS',
      icon: Trophy,
      accent: 'from-[#27241e] via-[#1b1916] to-[#141416]',
      onClick: () => onNavigate('rankings'),
    },
    {
      title: 'Profile & Email Sync',
      subtitle: 'Set age/height/goals & save browser data to an account',
      tag: 'ACCOUNT',
      icon: User,
      accent: 'from-[#242428] via-[#1b1b1e] to-[#141416]',
      onClick: () => onNavigate('profile'),
    },
  ];

  // SVG Timeline plot coordinates
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
    <div className="space-y-8">
      {/* STITCH HERO GREETING + TWO PILLS + QUICK ASK COMPOSER */}
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.85rem,4.5vw,2.75rem)] font-normal tracking-[-0.03em] text-[#f4f4f5] leading-tight">
              {profile.name
                ? `Welcome to Dark Triad AI, ${profile.name}`
                : 'Welcome to Dark Triad AI'}
            </h1>
            <p className="mt-1 text-xs text-[#9e9ea6]">
              {latestRecord
                ? `Latest scan: ${formatShortDate(latestRecord.createdAt)} · ${latestRecord.result.faceShape} · ${latestRecord.result.pslTier}`
                : 'Complete your first facial scan to populate your dashboard metrics.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              historySectionRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            title="Jump to Scan History & Timeline"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#1c1c1f] text-[#d4d4d8] hover:border-white/25 hover:text-white"
          >
            <History className="h-4 w-4" />
          </button>
        </div>

        {/* Two Stitch Pill Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onUpdateSelfie}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1b1b1e] px-4 py-2 text-xs font-medium text-[#e4e4e7] hover:border-white/30 hover:bg-[#242428] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span>Update your selfie</span>
          </button>
          <button
            type="button"
            onClick={onOpenResults}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1b1b1e] px-4 py-2 text-xs font-medium text-[#e4e4e7] hover:border-white/30 hover:bg-[#242428] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span>See your current ratings</span>
          </button>
        </div>

        {/* Stitch Rounded Composer Card */}
        <form
          onSubmit={handleQuickPromptSubmit}
          className="relative rounded-[24px] border border-white/15 bg-[#18181b] p-4 sm:p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]"
        >
          <textarea
            rows={2}
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="Ask Dactride AI about your facial harmony, jawline, skincare, diet, or hairstyle preview..."
            className="w-full resize-none bg-transparent text-sm text-[#f4f4f5] placeholder:text-[#7c7c85] focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/8">
            <span className="text-[11px] text-[#7c7c85]">
              Synced with your stored scan &amp; tracker records
            </span>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModeDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#232327] px-3 py-1.5 text-[11px] font-medium text-[#e4e4e7] hover:bg-[#2d2d32]"
              >
                <Sparkles className="h-3 w-3 text-[#a1a1aa]" />
                <span>SWITCH MODE · {quickMode}</span>
              </button>

              {modeDropdownOpen && (
                <div className="absolute right-10 bottom-11 z-30 w-44 rounded-2xl border border-white/15 bg-[#1f1f23] p-1.5 shadow-2xl">
                  {CHAT_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setQuickMode(m);
                        setModeDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs ${
                        quickMode === m
                          ? 'bg-[#f4f4f5] font-semibold text-[#0a0a0a]'
                          : 'text-[#d4d4d8] hover:bg-white/5'
                      }`}
                    >
                      <span>{m}</span>
                      {quickMode === m && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                aria-label="Send to Dactride AI"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f4f5] text-[#0a0a0a] hover:opacity-90 transition-opacity"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* HORIZONTALLY SLIDABLE FEATURE CAROUSEL (Replaces "Need inspiration?") */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-normal tracking-tight text-[#f4f4f5]">
            Explore Features
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous features"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#1b1b1e] text-[#d4d4d8] hover:border-white/30 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next features"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#1b1b1e] text-[#d4d4d8] hover:border-white/30 hover:text-white"
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
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className={`group snap-start shrink-0 w-[245px] sm:w-[270px] rounded-[24px] border border-white/12 bg-gradient-to-br ${card.accent} p-5 text-left transition-all hover:border-white/30`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.08em] text-[#d4d4d8]">
                    {card.tag}
                  </span>
                  <Icon className="h-4 w-4 text-[#a1a1aa] group-hover:text-white transition-colors" />
                </div>
                <h3 className="mt-6 text-base font-medium text-[#f4f4f5] leading-snug">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#9e9ea6]">
                  {card.subtitle}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[#f4f4f5] opacity-80 group-hover:opacity-100">
                  <span>Open</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CORE METRICS OVERVIEW + UPDATE YOUR SELFIE */}
      {activeRecord ? (
        <section className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8 space-y-6">
          <div className="grid gap-5 md:grid-cols-4 items-center">
            <div className="md:col-span-2 space-y-2">
              <span className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
                Strict PSL Overall Score
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-medium tracking-tight text-[#f4f4f5] tabular-nums">
                  {activeRecord.result.overallRating.toFixed(1)}
                </span>
                <span className="text-sm text-[#8e8e95] tabular-nums">/ 10.0</span>
                <span className="rounded-full border border-white/15 bg-[#242429] px-3 py-1 text-xs font-medium text-[#f4f4f5]">
                  {activeRecord.result.pslTier}
                </span>
              </div>
              <p className="text-xs text-[#9e9ea6]">
                Latest scan date: <strong className="text-[#e4e4e7]">{formatShortDate(activeRecord.createdAt)}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
              <span className="block text-[10px] font-medium tracking-[0.08em] text-[#8e8e95] uppercase">
                Previous Rating &amp; Delta
              </span>
              {previousRecord && ratingDelta !== null ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-medium text-[#f4f4f5] tabular-nums">
                      {previousRecord.result.overallRating.toFixed(1)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        ratingDelta > 0
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : ratingDelta < 0
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-white/10 text-[#d4d4d8]'
                      }`}
                    >
                      {ratingDelta > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : ratingDelta < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : null}
                      {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta === 0 ? '0.0' : ratingDelta}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8e8e95]">
                    Prev: {formatShortDate(previousRecord.createdAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#8e8e95]">
                  Baseline scan recorded. Submit an updated selfie later to compare deltas.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onUpdateSelfie}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f4f4f5] px-5 py-3 text-xs font-semibold tracking-[0.06em] text-[#0a0a0a] hover:opacity-95 transition-opacity"
              >
                <Camera className="h-4 w-4" />
                <span>UPDATE YOUR SELFIE</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('improve')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-[#232327] px-5 py-2.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2d2d32]"
              >
                <Dumbbell className="h-3.5 w-3.5" />
                <span>Open Improve Protocol</span>
              </button>
            </div>
          </div>

          {/* FRONT VS SIDE DISPLAY SIDE-BY-SIDE */}
          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium tracking-[0.1em] text-[#9e9ea6] uppercase">
                  Front vs Side Display
                </p>
                <h2 className="mt-0.5 text-lg font-medium text-[#f4f4f5]">
                  Active Structural Reference Portraits
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowOverlayLines((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#232327] px-3 py-1.5 text-xs text-[#e4e4e7]"
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

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 items-start">
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

            {/* Large Prominent Clickable Card: "SEE YOUR CURRENT RATINGS" */}
            <button
              type="button"
              onClick={onOpenResults}
              className="group flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/20 bg-gradient-to-r from-[#242429] via-[#1d1d22] to-[#17171a] p-5 sm:p-6 text-left hover:border-white/40 transition-all"
            >
              <div>
                <span className="block text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
                  15 Technical Categories · Full Landmarks · Non-Inflated Rubric
                </span>
                <span className="mt-1 block text-xl sm:text-2xl font-medium tracking-tight text-[#f4f4f5]">
                  SEE YOUR CURRENT RATINGS
                </span>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[#0a0a0a] transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-5 w-5" />
              </span>
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-8 text-center">
          <h2 className="text-xl font-medium text-[#f4f4f5]">
            No Facial Scan Recorded Yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-[#9e9ea6]">
            Submit your front and side profile photographs to populate your PSL rating,
            feature comparisons, and personalized plan.
          </p>
          <button
            type="button"
            onClick={onUpdateSelfie}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f4f4f5] px-6 py-3 text-xs font-semibold text-[#0a0a0a]"
          >
            <Camera className="h-4 w-4" />
            <span>Start Scan</span>
          </button>
        </section>
      )}

      {/* FEATURE-BY-FEATURE COMPARISON & IMPROVEMENT TIMELINE */}
      <section
        ref={historySectionRef}
        className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8 space-y-6"
      >
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
            Real Historical Measurements
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
            Improvement Timeline &amp; Scan Comparison
          </h2>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[10px] text-[#8e8e95] uppercase">
              Total Weeks Since Start
            </span>
            <span className="mt-1 block text-lg font-medium text-[#f4f4f5] tabular-nums">
              {analyses.length > 0 ? `${weeksSinceStart} wk` : '—'}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[10px] text-[#8e8e95] uppercase">
              First Analysis Date
            </span>
            <span className="mt-1 block text-sm font-medium text-[#f4f4f5]">
              {firstScan ? formatShortDate(firstScan.createdAt) : '—'}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[10px] text-[#8e8e95] uppercase">
              Latest Analysis Date
            </span>
            <span className="mt-1 block text-sm font-medium text-[#f4f4f5]">
              {latestRecord ? formatShortDate(latestRecord.createdAt) : '—'}
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <span className="block text-[10px] text-[#8e8e95] uppercase">
              Number of Scans
            </span>
            <span className="mt-1 block text-lg font-medium text-[#f4f4f5] tabular-nums">
              {analyses.length}
            </span>
          </div>
        </div>

        {/* Real Rating Progression SVG Graph */}
        {analyses.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#141416] p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#9e9ea6]">Rating Progression (0 – 10 PSL Scale)</span>
              <span className="text-[11px] text-[#7c7c85]">
                Tap a point or scan below to inspect
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
        )}

        {/* Feature-by-Feature Delta Comparison when 2+ scans exist */}
        {featureDeltas.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-medium tracking-[0.08em] text-[#9e9ea6] uppercase">
              Feature-by-Feature Comparison (Previous vs. Latest)
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {featureDeltas.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#141416] px-3.5 py-2.5 text-xs"
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
                        className={`text-[10px] font-semibold ${
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
        )}

        {/* Historical Assessments List */}
        {analyses.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium tracking-[0.08em] text-[#9e9ea6] uppercase">
              Historical Scan Log
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...analyses].reverse().map((rec, idx) => {
                const isSelected = activeRecord?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectRecord(rec.id)}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[#f4f4f5] bg-[#242429]'
                        : 'border-white/10 bg-[#141416] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={rec.frontPhoto.dataUrl}
                        alt="Scan thumbnail"
                        className="h-10 w-10 rounded-xl object-cover shrink-0 border border-white/15"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#f4f4f5] truncate">
                          Scan #{analyses.length - idx} · {rec.result.faceShape}
                        </p>
                        <p className="text-[11px] text-[#8e8e95]">
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
        )}
      </section>

      {/* DAILY PROGRESS TRACKER */}
      <section className="rounded-[26px] border border-white/12 bg-[#1a1a1d] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#9e9ea6] uppercase">
              Daily Consistency Log · {todayDate}
            </p>
            <h2 className="mt-1 text-xl font-medium tracking-tight text-[#f4f4f5]">
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

        <form onSubmit={(e) => void handleSaveDailyTracker(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <label className="block font-medium text-[#e4e4e7]">
                How many litres of water did you drink today?
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
                className="w-full rounded-xl border border-white/12 bg-[#1b1b1e] px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <span className="block font-medium text-[#e4e4e7]">
                Did you exercise today?
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
                        : 'border-white/12 bg-[#1b1b1e] text-[#a1a1aa]'
                    }`}
                  >
                    {val ? 'YES' : 'NO'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <label className="block font-medium text-[#e4e4e7]">
                How many calories did you consume today?
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={caloriesConsumed}
                onChange={(e) => setCaloriesConsumed(e.target.value)}
                placeholder="e.g. 2100"
                className="w-full rounded-xl border border-white/12 bg-[#1b1b1e] px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <label className="block font-medium text-[#e4e4e7]">
                How many hours did you sleep?
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
                className="w-full rounded-xl border border-white/12 bg-[#1b1b1e] px-3 py-2 text-sm text-[#f4f4f5] focus:border-white/35 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <span className="block font-medium text-[#e4e4e7]">
                Did you complete your skincare routine?
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
                        : 'border-white/12 bg-[#1b1b1e] text-[#a1a1aa]'
                    }`}
                  >
                    {val ? 'YES' : 'NO'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-2">
              <span className="block font-medium text-[#e4e4e7]">
                Did you follow your recommended diet?
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
                        : 'border-white/12 bg-[#1b1b1e] text-[#a1a1aa]'
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
                Today&apos;s entry already exists — saving updates it cleanly.
              </span>
            )}
          </div>
        </form>

        {/* Historical Tracking & Real Summaries */}
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#9e9ea6]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Actual Completion Statistics</span>
            </div>
            <div className="inline-flex rounded-full border border-white/12 bg-[#141416] p-1 text-[11px]">
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

          {trackerTab === 'daily' && (
            dailyProgress.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs text-[#8e8e95]">
                No daily entries saved yet. Log today&apos;s metrics above to start building real statistics.
              </p>
            ) : (
              <div className="space-y-2">
                {[...dailyProgress].reverse().slice(0, 14).map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#141416] px-4 py-3 text-xs"
                  >
                    <span className="font-medium text-[#f4f4f5] tabular-nums">
                      {row.date} {row.date === todayDate ? '(Today)' : ''}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-[#d4d4d8] tabular-nums">
                      <span>{row.waterLitres}L Water</span>
                      <span>{row.caloriesConsumed} kcal</span>
                      <span>{row.sleepHours}h Sleep</span>
                      <span className={row.exercised ? 'text-emerald-300' : 'text-[#7c7c85]'}>
                        Exercise: {row.exercised ? 'Yes' : 'No'}
                      </span>
                      <span className={row.skincareCompleted ? 'text-emerald-300' : 'text-[#7c7c85]'}>
                        Skincare: {row.skincareCompleted ? 'Yes' : 'No'}
                      </span>
                      <span className={row.dietFollowed ? 'text-emerald-300' : 'text-[#7c7c85]'}>
                        Diet: {row.dietFollowed ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {(trackerTab === 'weekly' || trackerTab === 'monthly') && (() => {
            const stats = trackerTab === 'weekly' ? weeklyStats : monthlyStats;
            if (!stats) {
              return (
                <p className="rounded-2xl border border-white/10 bg-[#141416] p-4 text-xs text-[#8e8e95]">
                  No entries logged inside this window yet.
                </p>
              );
            }
            return (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
                  <span className="text-[10px] text-[#8e8e95] uppercase">Days Logged</span>
                  <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                    {stats.daysLogged}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
                  <span className="text-[10px] text-[#8e8e95] uppercase">Avg Water</span>
                  <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                    {stats.avgWater} L
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
                  <span className="text-[10px] text-[#8e8e95] uppercase">Avg Calories</span>
                  <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                    {stats.avgCalories}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
                  <span className="text-[10px] text-[#8e8e95] uppercase">Avg Sleep</span>
                  <p className="mt-1 text-lg font-medium text-[#f4f4f5] tabular-nums">
                    {stats.avgSleep} hrs
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
                  <span className="text-[10px] text-[#8e8e95] uppercase">Exercise Rate</span>
                  <p className="mt-1 text-lg font-medium text-emerald-300 tabular-nums">
                    {stats.exercisePct}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#141416] p-3.5">
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
    </div>
  );
}
