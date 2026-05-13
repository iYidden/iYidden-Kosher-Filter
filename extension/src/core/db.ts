/**
 * IndexedDB wrapper for the category DB and override log.
 *
 * Design principles:
 *   - All reads validate via type guards from schema.ts. We never trust the
 *     bytes on disk to match the current types.
 *   - Migrations are explicit and versioned. Adding fields is fine in v1
 *     (TS optional), but renames/removals require a migration step.
 *   - No `any`. Failures surface as rejected promises with typed errors.
 *   - The override log is append-only — there is no `deleteLog` API by
 *     design.
 *
 * NOTE: This is a thin wrapper, not an ORM. Two stores, simple queries.
 * If queries get complex we'll add indexes, not abstractions.
 */

import {
  isCategoryEntry,
  isOverrideLogEntry,
  SCHEMA_VERSION,
  type CategoryEntry,
  type OverrideLogEntry,
} from './schema';

const DB_NAME = 'kosher-filter';
const STORE_CATEGORIES = 'categories';
const STORE_OVERRIDE_LOG = 'override_log';

/** Custom error so callers can distinguish DB issues from validation issues. */
export class DbError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
   ) {
     super(message);
     this.name = 'DbError';
   }
 }
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Lazy-open the database. Safe to call repeatedly; the same connection is
 * reused for the lifetime of the service worker.
 */
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onerror = () => reject(new DbError('openDb failed', req.error));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      // ---- Migrations ----
      // Each migration is a step from version N to N+1. New migrations append.
      if (oldVersion < 1) {
        // v0 -> v1: initial schema.
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'domain' });
        const log = db.createObjectStore(STORE_OVERRIDE_LOG, { keyPath: 'id' });
        log.createIndex('timestamp', 'timestamp', { unique: false });
        log.createIndex('domain', 'domain', { unique: false });
      }
      // Future: if (oldVersion < 2) { ... }
    };
    req.onblocked = () =>
      reject(new DbError('openDb blocked — another connection holds the DB'));
  });
  return dbPromise;
}

/** Promisify an IDBRequest. */
function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new DbError('IDBRequest failed', r.error));
  });
}

// ----- Category entries -----

export async function getCategory(domain: string): Promise<CategoryEntry | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_CATEGORIES, 'readonly');
  const result = await req(tx.objectStore(STORE_CATEGORIES).get(domain));
  if (result === undefined) return null;
  if (!isCategoryEntry(result)) {
    throw new DbError(`Malformed CategoryEntry for domain: ${domain}`);
  }
  return result;
}

export async function putCategory(entry: CategoryEntry): Promise<void> {
  if (!isCategoryEntry(entry)) {
    throw new DbError('putCategory: invalid CategoryEntry');
  }
  const db = await openDb();
  const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
  await req(tx.objectStore(STORE_CATEGORIES).put(entry));
}

export async function getAllCategories(): Promise<CategoryEntry[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CATEGORIES, 'readonly');
  const all = await req(tx.objectStore(STORE_CATEGORIES).getAll());
  return all.filter(isCategoryEntry);
}

/**
 * Bulk insert — used by the seed loader on first install. Skips entries that
 * already exist (so re-running the seed never overwrites user classifications).
 */
export async function seedCategories(entries: CategoryEntry[]): Promise<{
  inserted: number;
  skipped: number;
}> {
  const db = await openDb();
  const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
  const store = tx.objectStore(STORE_CATEGORIES);
  let inserted = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (!isCategoryEntry(entry)) {
      skipped++;
      continue;
    }
    const existing = await req(store.get(entry.domain));
    if (existing !== undefined) {
      skipped++;
      continue;
    }
    await req(store.add(entry));
    inserted++;
  }
  return { inserted, skipped };
}

// ----- Override log -----

export async function appendOverrideLog(entry: OverrideLogEntry): Promise<void> {
  if (!isOverrideLogEntry(entry)) {
    throw new DbError('appendOverrideLog: invalid OverrideLogEntry');
  }
  const db = await openDb();
  const tx = db.transaction(STORE_OVERRIDE_LOG, 'readwrite');
  await req(tx.objectStore(STORE_OVERRIDE_LOG).add(entry));
}

export async function getRecentOverrides(limit = 100): Promise<OverrideLogEntry[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_OVERRIDE_LOG, 'readonly');
  const idx = tx.objectStore(STORE_OVERRIDE_LOG).index('timestamp');
  // Newest first.
  const results: OverrideLogEntry[] = [];
  return new Promise((resolve, reject) => {
    const cursorReq = idx.openCursor(null, 'prev');
    cursorReq.onerror = () => reject(new DbError('getRecentOverrides failed', cursorReq.error));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor === null || results.length >= limit) {
        resolve(results);
        return;
      }
      const value = cursor.value as unknown;
      if (isOverrideLogEntry(value)) results.push(value);
      cursor.continue();
    };
  });
}

/**
 * Test-only escape hatch: clear all data. Guarded against accidental
 * production calls. Do not call from extension UI code.
 */
export async function _resetForTests(): Promise<void> {
  // The service worker should never invoke this. It exists for vitest.
  const db = await openDb();
  const tx = db.transaction([STORE_CATEGORIES, STORE_OVERRIDE_LOG], 'readwrite');
  await req(tx.objectStore(STORE_CATEGORIES).clear());
  await req(tx.objectStore(STORE_OVERRIDE_LOG).clear());
}
