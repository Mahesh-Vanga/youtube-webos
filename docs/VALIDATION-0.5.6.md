# Validation — 0.5.6, 2 November 2026

50 source-level regression tests cover previous content ordering, playback,
framing and HDR behavior plus category selection, disabling hidden controls,
remote focus/activation, document-level keyboard capture, transparency choices,
immediate SponsorBlock toggles and sleep timer expiry/cancellation/session reset.

TypeScript, ESLint, Prettier, production Webpack build, ES5 bundle checks and
Homebrew package version/size/hash consistency are included in release validation.
Webpack bundle-size and installed Browserslist dataset warnings are advisory.

The supplied image guides the visual design. No physical TV or visual browser
validation was available; the previously declined browser preview was not retried.
The remote/DOM mocks cannot prove the appearance, contrast over every video,
native video-plane transparency/blur behavior, playback quality or latency on
the actual LG firmware. Use [TV-VALIDATION.md](TV-VALIDATION.md) on the TV.

No fabricated resolution, HDR metadata, codecs or 8K labels are added. Lower
resolution sources remain limited by the original video and the TV's 4K panel.
