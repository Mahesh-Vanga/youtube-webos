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
    // Avoid expensive structuredClone: shallow copy if frozen, else modify in-place
    if (Object.isFrozen(value)) {
      value = { ...(value as Record<string, unknown>) };
    }

    // @ts-expect-error TS doesn't allow optional chaining on unknown
    let ctx = value?.playbackContext?.contentPlaybackContext as unknown;
    if (!isPrimitive(ctx)) {
      if (Object.isFrozen(ctx)) {
        ctx = { ...(ctx as Record<string, unknown>) };
        (value as any).playbackContext.contentPlaybackContext = ctx;
      }
      (ctx as Record<string, unknown>).isInlinePlaybackNoAd = true;
    }

    // Inject Dolby Audio / 5.1 Surround capabilities into playback context
    try {
      value = injectDolbyContext(value);
    } catch {
      // Ignore
    }
  }

  return originalStringify(value, replacer as any, space);
}

JSON.stringify = stringify;
