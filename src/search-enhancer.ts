import { configRead } from './config';
import { parseViewCount } from './feed-prioritization';

/**
 * Checks if a search item is a song, music video, or audio track.
 */
function isSongOrMusicItem(item: any): boolean {
  if (!item) return false;

  try {
    const raw = JSON.stringify(item).toLowerCase();

    // Check for explicit music badges or metadata
    if (
      raw.includes('official music video') ||
      raw.includes('official audio') ||
      raw.includes('audio track') ||
      raw.includes('lyrics') ||
      raw.includes('song') ||
      raw.includes('music') ||
      raw.includes('album') ||
      raw.includes('artist') ||
      raw.includes('vevo') ||
      raw.includes('records') ||
      raw.includes('soundtrack') ||
      raw.includes('remix') ||
      raw.includes('single')
    ) {
      return true;
    }

    // Check tile metadata badges or description
    const tile = item.tileRenderer || item.compactVideoRenderer || item.tvVideoRenderer;
    const title = (
      tile?.title?.runs?.[0]?.text ||
      tile?.title?.simpleText ||
      tile?.metadata?.tileMetadataRenderer?.title?.runs?.[0]?.text ||
      ''
    ).toLowerCase();

    if (
      title.includes('song') ||
      title.includes('music') ||
      title.includes('audio') ||
      title.includes('video song') ||
      title.includes('full song') ||
      title.includes('lyric') ||
      title.includes('track') ||
      title.includes('feat.') ||
      title.includes('ft.')
    ) {
      return true;
    }
  } catch {
    // ignore parsing errors
  }

  return false;
}

/**
 * Extracts continuation token from search response contents.
 */
function extractContinuationToken(contents: any[]): string | null {
  if (!Array.isArray(contents)) return null;

  for (const item of contents) {
    const token =
      item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand
        ?.token;
    if (token) return token;
  }

  return null;
}

/**
 * Asynchronously prefetches additional continuation pages and appends them
 * so the TV search shows a full, complete catalog of songs.
 */
let isPrefetching = false;

async function prefetchDeepSearchResults(
  continuationToken: string,
  targetList: any[],
  maxPages = 3
) {
  if (!continuationToken || isPrefetching) return;
  isPrefetching = true;

  try {
    let currentToken = continuationToken;
    let pagesFetched = 0;

    while (currentToken && pagesFetched < maxPages) {
      console.info(
        `[Search Enhancer] Auto-fetching deep song search page ${pagesFetched + 1}...`
      );

      const url = `/youtubei/v1/search?continuation=${encodeURIComponent(currentToken)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          continuation: currentToken
        })
      });

      if (!response.ok) break;

      const data = await response.json();
      const continuationContents =
        data?.continuationContents?.sectionListContinuation?.contents ||
        data?.continuationContents?.itemSectionContinuation?.contents ||
        data?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction
          ?.continuationItems;

      if (!Array.isArray(continuationContents) || continuationContents.length === 0) {
        break;
      }

      // Filter and append items
      for (const item of continuationContents) {
        if (!item.continuationItemRenderer) {
          targetList.push(item);
        }
      }

      // Update token for next iteration
      currentToken = extractContinuationToken(continuationContents) || '';
      pagesFetched++;
    }

    console.info(
      `[Search Enhancer] Successfully fetched deep songs list. Total items: ${targetList.length}`
    );
  } catch (err) {
    console.warn('[Search Enhancer] Error prefetching deep search results:', err);
  } finally {
    isPrefetching = false;
  }
}

/**
 * Enhances search results: prioritizes songs, sorts by views, and expands pagination.
 */
export function enhanceSearchResults(data: any): any {
  if (!configRead('enableExtendedSongSearch') || !data || typeof data !== 'object') {
    return data;
  }

  try {
    // Check if response is search results or search continuation
    const searchSections =
      data?.contents?.sectionListRenderer?.contents ||
      data?.contents?.tvSurfaceContentRenderer?.content?.sectionListRenderer
        ?.contents;

    if (Array.isArray(searchSections)) {
      for (const section of searchSections) {
        const itemSection = section?.itemSectionRenderer;
        if (Array.isArray(itemSection?.contents)) {
          const items = itemSection.contents;

          // Separate songs and others
          const songs: any[] = [];
          const others: any[] = [];
          let continuationItem: any = null;

          for (const item of items) {
            if (item.continuationItemRenderer) {
              continuationItem = item;
            } else if (isSongOrMusicItem(item)) {
              songs.push(item);
            } else {
              others.push(item);
            }
          }

          // If songs were found in the search results, prioritize them
          if (songs.length > 0) {
            // Sort songs by view count descending
            songs.sort((a, b) => {
              const aViews = parseViewCount(JSON.stringify(a));
              const bViews = parseViewCount(JSON.stringify(b));
              return bViews - aViews;
            });

            // Reconstruct contents: songs first, then other results, then continuation
            itemSection.contents = [
              ...songs,
              ...others,
              ...(continuationItem ? [continuationItem] : [])
            ];

            console.info(
              `[Search Enhancer] Prioritized ${songs.length} song results in search list`
            );

            // Trigger deep continuation pre-fetch if token exists
            const token =
              continuationItem?.continuationItemRenderer?.continuationEndpoint
                ?.continuationCommand?.token;
            if (token) {
              prefetchDeepSearchResults(token, itemSection.contents, 3);
            }
          }
        }
      }
    }

    // Also handle direct section list continuations
    const continuationItems =
      data?.continuationContents?.sectionListContinuation?.contents ||
      data?.continuationContents?.itemSectionContinuation?.contents;

    if (Array.isArray(continuationItems)) {
      const continuationSongs: any[] = [];
      const continuationOthers: any[] = [];
      let contItem: any = null;

      for (const item of continuationItems) {
        if (item.continuationItemRenderer) {
          contItem = item;
        } else if (isSongOrMusicItem(item)) {
          continuationSongs.push(item);
        } else {
          continuationOthers.push(item);
        }
      }

      if (continuationSongs.length > 0) {
        continuationSongs.sort((a, b) => {
          const aViews = parseViewCount(JSON.stringify(a));
          const bViews = parseViewCount(JSON.stringify(b));
          return bViews - aViews;
        });

        continuationItems.length = 0;
        continuationItems.push(
          ...continuationSongs,
          ...continuationOthers,
          ...(contItem ? [contItem] : [])
        );
      }
    }
  } catch (err) {
    console.warn('[Search Enhancer] Failed to enhance search results:', err);
  }

  return data;
}

// Hook into JSON.parse to apply search enhancement
const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments as any);
  return enhanceSearchResults(r);
};
