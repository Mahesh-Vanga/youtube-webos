import { configRead } from './config';

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
        for (let i = 0; i < DOLBY_CODECS.length; i++) {
          if (lower.includes(DOLBY_CODECS[i])) {
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
        for (let i = 0; i < DOLBY_CODECS.length; i++) {
          if (lower.includes(DOLBY_CODECS[i])) {
            return 'probably';
          }
        }
      }

      return origCanPlayType.call(this, mimeType);
    };
  }
}

/**
 * Injects Dolby & 5.1 audio configuration into YouTube Innertube client payload.
 * Native stream negotiation starts with 5.1 Dolby without needing re-buffering.
 */
export function injectDolbyContext(payload: any) {
  if (!configRead('enableDolbyAudio') || !payload || typeof payload !== 'object') {
    return payload;
  }

  try {
    if (!payload.playbackContext) {
      payload.playbackContext = {};
    }
    payload.playbackContext.audioConfig = {
      enable51Audio: true,
      loudnessCompensation: true,
      preferSpatialAudio: true,
      spatialAudioMode: 'SPATIAL_AUDIO_MODE_SURROUND'
    };

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
    // Ignore payload errors
  }

  return payload;
}

// Initialize capabilities instantly on module load
initDolbyMediaSourceCapabilities();
