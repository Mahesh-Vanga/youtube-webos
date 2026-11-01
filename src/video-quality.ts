import { configAddChangeListener, configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import type { PlayerManager } from './player_api';

const playerManager = await getPlayerManager();

function setPlaybackQuality(this: PlayerManager) {
  if (this.playerMode === PlayerMode.PREVIEW) return;
  this.removeEventListener('playbackStart', setPlaybackQuality);
  const forceHighest = configRead('forceHighResVideo');
  const preferHDR = configRead('preferHDR');
  if (!forceHighest && !preferHDR) return;

  // Trust actual playable formats. Never advertise unsupported codecs or lock
  // playback to a generic highres level. No polling after changing tracks.
  const qualities = this.player
    .getAvailableQualityData()
    .filter((quality) => quality.isPlayable && !quality.paygatedQualityDetails)
    .sort(
      (a, b) =>
        (parseInt(b.qualityLabel, 10) || 0) -
        (parseInt(a.qualityLabel, 10) || 0)
    );
  // Only trust HDR explicitly advertised by the player's playable format label.
  // No HDR metadata spoofing, SDR filters, codec overrides or new formats.
  const hdr = preferHDR
    ? qualities.find((quality) => /\bHDR\b/i.test(quality.qualityLabel))
    : undefined;
  const best = hdr || (forceHighest ? qualities[0] : undefined);
  if (!best) return;
  this.player.setPlaybackQualityRange(
    best.quality,
    best.quality,
    best.formatId
  );
}

playerManager.addEventListener('newVideo', function () {
  this.removeEventListener('playbackStart', setPlaybackQuality);
  if (
    this.playerMode !== PlayerMode.PREVIEW &&
    configRead('preferHDR') &&
    !configRead('forceHighResVideo')
  ) {
    this.player.setPlaybackQualityRange('default', 'default');
  }
  if (configRead('forceHighResVideo') || configRead('preferHDR'))
    this.addEventListener('playbackStart', setPlaybackQuality);
});

function updatePreference() {
  playerManager.removeEventListener('playbackStart', setPlaybackQuality);
  if (playerManager.playerMode === PlayerMode.PREVIEW) return;
  // Release any previous manual range first, including HDR -> SDR transitions.
  playerManager.player.setPlaybackQualityRange('default', 'default');
  setPlaybackQuality.call(playerManager);
}

configAddChangeListener('forceHighResVideo', updatePreference);
configAddChangeListener('preferHDR', updatePreference);
