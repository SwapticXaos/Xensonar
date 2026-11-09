export interface IndexedDbRecordStoreConfig {
  dbName: string;
  storeName: string;
  version?: number;
  keyPath?: string;
  openErrorMessage?: string;
  upgrade?: (db: IDBDatabase) => void;
}

function unavailableIndexedDbError(): Error {
  return new Error('IndexedDB not available');
}

function requestToPromise<T>(request: IDBRequest<T>, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(errorMessage));
  });
}

export function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function openIndexedDbRecordStore(config: IndexedDbRecordStoreConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(unavailableIndexedDbError());
      return;
    }
    const request = indexedDB.open(config.dbName, config.version ?? 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      config.upgrade?.(db);
      if (!db.objectStoreNames.contains(config.storeName)) {
        db.createObjectStore(config.storeName, { keyPath: config.keyPath ?? 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(config.openErrorMessage ?? 'Failed to open IndexedDB'));
  });
}

export async function readAllIndexedDbRecords<T>(config: IndexedDbRecordStoreConfig, errorMessage: string): Promise<T[]> {
  const db = await openIndexedDbRecordStore(config);
  const tx = db.transaction(config.storeName, 'readonly');
  const store = tx.objectStore(config.storeName);
  return (await requestToPromise<T[]>(store.getAll() as IDBRequest<T[]>, errorMessage)) ?? [];
}

export async function readIndexedDbRecord<T>(config: IndexedDbRecordStoreConfig, id: IDBValidKey, errorMessage: string): Promise<T | null> {
  const db = await openIndexedDbRecordStore(config);
  const tx = db.transaction(config.storeName, 'readonly');
  const store = tx.objectStore(config.storeName);
  return (await requestToPromise<T | undefined>(store.get(id) as IDBRequest<T | undefined>, errorMessage)) ?? null;
}

export async function putIndexedDbRecord<T>(config: IndexedDbRecordStoreConfig, record: T, errorMessage: string): Promise<void> {
  const db = await openIndexedDbRecordStore(config);
  const tx = db.transaction(config.storeName, 'readwrite');
  const store = tx.objectStore(config.storeName);
  await requestToPromise(store.put(record), errorMessage);
}

export async function deleteIndexedDbRecord(config: IndexedDbRecordStoreConfig, id: IDBValidKey, errorMessage: string): Promise<void> {
  const db = await openIndexedDbRecordStore(config);
  const tx = db.transaction(config.storeName, 'readwrite');
  const store = tx.objectStore(config.storeName);
  await requestToPromise(store.delete(id), errorMessage);
}


export async function clearIndexedDbRecords(config: IndexedDbRecordStoreConfig, errorMessage: string): Promise<void> {
  const db = await openIndexedDbRecordStore(config);
  const tx = db.transaction(config.storeName, 'readwrite');
  const store = tx.objectStore(config.storeName);
  await requestToPromise(store.clear(), errorMessage);
}
