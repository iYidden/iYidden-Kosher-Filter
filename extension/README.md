# Kosher Filter — Browser Extension

Phase 1 MVP of the kosher filter. Chromium-targeted (Edge,
Chrome, Brave, Arc) Manifest V3 extension.

See the repo root for `PLAN.md` and project-wide context.

## Setup

```bash
npm install
```

## Develop

```bash
npm run dev
```

Then in Edge/Chrome:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable Developer Mode.
3. Click "Load unpacked" and select the `dist/` directory inside this folder.
4. Edits to `src/**` rebuild the extension; click the reload icon on the
   extensions page if a change doesn't pick up automatically.

## Build for distribution

```bash
npm run build
```

Output goes to `dist/`. Load this as an unpacked extension, or zip it
for distribution (Chrome Web Store packaging comes in Phase 6).

## Test

```bash
npm test        # one-shot
npm run test:watch
```

Tests cover the pure-function `core/` modules. `dnr-rules.ts` and
`categories.ts` are load-bearing for the filter doing its job, so the
tests there are not optional.

## Type-check without building

```bash
npm run typecheck
```

## Project structure

See `CLAUDE.md` for the architecture map and design rules.
