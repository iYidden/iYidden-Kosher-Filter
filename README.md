# Kosher Filter

*Chrome Web Store listing: **iYidden Kosher Filter - Web Extension***

A content filter built by and for a Chabad chassid who is also a developer.
Designed to enforce kedusha and shemiras einayim while remaining fully
compatible with professional software development and AI tool usage.

## Why another filter

Existing filters force a tradeoff this user wouldn't accept:

- **Frum filters** over-block developer resources and AI tools.
- **Mainstream filters** under-block on cultural and ideological dimensions.

Kosher Filter inverts the tradeoff. It's **lighter** than typical frum filters
on explicit/adult content (mainstream sites like Amazon are fine), and
**heavier** on cultural and ideological dimensions (secular lifestyle, opinion,
kefirah, anti-chassidus). Categorization is by **content purpose, not author
identity** — a goyishe-written technical blog is `Technical`; a Jewish-written
political opinion blog is `Opinion`.

Personal use first. A public release for the broader frum/Chabad developer
community is a possible Phase 6 outcome, not a starting goal.

## Status

**Phase 1 of 6 — Browser extension MVP** (in progress).

| Phase | Scope                                          | State     |
|-------|------------------------------------------------|-----------|
| 0     | NextDNS foundation + hand-curated lists        | In progress |
| 1     | Browser extension MVP (Chromium → Firefox)     | **Active** |
| 2     | Android app MVP (NetGuard fork — TBD)          | Not started |
| 3     | Local AI classifier (Ryzen NPU / Gemini Nano)  | Not started |
| 4     | Sync backend                                   | Not started |
| 5     | Accountability features                        | Not started |
| 6     | Public release preparation                     | Not started |

See [PLAN.md](PLAN.md) for the full roadmap and milestone checklists.

## Target platforms

- **Desktop:** Windows 11 (Asus Zenbook S16, Ryzen AI 9, NPU ~50 TOPS).
- **Mobile:** Android (Pixel 10 Pro, Gemini Nano on-device).

No other platforms in v1. iOS, macOS, Linux desktop, and family-device
management are explicitly out of scope.

## Architecture (high level)

Three layers per platform, sharing one category DB:

**Windows 11**

1. NextDNS — system-wide DoH baseline.
2. Browser extension — MV3 (Chromium first, Firefox after).
3. Ryzen NPU classifier — local-only inference for unknown domains.

**Android**

1. Private DNS pointed at the same NextDNS profile.
2. Local VPN-style filter via `VpnService` (likely a NetGuard fork).
3. Gemini Nano classifier.

Classification inference runs **locally only** — never via a cloud API.
Browsing patterns are halachically sensitive.

See [PLAN.md §5–§7](PLAN.md) for architectural detail.

## Repo layout

```
kosher-filter/
├── README.md          ← this file
├── CLAUDE.md          ← Claude Code project context
├── PLAN.md            ← source of truth: architecture, taxonomy, roadmap
├── NOTES.md           ← running decisions, parked questions
├── extension/         ← Phase 1: MV3 browser extension (TypeScript, Preact)
├── android/           ← Phase 2: Android VPN-style filter
├── classifier/        ← Phase 3: NPU + Gemini Nano models, prompts
├── backend/           ← Phase 4: sync service
├── data/              ← seed category DB, NextDNS list exports
└── docs/              ← halachic basis, setup guides
```

## Quickstart — browser extension

Requires Node 20+ and npm.

```bash
cd extension
npm install
npm run dev          # Vite dev server with HMR
```

Then in Vivaldi/Chrome/Edge/Brave:

1. Open `chrome://extensions` (or `vivaldi://extensions`, etc.).
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select `extension/dist`.
4. Open the service worker DevTools from the extension card to verify the
   `[kf] seed loaded` and `[kf] DNR rebuilt` lines appear.

For a self-contained production build (no dev-server dependency):

```bash
npm run build        # outputs to extension/dist/
npm test             # vitest run (17 tests cover core/ logic)
npm run typecheck    # tsc --noEmit
```

The category database is seeded at install from
`extension/src/seed/seed_categories.json`. Curation of that file is the
Phase 0 deliverable; the extension currently ships with an empty seed.

## Coding conventions

- **TypeScript** for the extension; **Kotlin** for Android (if NetGuard fork);
  Go or Python TBD for the backend.
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`,
  `test:`).
- **Trunk-based**, with feature branches for anything > 1 day of work.
- Tests required for category rule logic and classifier integration.

## More context

- [CLAUDE.md](CLAUDE.md) — context for Claude Code working on this repo
  (architectural rules, halachic considerations, out-of-scope items).
- [PLAN.md](PLAN.md) — full plan: confirmed principles, architecture, category
  taxonomy, override tiers, roadmap.
- [NOTES.md](NOTES.md) — running notes, decisions log, parked questions.

## License

To be determined before any public release. If the Android filter forks
NetGuard, the project inherits **GPL-3.0** for that component.
