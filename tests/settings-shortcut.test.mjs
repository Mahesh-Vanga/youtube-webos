import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

async function shortcuts(register = true) {
  let time = 1000,
    toggles = 0;
  const listeners = new Map(),
    captures = [];
  const env = runtime({ globals: { Date: { now: () => time } } });
  env.context.window.addEventListener = (type, listener, capture) => {
    listeners.set(type, listener);
    if (type !== 'blur') captures.push(capture);
  };
  const mod = await env.import('src/settings-shortcut.js');
  const bind = () => mod.registerSettingsShortcut(() => toggles++);
  if (register) bind();
  function emit(type, properties = {}) {
    let cancelled = false,
      stopped = false;
    listeners.get(type)({
      type,
      ...properties,
      preventDefault: () => {
        cancelled = true;
      },
      stopImmediatePropagation: () => {
        stopped = true;
      }
    });
    return { cancelled, stopped };
  }
  return {
    bind,
    emit,
    captures,
    count: () => toggles,
    advance: (ms) => {
      time += ms;
    }
  };
}

for (const code of [404, 172, 403]) {
  test(`settings color code ${code} is captured once per complete press`, async () => {
    const env = await shortcuts();
    for (const type of ['keydown', 'keypress', 'keyup']) {
      assert.deepEqual(env.emit(type, { keyCode: code }), {
        cancelled: true,
        stopped: true
      });
    }
    assert.equal(env.count(), 1);
    assert.deepEqual(env.captures, [true, true, true]);
    env.emit('keydown', { keyCode: code });
    env.emit('keyup', { keyCode: code });
    assert.equal(env.count(), 2);
  });
}
test('named keys and alternate numeric fields are recognized', async () => {
  const env = await shortcuts();
  for (const properties of [
    { key: 'ColorF1Green' },
    { code: 'ColorF0Red' },
    { key: 'Green' },
    { key: 'Red' },
    { keyCode: 229, which: 404 },
    { charCode: 403 }
  ]) {
    env.emit('keydown', properties);
    env.emit('keyup', properties);
  }
  assert.equal(env.count(), 6);
});
test('release-only remotes work and duplicate releases do not double toggle', async () => {
  const env = await shortcuts();
  env.emit('keyup', { keyCode: 404 });
  env.emit('keyup', { keyCode: 404 });
  assert.equal(env.count(), 1);
  env.advance(200);
  env.emit('keyup', { keyCode: 404 });
  assert.equal(env.count(), 2);
});
test('held/repeated events do not open and immediately close the panel', async () => {
  const env = await shortcuts();
  // Even if the first received event is marked repeat, respond to the press.
  env.emit('keydown', { keyCode: 404, repeat: true });
  for (let i = 0; i < 10; i++) {
    env.advance(100);
    env.emit('keydown', { keyCode: 404 });
  }
  env.advance(1000);
  env.emit('keydown', { keyCode: 404, repeat: true });
  env.emit('keyup', { keyCode: 404 });
  assert.equal(env.count(), 1);
});
test('an early press is replayed once when the panel becomes ready', async () => {
  const env = await shortcuts(false);
  env.emit('keydown', { keyCode: 403 });
  env.emit('keyup', { keyCode: 403 });
  assert.equal(env.count(), 0);
  env.bind();
  assert.equal(env.count(), 1);
});
test('blur clears a missing release and other remote buttons pass through', async () => {
  const env = await shortcuts();
  for (const keyCode of [37, 38, 39, 40, 13, 405, 406, 461]) {
    assert.deepEqual(env.emit('keydown', { keyCode }), {
      cancelled: false,
      stopped: false
    });
  }
  assert.equal(env.count(), 0);
  env.emit('keydown', { keyCode: 404 });
  env.emit('blur');
  env.emit('keydown', { keyCode: 404 });
  env.emit('keyup', { keyCode: 404 });
  assert.equal(env.count(), 2);
});
