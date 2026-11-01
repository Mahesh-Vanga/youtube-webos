import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

const { parseViewCount, prioritizeHomeFeed, enhanceSearchResults } =
  await runtime().import('src/content-order.ts');
const tile = (title, views = '10 views') => ({
  tileRenderer: {
    title: { simpleText: title },
    viewCountText: { simpleText: views }
  }
});
const continuation = () => ({ continuationItemRenderer: { token: 'keep-me' } });
const shelf = (title, items) => ({
  shelfRenderer: {
    title: { simpleText: title },
    content: { horizontalListRenderer: { items } }
  }
});
const home = (contents) => ({
  contents: {
    tvBrowseRenderer: {
      content: {
        tvSurfaceContentRenderer: {
          content: { sectionListRenderer: { contents } }
        }
      }
    }
  }
});

test('view parsing handles abbreviated and Indian English counts', () => {
  for (const [text, expected] of [
    ['1.2M views', 1200000],
    ['2K views', 2000],
    ['1,234 views', 1234],
    ['1 view', 1],
    ['0 views', 0],
    ['2.5 lakh views', 250000],
    ['1 crore views', 10000000]
  ])
    assert.equal(parseViewCount(text), expected);
  for (const text of [
    '1:23',
    'Music',
    '1,2 Mio. Aufrufe',
    '1.2M subscribers',
    'views',
    ''
  ]) {
    assert.equal(parseViewCount(text), null);
  }
});

test('home puts music then news first and sorts recognized videos by views', () => {
  const low = tile('Song', '2K views'),
    high = tile('Song', '3M views');
  const token = continuation();
  const music = shelf('Music', [low, token, high]);
  const news = shelf('News', []),
    gaming = shelf('Gaming', []);
  const fixed = { tvMastheadRenderer: {} };
  const sections = [gaming, fixed, news, music, token];
  const response = home(sections);
  assert.equal(prioritizeHomeFeed(response), response);
  assert.deepEqual(sections, [music, fixed, news, gaming, token]);
  assert.deepEqual(music.shelfRenderer.content.horizontalListRenderer.items, [
    high,
    token,
    low
  ]);
});

test('new home responses are sorted on every visit, retaining stable ties', () => {
  for (let i = 0; i < 3; i++) {
    const a = shelf('Songs', []),
      b = shelf('Music', []),
      news = shelf('News', []);
    const sections = [news, a, b];
    prioritizeHomeFeed(home(sections));
    assert.deepEqual(sections, [a, b, news]);
  }
});

test('localized unknown views and continuation slots are preserved', () => {
  const a = tile('A', '1K views'),
    unknown = tile('B', '10 lakh subscribers');
  const b = tile('C', '5K views'),
    token = continuation();
  const items = [a, unknown, b, token];
  prioritizeHomeFeed(home([shelf('Music', items)]));
  assert.deepEqual(items, [b, unknown, a, token]);
});

test('loaded search prioritizes songs without dropping any continuation or playlist', () => {
  const other = tile('Interview'),
    song = tile('Full song');
  const token1 = continuation(),
    token2 = continuation(),
    playlist = { playlistRenderer: {} };
  const items = [other, token1, song, playlist, token2];
  const data = {
    contents: {
      sectionListRenderer: {
        contents: [{ itemSectionRenderer: { contents: items } }]
      }
    }
  };
  enhanceSearchResults(data);
  assert.deepEqual(items, [song, token1, other, playlist, token2]);
});

test('search continuation pages and append commands keep all results and tokens', () => {
  for (const wrap of [
    (items) => ({
      continuationContents: {
        itemSectionContinuation: { contents: items, continuations: ['next'] }
      }
    }),
    (items) => ({
      continuationContents: { sectionListContinuation: { contents: items } }
    }),
    (items) => ({
      onResponseReceivedCommands: [
        { appendContinuationItemsAction: { continuationItems: items } }
      ]
    }),
    (items) => ({
      onResponseReceivedActions: [
        { appendContinuationItemsAction: { continuationItems: items } }
      ]
    })
  ]) {
    const other = tile('Interview'),
      song = tile('Music video'),
      token = continuation();
    const items = [other, song, token];
    enhanceSearchResults(wrap(items));
    assert.deepEqual(items, [song, other, token]);
  }
});

test('unrecognized and malformed response shapes pass through unchanged', () => {
  for (const data of [
    null,
    3,
    'text',
    [],
    {},
    { contents: null },
    { contents: { tvBrowseRenderer: {} } }
  ]) {
    assert.equal(prioritizeHomeFeed(data), data);
    assert.equal(enhanceSearchResults(data), data);
  }
});

test('unknown shelf entries do not break JSON parsing', () => {
  const data = home([null, {}, { shelfRenderer: {} }, continuation()]);
  assert.equal(prioritizeHomeFeed(data), data);
});

test('route hook leaves subscriptions, playlists and watch data untouched', async () => {
  const env = runtime({
    stubs: { 'src/config.ts': { configRead: () => true } }
  });
  await env.import('src/content-order-hook.ts');
  const data = home([shelf('News', []), shelf('Music', [])]);
  env.context.input = JSON.stringify(data);
  for (const path of [
    '#/watch?v=abc',
    '#/playlist?list=abc',
    '#/feed/subscriptions',
    '#/library'
  ]) {
    env.context.window.location.hash = path;
    assert.equal(
      env.evaluate('JSON.stringify(JSON.parse(input))'),
      JSON.stringify(data)
    );
  }
  env.context.window.location.hash = '#/';
  assert.notEqual(
    env.evaluate('JSON.stringify(JSON.parse(input))'),
    JSON.stringify(data)
  );
});
