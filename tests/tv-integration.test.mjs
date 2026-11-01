import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { runtime } from './runtime.mjs';

async function tvRuntime(globals = {}) {
  const env = runtime({ globals });
  const timers = new Map();
  let token = 0;
  Object.assign(env.context.window, {
    setTimeout: (callback) => {
      timers.set(++token, callback);
      return token;
    },
    clearTimeout: (id) => timers.delete(id)
  });
  const service = await env.import('src/tv-service.js');
  return { env, service, timers };
}
test('sound shortcut uses public app launch with sound target, not an output-setting write', async () => {
  const { env, service, timers } = await tvRuntime();
  let call;
  env.context.window.webOS = {
    service: {
      request: (uri, options) => {
        call = { uri, method: options.method, parameters: options.parameters };
        options.onSuccess({ returnValue: true });
      }
    }
  };
  await service.openTVSoundSettings();
  assert.deepEqual(JSON.parse(JSON.stringify(call)), {
    uri: 'luna://com.webos.applicationManager',
    method: 'launch',
    parameters: { id: 'com.palm.app.settings', params: { target: 'sound' } }
  });
  assert.equal(timers.size, 0);
});
test('PalmServiceBridge fallback launches the existing player and accepts its reply', async () => {
  const { env, service, timers } = await tvRuntime();
  let bridge;
  env.context.window.PalmServiceBridge = class {
    constructor() {
      bridge = this;
    }
    call(uri, payload) {
      this.uri = uri;
      this.payload = JSON.parse(payload);
    }
  };
  const result = service.launchTVApp('youtube.leanback.v4');
  assert.equal(bridge.uri, 'luna://com.webos.applicationManager/launch');
  assert.deepEqual(bridge.payload, { id: 'youtube.leanback.v4', params: {} });
  bridge.onservicecallback('{"returnValue":true}');
  assert.equal((await result).returnValue, true);
  assert.equal(timers.size, 0);
});
test('a rejected native launch is reported rather than shown as success', async () => {
  const { env, service } = await tvRuntime();
  env.context.window.webOS = {
    service: {
      request: (_uri, options) =>
        options.onFailure({ errorText: 'permission denied' })
    }
  };
  await assert.rejects(service.openTVSoundSettings(), /permission denied/);
});
test('a malformed bridge response fails safely', async () => {
  const { env, service } = await tvRuntime();
  env.context.window.PalmServiceBridge = class {
    call() {
      this.onservicecallback('not JSON');
    }
  };
  await assert.rejects(service.openTVSoundSettings(), /unreadable/);
});
test('missing TV integration returns a manual-settings error and leaves no timer', async () => {
  const { service, timers } = await tvRuntime();
  await assert.rejects(
    service.openTVSoundSettings(),
    /TV services are unavailable/
  );
  assert.equal(timers.size, 0);
});
test('unanswered native requests time out and a late reply does not repeat the action', async () => {
  const { env, service, timers } = await tvRuntime();
  let callback;
  env.context.window.webOS = {
    service: {
      request: (_uri, options) => {
        callback = options.onSuccess;
      }
    }
  };
  const pending = service.openTVSoundSettings();
  const rejected = assert.rejects(pending, /did not respond/);
  [...timers.values()][0]();
  await rejected;
  callback({ returnValue: true });
  assert.equal(timers.size, 0);
});

function surroundNode({
  label = '5.1 surround sound',
  controls = true,
  modal = false,
  hidden = false,
  role = 'button'
} = {}) {
  return {
    closest: (selector) =>
      selector === '.ytaf-ui-container' ? modal : controls,
    getAttribute: (key) =>
      ({ 'aria-label': label, role, 'aria-hidden': hidden ? 'true' : 'false' })[
        key
      ],
    matches: () => role === 'button',
    getClientRects: () => (hidden ? [] : [{}])
  };
}
test('only an explicitly-labelled native surround control in the player is found', async () => {
  const { findSurroundControl } = await runtime().import(
    'src/native-surround.js'
  );
  const control = surroundNode();
  assert.equal(
    findSurroundControl({ querySelectorAll: () => [control] }),
    control
  );
});
test('surround discovery ignores video titles, modal text and hidden controls', async () => {
  const { findSurroundControl } = await runtime().import(
    'src/native-surround.js'
  );
  const nodes = [
    surroundNode({ controls: false }),
    surroundNode({ modal: true }),
    surroundNode({ hidden: true }),
    surroundNode({ label: 'Captions' })
  ];
  assert.equal(findSurroundControl({ querySelectorAll: () => nodes }), null);
});
test('ambiguous surround controls are not automatically chosen', async () => {
  const { findSurroundControl } = await runtime().import(
    'src/native-surround.js'
  );
  assert.equal(
    findSurroundControl({
      querySelectorAll: () => [surroundNode(), surroundNode()]
    }),
    null
  );
});

for (const succeeds of [true, false]) {
  test(`Home shortcut launches the existing player (${succeeds ? 'success' : 'failure'})`, async () => {
    const listeners = new Map();
    const button = {
      disabled: false,
      addEventListener: (name, fn) => listeners.set(name, fn),
      focus() {}
    };
    const status = { textContent: '' };
    let parameters;
    const { env } = await tvRuntime({
      document: {
        getElementById: (id) => (id === 'open' ? button : status),
        addEventListener: (name, fn) => listeners.set(name, fn)
      }
    });
    env.context.window.webOS = {
      service: {
        request: (_uri, options) => {
          parameters = options.parameters;
          if (succeeds) options.onSuccess({ returnValue: true });
          else options.onFailure({ errorText: 'player not installed' });
        }
      }
    };
    await env.import('launcher/index.js');
    await setImmediate();
    assert.equal(parameters.id, 'youtube.leanback.v4');
    assert.equal(button.disabled, false);
    assert.match(
      status.textContent,
      succeeds ? /was opened/ : /player not installed/
    );
  });
}
test('Home shortcut has a separate, visible app identity and packaged icon paths', async () => {
  const info = JSON.parse(
    await readFile(new URL('../launcher/appinfo.json', import.meta.url))
  );
  assert.equal(info.id, 'com.mahesh.youtube.extended.launcher');
  assert.equal(info.visible, true);
  assert.equal(info.noWindow, false);
  assert.equal(info.main, 'index.html');
  assert.equal(info.icon, 'icon.png');
});
