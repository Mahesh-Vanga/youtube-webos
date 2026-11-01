# Physical TV validation — 0.5.8

Target reported by the user: **LG OLED55C2XSC**. The installed webOS version was
not supplied. No TV was connected during development. Unit tests, browser fixture
checks and ES5 bundle compatibility do not certify actual TV playback or fps.

1. Save the previous working player IPK. Install the 0.5.8 player IPK
   using Homebrew or webOS Dev Manager and confirm **v0.5.8** at the bottom of the
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
9. On 4:3, widescreen and vertical videos, test Green → Picture → Picture framing → Fill
   and zoom. Confirm only video changes, controls remain reachable, and Original
   with 100% (or Reset) restores normal playback. Test recommendations, song
   changes and returning Home while a custom framing option is enabled. Presets
   keep the source's proportions; they are not a stretch override. Videos with
   black bars encoded into the picture may require manual zoom. Check crop behavior
   on the physical TV; source geometry unit tests do not prove native plane clipping.
10. On a known HDR upload, enable Prefer HDR and confirm the quality menu offers
    an HDR-labelled format and the TV actually enters HDR mode. Play an SDR-only
    upload next and confirm it stays SDR. Disable the preference and check Auto
    is restored unless highest quality was separately enabled. This does not
    convert SDR to HDR, unlock unavailable quality levels or enhance 1080p to 8K.
11. Confirm Green opens Ads & skips first with the video visible through the panel.
    Switch all four categories with the remote and pointer. Hidden controls must
    not receive focus; the header and footer should stay visible when scrolling.
    Check that navigation does not also seek or move the video interface behind
    the panel. Check all three transparency levels and optional blur; disable
    blur if it affects performance on the installed firmware.
12. Disable SponsorBlock during playback, then reenable it and change a skip
    category. Confirm the current video responds immediately. Test the sleep
    timer, cancellation, playback pause on expiry, and Off after app restart.
    In Extras, refresh video details and compare source resolution with Stats for
    nerds; source dimensions are not the panel's output resolution.
13. Install **YouTube Extended Home** from the same repository. Confirm it appears
    in LG Home's apps list, move it with Edit App List if needed, and open it.
    It must open the existing player with Green/Red controls and saved settings.
    Removing this companion must not remove the player. If the player is missing,
    the companion must show a clear installation message and retry button.
14. Green/Red → Audio & TV → LG Sound settings: test TV Speaker, then HDMI (ARC)
    Device with the connected soundbar/receiver. Check actual received formats on
    the audio device. If the Sound-page launch is blocked, use the displayed TV
    Settings-button path. A successful app-launch reply does not verify an output
    switch or Dolby decoding.
15. On supported 5.1 content, show the native player controls and try Go to YouTube
    5.1 surround control. Check focus reaches the actual native option. On stereo
    or hidden/unsupported controls, the overlay must show instructions without
    claiming 5.1 or Atmos is enabled.

For a regression, disable the glass theme, restart and repeat the same steps.
Record model, webOS version, app version, video ID, network type, exact remote
action and Stats for nerds. Avoid recording account identifiers or sign-in codes.
Reinstall the saved IPK to roll back if needed. The settings reset only changes
the old forced-quality default; login data is not deliberately cleared.

## Homebrew publication check

Run `pnpm catalog:check` against the exact new IPK. After publishing source,
both binaries and feed together, verify both entries say 0.5.8 and each downloaded
IPK's SHA-256 equals its `manifest.ipkHash.sha256`. If jsDelivr serves an old
version, use `https://cdn.jsdelivr.net/gh/Mahesh-Vanga/youtube-webos@main/apps-0.5.8.json`.
The older commit-pinned `@bc12eea/apps.json` remains on 0.5.4 intentionally.
