// Only reorder recognized renderer slots. Continuations, ads, headers, playlists,
// and unknown objects retain their exact positions and object identities.
type Item = Record<string, any>;

function text(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value?.simpleText === 'string') return value.simpleText;
  if (!Array.isArray(value?.runs)) return '';
  return value.runs.map((run: Item) => run.text || '').join('');
}

export function parseViewCount(value: string): number | null {
  // Unknown/localized labels are left in place instead of treated as zero views.
  const match = value.match(
    /^\s*([\d,]+(?:\.\d+)?)\s*(K|M|B|lakh|crore)?\s+views?\s*$/i
  );
  if (!match) return null;
  const count = Number(match[1]!.replace(/,/g, ''));
  const units: Record<string, number> = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
    lakh: 1e5,
    crore: 1e7
  };
  return Number.isFinite(count)
    ? count * (units[match[2]?.toLowerCase() || ''] || 1)
    : null;
}

function video(item: Item): Item | undefined {
  return (
    item?.tileRenderer ||
    item?.videoRenderer ||
    item?.compactVideoRenderer ||
    item?.tvVideoRenderer
  );
}

function views(item: Item): number | null {
  const tile = video(item);
  if (!tile) return null;
  for (const value of [tile.viewCountText, tile.shortViewCountText]) {
    const count = parseViewCount(text(value));
    if (count !== null) return count;
  }
  const lines = tile.metadata?.tileMetadataRenderer?.lines;
  if (!Array.isArray(lines)) return null;
  for (const line of lines) {
    const items = line?.lineRenderer?.items;
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      const count = parseViewCount(text(entry?.text));
      if (count !== null) return count;
    }
  }
  return null;
}

function reorderSlots(
  items: Item[],
  eligible: (item: Item) => boolean,
  compare: (a: Item, b: Item) => number
): void {
  const sorted = items.filter(eligible).map((item, index) => ({ item, index }));
  // Explicit stable sorting also works on webOS engines predating ES2019.
  sorted.sort((a, b) => compare(a.item, b.item) || a.index - b.index);
  let index = 0;
  for (let i = 0; i < items.length; i++) {
    if (eligible(items[i]!)) items[i] = sorted[index++]!.item;
  }
}

function shelfTitle(item: Item): string {
  const shelf = item?.shelfRenderer;
  return text(
    shelf?.title || shelf?.headerRenderer?.shelfHeaderRenderer?.title
  ).toLowerCase();
}

function shelfPriority(item: Item): number {
  const title = shelfTitle(item);
  if (/\b(music|songs?|tracks?|albums?|artists?|hits)\b/.test(title)) return 0;
  if (/\b(news|headlines?|breaking)\b/.test(title)) return 1;
  return 2;
}

function shelfItems(item: Item): Item[] | undefined {
  return item?.shelfRenderer?.content?.horizontalListRenderer?.items;
}

export function prioritizeHomeFeed(data: any): any {
  const sections =
    data?.contents?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer?.content
      ?.sectionListRenderer?.contents;
  if (!Array.isArray(sections)) return data;

  const scores = new Map<Item, number>();
  for (const section of sections) {
    const items = shelfItems(section);
    if (!Array.isArray(items)) continue;
    const counts = new Map<Item, number>();
    for (const item of items) {
      const count = views(item);
      if (count !== null) counts.set(item, count);
    }
    reorderSlots(
      items,
      (item) => counts.has(item),
      (a, b) => counts.get(b)! - counts.get(a)!
    );
    scores.set(section, Math.max(0, ...counts.values()));
  }
  reorderSlots(
    sections,
    (item) => !!item?.shelfRenderer,
    (a, b) =>
      shelfPriority(a) - shelfPriority(b) ||
      (scores.get(b) || 0) - (scores.get(a) || 0)
  );
  return data;
}

function isSong(item: Item): boolean {
  const tile = video(item);
  if (!tile) return false;
  const title = text(tile.title || tile.metadata?.tileMetadataRenderer?.title);
  const author = text(tile.subtitle || tile.ownerText || tile.shortBylineText);
  return (
    /\b(song|music|audio|lyric[s]?|remix|album|feat)\b/i.test(title) ||
    /\b(music|vevo|records)\b/i.test(author)
  );
}

function orderSearchItems(items: unknown): void {
  if (!Array.isArray(items)) return;
  reorderSlots(
    items,
    (item) => !!video(item),
    (a, b) => Number(isSong(b)) - Number(isSong(a))
  );
}

export function enhanceSearchResults(data: any): any {
  const sections =
    data?.contents?.sectionListRenderer?.contents ||
    data?.contents?.tvSearchRenderer?.results?.sectionListRenderer?.contents ||
    data?.contents?.tvSurfaceContentRenderer?.content?.sectionListRenderer
      ?.contents ||
    data?.continuationContents?.sectionListContinuation?.contents;
  if (Array.isArray(sections)) {
    for (const section of sections)
      orderSearchItems(section?.itemSectionRenderer?.contents);
    orderSearchItems(sections);
  }
  orderSearchItems(
    data?.continuationContents?.itemSectionContinuation?.contents
  );
  const commands =
    data?.onResponseReceivedCommands || data?.onResponseReceivedActions;
  if (Array.isArray(commands)) {
    for (const command of commands) {
      orderSearchItems(
        command?.appendContinuationItemsAction?.continuationItems
      );
    }
  }
  return data;
}
