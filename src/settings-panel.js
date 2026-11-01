/* global __YTAF_VERSION__ */
import {
  configAddChangeListener,
  configRead,
  configWrite,
  configGetDesc
} from './config.js';
import './settings-panel.css';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function checkbox(key) {
  const row = element('label', 'ytaf-setting-check');
  const input = element('input');
  input.type = 'checkbox';
  input.setAttribute('data-setting', key);
  const caption = element('span', 'ytaf-setting-caption', configGetDesc(key));
  const state = element('span', 'ytaf-setting-state');
  state.setAttribute('aria-hidden', 'true');
  function update() {
    input.checked = configRead(key);
    state.textContent = input.checked ? 'On' : 'Off';
  }
  input.addEventListener('change', () => configWrite(key, input.checked));
  configAddChangeListener(key, update);
  update();
  row.appendChild(input);
  row.appendChild(caption);
  row.appendChild(state);
  return row;
}

function cycle(key, choices) {
  const row = element('div', 'ytaf-setting-row');
  row.appendChild(element('span', 'ytaf-setting-caption', configGetDesc(key)));
  const button = element('button');
  button.type = 'button';
  button.setAttribute('data-setting', key);
  function update() {
    button.textContent = choices.find(
      ([value]) => value === configRead(key)
    )[1];
    button.setAttribute(
      'aria-label',
      `${configGetDesc(key)}: ${button.textContent}`
    );
  }
  button.ytafAdjust = (direction) => {
    const index = choices.findIndex(([value]) => value === configRead(key));
    configWrite(
      key,
      choices[(index + direction + choices.length) % choices.length][0]
    );
  };
  button.addEventListener('click', () => button.ytafAdjust(1));
  configAddChangeListener(key, update);
  update();
  row.appendChild(button);
  return row;
}

function action(text, callback) {
  const button = element('button', 'ytaf-settings-action', text);
  button.type = 'button';
  button.addEventListener('click', callback);
  return button;
}

export function createSettingsPanel(onClose) {
  const panel = element('div', 'ytaf-ui-container');
  panel.style.display = 'none';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'ytaf-settings-title');
  panel.setAttribute('aria-describedby', 'ytaf-settings-help');
  const header = element('header', 'ytaf-settings-header');
  header.appendChild(
    element('p', 'ytaf-settings-eyebrow', 'YOUR VIEWING PREFERENCES')
  );
  const title = element('h1', '', 'webOS YouTube Extended');
  title.id = 'ytaf-settings-title';
  header.appendChild(title);
  header.appendChild(
    element(
      'p',
      'ytaf-settings-subtitle',
      'Your video stays in view. Make yourself at home.'
    )
  );
  const close = action('Close ×', onClose);
  close.className = 'ytaf-settings-close';
  header.appendChild(close);
  panel.appendChild(header);

  const navigation = element('div', 'ytaf-settings-tabs');
  navigation.setAttribute('role', 'tablist');
  navigation.setAttribute('aria-label', 'Settings categories');
  panel.appendChild(navigation);
  const scroll = element('div', 'ytaf-settings-scroll');
  panel.appendChild(scroll);
  const pages = [],
    tabs = [];
  let selected = 0;
  const details = element('p', 'ytaf-playback-details');
  details.setAttribute('aria-live', 'polite');
  function refreshDetails() {
    const video = document.querySelector('video');
    if (!video || !video.videoWidth || !video.videoHeight) {
      details.textContent = 'Play a video to see its source resolution.';
      return;
    }
    let dropped = '';
    if (typeof video.getVideoPlaybackQuality === 'function') {
      try {
        const quality = video.getVideoPlaybackQuality();
        if (Number.isFinite(quality.droppedVideoFrames))
          dropped = ` · Dropped frames: ${quality.droppedVideoFrames}`;
      } catch {
        // Some TV engines expose this API without implementing it.
      }
    }
    details.textContent = `Source video: ${video.videoWidth} × ${video.videoHeight} · ${video.paused ? 'Paused' : 'Playing'}${dropped}. Your TV scales the source to its panel.`;
  }
  const names = ['Ads & skips', 'Picture', 'Appearance', 'Extras'];
  function controls(page) {
    return Array.from(page.querySelectorAll('input, button'));
  }
  function select(index) {
    selected = (index + pages.length) % pages.length;
    pages.forEach((page, i) => {
      page.style.display = i === selected ? 'block' : 'none';
      page.setAttribute('aria-hidden', String(i !== selected));
      controls(page).forEach((control) => {
        control.disabled = i !== selected;
      });
      tabs[i].setAttribute('aria-selected', String(i === selected));
      tabs[i].className =
        i === selected ? 'ytaf-settings-tab is-selected' : 'ytaf-settings-tab';
    });
    scroll.scrollTop = 0;
    if (selected === 3) refreshDetails();
  }
  names.forEach((name, index) => {
    const page = element('section', 'ytaf-settings-page');
    page.id = `ytaf-settings-page-${index}`;
    page.setAttribute('role', 'tabpanel');
    page.setAttribute('aria-labelledby', `ytaf-settings-tab-${index}`);
    pages.push(page);
    scroll.appendChild(page);
    const tab = action(name, () => select(index));
    tab.id = `ytaf-settings-tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', page.id);
    tab.ytafTab = true;
    tab.ytafAdjust = (direction) => {
      select(index + direction);
      tabs[selected].focus();
    };
    tabs.push(tab);
    navigation.appendChild(tab);
  });

  pages[0].appendChild(checkbox('enableAdBlock'));
  pages[0].appendChild(checkbox('enableSponsorBlock'));
  const skip = element('div', 'ytaf-subsettings');
  skip.appendChild(element('h2', '', 'Skip these segments'));
  [
    'enableSponsorBlockSponsor',
    'enableSponsorBlockIntro',
    'enableSponsorBlockOutro',
    'enableSponsorBlockInteraction',
    'enableSponsorBlockSelfPromo',
    'enableSponsorBlockMusicOfftopic',
    'enableSponsorBlockPreview'
  ].forEach((key) => {
    skip.appendChild(checkbox(key));
  });
  pages[0].appendChild(skip);
  pages[0].appendChild(
    element(
      'p',
      'ytaf-settings-note',
      'SponsorBlock uses community-submitted segments from sponsor.ajay.app.'
    )
  );

  pages[1].appendChild(checkbox('forceHighResVideo'));
  pages[1].appendChild(checkbox('preferHDR'));
  pages[1].appendChild(
    cycle('screenFit', [
      ['original', 'Original'],
      ['fill', 'Fill screen · crop'],
      ['16:9', '16:9 · fit'],
      ['4:3', '4:3 · fit'],
      ['21:9', '21:9 · fit']
    ])
  );
  pages[1].appendChild(
    cycle(
      'videoZoom',
      [100, 110, 125, 150, 175, 200, 250, 300].map((value) => [
        value,
        `${value}%`
      ])
    )
  );
  pages[1].appendChild(
    action('Reset framing and zoom', () => {
      configWrite('screenFit', 'original');
      configWrite('videoZoom', 100);
    })
  );
  pages[1].appendChild(
    element(
      'p',
      'ytaf-settings-note',
      'Fill and zoom crop the picture. Frame presets keep source proportions. HDR requires HDR content; SDR stays SDR. Your 4K TV scales lower-resolution videos, but cannot display native 8K.'
    )
  );

  pages[2].appendChild(checkbox('enableModernTheme'));
  pages[2].appendChild(
    cycle('panelTransparency', [
      ['clear', 'More transparent'],
      ['balanced', 'Balanced'],
      ['solid', 'More contrast']
    ])
  );
  pages[2].appendChild(checkbox('enableGlassBlur'));
  pages[2].appendChild(checkbox('hideLogo'));
  pages[2].appendChild(checkbox('showWatch'));
  pages[2].appendChild(checkbox('upgradeThumbnails'));
  pages[2].appendChild(
    element(
      'p',
      'ytaf-settings-note',
      'Transparency keeps your video visible. Frosted blur is optional and uses more graphics power.'
    )
  );

  pages[3].appendChild(
    cycle(
      'sleepTimerMinutes',
      [0, 15, 30, 60, 90, 120].map((value) => [
        value,
        value ? `${value} minutes` : 'Off'
      ])
    )
  );
  pages[3].appendChild(
    element(
      'p',
      'ytaf-settings-note',
      'The sleep timer pauses playback. It does not turn off your TV and resets when this app restarts.'
    )
  );
  [
    'removeShorts',
    'removeEndscreen',
    'autoAccountSelect',
    'enableFeedPrioritization',
    'enableExtendedSongSearch'
  ].forEach((key) => {
    pages[3].appendChild(checkbox(key));
  });
  pages[3].appendChild(action('Refresh video details', refreshDetails));
  pages[3].appendChild(details);
  pages[3].appendChild(
    element(
      'p',
      'ytaf-ui-sponsor',
      'Unofficial fork by Mahesh Vanga · webosbrew contributors · GPL-3.0-only · No warranty. Source: github.com/Mahesh-Vanga/youtube-webos'
    )
  );

  const footer = element('footer', 'ytaf-settings-footer');
  const help = element(
    'span',
    '',
    '↑ ↓ Navigate   ·   ← → Adjust   ·   OK Toggle   ·   Green / Red / Back Close'
  );
  help.id = 'ytaf-settings-help';
  footer.appendChild(help);
  footer.appendChild(
    element('span', 'ytaf-ui-version', `v${__YTAF_VERSION__}`)
  );
  panel.appendChild(footer);

  const handleKey = (evt) => {
    const code = evt.keyCode || evt.which || evt.charCode;
    if (code === 404 || code === 172) return;
    const active = document.activeElement;
    const items = controls(pages[selected]);
    if (
      code !== 27 &&
      code !== 461 &&
      active !== close &&
      !tabs.includes(active) &&
      !items.includes(active)
    ) {
      items[0].focus();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
    if (code === 27 || code === 461) onClose();
    else if (
      (code === 37 || code === 39) &&
      typeof active.ytafAdjust === 'function'
    ) {
      active.ytafAdjust(code === 37 ? -1 : 1);
    } else if (code === 37 || code === 39) {
      if (active.matches('input')) {
        active.checked = code === 39;
        active.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (code === 38 || code === 40 || code === 9) {
      const direction = code === 38 || (code === 9 && evt.shiftKey) ? -1 : 1;
      if (active === close) tabs[selected].focus();
      else if (active.ytafTab) (direction > 0 ? items[0] : close).focus();
      else {
        const target = items[items.indexOf(active) + direction];
        (target || tabs[selected]).focus();
      }
    } else if (
      (code === 13 || code === 32) &&
      !evt.repeat &&
      active.matches('input, button')
    )
      active.click();
    evt.preventDefault();
    evt.stopPropagation();
  };
  panel.ytafHandleKey = handleKey;
  panel.addEventListener('keydown', handleKey, true);
  panel.addEventListener('keypress', (evt) => evt.stopPropagation());
  panel.addEventListener('keyup', (evt) => evt.stopPropagation());
  panel.addEventListener('click', (evt) => evt.stopPropagation());
  panel.ytafFocusInitial = () => {
    select(0);
    controls(pages[0])[0].focus();
  };
  select(0);
  return panel;
}
