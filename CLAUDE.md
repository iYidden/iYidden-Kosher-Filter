# Jewish Content Filter — Claude Code Context

> **Read PLAN.md before doing anything else.** It is the source of truth for
> architecture, categorization, and roadmap. Treat its "Confirmed Principles"
> section as locked-in — do not relitigate those decisions without explicit
> instruction from the user.

## Project mission

A content filter built by and for a Chabad chassid who is also a developer.
Designed to enforce kedusha and shemiras einayim while remaining fully
compatible with professional software development and AI tool usage.

Personal use first. Public release for the frum/Chabad developer community
is a possible Phase 6 outcome, not a starting goal.

## What makes this filter different

Existing filters fail this user because they target one audience:

- Frum filters over-block developer resources and AI tools.
- Mainstream filters under-block on cultural and ideological dimensions.

This filter inverts the tradeoff: **lighter** than typical frum filters on
explicit/adult content (mainstream sites like Amazon are fine), **heavier**
on cultural and ideological dimensions (secular lifestyle, opinion, kefirah).

Categorization is by **content purpose, not author identity**. A goyishe-
written technical blog is Technical. A Jewish-written political opinion blog
is Opinion. PURPOSE/USE matters more than surface category — this pattern
shows up everywhere in the design.

## Target platforms

- Desktop: Asus Zenbook S16, Ryzen AI 9 (NPU ~50 TOPS), 24GB RAM, Windows 11.
- Mobile: Google Pixel 10 Pro, latest Android, Gemini Nano on-device.

No other platforms in scope for v1. Family devices, iOS, Linux, macOS are
all out of scope unless explicitly requested.

## Architecture (three layers per platform, shared backend)

**Windows 11:**
1. NextDNS (system-wide DoH baseline)
2. Browser extension (MV3 Chromium + separate Firefox manifest) — smart filter
3. Ryzen NPU classifier (Phi-3 mini / Gemma 2 2B candidates)
4. WFP driver — DEFERRED, do not build unless explicitly asked

**Android (Pixel 10 Pro):**
1. Private DNS pointed at same NextDNS profile
2. Local VPN filter app via VpnService API (likely NetGuard fork, GPL-3.0)
3. App hygiene + Gemini Nano classifier

**Shared:** Category DB, override log, optional accountability backend.

See PLAN.md §5–7 for the full architecture details.

## Confirmed principles — do not violate

- AI assistant replies are NOT filtered. Trust the user's own judgment in
  AI conversations. Only the AI service domains are subject to category
  rules (Claude/ChatGPT/Gemini allowed; janitor.ai/character.ai blocked).
- YouTube is fully blocked. No shiurim exception needed.
- Wikipedia is blocked. Do not propose Wikipedia integration or fallbacks.
- Hacker News is blocked (social forum). Do not propose it as a tech source.
- Stack Overflow / Stack Exchange / GitHub Discussions / dev.to / Lobsters
  are allowed technical forums.
- Internet Archive is allowed despite category.
- Classification inference runs **locally only** — NPU on Windows, Gemini
  Nano on Android. Never propose sending browsing data to a cloud API for
  classification. Browsing patterns are halachically sensitive.
- Tzioni news (Times of Israel, JPost, Ynet, Arutz Sheva, JTA, Haaretz)
  is blocked. Frum non-Chabad news (Yeshiva World, Matzav, Hamodia, VIN)
  and Chabad news (Chabad.org, COLlive, Anash, CrownHeights.info, Beis
  Moshiach) are allowed.
- Hybrid default + tiered override is the architecture. Don't propose
  pure allowlist or pure blocklist alternatives.
- Hard-block categories (adult, overt antisemitism, avodah zarah, anti-
  chassidus, companion/roleplay AI) have NO override path. Don't add one.

## Roadmap phases — work in order

Phase 0: NextDNS foundation (week 1) — config and curated lists
Phase 1: Browser extension MVP (weeks 2–6) — Chromium first, then Firefox
Phase 2: Android app MVP (weeks 6–12) — NetGuard fork decision needed
Phase 3: Local AI classifier (months 3–4) — NPU and Gemini Nano
Phase 4: Sync backend (months 4–5) — Go or Python, $5/mo VPS
Phase 5: Accountability features (months 5–6)
Phase 6: Public release prep (months 6+)

Do not skip ahead. If a Phase 2 question arises while Phase 1 is in
progress, capture it in NOTES.md and continue.

## Coding conventions

> TODO: fill in as decisions are made. Suggested template below — replace
> with actual choices when the user confirms them.

- **Languages:**
  - Browser extension: TypeScript (recommended). Vanilla JS acceptable.
  - Android app: Kotlin if forking NetGuard (matches upstream); Java
    only if NetGuard internals require it.
  - Backend: TBD (Go or Python — defer until Phase 4).
- **Style:** Match upstream conventions when forking. For greenfield code,
  Prettier defaults + ESLint recommended config for JS/TS; ktlint for Kotlin.
- **Testing:** Vitest or Jest for extension; JUnit for Android.
  Tests are required for category rule logic and the classifier integration
  layer. UI code can be tested lighter.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`, `test:`).
- **Branching:** trunk-based; feature branches for anything > 1 day of work.

## Halachic considerations

This is a filter for a Chabad chassid. When making categorization or
content decisions:

- Lean to the strict side when in doubt. A false positive (over-block)
  is recoverable via override flow; a false negative (let through harmful
  content) is not.
- The hard-block categories represent serious aveiros — do not introduce
  any code path that weakens them, even for "edge cases" or "testing."
- Local-only inference is itself a tzniyus consideration. Don't route
  browsing data through external services even for legitimate-seeming
  reasons (analytics, error reporting, telemetry).
- If a Rav has not yet reviewed a specific category decision and you're
  uncertain, flag it in your response and ask the user — do not silently
  pick a permissive interpretation.

## Out of scope unless explicitly asked

- Cloud-based classification of any kind
- Wikipedia integration or fallback
- AI reply filtering
- iOS support
- macOS / Linux desktop support
- Family-device management features
- Telemetry, analytics, error reporting that sends data off-device
- Any feature that weakens hard-block categories
- Hacker News, Reddit, or any social-forum sourcing

## Workflow expectations

- **Before writing code:** confirm which Phase the task belongs to and
  read the relevant PLAN.md sections.
- **Before adding a dependency:** check it works under the platform's
  constraints. For the browser extension, anything pulling in a heavy
  network stack is suspect. For the Android app, anything requiring
  Play Services pulls the project into the Play Store ecosystem.
- **Before fetching external resources at runtime:** justify why this
  cannot be done at build time. Runtime fetches from third parties are
  attack surface and tzniyus concerns.
- **When uncertain about an Anthropic product detail** (Claude API,
  Claude Code itself, Claude.ai), check the official docs at
  https://docs.claude.com — training data may be stale.
- **When uncertain about a current API** (Ryzen AI SDK, AICore Gemini
  Nano, Chrome MV3, Android VpnService) — fetch the current docs rather
  than relying on training data.

## File layout (target, build out as you go)

```
jewish-filter/
├── CLAUDE.md                ← this file
├── PLAN.md                  ← the v0.4 plan, source of truth
├── NOTES.md                 ← running notes, deferred questions, decisions
├── extension/               ← Phase 1: browser extension
│   ├── CLAUDE.md            ← MV3 specifics when started
│   └── ...
├── android/                 ← Phase 2: Android VPN-style filter
│   ├── CLAUDE.md            ← VpnService notes, NetGuard fork rules
│   └── ...
├── classifier/              ← Phase 3: NPU + Gemini Nano models, prompts
│   └── ...
├── backend/                 ← Phase 4: sync service
│   └── ...
├── data/                    ← seed category DB, blocklists, allowlists
│   ├── allowlist.txt
│   ├── blocklist.txt
│   └── categories.json
└── docs/                    ← halachic-basis.md, setup guides, etc.
```

## Communication style

The user is a Chabad meshichist and prefers G-d's names substituted in
text (e.g., G-d, Hashem, Elokim). Ending replies with
"יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד" is their preference for
chat, but is NOT required in code comments, commit messages, or
documentation — those should be professional/neutral so the project
can be received by the broader frum dev community later.
