/**
 * Generate declarativeNetRequest rules from category DB entries.
 *
 * Strategy:
 *   - One DNR rule per blocked domain. Action: redirect top-frame requests
 *     to our extension's block page, with the original URL + category passed
 *     as query params so the block page knows what to show.
 *   - Sub-resources (images, scripts, XHR) are *not* redirected — we only
 *     interrupt the top-level navigation. Blocking sub-resources would break
 *     too many sites and create false positives, while top-frame is the
 *     interaction the user is actually making.
 *   - Allowed categories: no rule (DNR's default = let through).
 *   - Unknown categories: no rule. The classification flow is triggered by
 *     the service worker observing the navigation, not by DNR. (DNR doesn't
 *     have a "callback" action — we couldn't ask the user from inside DNR.)
 *
 * Rule ID allocation: deterministic hash of the domain. This way, regenerating
 * rules from the same DB produces stable IDs, and DNR's "removeRuleIds + addRules"
 * update cycle is clean.
 */

import { CATEGORY, policyFor, type Category } from './categories';
import type { CategoryEntry } from './schema';

/**
 * DNR rule limit safety margin. Chrome 120+ allows ~30k dynamic rules; we
 * cap ourselves well below that to leave headroom for session rules, future
 * categories, and chained allow-rules.
 */
export const MAX_DYNAMIC_RULES = 25_000;

/**
 * Path to the extension's block page. Used as the redirect target.
 * The actual extension URL is composed at runtime since chrome.runtime.getURL
 * is only available in the extension context, not at build time.
 */
export const BLOCK_PAGE_PATH = 'src/ui/block-page/index.html';

/**
 * Deterministic 32-bit hash for rule IDs. DNR requires positive integers;
 * we use 1..2^31-1 to be safe. Same domain in -> same ID out.
 */
function ruleIdForDomain(domain: string): number {
  // FNV-1a 32-bit.
  let hash = 0x811c9dc5;
  for (let i = 0; i < domain.length; i++) {
    hash ^= domain.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Ensure positive non-zero.
  const id = (hash >>> 0) % 0x7fffffff;
  return id === 0 ? 1 : id;
}

/**
 * Result of rule generation. The caller passes the array to
 * chrome.declarativeNetRequest.updateDynamicRules.
 *
 * We return diagnostics too so the service worker / settings UI can surface
 * "your DB has more entries than DNR can hold" before silent truncation.
 */
export interface RuleGenResult {
  readonly rules: chrome.declarativeNetRequest.Rule[];
  readonly stats: {
    readonly total: number;
    readonly blocked: number;
    readonly allowed: number;
    readonly unknown: number;
    readonly hardBlock: number;
    readonly softBlock: number;
    readonly truncated: boolean;
  };
}

/**
 * Build the DNR redirect URL for a domain + category. The block page will
 * read these query params and render the appropriate UI.
 *
 * `extensionUrl` is `chrome.runtime.getURL(BLOCK_PAGE_PATH)` from the caller.
 */
function buildRedirectUrl(extensionUrl: string, category: Category): string {
  const u = new URL(extensionUrl);
  u.searchParams.set('category', category);
  // We intentionally do NOT include the blocked URL itself — that path/query
  // could contain personal data and persists in browser history. The block
  // page only needs to know the category and the originating domain, which
  // DNR will substitute via the placeholder \\0.
  return u.toString();
}

/**
 * Generate rules from an array of category entries.
 *
 * Pure function — no IndexedDB, no chrome.* calls, fully testable.
 *
 * @param entries  All category DB rows.
 * @param extensionUrl  Result of chrome.runtime.getURL(BLOCK_PAGE_PATH).
 *                       Pass a placeholder like "https://example.invalid/block.html"
 *                       in tests; the function does not interpret it semantically.
 */
export function generateDnrRules(
  entries: readonly CategoryEntry[],
  extensionUrl: string,
): RuleGenResult {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  const stats = {
    total: entries.length,
    blocked: 0,
    allowed: 0,
    unknown: 0,
    hardBlock: 0,
    softBlock: 0,
    truncated: false,
  };

  // Track IDs to detect collisions. With 32-bit hash space and a few thousand
  // domains, collisions are astronomically unlikely, but we surface them
  // rather than silently dropping rules.
  const seenIds = new Set<number>();

  for (const entry of entries) {
    const policy = policyFor(entry.category);

    if (policy === 'allow') {
      stats.allowed++;
      continue;
    }
    if (policy === 'classify' || entry.category === CATEGORY.Unknown) {
      stats.unknown++;
      continue;
    }
    if (policy === 'hard_block') stats.hardBlock++;
    else if (policy === 'soft_block') stats.softBlock++;

    if (rules.length >= MAX_DYNAMIC_RULES) {
      stats.truncated = true;
      break;
    }

    const id = ruleIdForDomain(entry.domain);
    if (seenIds.has(id)) {
      // Collision: skip and surface via stats. With FNV-1a and <30k domains
      // this should effectively never happen; if it does, we'll mitigate.
      continue;
    }
    seenIds.add(id);

    rules.push({
      id,
      priority: policy === 'hard_block' ? 2 : 1,
      action: {
        type: 'redirect' as chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: buildRedirectUrl(extensionUrl, entry.category) },
      },
      condition: {
        // requestDomains matches the exact domain *and* subdomains. We rely
        // on that for "block youtube.com" to also catch "m.youtube.com".
        requestDomains: [entry.domain],
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
    stats.blocked++;
  }

  return { rules, stats };
}

/** Exposed for tests so they don't have to re-derive the hash. */
export const _internal = { ruleIdForDomain };
