# Validation — 0.5.7, 2 November 2026

Shortcut-only maintenance release. Runtime changes are limited to early
window-level Green/Red shortcut capture, numeric/named/release event handling,
deduplication, queuing until the existing panel is ready, and shortcut hints.
Existing playback, picture, glass styles and settings behavior are unchanged.

59 regression tests cover existing functionality and the new color-key sequences.
Remote tests now simulate window capture before document and panel handlers,
including Red opening the same panel and restoring focus on close. Repeat and
release-only sequences are checked separately. All supported unrelated keys pass
through this shortcut handler unchanged.

TypeScript, ESLint, Prettier, production build, ES5 compatibility and package/feed
version/size/SHA-256 are checked. These tests cannot prove which events the user's
physical remote and firmware deliver; a real-TV keypress still needs confirmation.

Install from `apps-0.5.7.json`, fully close/reopen YouTube Extended, then tap
**Green or Red**. The prior version-specific feed remains on its original build.
