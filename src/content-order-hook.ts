import { configRead } from './config';
import { enhanceSearchResults, prioritizeHomeFeed } from './content-order';

const originalParse = JSON.parse;
JSON.parse = function (...args: Parameters<typeof JSON.parse>) {
  const result = originalParse.apply(this, args);
  // Never reorder subscriptions, playlists, watch queues, or library pages.
  const path = window.location.hash.slice(1).split('?')[0];
  if ((path === '' || path === '/') && configRead('enableFeedPrioritization')) {
    return prioritizeHomeFeed(result);
  }
  if (path === '/search' && configRead('enableExtendedSongSearch')) {
    return enhanceSearchResults(result);
  }
  return result;
};
