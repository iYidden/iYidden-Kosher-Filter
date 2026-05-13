import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

/**
 * Manifest V3 declaration.
 *
 * Design notes:
 * - `declarativeNetRequest` (not the `WithHostAccess` variant) — we want the
 *   privacy property: rules are evaluated in the browser, the extension does
 *   not see request URLs at runtime. The user's browsing data never enters
 *   the extension process. This matters for tzniyus.
 * - `declarativeNetRequestFeedback` — required so we can log *which* category
 *   rule blocked a navigation, for the override log. Without this we'd know
 *   "something was blocked" but not the rule id / category.
 * - `storage` — for IndexedDB-adjacent settings, override log, etc.
 * - No host_permissions — DNR works without them for block actions. The only
 *   action we take is "redirect to extension block page" for top-frame
 *   navigations, which is covered by the extension's own web_accessible_resources.
 * - `host_permissions` will be revisited in Phase 1.3 if the block-page redirect
 *   needs it; current plan is to use action.type "redirect" with a URL pointing
 *   at the extension's own block.html, which does not require host permissions.
 *
 * Open question (deferred to Phase 1.3): redirect vs. block action. A pure
 * `block` leaves the user on a blank "ERR_BLOCKED_BY_CLIENT" page with no
 * override UI; `redirect` to our block page is needed for the override flow.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'iYidden Kosher Filter - Web Extension',
  version: pkg.version,
  description:
    'Kosher Filter — a content filter for the frum developer, kedusha-first and developer-compatible.',
  // Minimal permissions surface.
  permissions: [
    'declarativeNetRequest',
    'declarativeNetRequestFeedback',
    'storage',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  action: {
    default_title: 'Kosher Filter',
    default_popup: 'src/ui/settings/index.html',
  },
  // The block page is reached by DNR redirect, so it must be web-accessible.
  web_accessible_resources: [
    {
      resources: ['src/ui/block-page/index.html'],
      matches: ['<all_urls>'],
    },
  ],
  // DNR static rulesets — populated by the build step from the category DB.
  // For Phase 1 MVP, we ship one empty static ruleset and rely on dynamic
  // rules pushed at runtime from the seed data. We can move to static later
  // if performance demands it.
  declarative_net_request: {
    rule_resources: [
      {
        id: 'seed_block_rules',
        enabled: true,
        path: 'src/seed/seed_block_rules.json',
      },
    ],
  },
  // Icons: omitted until real assets are designed. Chrome falls back to a
  // generic puzzle-piece icon, which is fine for local development.
});
