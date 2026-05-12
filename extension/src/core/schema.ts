/**
 * Schema definitions for the category DB and override log.
 *
 * This file is the *contract* between the browser extension, the future
 * Android filter, and the future sync backend. Changes here ripple
 * everywhere. Treat schema changes as a versioned migration, not a refactor.
 *
 * Source of truth in PLAN.md §7 (Shared Infrastructure).
 */

import type { Category } from './categories';

/**
 * Schema version. Bump when fields are added/removed/renamed in
 * `CategoryEntry` or `OverrideLogEntry`. Migrations live in `db.ts`.
 *
 * Versioning convention:
 *   1 — initial Phase 1 schema.
 *   2+ — see CHANGELOG entries in db.ts beside the migration code.
 */
export const SCHEMA_VERSION = 1;

/** How a category decision was made — affects trust + UI affordances. */
export type ClassificationSource =
  | 'seed' // shipped with the extension (Phase 0 hand-curated lists)
  | 'user' // user manually classified during an override flow
  | 'ai_local' // local NPU/Gemini Nano classifier (Phase 3)
  | 'sync'; // pulled from sync backend (Phase 4)

/**
 * One row in the category database.
 *
 * Identity: `domain` is the primary key. Subdomain handling is *not* baked
 * into the schema — the lookup logic in `db.ts` decides whether to match
 * exact, suffix, or longest-prefix. Keeping the row schema dumb keeps
 * migrations cheap.
 */
export interface CategoryEntry {
  /** Lowercased, ASCII-only (punycode-encoded if IDN). e.g. "youtube.com". */
  readonly domain: string;

  /** The category decision. May be `Unknown` for domains awaiting classification. */
  readonly category: Category;

  /** Optional finer-grained label, free-form. e.g. "fashion" inside Lifestyle. */
  readonly subcategory?: string;

  /** Where this classification came from. */
  readonly source: ClassificationSource;

  /**
   * Confidence in [0, 1] when source is `ai_local`. Undefined for seed/user
   * (treated as 1.0 by readers). Used to decide whether to re-prompt.
   */
  readonly confidence?: number;

  /** Unix ms when the row was created or last classified. */
  readonly timestamp: number;

  /**
   * Monotonically increasing version for sync conflict resolution.
   * Phase 4 backend assigns; Phase 1 leaves at 0.
   */
  readonly syncVersion: number;
}

/** How an override was resolved. */
export type OverrideType =
  | 'allowed_with_cooldown' // soft block, user waited and entered reason
  | 'classified_then_allowed' // unknown domain, user classified and proceeded
  | 'classified_then_blocked' // unknown domain, user classified into a block category
  | 'hard_block_attempted' // user tried to access a hard-block; recorded but not allowed
  | 'cancelled'; // user backed out of the block page

/**
 * Append-only log of every block-page interaction.
 *
 * Purpose: self-review, accountability digests (Phase 5), and (for hard-block
 * attempts specifically) a clear-eyed picture of where temptation is strongest.
 *
 * Never deleted. Synced append-only to the backend in Phase 4. The log itself
 * is private data — never sent off-device except to the user's own backend.
 */
export interface OverrideLogEntry {
  /** Unique id (uuid v4 or similar). Used for sync dedup. */
  readonly id: string;

  /** Unix ms. */
  readonly timestamp: number;

  /** Which device originated this entry. Set per-install. */
  readonly device: string;

  /** Domain that was blocked. URL path is *not* stored — that's a tzniyus consideration. */
  readonly domain: string;

  /** Category at the time of the block. (Category may change later; this is a snapshot.) */
  readonly category: Category;

  /** What happened. */
  readonly overrideType: OverrideType;

  /** User-entered reason for soft-block overrides. Empty for other types. */
  readonly overrideReason: string;

  /** How long the cooldown ran before confirmation. 0 if not applicable. */
  readonly cooldownUsedMs: number;

  /** Sync version, see CategoryEntry.syncVersion. */
  readonly syncVersion: number;
}

/**
 * Type guards — useful at IndexedDB read boundaries where we receive `unknown`.
 *
 * These are intentionally strict. If schema drift produces a malformed row,
 * we want to know at read time, not silently use a half-typed object.
 */
export function isCategoryEntry(value: unknown): value is CategoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['domain'] === 'string' &&
    typeof v['category'] === 'string' &&
    typeof v['source'] === 'string' &&
    typeof v['timestamp'] === 'number' &&
    typeof v['syncVersion'] === 'number'
  );
}

export function isOverrideLogEntry(value: unknown): value is OverrideLogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['timestamp'] === 'number' &&
    typeof v['device'] === 'string' &&
    typeof v['domain'] === 'string' &&
    typeof v['category'] === 'string' &&
    typeof v['overrideType'] === 'string' &&
    typeof v['overrideReason'] === 'string' &&
    typeof v['cooldownUsedMs'] === 'number' &&
    typeof v['syncVersion'] === 'number'
  );
}
