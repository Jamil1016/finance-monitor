'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { isOnline, onOnlineStatusChange } from '@/lib/offline';
import { syncQueuedWrites } from '@/lib/sync';
import { getQueuedWrites } from '@/lib/offline';

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(isOnline());
    const cleanup = onOnlineStatusChange(async (status) => {
      setOnline(status);
      if (status) {
        // Back online - auto sync
        const queued = await getQueuedWrites();
        if (queued.length > 0) {
          setSyncing(true);
          const result = await syncQueuedWrites();
          setSyncResult(result);
          setSyncing(false);
          setTimeout(() => setSyncResult(null), 3000);
        }
      }
    });

    // Check pending count periodically
    const interval = setInterval(async () => {
      const queued = await getQueuedWrites();
      setPendingCount(queued.length);
    }, 5000);

    return () => { cleanup(); clearInterval(interval); };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (online && !syncing && !syncResult && pendingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[80] safe-top">
      {!online && (
        <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium">
          <WifiOff size={14} />
          Offline mode — data will sync when connected
          {pendingCount > 0 && <span className="bg-white/20 rounded-full px-2 py-0.5">{pendingCount} pending</span>}
        </div>
      )}
      {syncing && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium">
          <RefreshCw size={14} className="animate-spin" />
          Syncing {pendingCount} entries...
        </div>
      )}
      {syncResult && (
        <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium">
          <Check size={14} />
          Synced {syncResult.synced} entries{syncResult.failed > 0 ? ` (${syncResult.failed} failed)` : ''}
        </div>
      )}
    </div>
  );
}
