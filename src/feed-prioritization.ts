import { configRead } from './config';

/**
 * Parses view count strings like "1.2M views", "450K views", "2.5B views", "89,120 views".
 */
export function parseViewCount(text: string): number {
  if (!text) return 0;
  const match = text.match(/([\d,.]+)\s*([KkMmBb])?\s*views?/i);
  if (!match) return 0;

  let count = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(count)) return 0;

  const unit = (match[2] || '').toUpperCase();
  if (unit === 'K') count *= 1_000;
  else if (unit === 'M') count *= 1_000_000;
  else if (unit === 'B') count *= 1_000_000_000;

  return count;
}

/**
 * Extracts the highest view count from an item's metadata.
 */
function extractItemViewCount(item: any): number {
  if (!item) return 0;

  try {
    const raw = JSON.stringify(item);
    const viewMatches = raw.match(/"([^"]*?[\d,.]+\s*[KkMmBb]?\s*views?[^"]*?)"/gi);
    if (viewMatches && viewMatches.length > 0) {
      for (const m of viewMatches) {
        const cleaned = m.replace(/"/g, '');
        const val = parseViewCount(cleaned);
        if (val > 0) return val;
      }
    }
  } catch {
    // ignore json stringify errors
  }

  return 0;
}

/**
 * Extracts shelf title text.
 */
function getShelfTitle(shelfItem: any): string {
  const shelf = shelfItem?.shelfRenderer || shelfItem;
  if (!shelf) return '';

  const titleRuns =
    shelf.title?.runs ||
    shelf.headerRenderer?.shelfHeaderRenderer?.title?.runs ||
    [];

  if (titleRuns.length > 0) {
    return titleRuns.map((r: any) => r.text || '').join(' ').trim();
  }

  return (
    shelf.title?.simpleText ||
    shelf.headerRenderer?.shelfHeaderRenderer?.title?.simpleText ||
    shelf.title ||
    ''
  );
}

/**
 * Determines shelf category weight:
 * 1. Music (Highest priority: 1000)
 * 2. News (Second priority: 800)
 * 3. Trending / Popular (600)
 * 4. Other categories (Entertainment, Gaming, etc.)
 */
function getShelfScore(shelfItem: any): number {
  const title = getShelfTitle(shelfItem).toLowerCase();

  // Music: First reference
  if (
    title.includes('music') ||
    title.includes('song') ||
    title.includes('track') ||
    title.includes('album') ||
    title.includes('artist') ||
    title.includes('hits') ||
    title.includes('soundtrack')
  ) {
    return 1000;
  }

  // News: Second reference
  if (
    title.includes('news') ||
    title.includes('breaking') ||
    title.includes('headline') ||
    title.includes('world') ||
    title.includes('journalism') ||
    title.includes('today')
  ) {
    return 800;
  }

  // Trending / Popular
  if (title.includes('trending') || title.includes('popular') || title.includes('top')) {
    return 600;
  }

  // Gaming
  if (title.includes('gaming') || title.includes('game')) {
    return 500;
  }

  // Entertainment / Movies
  if (title.includes('entertainment') || title.includes('movie') || title.includes('show')) {
    return 400;
  }

  return 100;
}

/**
 * Sorts items inside a shelf by view count descending.
 */
function sortShelfItemsByViewCount(items: any[]): any[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  return [...items].sort((a, b) => {
    const aViews = extractItemViewCount(a);
    const bViews = extractItemViewCount(b);
    return bViews - aViews;
  });
}

/**
 * Reorders home feed shelves and sorts video items within shelves according to views.
 */
export function prioritizeHomeFeed(data: any): any {
  if (!configRead('enableFeedPrioritization') || !data || typeof data !== 'object') {
    return data;
  }

  try {
    // 1. Home feed section list
    const sectionListRenderer =
      data?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content
        ?.sectionListRenderer ||
      data?.contents?.sectionListRenderer;

    if (Array.isArray(sectionListRenderer?.contents)) {
      // Re-order shelves: Music first, then News, etc.
      sectionListRenderer.contents.sort((a: any, b: any) => {
        const scoreA = getShelfScore(a);
        const scoreB = getShelfScore(b);
        return scoreB - scoreA;
      });

      // Sort items inside each shelf by view count
      for (const shelfItem of sectionListRenderer.contents) {
        const shelf = shelfItem?.shelfRenderer;
        if (shelf?.content?.horizontalListRenderer?.items) {
          shelf.content.horizontalListRenderer.items = sortShelfItemsByViewCount(
            shelf.content.horizontalListRenderer.items
          );
        } else if (shelf?.content?.gridRenderer?.items) {
          shelf.content.gridRenderer.items = sortShelfItemsByViewCount(
            shelf.content.gridRenderer.items
          );
        }
      }

      console.info('[Feed Prioritization] Prioritized Home feed: Music -> News -> Others sorted by views');
    }

    // 2. Guide / Sidebar items: Elevate Music & News tabs
    const guideItems = data?.contents?.tvBrowseRenderer?.navigation?.guideRenderer?.items;
    if (Array.isArray(guideItems)) {
      guideItems.sort((a: any, b: any) => {
        const titleA = (a?.guideEntryRenderer?.title || '').toLowerCase();
        const titleB = (b?.guideEntryRenderer?.title || '').toLowerCase();
        const scoreA = titleA.includes('music') ? 100 : titleA.includes('news') ? 80 : 0;
        const scoreB = titleB.includes('music') ? 100 : titleB.includes('news') ? 80 : 0;
        return scoreB - scoreA;
      });
    }
  } catch (err) {
    console.warn('[Feed Prioritization] Failed to reorder feed:', err);
  }

  return data;
}

// Hook into JSON.parse to apply feed prioritization
const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments as any);
  return prioritizeHomeFeed(r);
};
