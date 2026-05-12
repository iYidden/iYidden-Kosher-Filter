# Extension — Claude Code Context

> Subdirectory CLAUDE.md. The root-level CLAUDE.md and PLAN.md apply first.
> This file adds extension-specific guidance.

## What this directory is

The Phase 1 deliverable from PLAN.md: a Manifest V3 browser extension for
Chromium (Edge primarily, then Chrome/Brave/Arc). Firefox is deferred.

## Stack

- **TypeScript** (strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`).
- **Vite** + **@crxjs/vite-plugin** for MV3 bundling and HMR.
- **Preact** for the block page and settings UI.
- **Vitest** for unit tests of pure functions.
- **declarativeNetRequest** (NOT `webRequest`) for the filter mechanism.

The DNR choice is deliberate: extensions using DNR don't see browsing data
at runtime. That's a tzniyus property, not just a privacy nicety.

## Architecture map

```
manifest.config.ts     ← typed MV3 manifest, single source
vite.config.ts          ← build config
src/
├── background/
│   └── service-worker.ts  ← orchestrator: install, rebuild rules, message router
├── core/                  ← framework-free, fully testable
│   ├── categories.ts        ← Category enum + CATEGORY_POLICY (locked decisions)
│   ├── schema.ts            ← CategoryEntry, OverrideLogEntry — cross-component contract
│   ├── db.ts                ← IndexedDB wrapper, migrations, type-guarded reads
│   └── dnr-rules.ts         ← CategoryEntry[] → DNR rules (PURE FUNCTION)
├── ui/
│   ├── block-page/          ← Preact, shown when DNR redirects a block
│   └── settings/            ← Preact, opened from the toolbar action
└── seed/
    ├── seed_categories.json   ← bundled initial DB; loaded on install
    └── seed_block_rules.json  ← static DNR ruleset (empty for now)
tests/
└── core/                    ← Vitest unit tests for pure functions
```

## Hard rules for code in this directory

1. **`src/core/` stays framework-free.** No Preact, no Chrome APIs.
   It must be unit-testable in plain Node. Browser globals (`indexedDB`)
   are OK because Vitest provides them via jsdom; `chrome.*` is not.
2. **Pure functions over stateful code where possible.**
   `generateDnrRules` is pure on purpose — bugs there are existential
   for the project, so make them easy to catch in tests.
3. **No `any`.** Use `unknown` at boundaries (IndexedDB reads, messages
   from other components) and narrow with type guards from `schema.ts`.
4. **No telemetry, no analytics, no error reporting libraries.**
   Per the locked-in principle: browsing data never leaves the device.
5. **Privacy in DNR redirects.** The block page receives the *category*,
   not the blocked URL. Paths and query strings can contain personal
   data and persist in browser history.
6. **Override log is append-only.** No delete API by design.
7. **Schema changes are migrations.** Bump `SCHEMA_VERSION` in `schema.ts`
   and add a migration step in `db.ts`. Never silently mutate existing data.

## DNR limits worth remembering

- Chrome 120+: dynamic and session rules are tracked separately.
- We cap ourselves at `MAX_DYNAMIC_RULES = 25_000` for safety; Chrome
  allows more, but headroom matters when adding categories later.
- If `RuleGenResult.stats.truncated === true`, the user needs to see
  it — the settings UI should surface this prominently.

## Phase 1 sub-phases (in order)

- **1.1 Scaffold** ✅ (this commit)
- **1.2 Seed data pipeline.** Build step that reads `../data/blocklist.txt`
  + `../data/allowlist.txt` and emits `src/seed/seed_categories.json`.
- **1.3 Block page UI.** Real override flow: hard-block view, soft-block
  cooldown + reason, unknown-classification. Run through the
  `frontend-design` skill — this is the most-seen surface.
- **1.4 Settings UI.** Category DB browser/editor, override log viewer,
  export/import JSON.
- **1.5 Daily-driver shake-down.** Use the extension on the user's actual
  daily workflow for a week. Fix what hurts.

## Things explicitly NOT in Phase 1

- AI classifier (Phase 3).
- Sync backend (Phase 4).
- Firefox support (deferred).
- `webNavigation` observation for unknown-domain capture
  (deferred until Phase 1.3 makes the classification UI exist).
- Icon design (placeholder PNGs only).

## Communication style

User is a Chabad meshichist. Substitute G-d's names (G-d, Hashem, Elokim, E-l).
End substantive replies with "יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד".
