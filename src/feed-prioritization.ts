import { configRead } from './config';

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

function extractItemViewCount(item: any): number {
  if (!item) return 0;
  const tile = item.tileRenderer || item.compactVideoRenderer || item.tvVideoRenderer;
  if (!tile) return 0;

  const lines = tile.metadata?.tileMetadataRenderer?.lines;
  if (Array.isArray(lines)) {
    for (let i = 0; i < lines.length; i++) {
      const lineItems = lines[i]?.lineRenderer?.items;
      if (Array.isArray(lineItems)) {
        for (let j = 0; j < lineItems.length; j++) {
          const text = lineItems[j]?.text?.runs?.[0]?.text || lineItems[j]?.text?.simpleText;
          if (typeof text === 'string' && (text.includes('view') || text.includes('View'))) {
            const count = parseViewCount(text);
            if (count > 0) return count;
          }
        }
      }
    }
  }

  const viewText =
    tile.viewCountText?.runs?.[0]?.text ||
    tile.viewCountText?.simpleText ||
    tile.shortViewCountText?.runs?.[0]?.text ||
    tile.shortViewCountText?.simpleText;

  if (typeof viewText === 'string') {
    return parseViewCount(viewText);
  }

  return 0;
}

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

function getShelfScore(shelfItem: any): number {
  const title = getShelfTitle(shelfItem).toLowerCase();
  if (!title) return 100;

  if (
    title.includes('music') ||
    title.includes('song') ||
    title.includes('track') ||
    title.includes('album') ||
    title.includes('artist') ||
    title.includes('hits')
  ) {
    return 1000;
  }

  if (
    title.includes('news') ||
    title.includes('breaking') ||
    title.includes('headline') ||
    title.includes('world')
  ) {
    return 800;
  }

  if (title.includes('trending') || title.includes('popular')) return 600;
  if (title.includes('gaming')) return 500;
  if (title.includes('entertainment')) return 400;

  return 100;
}

function sortShelfItemsByViewCount(items: any[]): any[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  return [...items].sort((a, b) => {
    return extractItemViewCount(b) - extractItemViewCount(a);
  });
}

let hasSortedHomeFeed = false;

export function prioritizeHomeFeed(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (!configRead('enableFeedPrioritization')) return data;

  // Ultra-fast exit: Once the initial home feed is sorted, return immediately
  // Never re-sort during scrolling to maintain 60 FPS butter-smooth navigation
  const sectionListRenderer =
    data?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content
      ?.sectionListRenderer;

  if (!sectionListRenderer?.contents || !Array.isArray(sectionListRenderer.contents)) {
    return data;
  }

  if (hasSortedHomeFeed) {
    return data;
  }
  hasSortedHomeFeed = true;

  try {
    sectionListRenderer.contents.sort((a: any, b: any) => {
      return getShelfScore(b) - getShelfScore(a);
    });

    for (let i = 0; i < sectionListRenderer.contents.length; i++) {
      const shelf = sectionListRenderer.contents[i]?.shelfRenderer;
      if (Array.isArray(shelf?.content?.horizontalListRenderer?.items)) {
        shelf.content.horizontalListRenderer.items = sortShelfItemsByViewCount(
          shelf.content.horizontalListRenderer.items
        );
      }
    }
  } catch (err) {
    console.warn('[Feed Prioritization] error:', err);
  }

  return data;
}

const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments as any);
  return prioritizeHomeFeed(r);
};
