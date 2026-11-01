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
      this.isConnected = true;
      const classes = new Set();
      this.classList = {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name)
      };
    }
    setAttribute() {}
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(callback);
    }
    matches(selector) {
      return this.tagName === selector;
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
      this.checked = !this.checked;
      for (const listener of this.listeners.get('change') || [])
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
      'src/player_api/helpers.ts': { requireElement: () => {} }
    },
    globals: {
      document,
      __YTAF_VERSION__: '0.5.4',
      MutationObserver: class {
        observe() {}
      },
      setTimeout: () => 0
    }
  });
  await env.import('src/ui.js');
  const panel = document.body.children[0];
  const inputs = panel.querySelectorAll('input');
  function key(target, code, extra = {}) {
    const event = {
      keyCode: code,
      charCode: 0,
      type: 'keydown',
      preventDefault() {},
      stopPropagation() {},
      ...extra
    };
    for (const listener of target.listeners.get('keydown') || [])
      listener(event);
  }
  return { env, document, previous, panel, inputs, key };
}

test('Green keyCode opens settings and held repeats do not toggle repeatedly', async () => {
  const { document, panel, inputs, key } = await dialogRuntime();
  key(document, 404);
  assert.equal(panel.style.display, 'block');
  assert.equal(document.activeElement, inputs[0]);
  key(document, 404, { repeat: true });
  assert.equal(panel.style.display, 'block');
});

test('D-pad wraps through all settings and Enter toggles once', async () => {
  const { document, panel, inputs, key } = await dialogRuntime();
  key(document, 404);
  key(panel, 38);
  assert.equal(document.activeElement, inputs.at(-1));
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
