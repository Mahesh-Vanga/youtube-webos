# Validation — 0.5.5, 2 November 2026

42 source-level regression tests cover the existing 0.5.4 behavior plus framing
geometry, centered zoom, original/reset, saved options, remote cycle controls,
explicit HDR-format selection, SDR fallback, Watch-only video styling and
coalescing changes into a single animation frame.

The video styling tests use browser-like mocks. No physical LG C2 connection was
available. Neither mock tests nor CSS feature detection verifies the TV's native
video-plane crop behavior, actual HDR output, remote latency or visual appearance.
The previously declined local browser preview was not retried.

No fake codec/resolution capabilities, SDR-to-HDR filters, Canvas upscaling or
8K quality labels are introduced. 1080p sources remain 1080p; the 4K TV scales
them for display. Native automatic HDR behavior remains in place, with an optional
preference for formats that YouTube explicitly labels HDR and marks playable.

The release process also checks TypeScript, ESLint, Prettier, production build,
ES5 bundle compatibility, packaged script bytes/version and Homebrew SHA-256/size.
Webpack's bundle-size and the installed Browserslist dataset warnings are advisory.
Use [TV-VALIDATION.md](TV-VALIDATION.md) for the physical-device checks.
