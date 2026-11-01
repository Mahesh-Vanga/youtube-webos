import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

test('serialization handles frozen ancestors without altering caller data', async () => {
  const env = runtime();
  await env.import('src/hooks/json-stringify.ts');
  assert.equal(
    env.evaluate(`
    const ctx = Object.freeze({ existing: true });
    const playbackContext = Object.freeze({ contentPlaybackContext: ctx, other: 2 });
    const request = Object.freeze({ playbackContext, context: { client: { name: 'TV' } } });
    const serialized = JSON.parse(JSON.stringify(request));
    serialized.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd === true &&
    serialized.playbackContext.other === 2 &&
    !('isInlinePlaybackNoAd' in ctx) && !('audioConfig' in playbackContext)
  `),
    true
  );
});

test('ordinary JSON arrays, replacers, spacing and null retain native semantics', async () => {
  const env = runtime();
  await env.import('src/hooks/json-stringify.ts');
  for (const expression of [
    'JSON.stringify([1, null, "x"])',
    'JSON.stringify(null)',
    'JSON.stringify({a:1,b:2}, ["b"], 2)',
    'JSON.stringify({a:1}, (key,value) => typeof value === "number" ? value*2 : value)'
  ])
    assert.equal(env.evaluate(expression), Function(`return ${expression}`)());
  assert.equal(env.evaluate('JSON.stringify({hello: true})'), '{"hello":true}');
});

for (const stored of [
  'null',
  '[]',
  '42',
  '"bad"',
  '{bad',
  '{"forceHighResVideo":true}',
  '{"enableModernTheme":"false"}'
]) {
  test(`settings recover safely from legacy/invalid storage: ${stored}`, async () => {
    const env = runtime({ stored });
    const config = await env.import('src/config.js');
    assert.equal(config.configRead('forceHighResVideo'), false);
    assert.equal(config.configRead('enableModernTheme'), true);
  });
}

test('settings revision preserves explicit quality choices and change listeners', async () => {
  const env = runtime({
    stored: '{"settingsRevision":1,"forceHighResVideo":true}'
  });
  const config = await env.import('src/config.js');
  assert.equal(config.configRead('forceHighResVideo'), true);
  let detail;
  config.configAddChangeListener('enableModernTheme', (event) => {
    detail = event.detail;
  });
  config.configWrite('enableModernTheme', false);
  assert.equal(detail.newValue, false);
  assert.equal(JSON.parse(env.saved()).settingsRevision, 1);
});

test('unavailable localStorage does not prevent startup or changing preferences', async () => {
  const config = await runtime({ storageThrows: true }).import('src/config.js');
  config.configWrite('enableModernTheme', false);
  assert.equal(config.configRead('enableModernTheme'), false);
});

async function qualityRuntime() {
  let enabled = false;
  const listeners = new Map(),
    calls = [],
    change = {};
  const manager = {
    playerMode: 2,
    player: {
      getAvailableQualityData: () => [
        { quality: 'highres', qualityLabel: '4320p', isPlayable: false },
        { quality: 'hd2160', qualityLabel: '2160p', isPlayable: true },
        {
          quality: 'premium',
          qualityLabel: '4320p',
          isPlayable: true,
          paygatedQualityDetails: {}
        },
        { quality: 'hd1080', qualityLabel: '1080p', isPlayable: true }
      ],
      setPlaybackQualityRange: (...args) => calls.push(args)
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    }
  };
  const env = runtime({
    stubs: {
      'src/config.ts': {
        configRead: () => enabled,
        configAddChangeListener: (name, fn) => {
          change[name] = fn;
        }
      },
      'src/player_api.ts': {
        getPlayerManager: async () => manager,
        PlayerMode: { PREVIEW: 0 }
      }
    }
  });
  await env.import('src/video-quality.ts');
  return {
    manager,
    calls,
    listeners,
    emit: (name) => listeners.get(name)?.call(manager),
    toggle: (value) => {
      enabled = value;
      change.forceHighResVideo();
    }
  };
}

test('adaptive quality default never forces a format when a new song starts', async () => {
  const env = await qualityRuntime();
  env.emit('newVideo');
  env.emit('playbackStart');
  assert.deepEqual(env.calls, []);
});

test('quality preference selects playable non-premium 4K and restores auto', async () => {
  const env = await qualityRuntime();
  env.toggle(true);
  assert.deepEqual(env.calls, [['hd2160', 'hd2160', undefined]]);
  env.emit('newVideo');
  env.emit('playbackStart');
  env.emit('playbackStart');
  assert.equal(env.calls.length, 2);
  env.toggle(false);
  assert.deepEqual(env.calls.at(-1), ['default', 'default']);
  assert.equal(env.listeners.has('playbackStart'), false);
});

test('preview playback does not force quality', async () => {
  const env = await qualityRuntime();
  env.manager.playerMode = 0;
  env.toggle(true);
  assert.deepEqual(env.calls, []);
});
