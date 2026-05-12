# Browser Extension — Claude Code Context

Phase 1 work. Chromium MV3 first, then a separate Firefox manifest.

> Read ../CLAUDE.md and ../PLAN.md before working in this directory.

## Scope

- Manifest V3 (Chromium) — primary target
- Firefox MV3 manifest — secondary, separate manifest file
- TypeScript recommended; vanilla JS acceptable
- Vitest or Jest for category rule logic

## Out of scope here

- Native messaging to the NPU classifier (that lives in `../classifier/`)
- Android-specific concerns
- Anything touching cloud APIs for classification

## TODO

- Decide bundler (esbuild vs Vite vs rollup)
- Decide manifest split strategy (single source → two outputs)
- Wire category DB consumption from `../data/categories.json`
