import React from 'react';

const DB_NAME = 'EasyDriverCacheDB';
const DB_VERSION = 1;

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(new Error('IndexedDB initialization failed: ' + (event.target as any).error));
    };

    request.onsuccess = (event) => {
      resolve((event.target as any).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result as IDBDatabase;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tickets')) {
        db.createObjectStore('tickets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reviews')) {
        db.createObjectStore('reviews', { keyPath: 'id' });
      }
    };
  });
}

export function getStoreData<T>(storeName: 'requests' | 'tickets' | 'reviews'): Promise<T[]> {
  return initIndexedDB().then((db) => {
    return new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = (event) => {
        reject((event.target as any).error);
      };
    });
  });
}

export function saveStoreData<T>(storeName: 'requests' | 'tickets' | 'reviews', items: T[]): Promise<void> {
  return initIndexedDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        if (items.length === 0) {
          resolve();
          return;
        }

        let count = 0;
        let failed = false;

        for (const item of items) {
          const putRequest = store.put(item);
          putRequest.onsuccess = () => {
            count++;
            if (count === items.length && !failed) {
              resolve();
            }
          };
          putRequest.onerror = (event) => {
            if (!failed) {
              failed = true;
              reject((event.target as any).error);
            }
          };
        }
      };

      clearRequest.onerror = (event) => {
        reject((event.target as any).error);
      };
    });
  });
}

// Global performance logs holder
export const performanceMonitor = {
  renderTimes: [] as { component: string; duration: number; timestamp: number }[],
  wsLatencies: [] as { latency: number; timestamp: number }[],

  logRender: (component: string, duration: number) => {
    performanceMonitor.renderTimes.push({ component, duration, timestamp: Date.now() });
    if (performanceMonitor.renderTimes.length > 50) {
      performanceMonitor.renderTimes.shift();
    }
  },

  logWsMessage: (latency: number) => {
    performanceMonitor.wsLatencies.push({ latency, timestamp: Date.now() });
    if (performanceMonitor.wsLatencies.length > 50) {
      performanceMonitor.wsLatencies.shift();
    }
  },

  getAverageRenderTime: (component?: string) => {
    const logs = component
      ? performanceMonitor.renderTimes.filter(l => l.component === component)
      : performanceMonitor.renderTimes;
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, log) => acc + log.duration, 0);
    return parseFloat((sum / logs.length).toFixed(1));
  },

  getAverageWsLatency: () => {
    const logs = performanceMonitor.wsLatencies;
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, log) => acc + log.latency, 0);
    return Math.round(sum / logs.length);
  }
};

// React component rendering hook for micro-performance monitoring
export function useRenderTracker(componentName: string) {
  const startTime = window.performance.now();
  const startTimeRef = React.useRef(startTime);

  React.useEffect(() => {
    const duration = window.performance.now() - startTimeRef.current;
    performanceMonitor.logRender(componentName, duration);
  });
}
