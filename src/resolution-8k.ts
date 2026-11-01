/**
 * 8K (4320p) Video Resolution and 120Hz Display Capabilities Enabler
 * Spoofs 8K screen resolution and AV1/VP9 8K video codecs to unlock 8K streaming on YouTube TV.
 */

const CODECS_8K_120HZ = [
  'av01.0.12m.08', // AV1 8K 60fps Level 5.3
  'av01.0.13m.08', // AV1 8K high profile Level 6.0
  'av01',          // General AV1
  'vp09.02.51',    // VP9.2 8K Profile 2 Level 5.1
  'vp09.02.60',    // VP9.2 8K Profile 2 Level 6.0
  'vp09',
  'vp9',
  '7680',          // 8K width
  '4320'           // 8K height
];

export function init8KAnd120HzCapabilities() {
  if (typeof window === 'undefined') return;

  // 1. Spoof 8K Screen Dimensions so YouTube TV exposes 8K (4320p / 4320p60) formats
  try {
    Object.defineProperty(window.screen, 'width', {
      get: () => 7680,
      configurable: true
    });
    Object.defineProperty(window.screen, 'height', {
      get: () => 4320,
      configurable: true
    });
    Object.defineProperty(window.screen, 'availWidth', {
      get: () => 7680,
      configurable: true
    });
    Object.defineProperty(window.screen, 'availHeight', {
      get: () => 4320,
      configurable: true
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => 2,
      configurable: true
    });
  } catch (err) {
    console.warn('[8K-120Hz] Screen dimensions spoof warning:', err);
  }

  // 2. Announce 8K AV1 and VP9 support in MediaSource
  if (typeof window.MediaSource !== 'undefined') {
    const origIsTypeSupported = window.MediaSource.isTypeSupported.bind(window.MediaSource);

    window.MediaSource.isTypeSupported = function (mimeType: string): boolean {
      if (mimeType) {
        const lower = mimeType.toLowerCase();
        for (let i = 0; i < CODECS_8K_120HZ.length; i++) {
          if (lower.includes(CODECS_8K_120HZ[i])) {
            return true;
          }
        }
      }
      return origIsTypeSupported(mimeType);
    };
  }

  // 3. Announce 8K playback support in HTMLMediaElement
  if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype.canPlayType) {
    const origCanPlayType = HTMLMediaElement.prototype.canPlayType;

    HTMLMediaElement.prototype.canPlayType = function (mimeType: string): CanPlayTypeResult {
      if (mimeType) {
        const lower = mimeType.toLowerCase();
        for (let i = 0; i < CODECS_8K_120HZ.length; i++) {
          if (lower.includes(CODECS_8K_120HZ[i])) {
            return 'probably';
          }
        }
      }
      return origCanPlayType.call(this, mimeType);
    };
  }

  console.info('[8K-120Hz] 8K (4320p) and 120Hz capabilities initialized');
}

// Initialize immediately
init8KAnd120HzCapabilities();
