'use client';

import { ArrowUp, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { DataService } from '@/lib/storage/dataService';
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

const UNIFIED_CHAT_MODE: ChatMode = 'GENERAL';

const OVERALL_QUICK_SUGGESTIONS: string[] = [
  'What should I improve about my face?',
  'Build my morning & night skincare routine',
  'How many calories & protein should I eat?',
  'Create my workout & jawline routine',
  'Which hairstyle suits my face shape?',
];

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
  initialPrompt,
  onConsumedLaunchTrigger,
}: ChatbotViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputId = useId();
  const launchConsumedRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setErrorMsg('');
    void DataService.getChatHistory(ownerId, UNIFIED_CHAT_MODE).then((saved) => {
      if (!cancelled) {
        setMessages(saved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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

  const sendMessage = async (textRaw: string) => {
    const trimmed = textRaw.trim();
    if (!trimmed || loading) return;

    setErrorMsg('');
    setInput('');
    const currentAttach = attachment;
    setAttachment(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      imageDataUrl: currentAttach ?? undefined,
      mode: UNIFIED_CHAT_MODE,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [...messages, userMsg];
    setMessages(updatedList);
    await DataService.saveChatHistory(ownerId, UNIFIED_CHAT_MODE, updatedList);

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: UNIFIED_CHAT_MODE,
          message: trimmed,
          history: messages.slice(-10).map((m) => ({
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
        mode: UNIFIED_CHAT_MODE,
        createdAt: new Date().toISOString(),
      };
      const finalList = [...updatedList, assistantMsg];
      setMessages(finalList);
      await DataService.saveChatHistory(ownerId, UNIFIED_CHAT_MODE, finalList);
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
      void sendMessage(initialPrompt).finally(() => {
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

  const showEmptyIntro = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full text-left overflow-hidden">
      {/* Region 1: Independently scrollable conversation area (scroll locked inside) */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-0.5 py-1 space-y-4 min-h-0"
      >
        {showEmptyIntro && (
          <div className="min-h-full flex flex-col items-center justify-center pb-12 sm:pb-16 px-3 text-center">
            <h2 className="max-w-lg text-balance text-[clamp(1.6rem,3.6vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.035em] text-[#f4f4f5]">
              Hey, How are you feeling today?
            </h2>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[94%] sm:max-w-[82%] text-sm ${
                msg.role === 'user'
                  ? 'rounded-2xl border border-white/18 bg-[#222227] px-4 py-3 text-[#f4f4f5]'
                  : 'pl-0.5 py-1 text-[#e4e4e7]'
              }`}
            >
              {msg.imageDataUrl && (
                <img
                  src={msg.imageDataUrl}
                  alt="Attached photo"
                  className="mb-3 max-h-80 w-auto rounded-xl border border-white/15 object-cover"
                />
              )}

              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              ) : (
                <div className="space-y-1.5 text-sm leading-relaxed text-[#e4e4e7]">
                  <Markdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-base font-semibold text-[#f4f4f5] mt-2.5 mb-1 first:mt-0">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h4 className="text-sm font-semibold text-[#f4f4f5] mt-2 mb-1 first:mt-0">
                          {children}
                        </h4>
                      ),
                      h3: ({ children }) => (
                        <h5 className="text-sm font-semibold text-[#f4f4f5] mt-2 mb-1 first:mt-0">
                          {children}
                        </h5>
                      ),
                      p: ({ children }) => (
                        <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-1.5 space-y-1 pl-4 list-disc text-[#d4d4d8]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-1.5 space-y-1 pl-4 list-decimal text-[#d4d4d8]">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="pl-0.5 leading-relaxed">{children}</li>
                      ),
                    }}
                  >
                    {msg.text}
                  </Markdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2.5 text-xs text-[#a1a1aa] py-1 pl-0.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Region 2: Fixed quick-actions overall area right above composer (disappears after first prompt) */}
      {showEmptyIntro && (
        <div className="shrink-0 pt-1 pb-2 flex flex-wrap gap-1.5">
          {OVERALL_QUICK_SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(q)}
              className="rounded-full border border-white/18 bg-white/[0.04] px-3.5 py-1.5 text-left text-xs text-[#d4d4d8] hover:border-white/35 hover:text-white transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Region 3: Fixed circular/pill composer locked at bottom */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="shrink-0 relative pt-1 pb-1"
      >
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          onChange={(e) => void handleAttachFile(e)}
          className="sr-only"
        />

        {attachment && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="relative inline-block">
              <img
                src={attachment}
                alt="Attachment preview"
                className="h-12 w-12 rounded-xl border border-white/20 object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0a0a0a] border border-white/30 text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <span className="text-xs text-[#9e9ea6]">Photo attached</span>
          </div>
        )}

        <div className="relative flex items-center gap-1.5 rounded-full border border-white/16 bg-[#1e1e22] px-2 py-1.5 min-h-[50px] focus-within:border-white/35 transition-colors shadow-lg">
          {/* Plus icon for image upload */}
          <label
            htmlFor={fileInputId}
            title="Attach image"
            aria-label="Attach image"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#d4d4d8] hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus className="h-5 w-5 stroke-[2]" />
          </label>

          {/* Compact single-line / expanding text input */}
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => {
              window.scrollTo(0, 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Ask anything"
            className="flex-1 min-w-0 resize-none bg-transparent py-1.5 px-1 text-sm text-[#f4f4f5] placeholder:text-[#8e8e95] focus:outline-none leading-snug max-h-24 overflow-y-auto"
          />

          {/* Circular Send Button */}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            <ArrowUp className="h-4.5 w-4.5 stroke-[2.2]" />
          </button>
        </div>
      </form>
    </div>
  );
}
