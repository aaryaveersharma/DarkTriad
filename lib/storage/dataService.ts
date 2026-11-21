import {
  AuthSession,
  ChatMessage,
  ChatMode,
  DailyProgressEntry,
  FacialAnalysisRecord,
  UserProfile,
} from '../types';
import { idbDelete, idbGet, idbGetByIndex, idbPut } from './idb';
import { getSupabaseClient, isRemoteSupabaseConfigured } from './supabaseClient';
import {
  clearChatHistoryRemote,
  pullAnalysesRemote,
  pullChatHistoryRemote,
  pullDailyProgressRemote,
  pullProfileRemote,
  pushAnalysisRemote,
  pushChatMessagesRemote,
  pushDailyProgressRemote,
  pushPreferencesRemote,
  pushProfileRemote,
} from './supabaseSync';

export { isRemoteSupabaseConfigured };

const ANON_OWNER_KEY = 'dt_anon_owner_id';
const PREFS_KEY = 'dt_ui_prefs';
const ALL_CHAT_MODES: ChatMode[] = [
  'GENERAL',
  'FEEDBACK',
  'SKINCARE',
  'DIET',
  'EXERCISES',
  'HAIRSTYLE',
];

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
  const next = { ...current, ...prefs };
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));

  if (isRemoteSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        const uid = data.session?.user?.id;
        if (uid) {
          void pushPreferencesRemote(uid, next).catch(() => {});
        }
      });
    }
  }
}

async function getAuthenticatedRemoteUser(ownerId: string): Promise<{ id: string; email?: string } | null> {
  if (!isRemoteSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user && user.id === ownerId) {
      return { id: user.id, email: user.email ?? undefined };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Centralized Data Access Layer.
 * Persists locally in IndexedDB first for offline reliability and zero-latency UX,
 * and automatically syncs with PostgreSQL + private Supabase storage when authenticated.
 */
export const DataService = {
  resolveOwnerId(session: AuthSession | null): string {
    return session?.userId ?? getOrCreateAnonymousOwnerId();
  },

  async getProfile(ownerId: string): Promise<UserProfile> {
    const localExisting = await idbGet<UserProfile>('profiles', ownerId);
    const remoteUser = await getAuthenticatedRemoteUser(ownerId);

    if (remoteUser) {
      try {
        const remote = await pullProfileRemote(ownerId);
        if (remote) {
          await idbPut('profiles', remote);
          return remote;
        }
      } catch {
        // Fallback to local cache when offline
      }
    }

    if (localExisting) return localExisting;
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

    const remoteUser = await getAuthenticatedRemoteUser(updated.ownerId);
    if (remoteUser) {
      try {
        await pushProfileRemote(remoteUser.id, remoteUser.email, updated);
      } catch {
        // IndexedDB holds latest profile safely until next sync
      }
    }
    return updated;
  },

  async getAnalyses(ownerId: string): Promise<FacialAnalysisRecord[]> {
    const localList = await idbGetByIndex<FacialAnalysisRecord>('analyses', 'ownerId', ownerId);
    const localMap = new Map(localList.map((r) => [r.id, r]));
    const remoteUser = await getAuthenticatedRemoteUser(ownerId);

    if (remoteUser) {
      try {
        const remoteList = await pullAnalysesRemote(ownerId, localMap);
        if (remoteList) {
          const remoteIds = new Set(remoteList.map((r) => r.id));

          // Cache remote items locally
          for (const rec of remoteList) {
            await idbPut('analyses', rec);
          }

          // Push any offline-created local scans not yet in Supabase
          const unsyncedLocal = localList.filter((r) => !remoteIds.has(r.id));
          for (const rec of unsyncedLocal) {
            await pushAnalysisRemote(rec).catch(() => {});
          }

          return [...remoteList, ...unsyncedLocal].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        }
      } catch {
        // Fallback to IndexedDB when offline
      }
    }

    return localList.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async saveAnalysis(record: FacialAnalysisRecord): Promise<FacialAnalysisRecord> {
    await idbPut('analyses', record);

    const remoteUser = await getAuthenticatedRemoteUser(record.ownerId);
    if (remoteUser) {
      try {
        await pushAnalysisRemote(record);
      } catch {
        // Preserved locally in IndexedDB; will sync on next getAnalyses()
      }
    }
    return record;
  },

  async getDailyProgress(ownerId: string): Promise<DailyProgressEntry[]> {
    const localList = await idbGetByIndex<DailyProgressEntry>(
      'dailyProgress',
      'ownerId',
      ownerId,
    );
    const remoteUser = await getAuthenticatedRemoteUser(ownerId);

    if (remoteUser) {
      try {
        const remoteList = await pullDailyProgressRemote(ownerId);
        if (remoteList) {
          const merged = new Map<string, DailyProgressEntry>();
          for (const item of remoteList) {
            merged.set(item.date, item);
            await idbPut('dailyProgress', item);
          }
          for (const item of localList) {
            const existing = merged.get(item.date);
            if (!existing || item.updatedAt > existing.updatedAt) {
              merged.set(item.date, item);
              await pushDailyProgressRemote(item).catch(() => {});
            }
          }
          return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
        }
      } catch {
        // Offline fallback
      }
    }

    return localList.sort((a, b) => a.date.localeCompare(b.date));
  },

  async saveDailyProgress(entry: DailyProgressEntry): Promise<DailyProgressEntry> {
    const payload = { ...entry, updatedAt: new Date().toISOString() };
    await idbPut('dailyProgress', payload);

    const remoteUser = await getAuthenticatedRemoteUser(payload.ownerId);
    if (remoteUser) {
      try {
        await pushDailyProgressRemote(payload);
      } catch {
        // Cached locally until synced
      }
    }
    return payload;
  },

  async getChatHistory(ownerId: string, mode: ChatMode): Promise<ChatMessage[]> {
    const key = `${ownerId}::${mode}`;
    const doc = await idbGet<{
      key: string;
      ownerId: string;
      mode: ChatMode;
      messages: ChatMessage[];
    }>('chatHistories', key);
    const localMessages = doc?.messages ?? [];

    const remoteUser = await getAuthenticatedRemoteUser(ownerId);
    if (remoteUser) {
      try {
        const remoteMessages = await pullChatHistoryRemote(ownerId, mode);
        if (remoteMessages) {
          const byId = new Map<string, ChatMessage>();
          for (const m of remoteMessages) byId.set(m.id, m);
          for (const m of localMessages) {
            if (!byId.has(m.id)) {
              byId.set(m.id, m);
            }
          }
          const merged = Array.from(byId.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          await idbPut('chatHistories', { key, ownerId, mode, messages: merged });
          return merged;
        }
      } catch {
        // Offline fallback
      }
    }

    return localMessages;
  },

  async saveChatHistory(
    ownerId: string,
    mode: ChatMode,
    messages: ChatMessage[],
  ): Promise<void> {
    const key = `${ownerId}::${mode}`;
    await idbPut('chatHistories', { key, ownerId, mode, messages });

    const remoteUser = await getAuthenticatedRemoteUser(ownerId);
    if (remoteUser) {
      try {
        await pushChatMessagesRemote(ownerId, mode, messages);
      } catch {
        // Preserved locally until synced
      }
    }
  },

  async clearChatHistory(ownerId: string, mode: ChatMode): Promise<void> {
    const key = `${ownerId}::${mode}`;
    await idbDelete('chatHistories', key);

    const remoteUser = await getAuthenticatedRemoteUser(ownerId);
    if (remoteUser) {
      try {
        await clearChatHistoryRemote(ownerId, mode);
      } catch {
        // Ignore network failure
      }
    }
  },

  /**
   * Migrates anonymous local records (profile, scans, selfies, plans, progress, chat histories)
   * onto an authenticated user ID and pushes them to Supabase if configured.
   */
  async associateAnonymousData(targetUserId: string, email?: string): Promise<void> {
    const anonId = getOrCreateAnonymousOwnerId();
    if (!anonId || anonId === targetUserId) return;

    const anonProfile = await idbGet<UserProfile>('profiles', anonId);
    const existingTargetProfile = await idbGet<UserProfile>('profiles', targetUserId);
    if (anonProfile && (!existingTargetProfile || !existingTargetProfile.name)) {
      const migratedProfile = { ...anonProfile, ownerId: targetUserId };
      await idbPut('profiles', migratedProfile);
      await idbDelete('profiles', anonId);
      const remoteUser = await getAuthenticatedRemoteUser(targetUserId);
      if (remoteUser) {
        await pushProfileRemote(targetUserId, email ?? remoteUser.email, migratedProfile).catch(() => {});
      }
    }

    const anonAnalyses = await idbGetByIndex<FacialAnalysisRecord>('analyses', 'ownerId', anonId);
    for (const item of anonAnalyses) {
      const migrated = { ...item, ownerId: targetUserId };
      await idbPut('analyses', migrated);
      const remoteUser = await getAuthenticatedRemoteUser(targetUserId);
      if (remoteUser) {
        await pushAnalysisRemote(migrated).catch(() => {});
      }
    }

    const anonProgress = await idbGetByIndex<DailyProgressEntry>('dailyProgress', 'ownerId', anonId);
    for (const row of anonProgress) {
      const migrated = {
        ...row,
        id: `${targetUserId}::${row.date}`,
        ownerId: targetUserId,
      };
      await idbPut('dailyProgress', migrated);
      await idbDelete('dailyProgress', row.id);
      const remoteUser = await getAuthenticatedRemoteUser(targetUserId);
      if (remoteUser) {
        await pushDailyProgressRemote(migrated).catch(() => {});
      }
    }

    for (const mode of ALL_CHAT_MODES) {
      const anonMessages = await idbGet<{
        key: string;
        ownerId: string;
        mode: ChatMode;
        messages: ChatMessage[];
      }>('chatHistories', `${anonId}::${mode}`);

      if (anonMessages?.messages?.length) {
        const targetMessages = await this.getChatHistory(targetUserId, mode);
        const merged = [...targetMessages, ...anonMessages.messages].filter(
          (msg, idx, arr) => arr.findIndex((m) => m.id === msg.id) === idx,
        );
        await this.saveChatHistory(targetUserId, mode, merged);
        await idbDelete('chatHistories', `${anonId}::${mode}`);
      }
    }
  },
};
