# Validation — 0.5.4, 1 November 2026

Completed locally:

- 28 source-level regression tests: response ordering and continuation retention,
  settings migration/storage failures, frozen request serialization, supported
  quality selection, remote keys/focus, theme toggles and stale SponsorBlock replies.
- TypeScript project checks, ESLint, Prettier and Git whitespace checks.
- Production Webpack build and ES-Check: both emitted JavaScript entry points are
  ES5 compatible under the configured browser targets.
- webOS CLI packaging, packaged application version and script-byte comparison.
- Homebrew manifest version, IPK URL, size and SHA-256 consistency.

Build advisories: Browserslist reports its installed compatibility dataset is
seven months old. Webpack reports the 249 KiB user script exceeds its default
244 KiB advisory threshold. These are warnings; neither blocked the build.
No dependencies were upgraded for this change.

Not verified:

- The local browser fixture could not be opened because browser access to the
  local test origin was declined. Its layout has not been visually validated.
- No physical TV connection, fps/remote-latency measurements, live YouTube
  pagination, 4K playback or 5.1 output validation was available.
- Nothing was pushed to GitHub, installed on the TV or published to jsDelivr.

Use [TV-VALIDATION.md](TV-VALIDATION.md) for the device checks before relying on
this release. Passing source-level tests cannot guarantee future compatibility
with YouTube's remotely updated TV interface.
