# Physical TV validation — 0.5.4

Target reported by the user: **LG OLED55C2XSC**. The installed webOS version was
not supplied. No TV was connected during development. Unit tests, browser fixture
checks and ES5 bundle compatibility do not certify actual TV playback or fps.

1. Save the previous `youtube.leanback.v4_0.5.3_all.ipk`. Install the 0.5.4 IPK
   using Homebrew or webOS Dev Manager and confirm **v0.5.4** at the bottom of the
   green-button settings panel. Reopen the app after updating.
2. Leave “Prefer highest supported quality” and “Frosted settings background”
   **off**. Check glass theme on/off while browsing. Confirm focus returns when
   closing settings with Green or the TV Back button and every option is reachable
   using the D-pad. Holding Green should not repeatedly open/close settings.
3. On Home, test repeated Up/Down and Left/Right, then open a music video. Open
   recommendations and scroll several rows down and back to the player. Check
   for unexpected black overlays, clipping, stuck selection or offset controls.
4. Seek with the D-pad and Magic Remote pointer. Check the existing single track,
   buffer, chapter previews, time labels, Previous/Play/Next and settings buttons.
   Test a video with chapters as well as one without chapters.
5. Switch songs repeatedly before the previous song has finished loading. Check
   that SponsorBlock segments belong to the new song. Pause/resume and return
   Home. Network startup and buffering are separate from remote input latency.
6. Search for a musician and scroll until YouTube loads multiple pages. Confirm
   songs, other videos and playlists remain accessible. Repeat a nonmusic search.
   This fork prioritizes received results and does not fetch an exhaustive catalog.
7. On a video offering 4K, use Stats for nerds to confirm the **actual current
   resolution**, codec, dropped frames, connection speed and buffer. The C2's
   display is 3840×2160; an “8K” title is not evidence of 8K playback. Test Auto
   first, then optionally highest supported quality. If buffering increases, turn
   the preference off; the player is returned to Auto.
8. On known 5.1 content, look for YouTube's native 5.1 option and check the audio
   system's received format. A Dolby-capable television alone cannot make a
   stereo source Dolby Atmos. Do not interpret a fake badge as verification.

For a regression, disable the glass theme, restart and repeat the same steps.
Record model, webOS version, app version, video ID, network type, exact remote
action and Stats for nerds. Avoid recording account identifiers or sign-in codes.
Reinstall the saved IPK to roll back if needed. The settings reset only changes
the old forced-quality default; login data is not deliberately cleared.

## Homebrew publication check

Run `pnpm catalog:check` against the exact new IPK. After publishing source,
binary and feed together, verify the remote feed says 0.5.4 and the downloaded
IPK's SHA-256 equals `manifest.ipkHash.sha256`. If jsDelivr still serves 0.5.3,
wait for its cache to refresh or use the release's commit-pinned feed URL.
