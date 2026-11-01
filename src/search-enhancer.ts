import { configRead } from './config';
import { parseViewCount } from './feed-prioritization';

/**
 * Fast direct property check if an item is a song or music video.
 * Avoids JSON.stringify to prevent UI lag.
 */
function isSongOrMusicItem(item: any): boolean {
  if (!item) return false;

  const tile = item.tileRenderer || item.compactVideoRenderer || item.tvVideoRenderer;
  if (!tile) return false;

  const title = (
    tile.title?.runs?.[0]?.text ||
    tile.title?.simpleText ||
    tile.metadata?.tileMetadataRenderer?.title?.runs?.[0]?.text ||
    ''
  ).toLowerCase();

  if (
    title.includes('song') ||
    title.includes('music') ||
    title.includes('audio') ||
    title.includes('video song') ||
    title.includes('full song') ||
    title.includes('track') ||
    title.includes('lyric') ||
    title.includes('remix') ||
    title.includes('album') ||
    title.includes('feat') ||
    title.includes('ft.')
  ) {
    return true;
  }

  // Check channel or author
  const author = (
    tile.subtitle?.runs?.[0]?.text ||
    tile.metadata?.tileMetadataRenderer?.lines?.[0]?.lineRenderer?.items?.[0]?.text?.runs?.[0]?.text ||
    ''
  ).toLowerCase();

  return (
    author.includes('music') ||
    author.includes('vevo') ||
    author.includes('records') ||
    author.includes('series')
  );
}

/**
 * Fast search enhancer: prioritizes song items in search results.
 */
export function enhanceSearchResults(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (!configRead('enableExtendedSongSearch')) return data;

  // FAST GUARD: Only process if it is a search response
  const searchSections =
    data?.contents?.sectionListRenderer?.contents ||
    data?.contents?.tvSurfaceContentRenderer?.content?.sectionListRenderer?.contents;

  if (!Array.isArray(searchSections) || searchSections.length === 0) {
    return data;
  }

  try {
    for (let s = 0; s < searchSections.length; s++) {
      const itemSection = searchSections[s]?.itemSectionRenderer;
      if (Array.isArray(itemSection?.contents)) {
        const items = itemSection.contents;
        const songs: any[] = [];
        const others: any[] = [];
        let continuationItem: any = null;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item?.continuationItemRenderer) {
            continuationItem = item;
          } else if (isSongOrMusicItem(item)) {
            songs.push(item);
          } else {
            others.push(item);
          }
        }

        if (songs.length > 0) {
          itemSection.contents = [
            ...songs,
            ...others,
            ...(continuationItem ? [continuationItem] : [])
          ];
        }
      }
    }
  } catch (err) {
    console.warn('[Search Enhancer] error:', err);
  }

  return data;
}

// Hook into JSON.parse with instant pass-through for non-search requests
const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments as any);
  return enhanceSearchResults(r);
};
