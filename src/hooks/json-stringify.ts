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
    // @ts-expect-error TS doesn't allow optional chaining on unknown
    let ctx = value?.playbackContext?.contentPlaybackContext as unknown;
    if (!isPrimitive(ctx)) {
      // Copy only the modified path. YouTube can freeze any ancestor and other
      // callers must not see mutations just because they serialized a request.
      const request = value as Record<string, any>;
      value = {
        ...request,
        playbackContext: {
          ...request.playbackContext,
          contentPlaybackContext: {
            ...(ctx as Record<string, unknown>),
            isInlinePlaybackNoAd: true
          }
        }
      };
    }
  }

  return originalStringify(value, replacer as any, space);
}

JSON.stringify = stringify;
