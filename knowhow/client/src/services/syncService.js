import { getDraftMessages, deleteDraftMessage } from './offlineDB';
import { aiAPI } from './api';

let isSyncing = false;
let syncListeners = [];

export function onSyncStatusChange(listener) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(status) {
  syncListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
}

export async function syncDraftMessages() {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  isSyncing = true;
  notifyListeners({ isSyncing: true });

  let synced = 0;
  let failed = 0;

  try {
    const drafts = await getDraftMessages();

    if (drafts.length === 0) {
      return { synced: 0, failed: 0 };
    }

    for (const draft of drafts) {
      try {
        await aiAPI.chat({
          message: draft.message,
          mode: draft.mode || 'office',
          session_id: draft.sessionId || undefined,
          conversation_history: draft.conversationHistory || [],
        });

        await deleteDraftMessage(draft.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync draft message:', draft.id, error);
        failed++;
        // Stop syncing if we hit a network error (means we went offline again)
        if (!navigator.onLine) break;
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    isSyncing = false;
    notifyListeners({ isSyncing: false, synced, failed });
  }

  return { synced, failed };
}

// Auto-sync when coming back online
let initialized = false;

export function initAutoSync() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('online', () => {
    // Small delay to ensure network is truly available
    setTimeout(() => {
      syncDraftMessages();
    }, 1000);
  });
}
