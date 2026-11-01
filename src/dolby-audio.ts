import { configRead } from './config';
import { getPlayerManager, PlayerMode } from './player_api';
import type { PlayerManager } from './player_api';
import { showNotification } from './ui';

const DOLBY_CODECS = [
  'ec-3', // Dolby Digital Plus (E-AC-3)
  'ac-3', // Dolby Digital (AC-3)
  'ac-4', // Dolby AC-4
  'dvh1', // Dolby Vision / Atmos container
  'mp4a.a5', // AC-3 audio
  'mp4a.a6' // E-AC-3 audio
];

/**
 * Polyfill MediaSource.isTypeSupported and HTMLMediaElement.prototype.canPlayType
 * to announce Dolby Audio (AC-3 / E-AC-3 / 5.1 Surround) support to YouTube TV.
 */
function initDolbyMediaSourceCapabilities() {
  if (typeof window === 'undefined') return;

  // 1. Hook MediaSource.isTypeSupported
  if (typeof window.MediaSource !== 'undefined') {
    const origIsTypeSupported = window.MediaSource.isTypeSupported.bind(window.MediaSource);

    window.MediaSource.isTypeSupported = function (mimeType: string): boolean {
      if (!configRead('enableDolbyAudio')) {
        return origIsTypeSupported(mimeType);
      }

      if (mimeType) {
        const lower = mimeType.toLowerCase();
        for (const codec of DOLBY_CODECS) {
          if (lower.includes(codec)) {
            console.debug('[Dolby Audio] Spoofed MediaSource.isTypeSupported for:', mimeType);
            return true;
          }
        }
      }

      return origIsTypeSupported(mimeType);
    };
  }

  // 2. Hook HTMLMediaElement.prototype.canPlayType
  if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype.canPlayType) {
    const origCanPlayType = HTMLMediaElement.prototype.canPlayType;

    HTMLMediaElement.prototype.canPlayType = function (mimeType: string): CanPlayTypeResult {
      if (!configRead('enableDolbyAudio')) {
        return origCanPlayType.call(this, mimeType);
      }

      if (mimeType) {
        const lower = mimeType.toLowerCase();
        for (const codec of DOLBY_CODECS) {
          if (lower.includes(codec)) {
            console.debug('[Dolby Audio] Spoofed canPlayType for:', mimeType);
            return 'probably';
          }
        }
      }

      return origCanPlayType.call(this, mimeType);
    };
  }

  console.info('[Dolby Audio] Dolby Surround / E-AC-3 capabilities initialized');
}

/**
 * Injects Dolby & 5.1 audio configuration into YouTube Innertube client payload.
 */
export function injectDolbyContext(payload: any) {
  if (!configRead('enableDolbyAudio') || !payload || typeof payload !== 'object') {
    return payload;
  }

  try {
    // 1. Inject audioConfig for 5.1 playback
    if (!payload.playbackContext) {
      payload.playbackContext = {};
    }
    payload.playbackContext.audioConfig = {
      enable51Audio: true,
      loudnessCompensation: true,
      preferSpatialAudio: true,
      spatialAudioMode: 'SPATIAL_AUDIO_MODE_SURROUND'
    };

    // 2. Set client capabilities
    if (payload.context?.client) {
      payload.context.client.capabilities = {
        ...(payload.context.client.capabilities || {}),
        supports51: true,
        supportsSpatialAudio: true
      };
      payload.context.client.spatialAudioCapability = {
        supportsSpatialAudio: true
      };
    }
  } catch (err) {
    console.warn('[Dolby Audio] Failed to inject dolby context into payload:', err);
  }

  return payload;
}

/**
 * Monitor playback and auto-switch to 5.1 Surround / Dolby Audio track when available.
 */
async function initDolbyPlayerIntegration() {
  try {
    const playerManager = await getPlayerManager();

    function handleDolbyPlayback(this: PlayerManager) {
      if (!configRead('enableDolbyAudio')) return;
      if (this.playerMode === PlayerMode.PREVIEW) return;

      const player: any = this.player;

      // Check if player has getAvailableAudioTracks
      if (typeof player.getAvailableAudioTracks === 'function') {
        const tracks = player.getAvailableAudioTracks();
        if (Array.isArray(tracks) && tracks.length > 0) {
          console.debug('[Dolby Audio] Available audio tracks:', tracks);

          // Find Dolby 5.1 or Surround track
          const dolbyTrack = tracks.find((t: any) => {
            const name = (t.name || t.displayName || t.id || '').toLowerCase();
            return (
              name.includes('5.1') ||
              name.includes('surround') ||
              name.includes('dolby') ||
              name.includes('ac-3') ||
              name.includes('ec-3') ||
              name.includes('e-ac-3')
            );
          });

          if (dolbyTrack && typeof player.setAudioTrack === 'function') {
            const currentTrack = typeof player.getAudioTrack === 'function' ? player.getAudioTrack() : null;
            if (!currentTrack || currentTrack.id !== dolbyTrack.id) {
              player.setAudioTrack(dolbyTrack);
              console.info('[Dolby Audio] Switched to Dolby 5.1 track:', dolbyTrack);
              showNotification('Dolby Audio 5.1 Surround Active', 3500, 'blue');
              return;
            }
          }
        }
      }

      // If video supports spatial/5.1 audio or format has multichannel
      const stats = typeof player.getVideoStats === 'function' ? player.getVideoStats() : null;
      console.debug('[Dolby Audio] Video playback started with Dolby 5.1 enabled', stats);
    }

    playerManager.addEventListener('playbackStart', handleDolbyPlayback);
  } catch (e) {
    console.warn('[Dolby Audio] Player manager integration error:', e);
  }
}

// Initialize on module load
initDolbyMediaSourceCapabilities();
initDolbyPlayerIntegration();
