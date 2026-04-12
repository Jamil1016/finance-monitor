// Sync engine: process queued offline writes when back online

import { supabase } from './supabase';
import { getQueuedWrites, removeFromQueue, clearQueue } from './offline';

export async function syncQueuedWrites(): Promise<{ synced: number; failed: number }> {
  const writes = await getQueuedWrites();
  if (writes.length === 0) return { synced: 0, failed: 0 };

  // Check if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, failed: writes.length };

  let synced = 0;
  let failed = 0;

  for (const write of writes) {
    try {
      if (write.action === 'insert') {
        const { error } = await supabase.from(write.table).insert({
          ...write.data,
          user_id: user.id,
        });
        if (error) throw error;
      } else if (write.action === 'update') {
        const { id, ...updates } = write.data;
        const { error } = await supabase.from(write.table).update(updates).eq('id', id);
        if (error) throw error;
      } else if (write.action === 'delete') {
        const { error } = await supabase.from(write.table).delete().eq('id', write.data.id);
        if (error) throw error;
      }

      // Remove from queue after successful sync
      if (write.id) await removeFromQueue(write.id);
      synced++;
    } catch (e) {
      console.error('Sync failed for write:', write, e);
      failed++;
    }
  }

  return { synced, failed };
}
