import {
  AuthSession,
  ChatMessage,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  UserProfile,
} from '../types';
import { idbDelete, idbGet, idbGetByIndex, idbPut } from './idb';

const ANON_OWNER_KEY = 'dt_anon_owner_id';
const PREFS_KEY = 'dt_ui_prefs';

export interface LightweightPreferences {
  showLandmarkLines: boolean;
  preferredChatMode: ChatMode;
}

export function getOrCreateAnonymousOwnerId(): string {
  if (typeof window === 'undefined') return 'anon-ssr';
  const existing = window.localStorage.getItem(ANON_OWNER_KEY);
  if (existing) return existing;
  const fresh = `anon_${crypto.randomUUID()}`;
  window.localStorage.setItem(ANON_OWNER_KEY, fresh);
  return fresh;
}

export function getLightweightPreferences(): LightweightPreferences {
  if (typeof window === 'undefined') {
    return { showLandmarkLines: true, preferredChatMode: 'GENERAL' };
  }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { showLandmarkLines: true, preferredChatMode: 'GENERAL' };
    const parsed = JSON.parse(raw) as Partial<LightweightPreferences>;
    return {
      showLandmarkLines: parsed.showLandmarkLines ?? true,
      preferredChatMode: parsed.preferredChatMode ?? 'GENERAL',
    };
  } catch {
    return { showLandmarkLines: true, preferredChatMode: 'GENERAL' };
  }
}

export function saveLightweightPreferences(prefs: Partial<LightweightPreferences>): void {
  if (typeof window === 'undefined') return;
  const current = getLightweightPreferences();
  window.localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

export function isRemoteSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Centralized Data Access Layer.
 * Uses IndexedDB locally for all heavy data & selfies and exposes clean methods
 * ready to synchronize with RemoteProvider (PostgreSQL/Supabase) when env keys exist.
 */
export const DataService = {
  resolveOwnerId(session: AuthSession | null): string {
    return session?.userId ?? getOrCreateAnonymousOwnerId();
  },

  async getProfile(ownerId: string): Promise<UserProfile> {
    const existing = await idbGet<UserProfile>('profiles', ownerId);
    if (existing) return existing;
    return {
      ownerId,
      name: '',
      age: null,
      gender: '',
      heightCm: null,
      weightKg: null,
      bodyFrame: '',
      dietaryPreferences: '',
      fitnessGoals: '',
      updatedAt: new Date().toISOString(),
    };
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const updated = { ...profile, updatedAt: new Date().toISOString() };
    await idbPut('profiles', updated);
    return updated;
  },

  async getAnalyses(ownerId: string): Promise<FacialAnalysisRecord[]> {
    const list = await idbGetByIndex<FacialAnalysisRecord>('analyses', 'ownerId', ownerId);
    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async saveAnalysis(record: FacialAnalysisRecord): Promise<FacialAnalysisRecord> {
    await idbPut('analyses', record);
    return record;
  },

  async getDailyProgress(ownerId: string): Promise<DailyProgressEntry[]> {
    const list = await idbGetByIndex<DailyProgressEntry>('dailyProgress', 'ownerId', ownerId);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  },

  async saveDailyProgress(entry: DailyProgressEntry): Promise<DailyProgressEntry> {
    const payload = { ...entry, updatedAt: new Date().toISOString() };
    await idbPut('dailyProgress', payload);
    return payload;
  },

  async getChatHistory(ownerId: string, mode: ChatMode): Promise<ChatMessage[]> {
    const key = `${ownerId}::${mode}`;
    const doc = await idbGet<{ key: string; ownerId: string; mode: ChatMode; messages: ChatMessage[] }>(
      'chatHistories',
      key,
    );
    return doc?.messages ?? [];
  },

  async saveChatHistory(
    ownerId: string,
    mode: ChatMode,
    messages: ChatMessage[],
  ): Promise<void> {
    const key = `${ownerId}::${mode}`;
    await idbPut('chatHistories', { key, ownerId, mode, messages });
  },

  async clearChatHistory(ownerId: string, mode: ChatMode): Promise<void> {
    const key = `${ownerId}::${mode}`;
    await idbDelete('chatHistories', key);
  },

  /**
   * Migrates anonymous local records (profile, scans, selfies, plans, progress, chat histories)
   * onto a newly registered / signed-in user ID without losing anything.
   */
  async associateAnonymousData(targetUserId: string): Promise<void> {
    const anonId = getOrCreateAnonymousOwnerId();
    if (!anonId || anonId === targetUserId) return;

    const anonProfile = await idbGet<UserProfile>('profiles', anonId);
    const existingTargetProfile = await idbGet<UserProfile>('profiles', targetUserId);
    if (anonProfile && !existingTargetProfile) {
      await idbPut('profiles', { ...anonProfile, ownerId: targetUserId });
    }

    const anonAnalyses = await idbGetByIndex<FacialAnalysisRecord>('analyses', 'ownerId', anonId);
    for (const item of anonAnalyses) {
      await idbPut('analyses', { ...item, ownerId: targetUserId });
    }

    const anonProgress = await idbGetByIndex<DailyProgressEntry>('dailyProgress', 'ownerId', anonId);
    for (const row of anonProgress) {
      await idbPut('dailyProgress', {
        ...row,
        id: `${targetUserId}::${row.date}`,
        ownerId: targetUserId,
      });
    }

    const modes: ChatMode[] = [
      'GENERAL',
      'FEEDBACK',
      'SKINCARE',
      'DIET',
      'EXERCISES',
      'HAIRSTYLE',
    ];
    for (const mode of modes) {
      const anonMessages = await this.getChatHistory(anonId, mode);
      if (anonMessages.length > 0) {
        const targetMessages = await this.getChatHistory(targetUserId, mode);
        const merged = [...targetMessages, ...anonMessages].filter(
          (msg, idx, arr) => arr.findIndex((m) => m.id === msg.id) === idx,
        );
        await this.saveChatHistory(targetUserId, mode, merged);
      }
    }
  },
};
