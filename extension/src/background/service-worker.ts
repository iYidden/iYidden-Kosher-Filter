/**
 * MV3 Service Worker — orchestrator.
 *
 * Responsibilities (Phase 1 MVP):
 *   - On install: seed the category DB from the bundled seed file.
 *   - On startup: regenerate DNR dynamic rules from the current DB.
 *   - On category DB change (settings UI message): regenerate rules.
 *
 * Out of scope here (deferred):
 *   - Classification of unknown domains (Phase 3 brings the local AI).
 *   - Sync (Phase 4).
 *   - For now, unknown domains pass through, are NOT logged, and surface
 *     in the settings UI's "recently visited unknowns" list. We need
 *     navigation observation for that, which requires `webNavigation`
 *     permission — deferred until we wire it up properly.
 *
 * Service worker constraints:
 *   - The SW can be killed by Chrome at any time. Hold no in-memory state
 *     that matters; persist everything via the DB.
 *   - Top-level await is allowed in module SWs but should be minimal —
 *     we want install handlers registered synchronously.
 */

import { generateDnrRules, BLOCK_PAGE_PATH } from '@core/dnr-rules';
import { getAllCategories, seedCategories } from '@core/db';
import type { CategoryEntry } from '@core/schema';
import { SCHEMA_VERSION } from '@core/schema';
// Bundled at build time. Vite inlines the JSON into the SW chunk, so there is
// no runtime fetch — MV3 service workers can be hostile environments for
// fetches against the extension's own URLs during install.
import seedFile from '@seed/seed_categories.json';

// ----- Lifecycle -----

chrome.runtime.onInstalled.addListener((details) => {
  // `void` because addListener doesn't await — but we want to fire-and-track.
  void handleInstalled(details);
});

chrome.runtime.onStartup.addListener(() => {
  void rebuildDnrRules();
});

// Settings UI sends this when the user edits the category DB.
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== 'object' || message === null) return false;
  const m = message as { type?: string };
  if (m.type === 'rebuild_rules') {
    void rebuildDnrRules().then((stats) => sendResponse({ ok: true, stats }));
    return true; // keep the message channel open for the async response
  }
  return false;
});

// ----- Logic -----

async function handleInstalled(
  details: chrome.runtime.InstalledDetails,
): Promise<void> {
  if (details.reason === 'install') {
    await loadSeed();
  }
  // On both install and update, rebuild the DNR rules from current DB state.
  await rebuildDnrRules();
}

async function loadSeed(): Promise<void> {
  // Seed JSON is bundled by Vite at build time (see top-of-file import).
  const data = seedFile as { entries?: CategoryEntry[] };
  if (!Array.isArray(data.entries)) {
    console.warn('[kf] seed file malformed; skipping');
    return;
  }
  const result = await seedCategories(data.entries);
  console.log(
    `[kf] seed loaded: ${result.inserted} inserted, ${result.skipped} skipped`,
  );
}

async function rebuildDnrRules(): Promise<RebuildStats> {
  const entries = await getAllCategories();
  const extensionUrl = chrome.runtime.getURL(BLOCK_PAGE_PATH);
  const { rules, stats } = generateDnrRules(entries, extensionUrl);

  // Replace all dynamic rules atomically.
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rules,
  });

  console.log(
    `[kf] DNR rebuilt: ${stats.blocked} active rules (${stats.hardBlock} hard, ${stats.softBlock} soft), ${stats.allowed} allow-listed, ${stats.unknown} unknown${stats.truncated ? ' [TRUNCATED]' : ''}`,
  );
  return { ...stats, schemaVersion: SCHEMA_VERSION };
}

interface RebuildStats {
  total: number;
  blocked: number;
  allowed: number;
  unknown: number;
  hardBlock: number;
  softBlock: number;
  truncated: boolean;
  schemaVersion: number;
}
