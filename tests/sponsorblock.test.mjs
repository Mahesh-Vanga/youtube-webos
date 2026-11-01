import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { runtime } from './runtime.mjs';

test('a late SponsorBlock response cannot attach to the next song', async () => {
  const listeners = new Map(),
    requests = [];
  let videoLookups = 0;
  const env = runtime({
    stubs: {
      'src/tiny-sha256.ts': { default: () => '12345678' },
      'src/config.ts': { configRead: () => true },
      'src/ui.ts': { showNotification: () => {} }
    },
    globals: {
      URL,
      location: { hash: '#/watch?v=old', href: 'https://www.youtube.com/tv#/' },
      document: {
        querySelector: () => {
          videoLookups++;
          return null;
        }
      },
      fetch: () => new Promise((resolve) => requests.push(resolve)),
      setTimeout: () => 1,
      clearTimeout() {},
      clearInterval() {}
    }
  });
  env.context.window.addEventListener = (name, fn) => listeners.set(name, fn);
  await env.import('src/sponsorblock.js');
  listeners.get('hashchange')();
  env.context.location.hash = '#/watch?v=new';
  listeners.get('hashchange')();
  assert.equal(requests.length, 2);
  requests[0]({
    ok: true,
    json: async () => [
      {
        videoID: 'old',
        segments: [{ category: 'sponsor', segment: [0, 10] }]
      }
    ]
  });
  requests[1]({ ok: true, json: async () => [] });
  await setImmediate();
  assert.equal(videoLookups, 0);
  assert.equal(env.context.window.sponsorblock.videoID, 'new');
});
