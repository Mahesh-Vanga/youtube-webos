import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

async function displayRuntime() {
  const settings = { screenFit: 'original', videoZoom: 100 };
  const changes = new Map(),
    frames = [],
    observers = [];
  let watchPage = true;
  const stylesheet = { textContent: '' };
  class Video {
    style = { display: '', top: '0px', width: '1920px', height: '1080px' };
    videoWidth = 1440;
    videoHeight = 1080;
    listeners = new Map();
    setAttribute() {}
    addEventListener(name, fn) {
      this.listeners.set(name, fn);
    }
  }
  const video = new Video();
  const env = runtime({
    stubs: {
      'src/config.ts': {
        configRead: (key) => settings[key],
        configAddChangeListener: (key, fn) => changes.set(key, fn)
      },
      'src/player_api/helpers.ts': { requireElement: async () => video }
    },
    globals: {
      document: {
        head: { appendChild() {} },
        body: { classList: { contains: () => watchPage } },
        createElement: () => stylesheet
      },
      HTMLVideoElement: Video,
      MutationObserver: class {
        constructor(callback) {
          observers.push(callback);
        }
        observe() {}
      }
    }
  });
  Object.assign(env.context.window, {
    innerWidth: 1920,
    innerHeight: 1080,
    requestAnimationFrame: (fn) => frames.push(fn),
    addEventListener() {}
  });
  await env.import('src/video-display.ts');
  const flush = () => {
    for (const fn of frames.splice(0)) fn();
  };
  flush();
  return {
    video,
    stylesheet,
    observers,
    frames,
    flush,
    setWatch: (value) => {
      watchPage = value;
      observers[0]();
    },
    set: (key, value) => {
      settings[key] = value;
      changes.get(key)();
    }
  };
}

test('picture overrides apply only to video and do not mutate native inline layout', async () => {
  const env = await displayRuntime();
  const native = { ...env.video.style };
  assert.equal(env.stylesheet.textContent, '');
  env.set('screenFit', 'fill');
  env.flush();
  assert.match(env.stylesheet.textContent, /video\[data-ytaf-picture\]/);
  assert.match(env.stylesheet.textContent, /height: 1440px/);
  assert.match(env.stylesheet.textContent, /top: -180px/);
  assert.deepEqual(env.video.style, native);
  env.set('screenFit', 'original');
  env.flush();
  assert.equal(env.stylesheet.textContent, '');
});

test('leaving Watch or YouTube hiding the video removes the override', async () => {
  const env = await displayRuntime();
  env.set('screenFit', 'fill');
  env.flush();
  env.setWatch(false);
  env.flush();
  assert.equal(env.stylesheet.textContent, '');
  env.setWatch(true);
  env.flush();
  assert.notEqual(env.stylesheet.textContent, '');
  env.video.style.top = '-1080px';
  env.observers[1]();
  env.flush();
  assert.equal(env.stylesheet.textContent, '');
});

test('multiple setting changes share one frame and metadata applies the current source', async () => {
  const env = await displayRuntime();
  env.set('screenFit', 'fill');
  env.set('videoZoom', 125);
  assert.equal(env.frames.length, 1);
  env.flush();
  env.video.videoWidth = 0;
  env.video.videoHeight = 0;
  env.video.listeners.get('loadedmetadata')();
  env.flush();
  assert.equal(env.stylesheet.textContent, '');
  env.video.videoWidth = 1920;
  env.video.videoHeight = 1080;
  env.video.listeners.get('loadedmetadata')();
  env.flush();
  assert.match(env.stylesheet.textContent, /width: 2400px/);
});
