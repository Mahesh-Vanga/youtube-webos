import { configAddChangeListener, configRead } from './config.js';
import './ui.css';
import { createSettingsPanel } from './settings-panel.js';
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

const optionsPanel = createSettingsPanel(() => showOptionsPanel(false));
document.body.appendChild(optionsPanel);

let optionsPanelVisible = false;
let previousFocus = null;

function showOptionsPanel(visible) {
  visible ??= true;

  if (visible && !optionsPanelVisible) {
    optionsPanel.style.display = 'flex';
    previousFocus = document.activeElement;
    optionsPanel.ytafFocusInitial();
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
  if (optionsPanelVisible) {
    if (evt.type === 'keydown') optionsPanel.ytafHandleKey(evt);
    evt.preventDefault();
    // Intercept before YouTube's document-level remote handlers can seek or
    // navigate behind the modal. Do not synthesize another keyboard event.
    evt.stopImmediatePropagation();
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
