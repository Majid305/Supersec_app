import { DocumentData, RejectedCheck } from '../types';

const DB_NAME = 'SupersecDB';
const STORE_DOCS = 'documents';
const STORE_CHECKS = 'rejected_checks';
const DB_VERSION = 2;

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

export const getAllData = async (): Promise<{ documents: DocumentData[], checks: RejectedCheck[] }> => {
  const docs = await getAllDocuments();
  const checks = await getAllChecks();
  return { documents: docs, checks };
};

export const saveDocument = async (doc: DocumentData): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DOCS], 'readwrite');
    const store = transaction.objectStore(STORE_DOCS);
    store.put(doc);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllDocuments = async (): Promise<DocumentData[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DOCS], 'readonly');
    const store = transaction.objectStore(STORE_DOCS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.created_at - a.created_at));
    request.onerror = () => reject(request.error);
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DOCS], 'readwrite');
    const store = transaction.objectStore(STORE_DOCS);
    const request = store.delete(id);
    request.onsuccess = () => {}; 
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveCheck = async (check: RejectedCheck): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHECKS], 'readwrite');
    const store = transaction.objectStore(STORE_CHECKS);
    store.put(check);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllChecks = async (): Promise<RejectedCheck[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHECKS], 'readonly');
    const store = transaction.objectStore(STORE_CHECKS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.created_at - a.created_at));
    request.onerror = () => reject(request.error);
  });
};

export const deleteCheck = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_CHECKS], 'readwrite');
    const store = transaction.objectStore(STORE_CHECKS);
    const request = store.delete(id);
    request.onsuccess = () => {};
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const restoreBackup = async (backupData: any): Promise<number> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_DOCS, STORE_CHECKS], 'readwrite');
      const docStore = transaction.objectStore(STORE_DOCS);
      const checkStore = transaction.objectStore(STORE_CHECKS);
      let count = 0;

      try {
        if (backupData.documents || backupData.checks) {
          if (Array.isArray(backupData.documents)) {
            backupData.documents.forEach((item: any) => { docStore.put(item); count++; });
          }
          if (Array.isArray(backupData.checks)) {
            backupData.checks.forEach((item: any) => { checkStore.put(item); count++; });
          }
        } else if (Array.isArray(backupData)) {
          backupData.forEach(item => {
            if (item.banque || item.numero_cheque) {
              checkStore.put(item);
            } else {
              docStore.put(item);
            }
            count++;
          });
        }
        transaction.oncomplete = () => resolve(count);
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
};