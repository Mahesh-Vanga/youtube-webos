import { injectDolbyContext } from '../dolby-audio';

function isPrimitive(
  value: unknown
): value is string | number | boolean | null | undefined | symbol | bigint {
  return Object(value) !== value;
}

const originalStringify = JSON.stringify;

type FunctionReplacer = (this: any, key: string, value: any) => any;
type WhitelistReplacer = (string | number)[] | null;

function stringify(
  value: unknown,
  replacer?: FunctionReplacer | WhitelistReplacer,
  space?: string | number
): string {
  if (!isPrimitive(value)) {
    value = structuredClone(value);

    // @ts-expect-error TS doesn't allow optional chaining on `unknown`.
    const ctx = value?.playbackContext?.contentPlaybackContext as unknown;
    if (!isPrimitive(ctx)) {
      (ctx as Record<string, unknown>).isInlinePlaybackNoAd = true;
      console.info(`[JSON.stringify] Set isInlinePlaybackNoAd`);
    }

    // Inject Dolby Audio / 5.1 Surround capabilities into playback and client contexts
    try {
      value = injectDolbyContext(value);
    } catch (e) {
      console.warn('[JSON.stringify] Failed to inject Dolby context:', e);
    }
  }

  return originalStringify(value, replacer as any, space);
}

JSON.stringify = stringify;
