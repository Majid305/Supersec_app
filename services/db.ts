
import { DocumentData, RejectedCheck } from '../types';

const DB_NAME = 'SupersecDB';
const STORE_DOCS = 'documents';
const STORE_CHECKS = 'rejected_checks';
const DB_VERSION = 2; // Incremented version

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CHECKS)) {
        const checkStore = db.createObjectStore(STORE_CHECKS, { keyPath: 'id' });
        checkStore.createIndex('created_at', 'created_at', { unique: false });
        checkStore.createIndex('banque', 'banque', { unique: false });
        checkStore.createIndex('mois_rejet', 'mois_rejet', { unique: false });
      }
    };
  });
};

// --- Documents CRUD ---
export const saveDocument = async (doc: DocumentData): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_DOCS], 'readwrite');
  transaction.objectStore(STORE_DOCS).put(doc);
};

export const getAllDocuments = async (): Promise<DocumentData[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_DOCS], 'readonly');
    const request = transaction.objectStore(STORE_DOCS).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.created_at - a.created_at));
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_DOCS], 'readwrite');
  transaction.objectStore(STORE_DOCS).delete(id);
};

// --- Checks CRUD ---
export const saveCheck = async (check: RejectedCheck): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_CHECKS], 'readwrite');
  transaction.objectStore(STORE_CHECKS).put(check);
};

export const getAllChecks = async (): Promise<RejectedCheck[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_CHECKS], 'readonly');
    const request = transaction.objectStore(STORE_CHECKS).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.created_at - a.created_at));
  });
};

export const deleteCheck = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_CHECKS], 'readwrite');
  transaction.objectStore(STORE_CHECKS).delete(id);
};

export const restoreBackup = async (backupData: any[]): Promise<number> => {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_DOCS, STORE_CHECKS], 'readwrite');
      const docStore = transaction.objectStore(STORE_DOCS);
      const checkStore = transaction.objectStore(STORE_CHECKS);
      let count = 0;

      backupData.forEach(item => {
          if (item.banque) {
              checkStore.put(item);
          } else {
              docStore.put(item);
          }
          count++;
      });
      transaction.oncomplete = () => resolve(count);
    });
};
