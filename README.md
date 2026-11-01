# YouTube Extended for webOS — unofficial fork

Modified by Mahesh Vanga, 1–2 November 2026. Based on
[webosbrew/youtube-webos](https://github.com/webosbrew/youtube-webos), with the
original authors' source and GPL-3.0-only license retained. This fork is not
endorsed by webosbrew, Google/YouTube, Apple, Dolby, or LG.

## Version 0.5.6

The **Green** button now opens a centered, transparent glass settings panel over
the current video, inspired by the supplied settings reference. The title,
category buttons and remote-control hints stay visible while settings scroll.
No full-screen blur, scrolling filters or animation loops are added.

- **Ads & skips** opens first, with ad blocking and SponsorBlock followed by
  indented segment-category checkboxes. SponsorBlock on/off and category changes
  now update the current video rather than waiting for a new video.
- **Picture** contains highest playable quality, native HDR preference, framing,
  zoom and reset. Source resolution and genuine HDR/8K limits remain unchanged.
- **Appearance** contains panel transparency (more transparent/balanced/more
  contrast), optional frosted blur, the glass theme, clock and thumbnails.
- **Extras** contains a 15/30/60/90/120-minute **sleep timer**, source-video details
  and the remaining browsing settings. The timer pauses playback, never powers
  off the TV, and always resets to Off when the app starts again. Video details
  show actual source dimensions and dropped frames when the engine provides them.

Use **Up** from the first row to focus a category, **Left/Right** to change
categories, then **Down** to enter that category. Up/Down moves between rows;
Left/Right adjusts values or sets checkboxes off/on. **OK** toggles/cycles.
**Green**, TV **Back**, or **Close** dismisses the panel and restores focus.
Remote events are captured while the panel is open so they do not seek or
navigate the player behind it. The panel opens on Ads & skips each time.

### Retained picture controls from 0.5.5

Press **Green** to open settings for ad blocking, SponsorBlock and picture controls.

- **Picture framing:** Original (no override), Fill TV screen (crop), 16:9, 4:3
  and 21:9 frames. Frame presets fit the source without changing its proportions;
  they do not force video stretching on webOS. Fill crops a source with a different
  ratio to cover the TV screen.
- **Video zoom:** 100, 110, 125, 150, 175, 200, 250 or 300 percent. Zoom crops
  the edges. Use zoom for black bars encoded inside a video; they are not detected
  automatically. **Reset framing and zoom** restores Original/100% immediately.
- Use **Up/Down** to select a setting, **Left/Right** to change a picture control,
  or **OK** to cycle it. Green or TV Back closes the panel.
- **Prefer HDR when offered by the video and TV:** selects a playable format
  explicitly labelled HDR by YouTube. With no HDR-labelled format it retains Auto
  unless highest quality was separately enabled. Native automatic HDR negotiation
  continues normally. Turning the preference off returns to Auto or the selected
  highest-quality preference. HDR switching may rebuffer.

Picture changes are off by default and affect only video on the Watch page, not
controls or browsing surfaces. They use native video-plane sizing, not CSS
`object-fit`, filters, Canvas processing or a second video decoder. LG documents
that app-controlled stretching is not supported; physical-TV crop behavior still
needs verification on the installed firmware.

An SDR or 1080p source cannot become genuine HDR or 8K through these settings.
The C2's hardware displays lower-resolution video on its **4K** panel. No fake HDR
metadata, artificial 8K quality entries or codec capability overrides are added.

Reference: [LG on aspect-ratio limitations in webOS apps](https://forum.webostv.developer.lge.com/t/video-playback-fullscreen-issue/9362/11),
[YouTube HDR playback requirements](https://support.google.com/youtube/answer/7126552?hl=en).

### Retained from 0.5.4

- Lightweight glass-inspired cards, chips, notifications and settings. Theme can
  be disabled immediately with the green remote button; settings blur is optional
  and off by default. Scrolling lists and video are never blurred.
- Retains the native seek control, button positions, hit targets and chapter
  markers. The existing seek track gets a translucent white finish without a
  second overlay slider or an absolute-positioned full-height hit target.
- Adaptive playback is the default, including a one-time reset of the previous
  forced-quality setting. Highest _playable_ quality is optional in settings.
- Real display size, pixel ratio and native audio/video capability checks are
  preserved. Removed the previous fake 8K, Dolby and 120 Hz overrides.
- Recognized music shelves come before news on the initial Home response. Videos
  with readable view counts are ordered by views within shelves. Other shelf
  categories are ordered by their highest recognized video view count.
- Recognized songs are shown first within loaded search pages, preserving all
  results, playlists and continuation tokens. Keep scrolling for further results
  supplied by YouTube. This does not provide a complete music catalog or bypass
  YouTube's search limits. Unknown/localized counts retain their positions.
- Fixed remote color-key detection, settings scrolling and TV Back handling,
  immutable request serialization, and stale SponsorBlock requests after switching
  videos. Removed quality polling and per-command logging during normal use.

### Your LG OLED55C2XSC

This is a **4K, 120 Hz panel**, not an 8K panel. 120 Hz panel support does not make
the webOS web engine or YouTube video render at 120 fps. This package does not
force the system refresh rate. Use Auto quality for quickest track changes;
select 2160p in YouTube when offered if you prefer 4K over adaptive buffering.

Dolby/5.1 needs an appropriate source track, TV playback support and audio output
setup. Use YouTube's native 5.1 setting when it appears; this fork cannot convert
stereo songs into genuine Dolby Atmos. 8K is available only on a genuinely
compatible device when YouTube supplies a playable format.

Sources: [LG C2 specifications](https://www.lg.com/content/dam/lge/in/migration/catalogue-2023/pdf/OLED-g3-23.pdf),
[YouTube 5.1 requirements](https://support.google.com/youtube/answer/11904456?hl=en),
[LG webOS media capabilities](https://webostv.developer.lge.com/develop/specifications/video-audio-240).

### Build, verify and publish this fork

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run lint:all
pnpm build
pnpm test:compat
pnpm package
pnpm catalog
pnpm catalog:check
```

Install `youtube.leanback.v4_0.5.6_all.ipk` with webOS Dev Manager or the Homebrew
Channel. It uses the existing app ID so it updates the installed fork; retain the
previous IPK if you need to roll back. Local code changes do not update the TV.

The existing feed address remains:
[apps.json](https://cdn.jsdelivr.net/gh/Mahesh-Vanga/youtube-webos@main/apps.json).
Publish the matching source, **new IPK and generated apps.json together** to your
GitHub `main` branch. Until then that URL continues serving the previously
published version. jsDelivr may cache `@main`; verify the advertised version and
SHA-256 before installing. The additional version-specific `apps-0.5.6.json` feed
can be used to avoid a previously cached feed URL. A commit-pinned feed such as
`@bc12eea/apps.json` stays on its original version. Previous version-specific feeds
also retain their original release; use `apps-0.5.6.json` for this release.
`pnpm catalog:check` rejects stale version/size/hash metadata.

See [TV validation and rollback](docs/TV-VALIDATION.md) for physical-device checks.
The local integration fixture (`pnpm preview:fixture`, after building) exercises
the production user script with simulated player elements. It cannot measure
real-TV rendering or playback speed. Unit tests use Node's experimental VM module
support to isolate browser globals.

### Publishing rights and future maintenance

The upstream project is GPL-3.0-only. You may publish a modified fork under that
license: keep the license/copyright notices, identify your changes and dates,
and provide the corresponding source and build scripts for each binary you
distribute. The GPL does not grant trademark rights or permission to redistribute
YouTube's proprietary service, videos, Apple's assets, or Dolby branding. This
package contains the open-source wrapper; it loads YouTube's hosted TV interface
online rather than bundling the complete YouTube service.

Following the GPL addresses the upstream source license; it cannot guarantee
there will never be a complaint. YouTube's terms and service changes are separate
and can affect third-party clients. Private YouTube markup and APIs can change,
so future UI or playback repairs may be required. No claim of zero errors,
instant network video changes, Dolby certification or a guaranteed frame rate is
made. See [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html) and
[YouTube Terms](https://www.youtube.com/static?template=terms).

---

The original project's setup and feature documentation follows.

<p align="center">
  <img src="https://img.shields.io/github/stars/webosbrew/youtube-webos?style=flat-square&logo=github" alt="GitHub Stars">
  <img src="https://img.shields.io/github/v/release/webosbrew/youtube-webos?style=flat-square" alt="Latest Release">
  <img src="https://img.shields.io/github/contributors/webosbrew/youtube-webos?style=flat-square" alt="Contributors">
  <img src="https://img.shields.io/github/downloads/webosbrew/youtube-webos/total?style=flat-square" alt="Total Downloads">
  <img src="https://img.shields.io/badge/LG-webOS-000000?logo=webos&logoColor=white&style=flat-square" alt="webOS">
</p>

<p align="center">
  YouTube app for webOS TV with ad blocking and other enhancements
</p>

![Configuration Screen](./screenshots/1_sm.jpg?raw=true)
![Segment Skipped](./screenshots/2_sm.jpg?raw=true)

---

## Features

- Ad Blocking
- [SponsorBlock](https://sponsor.ajay.app/) Integration
- [Autostart Support](#autostart)
- Force Highest Video Quality
- Audio-Only Mode (🟦 Blue button on remote)
- Full Animation Support
- Shorts Removal
- Higher-Quality Thumbnails
- On-Screen Clock Overlay
- YouTube Logo Removal
- Remove end screens
- Bypass account selector screen

> [!NOTE]
> Press the 🟩 **Green** button on your remote to access the configuration screen.

---

## Requirements

- Uninstall the official YouTube app before installing this one.

---

## Installation

You can install the app using one of the following methods:

- **[webOS Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel):**
  App is available in the official webOS Brew repository.
- **[Device Manager](https://github.com/webosbrew/dev-manager-desktop):**
  Use a pre-built `.ipk` file from the [Releases](https://github.com/webosbrew/youtube-webos/releases) page.
- **Command Line (webOS CLI):** Configure the tools [below](#development-setup)

---

## Autostart

To enable autostart, run the following command needs to be executed on the TV via **SSH** or **Telnet**:

```sh
luna-send-pub -n 1 'luna://com.webos.service.eim/addDevice' '{"appId":"youtube.leanback.v4","pigImage":"","mvpdIcon":""}'
```

This allows the app to show up as an input source and launch automatically if it was the last used app. It will remain active in the background for faster startup (minor increase in idle memory usage).

To disable autostart:

```sh
luna-send-pub -n 1 'luna://com.webos.service.eim/deleteDevice' '{"appId":"youtube.leanback.v4"}'
```

---

## Development Setup

### Pre-requisites

- The latest **Node.js** LTS release. Refer to `devEngines` in [`package.json`](package.json) for the minimum version.
- **pnpm**. If you already have `Node.js`, you can have it automatically setup by running `corepack enable`.
- **git**

### Setup

1. Clone the repository.

   ```sh
   git clone https://github.com/webosbrew/youtube-webos.git
   cd youtube-webos
   ```

2. Install dependencies.

   ```sh
   pnpm install
   ```

### Building an IPK

```sh
pnpm run build:dev
pnpm run package
```

The `.ipk` file will be generated in the project root directory. You can stop here if you're fine with installing the IPK via [the webOS Dev Manager app](https://github.com/webosbrew/dev-manager-desktop). Alternatively, continue below if you want to make it so you can install the IPK on your TV with one command.

### On the TV

> [!IMPORTANT]
> If your TV is rooted, follow [the alternative setup section](#alternate-setup-rooted-tv) instead and then skip to [installing to the TV](#installing-to-the-tv)

1. Create an [LG Developer account](https://webostv.developer.lge.com/login)
2. Install the [**Developer Mode** app](https://in.lgappstv.com/main/tvapp/detail?appId=232503) from the LG Content Store
3. Navigate to the app, Log-in in with LG Developer Credentials and enable:
   - Developer Mode
   - Key Server

### Add the TV to the CLI

```sh
pnpm exec ares-setup-device
```

Follow the prompts:

1. Add device
2. Enter IP from the Developer Mode app
3. Use default values unless needed
4. Enter 6-digit passphrase shown on the TV screen

Verify:

```sh
pnpm exec ares-setup-device --list
```

Sample output:

```log
name            deviceinfo                     connection  profile    passphrase
--------------  -----------------------------  ----------  -------    ----------
mytv (default)  prisoner@192.168.137.102:9922  ssh         tv         EF32E8
```

---

## Installing to the TV

```sh
pnpm run deploy # Installs to the default device selected via `ares-setup-device`.
```

## Debugging

webOS supports the standard Chrome Devtools Protocol which allows you to inspect the app.

```sh
ares-inspect -d <device_name> --app youtube.leanback.v4
```

Or if you've set your TV as the default device:

```sh
pnpm run inspect
```

---

## Alternate Setup (Rooted TV)

1. Enable SSH via Homebrew Channel
2. Generate SSH key:

   ```sh
   ssh-keygen -t rsa
   ```

3. Copy `id_rsa` to `~/.ssh` (Windows: `%USERPROFILE%\.ssh`)
4. Append `id_rsa.pub` to `/home/root/.ssh/authorized_keys` on the TV
5. Set up device:

   ```sh
   ares-setup-device -a webos \
     -i "username=root" \
     -i "privatekey=id_rsa" \
     -i "passphrase=SSH_KEY_PASSPHRASE" \
     -i "host=TV_IP" \
     -i "port=22"
   ```

---

## Quick Commands

### Build, Install, and Launch

```sh
pnpm run build:dev && pnpm run package && pnpm run deploy && pnpm run launch
```

To launch a specific video directly:

```sh
pnpm run launch -- -p '{"contentTarget":"v=F8PGWLvn1mQ"}'
```
