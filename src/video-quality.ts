import { configAddChangeListener, configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import type { PlayerManager } from './player_api';

const playerManager = await getPlayerManager();

function setPlaybackQuality(this: PlayerManager) {
  if (this.playerMode === PlayerMode.PREVIEW) return;
  this.removeEventListener('playbackStart', setPlaybackQuality);
  if (!configRead('forceHighResVideo')) return;

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
  const best = qualities[0];
  if (!best) return;
  this.player.setPlaybackQualityRange(
    best.quality,
    best.quality,
    best.formatId
  );
}

playerManager.addEventListener('newVideo', function () {
  this.removeEventListener('playbackStart', setPlaybackQuality);
  if (configRead('forceHighResVideo'))
    this.addEventListener('playbackStart', setPlaybackQuality);
});

configAddChangeListener('forceHighResVideo', () => {
  playerManager.removeEventListener('playbackStart', setPlaybackQuality);
  if (configRead('forceHighResVideo')) {
    setPlaybackQuality.call(playerManager);
  } else {
    playerManager.player.setPlaybackQualityRange('default', 'default');
  }
});
