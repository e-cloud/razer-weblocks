export interface ObjectStoreSchema {
  name: string;
  keyPath: string | string[];
  autoIncrement: boolean;
  indexes: IndexSchema[];
}

export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  multiEntry: boolean;
  unique: boolean;
}

export interface DatabaseSchema {
  version: number;
  objectStores: ObjectStoreSchema[];
}

function createDatabase(name: string, schema: DatabaseSchema) {
  if (!window.indexedDB) {
    console.error(
      "Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.",
    );
  }

  return new Promise((resolve, reject) => {
    let db: IDBDatabase;
    const request = indexedDB.open(name, schema.version);
    request.onsuccess = function (event) {
      db = (event.target as any).result;
      resolve(db);
    };
    request.onerror = function (event) {
      reject(event);
    };
    request.onupgradeneeded = function (event) {
      db = (event.target as any).result;
      var objectStore;
      for (const storeSchema of schema.objectStores) {
        objectStore = db.createObjectStore(storeSchema.name, {
          keyPath: storeSchema.keyPath,
          autoIncrement: storeSchema.autoIncrement,
        });
        for (const indexSchema of storeSchema.indexes) {
          objectStore.createIndex(indexSchema.name, indexSchema.keyPath, {
            unique: indexSchema.unique,
            multiEntry: indexSchema.multiEntry,
          });
        }
      }
    };
  });
}

export class ADBObjectStore<T extends Record<string, unknown>> {
  static createDatabase = createDatabase;

  async add(dbName: string, storeName: string, data: T[] | T) {
    const openedDB = await openDB(dbName);

    const store = openedDB
      .transaction([storeName], 'readwrite')
      .objectStore(storeName);

    if (Array.isArray(data)) {
      for (const item of data) {
        await storeAddPromise(store, item);
      }
    } else {
      return storeAddPromise(store, data);
    }
  }
}

function openDB(databaseName: string) {
  if (!window.indexedDB) {
    console.error(
      "Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.",
    );
    return Promise.reject(false);
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = (event) => {
      resolve((event.target as any).result);
    };
    request.onerror = () => {
      reject();
    };
  });
}

function storeAddPromise<T>(store: IDBObjectStore, data: T) {
  return new Promise((resolve, reject) => {
    const request = store.add(data);

    request.onsuccess = function (event) {
      resolve(event);
    };
    request.onerror = function (event) {
      reject(event);
    };
  });
}
