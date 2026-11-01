import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

// Minimal focus/event model for the real dialog module. These tests exercise
// key handling only; they make no claims about browser layout or TV latency.
async function dialogRuntime() {
  const document = {};
  class Node {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.style = {};
      this.listeners = new Map();
      this.attributes = new Map();
      this.isConnected = true;
      const classes = new Set();
      this.classList = {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name)
      };
    }
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    getAttribute(key) {
      return this.attributes.get(key);
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    dispatchEvent(event) {
      for (const listener of this.listeners.get(event.type) || [])
        listener.call(this, event);
      return true;
    }
    matches(selector) {
      return selector.split(',').some((value) => this.tagName === value.trim());
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(child.matches?.(selector) ? [child] : []),
        ...(child.querySelectorAll?.(selector) || [])
      ]);
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0];
    }
    focus() {
      document.activeElement = this;
    }
    click() {
      if (this.tagName === 'input') {
        this.checked = !this.checked;
        for (const listener of this.listeners.get('change') || [])
          listener({ target: this });
      }
      for (const listener of this.listeners.get('click') || [])
        listener({ target: this });
    }
  }
  Object.assign(document, {
    body: new Node('body'),
    head: new Node('head'),
    createElement: (tag) => new Node(tag),
    createTextNode: (text) => ({ textContent: text }),
    listeners: new Map(),
    addEventListener: Node.prototype.addEventListener,
    querySelector: () => null
  });
  const previous = new Node('button');
  previous.focus();
  const env = runtime({
    stubs: {
      'src/ui.css': {},
      'src/settings-panel.css': {},
      'src/player_api/helpers.ts': { requireElement: () => {} }
    },
    globals: {
      document,
      __YTAF_VERSION__: '0.5.7',
      MutationObserver: class {
        observe() {}
      },
      setTimeout: () => 0
    }
  });
  const windowListeners = new Map();
  env.context.window.addEventListener = (type, listener) => {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  };
  await env.import('src/ui.js');
  const panel = document.body.children[0];
  const inputs = panel.querySelectorAll('input');
  function key(target, code, extra = {}) {
    let stopped = false;
    const event = {
      keyCode: code,
      charCode: 0,
      type: 'keydown',
      ...extra,
      preventDefault() {
        extra.preventDefault?.();
      },
      stopPropagation() {
        stopped = true;
        extra.stopPropagation?.();
      },
      stopImmediatePropagation() {
        stopped = true;
        extra.stopImmediatePropagation?.();
      }
    };
    const emit = (listeners) => {
      for (const listener of listeners.get(event.type) || []) {
        if (stopped) break;
        listener(event);
      }
    };
    emit(windowListeners);
    if (!stopped) emit(document.listeners);
    if (!stopped && target !== document) emit(target.listeners);
    if (event.type === 'keydown' && !extra.keepHeld && !extra.repeat) {
      key(target, code, {
        type: 'keyup',
        key: extra.key,
        code: extra.code,
        which: extra.which,
        charCode: extra.charCode
      });
    }
  }
  const tabs = panel
    .querySelectorAll('button')
    .filter((button) => button.getAttribute('role') === 'tab');
  const pages = panel.querySelectorAll('section');
  const control = (name) =>
    panel
      .querySelectorAll('input, button')
      .find((node) => node.getAttribute('data-setting') === name);
  return { env, document, previous, panel, inputs, tabs, pages, control, key };
}

test('Green keyCode opens settings and held repeats do not toggle repeatedly', async () => {
  const { document, panel, inputs, key } = await dialogRuntime();
  key(document, 404, { keepHeld: true });
  assert.equal(panel.style.display, 'flex');
  assert.equal(document.activeElement, inputs[0]);
  key(document, 404, { repeat: true });
  assert.equal(panel.style.display, 'flex');
});

test('Red fallback and named Green events open the same unchanged settings panel', async () => {
  const { document, panel, previous, key } = await dialogRuntime();
  key(document, 403);
  assert.equal(panel.style.display, 'flex');
  key(document, 403);
  assert.equal(panel.style.display, 'none');
  assert.equal(document.activeElement, previous);
  key(document, 0, { key: 'ColorF1Green' });
  assert.equal(panel.style.display, 'flex');
  key(document, 0, { code: 'ColorF0Red' });
  assert.equal(panel.style.display, 'none');
});

test('D-pad reaches category tabs and Enter toggles once', async () => {
  const { document, panel, inputs, tabs, key } = await dialogRuntime();
  key(document, 404);
  key(panel, 38);
  assert.equal(document.activeElement, tabs[0]);
  key(panel, 40);
  assert.equal(document.activeElement, inputs[0]);
  const before = inputs[0].checked;
  key(panel, 13);
  assert.equal(inputs[0].checked, !before);
  key(panel, 13, { repeat: true });
  assert.equal(inputs[0].checked, !before);
});

test('TV Back and Green close settings and restore previous focus', async () => {
  const { document, previous, panel, key } = await dialogRuntime();
  key(document, 404);
  key(panel, 461);
  assert.equal(panel.style.display, 'none');
  assert.equal(document.activeElement, previous);
  key(document, 404);
  key(document, 404);
  assert.equal(panel.style.display, 'none');
  assert.equal(document.activeElement, previous);
});

test('Green settings cycle picture mode and zoom with arrows, OK and reset', async () => {
  const { env, document, panel, tabs, pages, control, key } =
    await dialogRuntime();
  const config = await env.import('src/config.js');
  key(document, 404);
  tabs[1].click();
  const mode = control('screenFit'),
    zoom = control('videoZoom');
  const reset = pages[1]
    .querySelectorAll('button')
    .find((button) => button.textContent === 'Reset framing and zoom');
  mode.focus();
  key(panel, 39);
  assert.equal(config.configRead('screenFit'), 'fill');
  assert.equal(document.activeElement, mode);
  key(panel, 13);
  assert.equal(config.configRead('screenFit'), '16:9');
  key(panel, 37);
  assert.equal(config.configRead('screenFit'), 'fill');
  key(panel, 40);
  assert.equal(document.activeElement, zoom);
  key(panel, 39);
  assert.equal(config.configRead('videoZoom'), 110);
  reset.focus();
  key(panel, 13);
  assert.equal(config.configRead('screenFit'), 'original');
  assert.equal(config.configRead('videoZoom'), 100);
});

test('category switching disables hidden controls and every category is reachable', async () => {
  const { document, panel, tabs, pages, key } = await dialogRuntime();
  key(document, 404);
  key(panel, 38);
  for (let index = 1; index < 4; index++) {
    key(panel, 39);
    assert.equal(document.activeElement, tabs[index]);
    pages.forEach((page, pageIndex) => {
      assert.equal(page.style.display, pageIndex === index ? 'block' : 'none');
      assert.ok(
        page
          .querySelectorAll('input, button')
          .every((control) => control.disabled === (pageIndex !== index))
      );
    });
    key(panel, 40);
    assert.equal(
      document.activeElement,
      pages[index].querySelectorAll('input, button')[0]
    );
    key(panel, 38);
  }
});

test('reopening Green always starts with Ads and keyboard tab stays in the dialog', async () => {
  const { document, panel, previous, tabs, control, key } =
    await dialogRuntime();
  key(document, 404);
  tabs[3].click();
  key(panel, 461);
  assert.equal(document.activeElement, previous);
  key(document, 404);
  assert.equal(document.activeElement, control('enableAdBlock'));
  key(panel, 9);
  assert.equal(document.activeElement, control('enableSponsorBlock'));
  key(panel, 37);
  assert.equal(control('enableSponsorBlock').checked, false);
  key(panel, 39);
  assert.equal(control('enableSponsorBlock').checked, true);
});

test('document-level remote events are trapped inside the open glass panel', async () => {
  const { document, previous, panel, control, key } = await dialogRuntime();
  key(document, 404);
  let trapped = 0;
  key(document, 40, { stopImmediatePropagation: () => trapped++ });
  assert.equal(document.activeElement, control('enableSponsorBlock'));
  assert.equal(trapped, 1);
  let outsideClicks = 0;
  previous.addEventListener('click', () => outsideClicks++);
  previous.focus();
  key(document, 13);
  assert.equal(outsideClicks, 0);
  assert.equal(document.activeElement, control('enableAdBlock'));
  key(document, 461, { stopImmediatePropagation: () => trapped++ });
  assert.equal(panel.style.display, 'none');
  assert.equal(trapped, 2);
});
