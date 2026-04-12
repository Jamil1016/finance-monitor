// Offline support: IndexedDB cache + write queue

const DB_NAME = 'fintrack_offline';
const DB_VERSION = 1;
const STORES = {
  cache: 'data_cache',    // Cached Supabase data
  queue: 'write_queue',   // Pending writes for when back online
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.cache)) {
        db.createObjectStore(STORES.cache, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.queue)) {
        db.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- CACHE: Store/retrieve Supabase data locally ----

export async function cacheData(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.cache, 'readwrite');
    tx.objectStore(STORES.cache).put({ key, data, timestamp: Date.now() });
    db.close();
  } catch {}
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.cache, 'readonly');
      const request = tx.objectStore(STORES.cache).get(key);
      request.onsuccess = () => {
        db.close();
        resolve(request.result?.data ?? null);
      };
      request.onerror = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

// ---- QUEUE: Store pending writes for sync ----

interface QueuedWrite {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export async function queueWrite(write: Omit<QueuedWrite, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.queue, 'readwrite');
    tx.objectStore(STORES.queue).add({ ...write, timestamp: Date.now() });
    db.close();
  } catch {}
}

export async function getQueuedWrites(): Promise<QueuedWrite[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.queue, 'readonly');
      const request = tx.objectStore(STORES.queue).getAll();
      request.onsuccess = () => { db.close(); resolve(request.result || []); };
      request.onerror = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.queue, 'readwrite');
    tx.objectStore(STORES.queue).clear();
    db.close();
  } catch {}
}

export async function removeFromQueue(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.queue, 'readwrite');
    tx.objectStore(STORES.queue).delete(id);
    db.close();
  } catch {}
}

// ---- ONLINE STATUS ----

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
