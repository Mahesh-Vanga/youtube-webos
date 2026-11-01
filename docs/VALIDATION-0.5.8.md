# Validation — 0.5.8, 2 November 2026

72 source-level regression tests include all previous key, settings, playback
and framing checks plus SDK/PalmServiceBridge launch responses, native errors,
timeouts, missing APIs, conservative surround-control discovery and the Home
shortcut's player target, launch failure UI and visible identity.

The Audio & TV overlay is tested against mocked native callbacks. It opens
LG Sound settings and does not directly change Sound Out. Surround-control
discovery requires one visible player control with an explicit surround label;
video titles and the custom overlay are excluded. Unsupported/ambiguous cases
show instructions instead of asserting surround output.

Both production bundles, ES5 syntax, TypeScript/ESLint/formatting, IPK contents
and each Homebrew entry's version/size/SHA-256 are release checks. The companion
has a separate ID; it does not replace or rebuild the working player's identity.

No physical LG Home registration, actual Sound-menu launch on the user's current
firmware, HDMI/TV-speaker switching, Atmos or 5.1 output was verified. The native
API callbacks and package metadata cannot prove these hardware outcomes. After
installing both entries, check the Home tile, test launching the player from it,
and test both audio outputs using LG's native Sound menu and a known 5.1 video.
