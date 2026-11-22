'use client';

import {
  ArrowUp,
  Check,
  ChevronDown,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { DataService, saveLightweightPreferences } from '@/lib/storage/dataService';
import {
  ChatMessage,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  UserProfile,
} from '@/lib/types';

interface ChatbotViewProps {
  ownerId: string;
  profile: UserProfile;
  latestRecord: FacialAnalysisRecord | null;
  dailyProgress: DailyProgressEntry[];
  initialMode?: ChatMode;
  initialPrompt?: string;
  onConsumedLaunchTrigger?: () => void;
}

const MODES: Array<{ key: ChatMode; label: string; description: string }> = [
  { key: 'GENERAL', label: 'GENERAL', description: 'All scans, ratios & goals' },
  { key: 'FEEDBACK', label: 'FEEDBACK', description: 'Structure, ratios & harmony' },
  { key: 'SKINCARE', label: 'SKINCARE', description: 'Concerns, actives & routine' },
  { key: 'DIET', label: 'DIET', description: 'Macros & bloat balance' },
  { key: 'EXERCISES', label: 'EXERCISES', description: 'Training, cardio & posture' },
  { key: 'HAIRSTYLE', label: 'HAIRSTYLE', description: 'Cut framing & styling' },
];

const QUICK_SUGGESTIONS: Record<ChatMode, string[]> = {
  GENERAL: [
    'What should I improve about my face?',
    'How many calories should I eat according to my goals?',
    'How many miles should I run?',
    'How can I improve my jawline?',
    'Which skincare products should I use?',
  ],
  FEEDBACK: [
    'What are my strongest facial features?',
    'Explain my weakest facial characteristics.',
    'How can I improve my overall facial appearance?',
  ],
  SKINCARE: [
    'Build my morning skincare routine.',
    'What ingredients should I use?',
    'How can I improve my skin texture?',
  ],
  DIET: [
    'Calculate my daily calorie requirements.',
    'How much protein should I consume?',
    'Create a diet based on my fitness goals.',
  ],
  EXERCISES: [
    'Create my weekly workout routine.',
    'How much cardio should I do?',
    'How can I improve my overall fitness?',
  ],
  HAIRSTYLE: [
    'Which hairstyle suits my face the best?',
    'Explain why this hairstyle suits me.',
    'What should I tell my barber?',
    'How should I style my hair?',
  ],
};

function getStartedModesStorageKey(ownerId: string): string {
  return `dt_chat_started::${ownerId}`;
}

function readStartedModes(ownerId: string): Partial<Record<ChatMode, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getStartedModesStorageKey(ownerId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<ChatMode, boolean>>;
  } catch {
    return {};
  }
}

function writeStartedMode(ownerId: string, mode: ChatMode) {
  if (typeof window === 'undefined') return;
  try {
    const prev = readStartedModes(ownerId);
    if (prev[mode]) return;
    window.localStorage.setItem(
      getStartedModesStorageKey(ownerId),
      JSON.stringify({ ...prev, [mode]: true }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const segments = line.split(/(\*\*[^*]+\*\*)/g).map((seg, sIdx) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return (
              <strong key={sIdx} className="font-semibold text-white">
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return <span key={sIdx}>{seg}</span>;
        });

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <p key={idx} className="pl-3 relative">
              <span className="absolute left-0 text-[#9e9ea6]">•</span>
              {segments}
            </p>
          );
        }
        return <p key={idx}>{segments}</p>;
      })}
    </div>
  );
}

function compressAttachment(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 900 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || 600) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not read attachment.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unsupported image format.'));
    };
    img.src = url;
  });
}

export function ChatbotView({
  ownerId,
  profile,
  latestRecord,
  dailyProgress,
  initialMode,
  initialPrompt,
  onConsumedLaunchTrigger,
}: ChatbotViewProps) {
  const [mode, setMode] = useState<ChatMode>(initialMode ?? 'GENERAL');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [startedModes, setStartedModes] = useState<Partial<Record<ChatMode, boolean>>>(() =>
    readStartedModes(ownerId),
  );
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputId = useId();
  const launchConsumedRef = useRef(false);

  // Sync startedModes map when ownerId changes
  useEffect(() => {
    setStartedModes(readStartedModes(ownerId));
  }, [ownerId]);

  // Load persisted conversation history whenever ownerId or mode changes
  useEffect(() => {
    let cancelled = false;
    setErrorMsg('');
    void DataService.getChatHistory(ownerId, mode).then((saved) => {
      if (!cancelled) {
        setMessages(saved);
        if (saved.length > 0) {
          writeStartedMode(ownerId, mode);
          setStartedModes((prev) => ({ ...prev, [mode]: true }));
        }
      }
    });
    saveLightweightPreferences({ preferredChatMode: mode });
    return () => {
      cancelled = true;
    };
  }, [ownerId, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildProgressSummary = () => {
    if (dailyProgress.length === 0) return null;
    const recent = dailyProgress.slice(-7);
    const count = recent.length;
    return {
      totalDaysLogged: dailyProgress.length,
      recent7DaysCount: count,
      avgWaterLitres: Number(
        (recent.reduce((a, b) => a + b.waterLitres, 0) / count).toFixed(1),
      ),
      avgSleepHours: Number(
        (recent.reduce((a, b) => a + b.sleepHours, 0) / count).toFixed(1),
      ),
      avgCalories: Math.round(
        recent.reduce((a, b) => a + b.caloriesConsumed, 0) / count,
      ),
      latestEntryDate: dailyProgress[dailyProgress.length - 1]?.date ?? null,
    };
  };

  const buildLatestAnalysisSummary = () => {
    if (!latestRecord) return null;
    const { result } = latestRecord;
    return {
      createdAt: latestRecord.createdAt,
      overallRating: result.overallRating,
      pslTier: result.pslTier,
      faceShape: result.faceShape,
      overallConfidence: result.overallConfidence,
      proportions: result.proportions,
      postureRating: result.postureRating,
      subScores: result.subScores,
      summary: result.summary,
      improvementPlan: result.improvementPlan,
    };
  };

  const sendMessage = async (textRaw: string, customMode?: ChatMode) => {
    const trimmed = textRaw.trim();
    if (!trimmed || loading) return;

    const targetMode = customMode ?? mode;
    if (targetMode !== mode) setMode(targetMode);

    // Hide quick actions permanently for this mode once a message is sent
    writeStartedMode(ownerId, targetMode);
    setStartedModes((prev) => ({ ...prev, [targetMode]: true }));
    setModeMenuOpen(false);

    setErrorMsg('');
    setInput('');
    const currentAttach = attachment;
    setAttachment(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      imageDataUrl: currentAttach ?? undefined,
      mode: targetMode,
      createdAt: new Date().toISOString(),
    };

    const existingList =
      targetMode === mode ? messages : await DataService.getChatHistory(ownerId, targetMode);
    const updatedList = [...existingList, userMsg];
    setMessages(updatedList);
    await DataService.saveChatHistory(ownerId, targetMode, updatedList);

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          message: trimmed,
          history: existingList.slice(-10).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          attachmentImageBase64: currentAttach ?? undefined,
          userContext: {
            profile: {
              name: profile.name || null,
              age: profile.age,
              gender: profile.gender || null,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
              bodyFrame: profile.bodyFrame || null,
              dietaryPreferences: profile.dietaryPreferences || null,
              fitnessGoals: profile.fitnessGoals || null,
            },
            latestAnalysisSummary: buildLatestAnalysisSummary(),
            progressSummary: buildProgressSummary(),
            frontImageBase64: latestRecord?.frontPhoto?.dataUrl,
            sideImageBase64: latestRecord?.sidePhoto?.dataUrl,
          },
        }),
      });

      const payload = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || payload.error || !payload.reply) {
        throw new Error(payload.error || 'DARK TRIAD AI failed to respond.');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: payload.reply,
        mode: targetMode,
        createdAt: new Date().toISOString(),
      };
      const finalList = [...updatedList, assistantMsg];
      setMessages(finalList);
      await DataService.saveChatHistory(ownerId, targetMode, finalList);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Network error talking to DARK TRIAD AI.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (launchConsumedRef.current) return;
    if (initialPrompt) {
      launchConsumedRef.current = true;
      void sendMessage(initialPrompt, initialMode ?? 'GENERAL').finally(() => {
        onConsumedLaunchTrigger?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const b64 = await compressAttachment(file);
      setAttachment(b64);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to attach file.');
    }
  };

  const suggestions = QUICK_SUGGESTIONS[mode];
  const showQuickSuggestions = !startedModes[mode] && messages.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col min-h-[76vh] text-left"
    >
      {/* Top Heading Only — Open Left-Aligned Layout */}
      <header className="pb-4 border-b border-white/10">
        <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-[#f4f4f5]">
          DARK TRIAD AI
        </h1>
      </header>

      {/* Open Conversation Area (Completely Empty Before First Message) */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[78%] text-sm ${
                msg.role === 'user'
                  ? 'rounded-2xl border border-white/18 bg-[#222227] px-4 py-3 text-[#f4f4f5]'
                  : 'border-l border-white/18 pl-4 py-1 text-[#e4e4e7]'
              }`}
            >
              {msg.imageDataUrl && (
                <img
                  src={msg.imageDataUrl}
                  alt="Attached photo"
                  className="mb-3 max-h-80 w-auto rounded-xl border border-white/15 object-cover"
                />
              )}
              {renderFormattedText(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2.5 text-xs text-[#a1a1aa]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking in {mode} mode...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="border-l-2 border-red-400/60 pl-3 py-1 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mode-Specific Quick Suggestions — Hidden Permanently Once Mode Has Any Message */}
      {showQuickSuggestions && (
        <div className="pb-4 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(q)}
              className="rounded-full border border-white/15 bg-transparent px-3.5 py-1.5 text-left text-xs text-[#d4d4d8] hover:border-white/35 hover:text-white transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Open Composer Footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="relative border-t border-white/12 pt-4"
      >
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleAttachFile(e)}
          className="sr-only"
        />

        {attachment && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative inline-block">
              <img
                src={attachment}
                alt="Attachment preview"
                className="h-14 w-14 rounded-xl border border-white/20 object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0a0a0a] border border-white/30 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-[#9e9ea6]">Photo attached</span>
          </div>
        )}

        {/* Proportionate Balanced Grid of All 6 Modes When SWITCH MODE Is Clicked */}
        <AnimatePresence>
          {modeMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-[#19191d] p-2.5"
            >
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMode(m.key);
                    setModeMenuOpen(false);
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-colors ${
                    mode === m.key
                      ? 'border-[#f4f4f5] bg-[#f4f4f5] text-[#0a0a0a]'
                      : 'border-white/10 bg-[#141417] text-[#e4e4e7] hover:border-white/28'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold tracking-[0.04em]">
                      {m.label}
                    </span>
                    {mode === m.key && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                  <span
                    className={`mt-1 block text-[10px] leading-snug ${
                      mode === m.key ? 'text-[#0a0a0a]/75' : 'text-[#8e8e95]'
                    }`}
                  >
                    {m.description}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl border border-white/18 bg-transparent p-3 focus-within:border-white/35 transition-colors">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={`Ask DARK TRIAD AI (${mode} mode)...`}
            className="w-full resize-none bg-transparent px-1 text-sm text-[#f4f4f5] placeholder:text-[#7c7c85] focus:outline-none"
          />

          <div className="mt-2 flex items-center justify-between gap-2 pt-1.5">
            <label
              htmlFor={fileInputId}
              title="Attach image for analysis or question"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9e9ea6] hover:bg-white/8 hover:text-white transition-colors"
            >
              <Paperclip className="h-4 w-4" />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModeMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-transparent px-3.5 py-1.5 text-[11px] font-medium text-[#e4e4e7] hover:border-white/38 transition-colors"
              >
                <span>SWITCH MODE · {mode}</span>
                <ChevronDown
                  className={`h-3 w-3 text-[#a1a1aa] transition-transform ${
                    modeMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f4f5] text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:opacity-35"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
