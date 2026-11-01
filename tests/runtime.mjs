import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformSync } from '@babel/core';

// Run actual source modules in isolated browser-like globals. No app code is
// copied into tests and no capability hooks leak into Node's own JSON methods.
export function runtime({
  stored = null,
  storageThrows = false,
  stubs = {},
  globals = {}
} = {}) {
  let saved = stored;
  class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  }
  const context = vm.createContext({
    console,
    Event,
    EventTarget,
    CustomEvent,
    DocumentFragment: EventTarget,
    window: {
      location: { hash: '#/' },
      localStorage: {
        getItem() {
          if (storageThrows) throw new Error('storage unavailable');
          return saved;
        },
        setItem(_key, value) {
          if (storageThrows) throw new Error('quota');
          saved = value;
        }
      }
    },
    ...globals
  });
  const cache = new Map();
  async function load(pathname) {
    if (cache.has(pathname)) return cache.get(pathname);
    if (Object.hasOwn(stubs, pathname)) {
      const values = stubs[pathname];
      const mod = new vm.SyntheticModule(
        Object.keys(values),
        function () {
          for (const [key, value] of Object.entries(values))
            this.setExport(key, value);
        },
        { context, identifier: pathname }
      );
      cache.set(pathname, mod);
      return mod;
    }
    const source = await readFile(
      new URL(`../${pathname}`, import.meta.url),
      'utf8'
    );
    const { code } = transformSync(source, {
      filename: pathname,
      configFile: false,
      babelrc: false,
      presets: [['@babel/preset-typescript', { allExtensions: true }]]
    });
    const mod = new vm.SourceTextModule(code, {
      context,
      identifier: pathname
    });
    cache.set(pathname, mod);
    await mod.link((specifier, parent) => {
      const base = new URL(
        specifier,
        `file:///${parent.identifier}`
      ).pathname.slice(1);
      return load(/\.[a-z]+$/.test(base) ? base : `${base}.ts`);
    });
    return mod;
  }
  return {
    context,
    saved: () => saved,
    async import(pathname) {
      const mod = await load(pathname);
      if (mod.status !== 'evaluated') await mod.evaluate();
      return mod.namespace;
    },
    evaluate(code) {
      return vm.runInContext(code, context);
    }
  };
}
