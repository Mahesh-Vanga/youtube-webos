/* global __YTAF_VERSION__ */
import {
  configAddChangeListener,
  configRead,
  configWrite,
  configGetDesc
} from './config.js';
import './ui.css';
import { requireElement } from './player_api/helpers';

const colorCodeMap = new Map([
  [403, 'red'],
  [404, 'green'],
  [172, 'green'],
  [405, 'yellow'],
  [170, 'yellow'],
  [406, 'blue'],
  [167, 'blue'],
  [191, 'blue']
]);

function getKeyColor(charCode) {
  if (colorCodeMap.has(charCode)) {
    return colorCodeMap.get(charCode);
  }
  return null;
}

function createConfigCheckbox(key) {
  const elmInput = document.createElement('input');
  elmInput.type = 'checkbox';
  elmInput.checked = configRead(key);

  const changeHandler = (evt) => {
    configWrite(key, evt.target.checked);
  };

  elmInput.addEventListener('change', changeHandler);

  configAddChangeListener(key, (evt) => {
    elmInput.checked = evt.detail.newValue;
  });

  const elmLabel = document.createElement('label');
  elmLabel.appendChild(elmInput);
  elmLabel.appendChild(document.createTextNode('\u00A0' + configGetDesc(key)));

  return elmLabel;
}

function createConfigCycle(key, choices) {
  const row = document.createElement('div');
  row.className = 'ytaf-setting-row';
  const label = document.createElement('span');
  label.textContent = configGetDesc(key);
  const button = document.createElement('button');
  button.type = 'button';
  const update = () => {
    button.textContent = choices.find(
      ([value]) => value === configRead(key)
    )[1];
    button.setAttribute(
      'aria-label',
      `${configGetDesc(key)}: ${button.textContent}`
    );
  };
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
  row.appendChild(label);
  row.appendChild(button);
  return row;
}

function createOptionsPanel() {
  const elmContainer = document.createElement('div');

  elmContainer.classList.add('ytaf-ui-container');
  elmContainer.style['display'] = 'none';
  elmContainer.setAttribute('tabindex', 0);
  elmContainer.setAttribute('role', 'dialog');
  elmContainer.setAttribute('aria-modal', 'true');
  elmContainer.setAttribute('aria-labelledby', 'ytaf-settings-title');

  elmContainer.addEventListener(
    'keydown',
    (evt) => {
      const code = evt.keyCode || evt.which || evt.charCode;
      if (getKeyColor(code) === 'green') {
        return;
      }

      const active = document.activeElement;
      if (
        (code === 37 || code === 39) &&
        typeof active.ytafAdjust === 'function'
      ) {
        active.ytafAdjust(code === 37 ? -1 : 1);
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }

      // Up/Down navigates rows; Left/Right adjusts a picture control in place.
      if ([37, 38, 39, 40, 9].includes(code)) {
        const inputs = Array.from(
          elmContainer.querySelectorAll('input, button')
        );
        const activeIdx = inputs.indexOf(document.activeElement);
        if (code === 38 || code === 37 || (code === 9 && evt.shiftKey)) {
          // Up / Left
          inputs[(activeIdx - 1 + inputs.length) % inputs.length]?.focus();
        } else {
          // Down / Right
          inputs[(activeIdx + 1) % inputs.length]?.focus();
        }
      } else if (code === 13) {
        if (!evt.repeat && document.activeElement.matches('input, button')) {
          document.activeElement.click();
        }
      } else if (code === 27 || code === 461) {
        showOptionsPanel(false);
      } else if (code === 32 && document.activeElement.matches('input')) {
        evt.stopPropagation();
        return;
      } else if (code === 32 && document.activeElement.matches('button')) {
        if (!evt.repeat) document.activeElement.click();
      }

      evt.preventDefault();
      evt.stopPropagation();
    },
    true
  );

  // Keep activation keypress/keyup events inside the modal, too. Green is
  // handled by the document capture listener before it reaches the dialog.
  elmContainer.addEventListener('keypress', (evt) => evt.stopPropagation());
  elmContainer.addEventListener('keyup', (evt) => evt.stopPropagation());

  const elmHeading = document.createElement('h1');
  elmHeading.id = 'ytaf-settings-title';
  elmHeading.textContent = 'webOS YouTube Extended';
  elmContainer.appendChild(elmHeading);

  elmContainer.appendChild(createConfigCheckbox('enableAdBlock'));
  elmContainer.appendChild(createConfigCheckbox('upgradeThumbnails'));
  elmContainer.appendChild(createConfigCheckbox('hideLogo'));
  elmContainer.appendChild(createConfigCheckbox('showWatch'));
  elmContainer.appendChild(createConfigCheckbox('removeShorts'));
  elmContainer.appendChild(createConfigCheckbox('forceHighResVideo'));
  elmContainer.appendChild(createConfigCheckbox('preferHDR'));
  elmContainer.appendChild(
    createConfigCycle('screenFit', [
      ['original', 'Original — no override'],
      ['fill', 'Fill TV screen — crop'],
      ['16:9', '16:9 frame — fit'],
      ['4:3', '4:3 frame — fit'],
      ['21:9', '21:9 frame — fit']
    ])
  );
  elmContainer.appendChild(
    createConfigCycle(
      'videoZoom',
      [100, 110, 125, 150, 175, 200, 250, 300].map((value) => [
        value,
        `${value}%`
      ])
    )
  );
  const resetPicture = document.createElement('button');
  resetPicture.type = 'button';
  resetPicture.className = 'ytaf-reset-picture';
  resetPicture.textContent = 'Reset framing and zoom';
  resetPicture.addEventListener('click', () => {
    configWrite('screenFit', 'original');
    configWrite('videoZoom', 100);
  });
  elmContainer.appendChild(resetPicture);
  const pictureHelp = document.createElement('p');
  pictureHelp.className = 'ytaf-picture-help';
  pictureHelp.textContent =
    'Up/Down: move · Left/Right or OK: change. Fill/zoom crops the video. Frame presets keep source proportions; webOS cannot force stretching. HDR requires an HDR source and TV support. 1080p stays 1080p; your TV scales it to its 4K panel. No artificial 8K or SDR-to-HDR conversion.';
  elmContainer.appendChild(pictureHelp);
  elmContainer.appendChild(createConfigCheckbox('removeEndscreen'));
  elmContainer.appendChild(createConfigCheckbox('autoAccountSelect'));
  elmContainer.appendChild(createConfigCheckbox('enableFeedPrioritization'));
  elmContainer.appendChild(createConfigCheckbox('enableExtendedSongSearch'));
  elmContainer.appendChild(createConfigCheckbox('enableModernTheme'));
  elmContainer.appendChild(createConfigCheckbox('enableGlassBlur'));
  elmContainer.appendChild(createConfigCheckbox('enableSponsorBlock'));

  const elmBlock = document.createElement('blockquote');

  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockSponsor'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockIntro'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockOutro'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockInteraction'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockSelfPromo'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockMusicOfftopic'));
  elmBlock.appendChild(createConfigCheckbox('enableSponsorBlockPreview'));

  elmContainer.appendChild(elmBlock);

  const elmSponsorLink = document.createElement('small');
  elmSponsorLink.className = 'ytaf-ui-sponsor';
  elmSponsorLink.textContent =
    'Sponsor segments skipping - https://sponsor.ajay.app';
  elmContainer.appendChild(elmSponsorLink);

  const attribution = document.createElement('p');
  attribution.className = 'ytaf-ui-sponsor';
  attribution.textContent =
    'Unofficial fork by Mahesh Vanga · Based on webosbrew/youtube-webos · GPL-3.0-only · No warranty. Source: github.com/Mahesh-Vanga/youtube-webos';
  elmContainer.appendChild(attribution);

  const version = document.createElement('div');
  version.className = 'ytaf-ui-version';
  version.textContent = `v${__YTAF_VERSION__}`;

  elmContainer.appendChild(version);

  return elmContainer;
}

const optionsPanel = createOptionsPanel();
document.body.appendChild(optionsPanel);

let optionsPanelVisible = false;
let previousFocus = null;

function showOptionsPanel(visible) {
  visible ??= true;

  if (visible && !optionsPanelVisible) {
    optionsPanel.style.display = 'block';
    previousFocus = document.activeElement;
    optionsPanel.querySelector('input').focus();
    optionsPanelVisible = true;
  } else if (!visible && optionsPanelVisible) {
    optionsPanel.style.display = 'none';
    optionsPanelVisible = false;
    if (previousFocus?.isConnected) previousFocus.focus();
  }
}

window.ytaf_showOptionsPanel = showOptionsPanel;

const eventHandler = (evt) => {
  const color = getKeyColor(evt.keyCode || evt.which || evt.charCode);
  if (color === 'green') {
    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown' && !evt.repeat) {
      showOptionsPanel(!optionsPanelVisible);
    }
    return false;
  } else if (color === 'blue' && !optionsPanelVisible) {
    evt.preventDefault();
    evt.stopPropagation();

    if (evt.type === 'keydown' && !evt.repeat) {
      initAudioOnlyToggle();
    }
    return false;
  }
  return true;
};

document.addEventListener('keydown', eventHandler, true);
document.addEventListener('keypress', eventHandler, true);
document.addEventListener('keyup', eventHandler, true);

const COLOR_MAP = {
  red: 'rgba(255, 0, 0, 0.9)',
  green: 'rgba(0, 162, 0, 0.9)',
  yellow: 'rgba(255, 255, 0, 0.9)',
  blue: 'rgba(0, 128, 255, 0.9)',
  grey: 'rgba(255, 255, 255, 0.5)',
  none: 'rgba(0, 0, 0, 0)'
};

export function showNotification(text, time = 3000, color = 'grey') {
  if (!document.querySelector('.ytaf-notification-container')) {
    const c = document.createElement('div');
    c.classList.add('ytaf-notification-container');
    document.body.appendChild(c);
  }

  const elm = document.createElement('div');
  const elmInner = document.createElement('div');
  elmInner.innerText = text;
  elmInner.classList.add('message');
  elmInner.classList.add('message-hidden');
  elm.appendChild(elmInner);
  document.querySelector('.ytaf-notification-container').appendChild(elm);
  elmInner.style.borderColor = COLOR_MAP[color] || color;

  setTimeout(() => {
    elmInner.classList.remove('message-hidden');
  }, 100);
  setTimeout(() => {
    elmInner.classList.add('message-hidden');
    setTimeout(() => {
      elm.remove();
    }, 1000);
  }, time);
}

function initHideLogo() {
  const style = document.createElement('style');
  document.head.appendChild(style);

  const setHidden = (hide) => {
    const visibility = hide ? 'hidden' : 'visible';
    style.textContent = `ytlr-redux-connect-ytlr-logo-entity { visibility: ${visibility}; }`;
  };

  setHidden(configRead('hideLogo'));

  configAddChangeListener('hideLogo', (evt) => {
    setHidden(evt.detail.newValue);
  });
}

function applyUIFixes() {
  try {
    const bodyClasses = document.body.classList;

    const observer = new MutationObserver(function bodyClassCallback(
      _records,
      _observer
    ) {
      try {
        if (bodyClasses.contains('app-quality-root')) {
          bodyClasses.remove('app-quality-root');
        }
      } catch (e) {
        console.error('error in <body> class observer callback:', e);
      }
    });

    observer.observe(document.body, {
      subtree: false,
      childList: false,
      attributes: true,
      attributeFilter: ['class'],
      characterData: false
    });
  } catch (e) {
    console.error('error setting up <body> class observer:', e);
  }
}

let audioOnlyEnabled = false;
let overlayObserver = null;

async function initAudioOnlyToggle() {
  const elVideo = await requireElement('video', HTMLVideoElement);

  audioOnlyEnabled = !audioOnlyEnabled;
  elVideo.style.visibility = audioOnlyEnabled ? 'hidden' : '';

  const AUDIO_OVERLAY_SELECTOR = '.ytLrAudioPlayerOverlayAudioMode';
  const YTAF_OVERLAY_CLASS = 'ytaf-ui-watchControl-overlayMessage';

  const applyAudioOverlayFilter = () => {
    const node = document.querySelector(AUDIO_OVERLAY_SELECTOR);
    if (!node) return;
    if (audioOnlyEnabled) {
      node.style.setProperty('filter', 'brightness(0)', 'important');
    } else {
      node.style.removeProperty('filter');
    }
  };
  applyAudioOverlayFilter();

  showNotification(
    `Audio-Only mode: ${audioOnlyEnabled ? 'Enabled' : 'Disabled'}`,
    2000,
    'blue'
  );

  const controlsContainer = await requireElement(
    '[idomkey="controls"]',
    HTMLElement
  );

  const updateOverlay = (root = controlsContainer) => {
    let overlay = root.querySelector(`.${YTAF_OVERLAY_CLASS}`);

    if (!audioOnlyEnabled) {
      overlay?.remove();
      return;
    }

    if (overlay) return;

    overlay = Object.assign(document.createElement('div'), {
      textContent: 'Audio-Only Mode Enabled - Press [BLUE] to toggle',
      className: YTAF_OVERLAY_CLASS
    });
    root.prepend(overlay);
  };
  updateOverlay();

  if (overlayObserver) overlayObserver.disconnect();
  overlayObserver = new MutationObserver(() => {
    updateOverlay();
    applyAudioOverlayFilter();
  });

  overlayObserver.observe(controlsContainer, {
    childList: true,
    subtree: true
  });
}

applyUIFixes();
initHideLogo();

setTimeout(() => {
  showNotification(
    'Press [GREEN] to open YTAF configuration screen',
    2000,
    'green'
  );
});
