import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

test('glass and optional blur preferences apply immediately and can be disabled', async () => {
  const settings = {
    enableModernTheme: true,
    enableGlassBlur: false,
    panelTransparency: 'balanced'
  };
  const listeners = new Map(),
    classes = new Set();
  const env = runtime({
    stubs: {
      'src/config.ts': {
        configRead: (key) => settings[key],
        configAddChangeListener: (key, fn) => listeners.set(key, fn)
      },
      'src/beautiful-theme.css': {}
    },
    globals: {
      document: {
        documentElement: {
          classList: {
            toggle: (key, value) =>
              value ? classes.add(key) : classes.delete(key)
          }
        }
      }
    }
  });
  await env.import('src/theme.ts');
  assert.equal(classes.has('ytaf-glass'), true);
  assert.equal(classes.has('ytaf-glass-blur'), false);
  settings.panelTransparency = 'clear';
  listeners.get('panelTransparency')();
  assert.equal(classes.has('ytaf-glass-clear'), true);
  settings.panelTransparency = 'solid';
  listeners.get('panelTransparency')();
  assert.equal(classes.has('ytaf-glass-clear'), false);
  assert.equal(classes.has('ytaf-glass-solid'), true);
  settings.enableGlassBlur = true;
  listeners.get('enableGlassBlur')();
  assert.equal(classes.has('ytaf-glass-blur'), true);
  settings.enableModernTheme = false;
  listeners.get('enableModernTheme')();
  assert.equal(classes.has('ytaf-glass'), false);
});
