const DB_NAME = 'knowhow-offline';
const DB_VERSION = 1;

const STORES = {
  KNOWLEDGE_CACHE: 'knowledgeCache',
  DRAFT_MESSAGES: 'draftMessages',
  META: 'meta',
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_CACHE)) {
        db.createObjectStore(STORES.KNOWLEDGE_CACHE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.DRAFT_MESSAGES)) {
        const store = db.createObjectStore(STORES.DRAFT_MESSAGES, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(storeName, mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);

      tx.oncomplete = () => {
        db.close();
        resolve(result._result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };

      // Handle IDBRequest-based results
      if (result instanceof IDBRequest) {
        result.onsuccess = () => {
          result._result = result.result;
        };
      } else {
        result._result = undefined;
      }
    });
  });
}

// --- Knowledge Cache ---

export async function cacheKnowledgeList(items) {
  const db = await openDB();
  const tx = db.transaction(STORES.KNOWLEDGE_CACHE, 'readwrite');
  const store = tx.objectStore(STORES.KNOWLEDGE_CACHE);

  // Clear existing cache
  store.clear();

  // Add all items
  for (const item of items) {
    store.put(item);
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  // Store cache timestamp
  const metaTx = db.transaction(STORES.META, 'readwrite');
  metaTx.objectStore(STORES.META).put({
    key: 'knowledgeCacheTime',
    value: Date.now(),
  });

  await new Promise((resolve, reject) => {
    metaTx.oncomplete = () => {
      db.close();
      resolve();
    };
    metaTx.onerror = () => {
      db.close();
      reject(metaTx.error);
    };
  });
}

export async function getCachedKnowledgeList() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.KNOWLEDGE_CACHE, 'readonly');
    const store = tx.objectStore(STORES.KNOWLEDGE_CACHE);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// --- Draft Messages (offline queue) ---

export async function saveDraftMessage(draft) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFT_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORES.DRAFT_MESSAGES);
    const request = store.add({
      ...draft,
      createdAt: Date.now(),
    });

    request.onsuccess = () => {
      db.close();
      resolve(request.result); // returns the auto-generated id
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getDraftMessages() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFT_MESSAGES, 'readonly');
    const store = tx.objectStore(STORES.DRAFT_MESSAGES);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      // Sort by createdAt ascending
      const results = (request.result || []).sort((a, b) => a.createdAt - b.createdAt);
      resolve(results);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteDraftMessage(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFT_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORES.DRAFT_MESSAGES);
    store.delete(id);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearDraftMessages() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFT_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORES.DRAFT_MESSAGES);
    store.clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getDraftMessageCount() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFT_MESSAGES, 'readonly');
    const store = tx.objectStore(STORES.DRAFT_MESSAGES);
    const request = store.count();

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
