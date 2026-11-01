import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

async function timerRuntime(videoPresent = true) {
  let minutes = 0,
    listener,
    paused = 0,
    notified = 0;
  const timers = new Map();
  let id = 0;
  const env = runtime({
    stubs: {
      'src/config.ts': {
        configRead: () => minutes,
        configWrite: (_key, value) => {
          minutes = value;
          listener();
        },
        configAddChangeListener: (_key, callback) => {
          listener = callback;
        }
      },
      'src/ui.ts': { showNotification: () => notified++ }
    },
    globals: {
      document: {
        querySelector: () => (videoPresent ? { pause: () => paused++ } : null)
      }
    }
  });
  Object.assign(env.context.window, {
    setTimeout: (callback, delay) => {
      timers.set(++id, { callback, delay });
      return id;
    },
    clearTimeout: (token) => timers.delete(token)
  });
  await env.import('src/sleep-timer.ts');
  return {
    timers,
    set: (value) => {
      minutes = value;
      listener();
    },
    state: () => ({ minutes, paused, notified })
  };
}
test('sleep timer is idle by default, can be replaced and cancelled', async () => {
  const timer = await timerRuntime();
  assert.equal(timer.timers.size, 0);
  timer.set(15);
  assert.equal(timer.timers.size, 1);
  assert.equal([...timer.timers.values()][0].delay, 15 * 60000);
  timer.set(30);
  assert.equal(timer.timers.size, 1);
  timer.set(0);
  assert.equal(timer.timers.size, 0);
  assert.equal(timer.state().paused, 0);
});
test('sleep expiry pauses playback once and resets the visible setting to Off', async () => {
  const timer = await timerRuntime();
  timer.set(15);
  [...timer.timers.values()][0].callback();
  assert.deepEqual(timer.state(), { minutes: 0, paused: 1, notified: 1 });
  assert.equal(timer.timers.size, 0);
});
test('sleep expiry without a video is harmless', async () => {
  const timer = await timerRuntime(false);
  timer.set(15);
  [...timer.timers.values()][0].callback();
  assert.equal(timer.state().paused, 0);
  assert.equal(timer.state().minutes, 0);
});
test('a stored sleep timer never restarts in a new app session', async () => {
  const config = await runtime({
    stored: '{"sleepTimerMinutes":30,"panelTransparency":"clear"}'
  }).import('src/config.js');
  assert.equal(config.configRead('sleepTimerMinutes'), 0);
  assert.equal(config.configRead('panelTransparency'), 'clear');
});
