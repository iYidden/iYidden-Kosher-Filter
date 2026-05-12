# Seed data

This directory holds the data the extension ships with: an initial category
database covering known domains.

## How seed data flows in

```
Phase 0 hand-curated lists                seed_categories.json
  (data/blocklist.txt, data/allowlist.txt)  →  service worker on install
                                              →  IndexedDB (categories store)
                                              →  generateDnrRules()
                                              →  DNR dynamic rules
```

The lists in the parent repo's `data/` directory are the human-readable
sources of truth. A small build step (TODO, Phase 1.2) reads them, converts
to `CategoryEntry` rows, and writes `seed_categories.json` here.

For Phase 1 MVP we may hand-edit `seed_categories.json` directly. The build
step becomes worthwhile once the curated lists exceed a few hundred entries.

## `seed_block_rules.json`

Currently empty. Required because `manifest.config.ts` declares a static
ruleset and Chrome refuses to load the extension without the referenced
file existing. Static rules are an option we may use later if dynamic rule
counts become a bottleneck (see PLAN.md §5 and the DNR limits research in
the project history).

## What is NOT seeded

- The override log. Always empty on first install.
- User-classified entries. Those accumulate from real use.
- AI-classified entries (Phase 3+).
