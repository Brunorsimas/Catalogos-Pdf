/**
 * Hook para salvar e carregar PDFs no IndexedDB do dispositivo.
 * Suporta arquivos grandes (catálogos de alta resolução).
 */

const DB_NAME = 'CatalogoDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';
const PDF_KEY = 'catalogo_principal';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePDFToStorage(file: File): Promise<string> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const data = {
      blob: file,
      name: file.name,
      size: file.size,
      savedAt: new Date().toISOString(),
    };

    const req = store.put(data, PDF_KEY);
    req.onsuccess = () => {
      const url = URL.createObjectURL(file);
      resolve(url);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadPDFFromStorage(): Promise<{ url: string; name: string; savedAt: string } | null> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PDF_KEY);

      req.onsuccess = () => {
        const data = req.result;
        if (!data) {
          resolve(null);
          return;
        }
        const blob =
          data.blob instanceof Blob
            ? data.blob
            : new Blob([data.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        resolve({ url, name: data.name, savedAt: data.savedAt });
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function hasSavedPDF(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getKey(PDF_KEY);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function deleteSavedPDF(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(PDF_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
