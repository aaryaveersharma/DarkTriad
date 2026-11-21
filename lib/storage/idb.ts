const DB_NAME = 'darktriad_local_db';
const DB_VERSION = 1;

export type StoreName =
  | 'users'
  | 'sessions'
  | 'profiles'
  | 'analyses'
  | 'dailyProgress'
  | 'chatHistories';

const ALL_STORES: StoreName[] = [
  'users',
  'sessions',
  'profiles',
  'analyses',
  'dailyProgress',
  'chatHistories',
];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDarkTriadDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is unavailable in this browser environment.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'ownerId' });
      }
      if (!db.objectStoreNames.contains('analyses')) {
        const analysisStore = db.createObjectStore('analyses', { keyPath: 'id' });
        analysisStore.createIndex('ownerId', 'ownerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('dailyProgress')) {
        const progStore = db.createObjectStore('dailyProgress', { keyPath: 'id' });
        progStore.createIndex('ownerId', 'ownerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('chatHistories')) {
        db.createObjectStore('chatHistories', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Unable to open local storage database.'));
    };
  });

  return dbPromise;
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
  try {
    const db = await openDarkTriadDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await openDarkTriadDB();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbGetByIndex<T>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  try {
    const db = await openDarkTriadDB();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDarkTriadDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDarkTriadDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await openDarkTriadDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ALL_STORES, 'readwrite');
    for (const s of ALL_STORES) {
      tx.objectStore(s).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
