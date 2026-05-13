# PLAN.md — Kosher Filter

**Version:** 0.6
**Status:** Source of truth for architecture, categorization, and roadmap.

> Read this before writing code. Treat §10 (Confirmed Principles) as locked-in
> — do not relitigate without explicit instruction from the user. Other
> sections are open to revision; bump the version and note the change in
> NOTES.md "Decisions log."

---

## §0 Document conventions

- This file describes *intent*. Code under [`extension/`](extension/) is the
  current implementation; where the two disagree, treat code as the snapshot
  and this doc as the target.
- "User" means the primary user of the filter. Single-user assumptions are
  pervasive in v1.
- "Halachic ambiguity → strict." When this document and a permissive
  interpretation could both be argued, the doc takes the strict reading. A
  Rav's eventual review may relax specific calls.

---

## §1 Mission & Categorization Principle

### Mission

A content filter for a Chabad chassid who is also a developer. Goals:

1. **Enforce kedusha and shemiras einayim** — no soft language, no escape
   hatches on the hard categories.
2. **Stay compatible with professional software work** — developer tools, AI
   coding assistants, technical reference must not be over-blocked.
3. **Block by *editorial values*, not surface identity** — secular outlets
   are blocked because of the secular worldview they propagate; a frum outlet
   on the same topic is not.

Personal use is the only goal that has been committed to. A possible Phase 6
outcome is a public release for the frum/Chabad developer community; that is
deferred until Phase 5 deliverables are stable.

### Categorization principle (PURPOSE, not IDENTITY)

The filter categorizes by **content purpose**, not by who wrote it.

- A goyishe-written technical blog → `Technical`.
- A Jewish-written political opinion blog → `Opinion`.
- A frum news outlet → `Jewish` (allowed).
- A secular Israeli news outlet → `SecularIsraeliNews` (soft-blocked).

This pattern recurs throughout the design: the *use* a person makes of a
domain matters more than its surface category. Override prompts should
surface the user's stated purpose, not just the URL.

---

## §2 Category Taxonomy

Eighteen categories, grouped by policy. The taxonomy is the **shared
vocabulary** between the browser extension, the Android filter, and the
sync backend. Adding a category requires:

1. Update [`extension/src/core/categories.ts`](extension/src/core/categories.ts)
   (`Category` literal + `CATEGORY_POLICY` entry).
2. Update this section with rationale and examples.
3. Bump `SCHEMA_VERSION` in
   [`extension/src/core/schema.ts`](extension/src/core/schema.ts) only if the
   shape of `CategoryEntry` changes; not for added category literals.

### ALLOW (pass through, no friction)

| Category         | Definition                                              | Examples |
|------------------|---------------------------------------------------------|----------|
| `Technical`      | Software docs, dev blogs, code hosting, technical forums | github.com, stackoverflow.com, dev.to, lobste.rs, archive.org |
| `Jewish`         | Torah, Chabad, frum content (any movement, kosher) | chabad.org, collive.com, anash.org, crownheights.info, beismoshiach.org, yeshivaworld.com, matzav.com, hamodia.com, vinnews.com, sefaria.org, ou.org |
| `Utility`        | Banking, government, shipping, mainstream commerce, infrastructure | amazon.com, bank.com, irs.gov, ups.com, github.com (as commerce/utility — Technical wins where overlap) |
| `ProductivityAI` | AI assistants for coding/writing where the user controls the conversation | claude.ai, chatgpt.com, gemini.google.com, copilot.github.com |

### SOFT_BLOCK (block page → cooldown + reason override allowed)

| Category              | Definition                                       | Examples |
|-----------------------|--------------------------------------------------|----------|
| `Lifestyle`           | Secular lifestyle, fashion, leisure content      | (curate at Phase 0) |
| `Opinion`             | Political opinion, op-eds, ideological commentary | (curate at Phase 0) |
| `SecularIsraeliNews`  | Israeli outlets with secular editorial values    | timesofisrael.com, jpost.com, ynet.co.il, israelnationalnews.com, jta.org, haaretz.com |
| `GoyisheNews`         | General secular news media                       | cnn.com, bbc.com, nytimes.com, foxnews.com |
| `SocialForum`         | General-purpose social/forum sites (not technical) | news.ycombinator.com, reddit.com (default; per-subreddit override out of scope) |
| `Entertainment`       | Non-adult entertainment streaming, music, gaming | youtube.com (see §10), netflix.com, spotify.com, twitch.tv |
| `LashonHora`          | Gossip, celebrity tabloids, frum lashon hora    | (curate at Phase 0) |

### HARD_BLOCK (block page → no override path, ever)

| Category         | Definition                                                      |
|------------------|-----------------------------------------------------------------|
| `Adult`          | Pornography, sexually explicit, dating-for-hookup.              |
| `Antisemitism`   | Overtly antisemitic content.                                    |
| `AvodahZarah`    | Idolatry, missionary content, religious-other-faith proselytizing. |
| `AntiChassidus`  | Content opposing chassidic teachings or the Rebbe specifically; Litvish/MO polemics that target chassidim. |
| `Kefirah`        | Heresy: Conservative/Reform theology framed as Jewish, academic Bible criticism that denies Torah min Hashamayim, atheist-of-Torah content. |
| `CompanionAI`    | AI companion/roleplay services (janitor.ai, character.ai). |

### META

| Category   | Meaning                                                              |
|------------|----------------------------------------------------------------------|
| `Unknown`  | Domain seen but not yet classified. Triggers the classification flow (Phase 3) or settings UI prompt. |

### Edge calls (per §10 confirmed principles)

- **YouTube** → `Entertainment` and **fully blocked, no shiurim exception**.
  The user gets Torah content elsewhere; the cost/benefit on YouTube is bad.
- **Wikipedia** → `Lifestyle` or `Opinion` (effectively blocked). No
  integration or fallback.
- **Hacker News** → `SocialForum`, blocked. Despite the tech subject matter,
  it's a forum and behaves like one.
- **Internet Archive** → `Technical`, allowed despite the Wayback Machine
  exposing arbitrary historical web content. The archival utility outweighs
  the surface category overlap.
- **AI assistants** (`ProductivityAI`) — only the *service domains* are
  category-controlled. The AI's *replies* are NOT filtered (see §10).

---

## §3 Policy Mapping & Hard/Soft Distinction

Each category maps to exactly one `PolicyAction`:

```
'allow'        → ALLOW group        — no rule emitted, default-pass
'soft_block'   → SOFT_BLOCK group   — DNR redirect to block page; override OK
'hard_block'   → HARD_BLOCK group   — DNR redirect to block page; NO override
'classify'    →  META Unknown      — handled by classification flow, not DNR
```

The mapping lives in `CATEGORY_POLICY` in
[`categories.ts`](extension/src/core/categories.ts). TypeScript's
`Record<Category, PolicyAction>` typing guarantees every category has a
policy decision — there is no implicit default.

### DNR rule priorities

- **Hard-block:** priority 2.
- **Soft-block:** priority 1.

Hard-block wins when a domain is ever in both groups (which shouldn't happen,
but defends against data drift). See
[`dnr-rules.ts`](extension/src/core/dnr-rules.ts).

### Fail-closed defaults

- A `CategoryEntry` whose `category` is not in `CATEGORY_POLICY` returns
  `'classify'` from `policyFor()`. Never `'allow'`. Schema drift goes to the
  classification flow, not silent allow.
- Truncation of the rule list (when exceeding `MAX_DYNAMIC_RULES = 25_000`)
  reports `stats.truncated = true` so the settings UI can surface it. We
  never silently drop blocks.

---

## §4 Override Architecture

The architecture is **hybrid default + tiered override**:

- *Hybrid default* — every domain has a category (seed, AI, user, or sync).
  Unknown domains go to a classification flow before being permitted.
- *Tiered override* — soft-blocks can be overridden with friction calibrated
  to the category and to historical usage. Hard-blocks have **no override
  path** at any tier.

### Tiers

| Tier  | Applies to                | Mechanism |
|-------|---------------------------|-----------|
| **0** | ALLOW categories          | Pass through, no UI shown. |
| **1** | SOFT_BLOCK (default)      | Block page → 60s cooldown timer → reason text required → unblock for the current navigation. Logged. |
| **2** | SOFT_BLOCK (escalated)    | Tier 1 + a designated "chaver" must enter a PIN to confirm. *Draft — no domains assigned by default; the user can promote any domain into Tier 2 from the settings UI.* |
| **HARD** | HARD_BLOCK             | Block page → no override controls. Attempt is logged as `hard_block_attempted`. |

The 60-second cooldown duration is set in `SOFT_BLOCK_COOLDOWN_MS` in
[`categories.ts`](extension/src/core/categories.ts). Single global value, not
per-category — the UX is more predictable that way.

### Override flow (soft-block, Tier 1)

1. User navigates to a blocked domain.
2. DNR redirects to the block page with `?category=<Category>`.
3. Block page renders: domain (from referrer or query), category, why-blocked
   text, override controls.
4. User clicks "Continue anyway".
5. 60-second countdown timer runs. Reason field is required and must be
   non-empty.
6. On confirm: navigation is permitted for the current top-frame load.
   `OverrideLogEntry` is appended with `overrideType: 'allowed_with_cooldown'`.
7. The next visit to the same domain re-triggers the block page. Overrides
   are intentionally not "sticky" — friction is the feature.

### Override flow (Unknown classification, Tier 1)

1. User navigates to an unclassified domain.
2. Classification flow runs:
   - Phase 1 (no AI): block page shows category picker; user assigns category.
   - Phase 3+: local NPU/Nano proposes a category; user confirms or corrects.
3. If the assigned category is `'allow'`, navigation proceeds without
   cooldown. Log entry: `classified_then_allowed`.
4. If the assigned category is soft-block or hard-block, navigation is
   blocked. Log entry: `classified_then_blocked`.

### Override flow (Hard-block)

1. User navigates to a hard-blocked domain.
2. Block page renders with no override controls — only "Go back" / "Close tab."
3. Attempt is logged as `hard_block_attempted` with the category snapshot.
   This is for the user's own self-review and (Phase 5) accountability digests.
4. No code path opens the navigation, ever. See §10.

### What is *not* in the override system

- No per-category cooldown tuning in v1.
- No "allow for N minutes" timeboxed unblocks.
- No global "filter off" switch — this is a single-user filter with the user
  acting on their own behalf; an escape switch defeats the point.
- No remote/admin override (deferred to Phase 5 if the chaver-with-PIN flow
  materializes).

---

## §5 Windows Architecture

Stack, from layer-0 outward:

1. **NextDNS** (system-wide DoH baseline).
2. **Browser extension** (MV3 Chromium + separate Firefox manifest).
3. **Ryzen NPU classifier** (Phi-3 mini / Gemma 2 2B candidate).
4. **WFP driver** — *DEFERRED*. Do not build unless the user explicitly asks.

### Layer 1: NextDNS (Phase 0)

- Single profile, shared with Android. Catches the broadest, blunt-instrument
  blocks (known-bad domains, DoH bypass, telemetry).
- Curation is hand-done by the user from their own judgment.
- Backed up to `data/nextdns-profile.json` (export-from-UI snapshot).
- Limitations: domain-only, no awareness of subpaths, no UI for overrides.
  The browser extension exists to add what NextDNS cannot.

### Layer 2: Browser extension (Phase 1)

- **Manifest V3** with `declarativeNetRequest` (NOT
  `declarativeNetRequestWithHostAccess`). Privacy property: rules evaluate in
  the browser; the extension does not see request URLs at runtime. The user's
  browsing data never enters the extension process. **This is a tzniyus
  consideration.**
- **Build:** Vite + `@crxjs/vite-plugin@^2.4.0` + Preact + TypeScript.
- **Bundle layout:**
  - `dist/manifest.json` — generated from
    [`manifest.config.ts`](extension/manifest.config.ts).
  - `dist/service-worker-loader.js` — crxjs's loader; imports the SW chunk.
  - `dist/assets/service-worker.ts-*.js` — the actual SW.
  - `dist/src/ui/block-page/index.html` — block page UI.
  - `dist/src/ui/settings/index.html` — settings popup.
- **Service worker responsibilities (Phase 1):**
  - On install: seed the IndexedDB from bundled
    [`seed_categories.json`](extension/src/seed/seed_categories.json).
  - On startup / on settings-message: regenerate DNR dynamic rules from DB.
  - Listen for `rebuild_rules` messages from the settings UI.
- **Storage:** IndexedDB, DB name `kosher-filter`. Two stores: `categories`
  and `override_log`. See §7.
- **Block action:** DNR `redirect` to the extension's own block page
  (`web_accessible_resources`). Privacy: the blocked URL itself is **not**
  passed through the redirect — only the category.

### Layer 3: Ryzen NPU classifier (Phase 3)

- Hardware: Asus Zenbook S16, Ryzen AI 9, NPU ~50 TOPS, 24GB RAM.
- Candidate models: **Phi-3 mini** (3.8B) or **Gemma 2 2B**. Decision deferred
  to Phase 3 entry; pick whichever has stable Ryzen AI SDK / DirectML support
  at that time.
- Inference is **local-only**. Browsing data never leaves the device. See §10.
- Integration: the service worker posts an unclassified domain (+ optional
  fetched page title/snippet via `webNavigation`) to a native messaging host
  running the model. Result is a `Category` plus confidence in [0, 1].
- Confidence threshold: `< 0.7` → escalate to user via settings UI; `>= 0.7`
  → auto-classify with a note in the log.

### Layer 4: WFP driver — DEFERRED

A Windows Filtering Platform driver would catch traffic from non-browser
apps (electron-based clients, native installers, etc.). **Do not build
this unless explicitly asked.** The complexity-to-value ratio is wrong for
a single-user setup where the browser is the primary attack surface.

---

## §6 Android Architecture

Stack:

1. **Private DNS** (Android setting) pointed at the same NextDNS profile.
2. **Local VPN-style filter** via `VpnService` — likely a **NetGuard fork**.
3. **App hygiene** + **Gemini Nano classifier**.

### Hardware target

Google Pixel 10 Pro, latest Android, Gemini Nano on-device.

### Layer 1: Private DNS

- Same NextDNS profile as the desktop.
- Configurable in: Settings → Network & Internet → Private DNS.
- Catches what DNS can catch; the VPN filter does the rest.

### Layer 2: VpnService filter (Phase 2)

- Loops all device traffic through a local `VpnService` for filtering.
- **NetGuard fork** is the leading option:
  - Mature, audited, open-source (GPL-3.0).
  - Forking inherits GPL-3.0 — the Android codebase must be GPL-3.0.
  - Kotlin preferred (matches modern Android); Java only where NetGuard
    internals require it.
- Open question: fork vs build from scratch. Decision belongs at Phase 2
  entry, when the user has confirmed willingness to accept GPL-3.0 for the
  Android codebase. Until then, the fork decision is parked.

### Layer 3: App hygiene + classifier (Phase 2.5 / Phase 3)

- App hygiene: audit installed apps; surface ones in `Entertainment`,
  `SocialForum`, etc. for the user's review. No automated app removal —
  surfacing only.
- Classifier: **Gemini Nano** via AICore.
  - Local-only inference, same rule as desktop NPU.
  - Used for: classifying unknown domains observed by the VPN filter, and
    optionally classifying installed apps by metadata.

### Stock Android vs GrapheneOS

- Stock Android is the default. AICore (Gemini Nano) requires Play Services;
  GrapheneOS support is uncertain.
- Specific banking apps must be verified on stock Android first — they
  sometimes refuse to run with VPN-style filters active.
- A GrapheneOS migration is parked until banking apps and AICore behavior are
  understood. See NOTES.md "Open decisions parked."

---

## §7 Shared Backend / Category DB

### Category DB

The shared data model. Lives in IndexedDB on the extension and in SQLite (or
equivalent) on the Android client. Sync backend is Phase 4.

#### `CategoryEntry`

(See [`extension/src/core/schema.ts`](extension/src/core/schema.ts) for the
authoritative TypeScript definition.)

- `domain: string` — lowercased ASCII; IDN names are punycode-encoded.
  Primary key. Subdomain handling is **not** in the schema — the lookup logic
  decides whether to match exact, suffix, or longest-prefix.
- `category: Category` — one of the 18 categories from §2 (or `Unknown`).
- `subcategory?: string` — free-form refinement (e.g. "fashion" inside
  `Lifestyle`). Optional, for analysis.
- `source: ClassificationSource` — `'seed'` | `'user'` | `'ai_local'` | `'sync'`.
- `confidence?: number` — `[0, 1]` only when `source: 'ai_local'`. Seed and
  user are implicitly 1.0.
- `timestamp: number` — Unix ms; created or last classified.
- `syncVersion: number` — monotonically increasing for sync conflict
  resolution. Assigned by the backend; Phase 1 leaves at 0.

#### `OverrideLogEntry`

Append-only log of every block-page interaction. **Never deleted.**

- `id: string` — UUID v4, for sync dedup.
- `timestamp: number` — Unix ms.
- `device: string` — per-install ID, so sync can attribute entries.
- `domain: string` — the blocked domain. **No URL path is ever stored** —
  paths can carry tzniyus-sensitive content.
- `category: Category` — snapshot at block time (the category may change
  later; this is what was true *then*).
- `overrideType: OverrideType` — `'allowed_with_cooldown'` |
  `'classified_then_allowed'` | `'classified_then_blocked'` |
  `'hard_block_attempted'` | `'cancelled'`.
- `overrideReason: string` — user-entered text for Tier 1 soft-block
  overrides. Empty otherwise.
- `cooldownUsedMs: number` — how long the cooldown actually ran (the user may
  have waited longer than the 60s minimum).
- `syncVersion: number` — as above.

#### Schema versioning

- `SCHEMA_VERSION` is bumped only on **shape changes** to `CategoryEntry` or
  `OverrideLogEntry`. Adding category literals (§2) is not a schema change.
- Migrations live next to the IDB code in `db.ts`. Treat schema drift as a
  versioned migration, not a refactor.
- Phase 4 backend must read the current and previous schema versions.

### Sync backend (Phase 4)

Out-of-scope for Phase 1, but designed-for:

- **Single-user** (multi-device for that user). No multi-tenant.
- **Self-hosted** on a $5/mo VPS. Language TBD (Go or Python — defer until
  Phase 4 entry).
- **Auth:** per-device key in client local storage; server validates against
  the user's account.
- **Conflict resolution:** last-write-wins on `CategoryEntry` (newest
  `syncVersion` wins). Override log is append-only — no conflicts possible.
- **What is NOT synced:** anything containing browsing-path data. The
  `overrideReason` text *is* synced; the user wrote it themselves and it's
  their own data.

### Accountability backend hook (Phase 5)

- Periodic digest of the override log (weekly or monthly) sent to:
  - The user themselves, always.
  - Optionally, a designated "chaver" (human accountability partner) — only
    if the user opts in and confirms with the chaver. The chaver-with-PIN
    role is a **human conversation**, not a technical decision. See NOTES.md.
- Digest format: aggregate counts per category, top-10 domains hit, no raw
  URLs.

---

## §8 Roadmap — Phases 0 through 6

Work the phases **in order**. If a later-phase question arises during an
earlier phase, capture it in NOTES.md "Deferred questions" and continue.

### Phase 0 — NextDNS foundation (week 1)

- [ ] Create NextDNS profile.
- [ ] Hand-curate initial blocklist (secular news, lashon hora, etc.).
- [ ] Hand-curate initial allowlist (Chabad, frum, technical, utility).
- [ ] Apply profile to Windows (DoH client config).
- [ ] Apply profile to Android (Private DNS).
- [ ] Export profile to `data/nextdns-profile.json` and check in.
- [ ] Seed `extension/src/seed/seed_categories.json` from the hand-curated
      lists (Phase 0 unlocks Phase 1's actual blocking behavior).

### Phase 1 — Browser extension MVP (weeks 2–6)

Chromium-first; Firefox manifest after Chromium is stable.

**Scaffold and core (done):**

- [x] Project scaffold: Vite + crxjs v2 + Preact + Vitest.
- [x] Category taxonomy + policy map
      ([`categories.ts`](extension/src/core/categories.ts)).
- [x] Schema types + type guards
      ([`schema.ts`](extension/src/core/schema.ts)).
- [x] IndexedDB layer ([`db.ts`](extension/src/core/db.ts)).
- [x] DNR rule generator with priority bands, ID hashing, truncation
      reporting ([`dnr-rules.ts`](extension/src/core/dnr-rules.ts)).
- [x] Service worker lifecycle: install → seed → rebuild DNR.
- [x] Build-time JSON import of seed (no runtime fetch from SW).
- [x] 17 unit tests covering `core/` logic.

**Phase 1 work remaining:**

- [ ] Block page UI: render category, "why blocked" copy, override controls
      keyed off policy (none for hard-block).
- [ ] Cooldown timer component.
- [ ] Reason text input with non-empty validation.
- [ ] Settings popup UI:
  - [ ] Browse the category DB (filter by category).
  - [ ] Edit a row (re-categorize).
  - [ ] Delete a row (return to `Unknown`).
  - [ ] Override log viewer (read-only).
  - [ ] "Rebuild DNR rules" button (wires to existing SW handler).
  - [ ] JSON export/import of the category DB (for backup pre-sync).
- [ ] `webNavigation` permission + observer for unknown-domain logging
      (Phase 1.5 — adds a permission, take only if classification flow
      requires it).
- [ ] Block page: classification UX for `Unknown` (category picker).
- [ ] Phase 0 seed data wired in.
- [ ] Firefox manifest variant (separate file, share core code).
- [ ] Real extension icons (16/48/128 PNG).

### Phase 2 — Android app MVP (weeks 6–12)

- [ ] Decision: NetGuard fork vs greenfield.
- [ ] Set up Android Studio project (Kotlin).
- [ ] Confirm banking apps function with VpnService active.
- [ ] VpnService skeleton.
- [ ] DNS interception + per-domain rule engine.
- [ ] Settings UI (Jetpack Compose).
- [ ] App-hygiene auditor (read installed-apps list, surface flagged categories).
- [ ] IndexedDB-equivalent local DB (Room/SQLite).
- [ ] Sync prep: same `CategoryEntry` / `OverrideLogEntry` shapes as
      extension.

### Phase 3 — Local AI classifier (months 3–4)

- [ ] Pick model: Phi-3 mini vs Gemma 2 2B. Bench inference latency on the
      target Ryzen AI 9.
- [ ] Set up Ryzen AI SDK / DirectML inference path.
- [ ] Prompt design: deterministic category output, JSON-mode, refusal-safe.
- [ ] Native messaging host wiring (browser extension ↔ classifier process).
- [ ] Confidence calibration + escalation threshold.
- [ ] Android: Gemini Nano via AICore — same prompt, different runtime.
- [ ] Soak test: 1 week of real browsing, audit accuracy.

### Phase 4 — Sync backend (months 4–5)

- [ ] Language decision: Go or Python.
- [ ] VPS provisioning + TLS.
- [ ] Auth: per-device key, server validates.
- [ ] DB schema (mirrors `CategoryEntry` / `OverrideLogEntry`).
- [ ] Sync endpoint: bidirectional, with `syncVersion`-based conflict resolution.
- [ ] Client: extension + Android both sync.
- [ ] Backup + restore tooling.

### Phase 5 — Accountability features (months 5–6)

- [ ] Override log analytics (counts, trends, top domains).
- [ ] Email/push digest generation.
- [ ] Chaver-with-PIN flow — **only if** the human conversation about who
      fills that role has happened and the user opts in.
- [ ] Per-domain Tier 2 promotion in settings UI.

### Phase 6 — Public release prep (months 6+)

- [ ] Halachic review by a Rav. Specifically: category boundaries (Kefirah,
      AntiChassidus, AvodahZarah), the chaver flow, override mechanics.
- [ ] Documentation pass: README, install guide, contributor guide.
- [ ] Real icon set + Chrome Web Store screenshots.
- [ ] **Chrome Web Store listing name: `iYidden Kosher Filter - Web Extension`.**
- [ ] Firefox AMO listing.
- [ ] Android distribution decision: Play Store vs F-Droid vs sideload.
- [ ] License decision (GPL-3.0 is forced if Android is a NetGuard fork; pick
      something compatible for the extension and backend).
- [ ] Privacy policy reflecting local-only inference.

---

## §9 Open decisions / parked questions

Imported from NOTES.md. When one of these resolves, log it in NOTES.md's
"Decisions log" and update PLAN.md accordingly.

- **Slack** — probably allow as a work tool (`ProductivityAI` or `Utility`).
  Not yet locked in.
- **Specific banking apps** — must be verified on stock Android with the
  VpnService active before any GrapheneOS conversation begins.
- **Chaver-with-PIN role** — who fills it. This is a human conversation, not
  a technical decision. Phase 5 feature gated on this.
- **Halachic review by a Rav** — of the category logic and override rules.
  Targeted at Phase 6 entry; happy to do it earlier if a Rav is available.
- **Curated app store sibling project** — intentionally deferred to month
  ~3. Not in scope here.
- **`exactOptionalPropertyTypes` strictness in `tsconfig`** — currently on.
  May surface friction when wiring Phase 1 UI; reconsider if it does.

---

## §10 Confirmed Principles (LOCKED-IN)

These decisions are **not open for revision** without explicit user
instruction. Claude Code: do not relitigate. New contributors: read these
before opening a PR that touches any of these areas.

1. **AI assistant replies are NOT filtered.** Only AI *service domains* are
   category-controlled (claude.ai / chatgpt.com / gemini.google.com allowed;
   janitor.ai / character.ai hard-blocked under `CompanionAI`). The user
   trusts their own judgment in conversations with productivity AI.

2. **YouTube is fully blocked.** No shiurim exception. Torah content is
   available from kosher sources; the cost/benefit on YouTube is bad.

3. **Wikipedia is blocked.** Do not propose Wikipedia integration or
   fallbacks anywhere in the stack.

4. **Hacker News is blocked** (social forum). Do not propose it as a tech
   source. Technical forums that *are* allowed: Stack Overflow, Stack
   Exchange, GitHub Discussions, dev.to, Lobsters.

5. **Internet Archive is allowed.** Archival utility outweighs the surface
   category overlap.

6. **Classification inference is local-only.** NPU on Windows, Gemini Nano on
   Android. Never propose sending browsing data to a cloud API for
   classification — not for accuracy, not for QA, not for telemetry. Browsing
   patterns are halachically sensitive.

7. **Secular Israeli news is blocked** (Times of Israel, JPost, Ynet, Arutz
   Sheva, JTA, Haaretz). The reason is the **secular editorial values**
   these outlets propagate — not anti-Zionism. The user supports settling
   the full Land of Israel. Frum non-Chabad news (Yeshiva World, Matzav,
   Hamodia, VIN) and Chabad news (Chabad.org, COLlive, Anash,
   CrownHeights.info, Beis Moshiach) are allowed.

8. **Hybrid default + tiered override is the architecture.** Do not propose
   pure-allowlist or pure-blocklist alternatives.

9. **Hard-block categories have NO override path.** These are: `Adult`,
   `Antisemitism`, `AvodahZarah`, `AntiChassidus`, `Kefirah`, `CompanionAI`.
   Do not introduce any code path — UI, settings, debug, test fixture — that
   permits navigation past a hard-block. They represent serious aveiros.

10. **No telemetry off-device.** No analytics, no error reporting, no crash
    dumps sent to third parties. Local logs only. Local-only inference is
    itself a tzniyus consideration.

11. **No URL paths in the override log.** Only the domain. Paths can carry
    tzniyus-sensitive content.

12. **Lean strict on halachic ambiguity.** A false positive (over-block) is
    recoverable via the override flow. A false negative (let through harmful
    content) is not.

---

*End of PLAN.md v0.6.*
