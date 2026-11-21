'use client';

import {
  ArrowUp,
  Check,
  ChevronDown,
  Loader2,
  Paperclip,
  Scissors,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
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
  autoTriggerHairstylePreview?: boolean;
  onConsumedLaunchTrigger?: () => void;
}

const MODES: Array<{ key: ChatMode; label: string; description: string }> = [
  { key: 'GENERAL', label: 'GENERAL', description: 'Complete AI with all scans & goals' },
  { key: 'FEEDBACK', label: 'FEEDBACK', description: 'Facial structure, ratios & harmony' },
  { key: 'SKINCARE', label: 'SKINCARE', description: 'Skin concerns, actives & routines' },
  { key: 'DIET', label: 'DIET', description: 'Nutrition, macros & potassium/sodium' },
  { key: 'EXERCISES', label: 'EXERCISES', description: 'Training, cardio & neck posture' },
  { key: 'HAIRSTYLE', label: 'HAIRSTYLE', description: 'Cut framing & AI visual preview' },
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

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Render **bold** inline segments safely without raw HTML injection
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

function detectHairstylePreviewStyle(
  message: string,
  recommendedStyle: string | undefined,
): string | null {
  const lower = message.toLowerCase();
  const isVisualTrigger =
    /(show me|see how i (would|will) look|preview me|preview my|generate.*hair|put.*hairstyle on me|with a .* (haircut|fringe|fade|crop|quiff|mullet|pompadour|slick|crew|buzz))/i.test(
      lower,
    );
  if (!isVisualTrigger) return null;

  const matchWith = message.match(
    /(?:with|try|wearing)\s+(?:a|an|the)?\s*([^.?!]{3,60})/i,
  );
  if (matchWith?.[1]) {
    const cleaned = matchWith[1].trim();
    if (/recommended hairstyle/i.test(cleaned) && recommendedStyle) {
      return recommendedStyle;
    }
    return cleaned;
  }
  return recommendedStyle || 'Textured Modern Fringe with Tapered Sides';
}

export function ChatbotView({
  ownerId,
  profile,
  latestRecord,
  dailyProgress,
  initialMode,
  initialPrompt,
  autoTriggerHairstylePreview,
  onConsumedLaunchTrigger,
}: ChatbotViewProps) {
  const [mode, setMode] = useState<ChatMode>(initialMode ?? 'GENERAL');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputId = useId();
  const launchConsumedRef = useRef(false);

  // Load persisted conversation history whenever ownerId or mode changes
  useEffect(() => {
    let cancelled = false;
    setErrorMsg('');
    void DataService.getChatHistory(ownerId, mode).then((saved) => {
      if (!cancelled) {
        setMessages(saved);
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

  const triggerHairstylePreview = async (
    styleSpecRaw?: string,
    promptLabel?: string,
  ) => {
    setErrorMsg('');
    const recommendedStyle =
      latestRecord?.result.improvementPlan?.hairstyle?.recommendedStyle;
    const styleSpec = (styleSpecRaw || recommendedStyle || '').trim();

    if (!latestRecord?.frontPhoto?.dataUrl || !styleSpec) {
      const assistantNotice: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Please complete a facial scan first so I have your front photograph and recommended hairstyle specification before generating a visual preview.',
        mode,
        createdAt: new Date().toISOString(),
      };
      const next = [...messages, assistantNotice];
      setMessages(next);
      await DataService.saveChatHistory(ownerId, mode, next);
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: promptLabel || `SEE HOW I WILL LOOK WITH MY RECOMMENDED HAIRSTYLE (${styleSpec})`,
      mode,
      createdAt: new Date().toISOString(),
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    await DataService.saveChatHistory(ownerId, mode, withUser);

    setLoading(true);
    try {
      const res = await fetch('/api/hairstyle-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontImageBase64: latestRecord.frontPhoto.dataUrl,
          sideImageBase64: latestRecord.sidePhoto?.dataUrl,
          hairstyleSpec: styleSpec,
        }),
      });
      const data = (await res.json()) as {
        imageDataUrl?: string;
        caption?: string;
        error?: string;
      };
      if (!res.ok || data.error || !data.imageDataUrl) {
        throw new Error(data.error || 'Could not generate hairstyle preview.');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `**AI Hairstyle Preview — ${styleSpec}**\nPreserved your facial bone geometry, eye area, skin tone, and lighting while framing your head shape (${latestRecord.result.faceShape}).\n\n**Barber spec:** ${latestRecord.result.improvementPlan.hairstyle.barberInstructions}`,
        imageDataUrl: data.imageDataUrl,
        mode,
        createdAt: new Date().toISOString(),
      };
      const next = [...withUser, assistantMsg];
      setMessages(next);
      await DataService.saveChatHistory(ownerId, mode, next);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate hairstyle preview.',
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (textRaw: string, customMode?: ChatMode) => {
    const trimmed = textRaw.trim();
    if (!trimmed || loading) return;

    const targetMode = customMode ?? mode;
    if (targetMode !== mode) setMode(targetMode);

    // Check if user requested visual hairstyle preview naturally
    const previewStyle = detectHairstylePreviewStyle(
      trimmed,
      latestRecord?.result.improvementPlan?.hairstyle?.recommendedStyle,
    );
    if (previewStyle) {
      setInput('');
      await triggerHairstylePreview(previewStyle, trimmed);
      return;
    }

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
        throw new Error(payload.error || 'Dactride AI failed to respond.');
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
        err instanceof Error ? err.message : 'Network error talking to Dactride AI.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle cross-view launch triggers (Dashboard composer or Hairstyle Preview CTA)
  useEffect(() => {
    if (launchConsumedRef.current) return;
    if (autoTriggerHairstylePreview) {
      launchConsumedRef.current = true;
      setMode('HAIRSTYLE');
      void triggerHairstylePreview().finally(() => {
        onConsumedLaunchTrigger?.();
      });
    } else if (initialPrompt) {
      launchConsumedRef.current = true;
      void sendMessage(initialPrompt, initialMode ?? 'GENERAL').finally(() => {
        onConsumedLaunchTrigger?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, autoTriggerHairstylePreview]);

  const handleClearConversation = async () => {
    await DataService.clearChatHistory(ownerId, mode);
    setMessages([]);
    setErrorMsg('');
  };

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

  return (
    <div className="flex flex-col rounded-[28px] border border-white/12 bg-[#17171a] min-h-[74vh] overflow-hidden shadow-2xl">
      {/* Header matching Stitch Dark UI + Dactride Branding */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#1b1b1f] px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-medium tracking-tight text-[#f4f4f5]">
              DACTRIDE AI
            </h1>
            <span className="rounded-full border border-white/20 bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#e4e4e7]">
              {mode} MODE
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#9e9ea6]">
            Ask the AI questions related to your face and improvement journey.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#252529] px-3.5 py-1.5 text-xs font-medium text-[#f4f4f5] hover:bg-[#2e2e34]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span>SWITCH MODE</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#a1a1aa]" />
            </button>

            {modeMenuOpen && (
              <div className="absolute right-0 top-10 z-40 w-64 rounded-2xl border border-white/15 bg-[#1e1e23] p-1.5 shadow-2xl">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setMode(m.key);
                      setModeMenuOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                      mode === m.key
                        ? 'bg-[#f4f4f5] text-[#0a0a0a]'
                        : 'text-[#e4e4e7] hover:bg-white/6'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-semibold">{m.label}</span>
                      <span
                        className={`block text-[10px] ${
                          mode === m.key ? 'text-[#0a0a0a]/70' : 'text-[#8e8e95]'
                        }`}
                      >
                        {m.description}
                      </span>
                    </div>
                    {mode === m.key && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleClearConversation()}
            title="Clear current mode conversation"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#232327] px-3 py-1.5 text-xs text-[#d4d4d8] hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Mode Pills Strip for instant 1-tap switching on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/8 bg-[#151518] px-4 py-2 sm:px-6 no-scrollbar">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.06em] transition-colors ${
              mode === m.key
                ? 'bg-white/15 text-white border border-white/30'
                : 'text-[#8e8e95] hover:text-[#e4e4e7]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Scrollable Chat History Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-6 text-center space-y-4">
            <p className="text-xs font-medium tracking-[0.1em] text-[#8e8e95] uppercase">
              {mode} Mode Ready ·{' '}
              {latestRecord
                ? `Connected to ${latestRecord.result.faceShape} scan (${latestRecord.result.overallRating.toFixed(1)}/10)`
                : 'No facial scan yet'}
            </p>
            <p className="text-sm text-[#a1a1aa]">
              {mode === 'GENERAL' &&
                'Ask anything about your facial ratings, jawline, symmetry, skincare, nutrition, workouts, or hairstyle.'}
              {mode === 'FEEDBACK' &&
                'Focused on observable structural strengths, weaknesses, proportions, and realistic non-surgical improvements.'}
              {mode === 'SKINCARE' &&
                'Focused on visible skin tone, texture, AM/PM routines, active ingredients, and suitable formulations.'}
              {mode === 'DIET' &&
                'Focused on nutrition targets, protein, potassium/sodium balance, and sustainable Indian meal plans.'}
              {mode === 'EXERCISES' &&
                'Focused on resistance training, cardio, neck posture drills, and realistic jaw/masseter guidance.'}
              {mode === 'HAIRSTYLE' &&
                'Focused on hair framing for your bone structure — plus AI hairstyle previews directly on your portrait.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[78%] rounded-[22px] px-4 py-3.5 ${
                msg.role === 'user'
                  ? 'border border-white/15 bg-[#2a2a30] text-[#f4f4f5]'
                  : 'border border-white/10 bg-[#202024] text-[#e4e4e7]'
              }`}
            >
              {msg.imageDataUrl && (
                <img
                  src={msg.imageDataUrl}
                  alt={msg.role === 'assistant' ? 'AI hairstyle preview' : 'Attached photo'}
                  className="mb-3 max-h-80 w-auto rounded-2xl border border-white/15 object-cover"
                />
              )}
              {renderFormattedText(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-[#232327] px-4 py-2 text-xs text-[#d4d4d8]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>
                {mode === 'HAIRSTYLE'
                  ? 'Analyzing or rendering hairstyle preview...'
                  : `Thinking in ${mode} mode...`}
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Dynamic Mode-Specific Quick Suggestions */}
      <div className="border-t border-white/8 bg-[#161619] px-4 py-3 sm:px-6 space-y-2.5">
        {mode === 'HAIRSTYLE' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void triggerHairstylePreview()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#f4f4f5] px-5 py-2.5 text-xs font-semibold tracking-[0.04em] text-[#0a0a0a] hover:opacity-95 disabled:opacity-50"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>SEE HOW I WILL LOOK WITH MY RECOMMENDED HAIRSTYLE</span>
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(q)}
              className="rounded-full border border-white/12 bg-[#212126] px-3.5 py-1.5 text-left text-xs text-[#d4d4d8] hover:border-white/30 hover:text-white transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Stitch-Style Dark Composer Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="border-t border-white/10 bg-[#1a1a1e] p-3.5 sm:p-4"
      >
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleAttachFile(e)}
          className="sr-only"
        />

        {attachment && (
          <div className="mb-2.5 flex items-center gap-2">
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

        <div className="rounded-[22px] border border-white/15 bg-[#222227] p-3">
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
            placeholder={
              mode === 'HAIRSTYLE'
                ? 'Ask about hairstyles or try: "Show me how I would look with a textured fringe"'
                : `Ask Dactride AI (${mode} mode)...`
            }
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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#2a2a30] px-3 py-1.5 text-[11px] font-medium text-[#e4e4e7] hover:bg-[#33333a]"
              >
                <Sparkles className="h-3 w-3 text-[#a1a1aa]" />
                <span>SWITCH MODE · {mode}</span>
                <ChevronDown className="h-3 w-3 text-[#a1a1aa]" />
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
    </div>
  );
}
