const CONFIG_KEY = 'ytaf-configuration';

const configOptions = new Map([
  ['enableAdBlock', { default: true, desc: 'Enable ad blocking' }],
  ['upgradeThumbnails', { default: false, desc: 'Upgrade thumbnail quality' }],
  [
    'removeShorts',
    { default: false, desc: 'Remove Shorts from subscriptions' }
  ],
  ['enableSponsorBlock', { default: true, desc: 'Enable SponsorBlock' }],
  [
    'enableSponsorBlockSponsor',
    { default: true, desc: 'Skip sponsor segments' }
  ],
  ['enableSponsorBlockIntro', { default: true, desc: 'Skip intro segments' }],
  ['enableSponsorBlockOutro', { default: true, desc: 'Skip outro segments' }],
  [
    'enableSponsorBlockInteraction',
    {
      default: true,
      desc: 'Skip interaction reminder segments'
    }
  ],
  [
    'enableSponsorBlockSelfPromo',
    {
      default: true,
      desc: 'Skip self promotion segments'
    }
  ],
  [
    'enableSponsorBlockMusicOfftopic',
    {
      default: true,
      desc: 'Skip non-music segments in music videos'
    }
  ],
  [
    'enableSponsorBlockPreview',
    {
      default: false,
      desc: 'Skip recaps and previews'
    }
  ],
  [
    'hideLogo',
    {
      default: false,
      desc: 'Hide YouTube logo'
    }
  ],
  [
    'showWatch',
    {
      default: false,
      desc: 'Display time in UI'
    }
  ],
  [
    'forceHighResVideo',
    {
      default: false,
      desc: 'Prefer highest supported quality (may increase buffering)'
    }
  ],
  [
    'preferHDR',
    { default: false, desc: 'Prefer HDR when offered by the video and TV' }
  ],
  [
    'screenFit',
    {
      default: 'original',
      desc: 'Picture framing',
      values: ['original', 'fill', '16:9', '4:3', '21:9']
    }
  ],
  [
    'videoZoom',
    {
      default: 100,
      desc: 'Video zoom',
      values: [100, 110, 125, 150, 175, 200, 250, 300]
    }
  ],
  [
    'removeEndscreen',
    {
      default: false,
      desc: 'Remove end screens from video'
    }
  ],
  [
    'autoAccountSelect',
    {
      default: false,
      desc: 'Bypass initial account selection on startup'
    }
  ],
  [
    'enableGlassBlur',
    {
      default: false,
      desc: 'Frosted settings background (uses more graphics power)'
    }
  ],
  [
    'enableFeedPrioritization',
    {
      default: true,
      desc: 'Prioritize Music & News feeds by views'
    }
  ],
  [
    'enableExtendedSongSearch',
    {
      default: true,
      desc: 'Show songs first in loaded search results'
    }
  ],
  [
    'enableModernTheme',
    {
      default: true,
      desc: 'Glass-inspired theme'
    }
  ]
]);

const defaultConfig = (() => {
  let ret = {};
  for (const [k, v] of configOptions) {
    ret[k] = v.default;
  }
  return ret;
})();

/** @type {Record<string, DocumentFragment>} as const */
const configFrags = (() => {
  let ret = {};
  for (const k of configOptions.keys()) {
    ret[k] = new DocumentFragment();
  }
  return ret;
})();

function loadStoredConfig() {
  try {
    const storage = window.localStorage.getItem(CONFIG_KEY);
    if (storage === null) return null;
    const stored = JSON.parse(storage);
    if (!stored || typeof stored !== 'object' || Array.isArray(stored))
      return null;
    const values = Object.create(null);
    for (const [key, option] of configOptions) {
      if (
        option.values
          ? option.values.includes(stored[key])
          : typeof stored[key] === 'boolean'
      ) {
        values[key] = stored[key];
      }
    }
    // Reset the old forced bitrate default once, then retain user choices.
    if (stored.settingsRevision !== 1) values.forceHighResVideo = false;
    values.settingsRevision = 1;
    return values;
  } catch (err) {
    console.warn('Error parsing stored config:', err);
    return null;
  }
}

// Use defaultConfig as a prototype so writes to localConfig don't change it.
let localConfig = loadStoredConfig() ?? Object.create(defaultConfig);

function configExists(key) {
  return configOptions.has(key);
}

export function configGetDesc(key) {
  if (!configExists(key)) {
    throw new Error('tried to get desc for unknown config key: ' + key);
  }

  return configOptions.get(key).desc;
}

export function configRead(key) {
  if (!configExists(key)) {
    throw new Error('tried to read unknown config key: ' + key);
  }

  if (localConfig[key] === undefined) {
    console.warn(
      'Populating key',
      key,
      'with default value',
      defaultConfig[key]
    );

    localConfig[key] = defaultConfig[key];
  }

  return localConfig[key];
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
  }

  const option = configOptions.get(key);
  if (
    option.values ? !option.values.includes(value) : typeof value !== 'boolean'
  ) {
    throw new TypeError('invalid value for config key: ' + key);
  }

  const oldValue =
    localConfig[key] !== undefined ? localConfig[key] : defaultConfig[key];

  console.info('Changing key', key, 'from', oldValue, 'to', value);
  localConfig[key] = value;
  localConfig.settingsRevision = 1;
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(localConfig));
  } catch (err) {
    console.warn(
      'Could not persist settings; using them for this session.',
      err
    );
  }

  configFrags[key].dispatchEvent(
    new CustomEvent('ytafConfigChange', {
      detail: { key, newValue: value, oldValue }
    })
  );
}

/**
 * Add a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configAddChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.addEventListener('ytafConfigChange', callback);
}

/**
 * Remove a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configRemoveChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.removeEventListener('ytafConfigChange', callback);
}
