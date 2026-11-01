export type Framing = 'original' | 'fill' | '16:9' | '4:3' | '21:9';

/** Geometry only: native video-plane sizing, never an object-fit or GPU filter.
 * Frame presets preserve source proportions. Fill and zoom crop the picture.
 * They do not stretch pixels, remove encoded black bars, or increase detail.
 */
export function videoRectangle(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  framing: Framing,
  zoom: number
) {
  if (
    ![width, height, sourceWidth, sourceHeight, zoom].every(
      (n) => Number.isFinite(n) && n > 0
    )
  )
    return null;
  if (framing === 'original' && zoom === 100) return null;
  let frameWidth = width,
    frameHeight = height;
  const ratios: Partial<Record<Framing, number>> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '21:9': 21 / 9
  };
  const ratio = ratios[framing];
  if (ratio) {
    frameWidth = Math.min(width, height * ratio);
    frameHeight = frameWidth / ratio;
  }
  const scale =
    (framing === 'fill' ? Math.max : Math.min)(
      frameWidth / sourceWidth,
      frameHeight / sourceHeight
    ) * Math.max(1, Math.min(3, zoom / 100));
  const videoWidth = sourceWidth * scale,
    videoHeight = sourceHeight * scale;
  return {
    width: videoWidth,
    height: videoHeight,
    left: (width - videoWidth) / 2,
    top: (height - videoHeight) / 2
  };
}
