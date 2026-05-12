# Android App — Claude Code Context

Phase 2 work. Local VPN-style filter using `VpnService`, likely a NetGuard
fork (GPL-3.0).

> Read ../CLAUDE.md and ../PLAN.md before working in this directory.

## Scope

- Pixel 10 Pro, latest Android
- Kotlin if forking NetGuard (matches upstream); Java only if internals demand it
- Gemini Nano via AICore for on-device classification
- Private DNS pointed at the shared NextDNS profile

## Out of scope here

- Play Services dependencies (would pull project into Play Store ecosystem)
- iOS, family-device management
- Cloud classification

## TODO

- NetGuard fork decision: hard fork vs patch set
- License compliance plan for GPL-3.0 if forking
- AICore Gemini Nano integration prototype
