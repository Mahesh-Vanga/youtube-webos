// Install before YouTube's handlers and before the settings panel is constructed.
// webOS color buttons can arrive as numeric or named keyboard events.
let togglePanel = null;
let pendingToggle = false;
let heldButton = null;
let lastHeldEvent = 0;
let lastReleaseButton = null;
let lastReleaseTime = 0;

function settingsButton(event) {
  for (const code of [event.keyCode, event.which, event.charCode]) {
    if (code === 404 || code === 172) return 'green';
    if (code === 403) return 'red';
  }
  for (const name of [event.key, event.code]) {
    if (['ColorF1Green', 'Green', 'VK_GREEN'].includes(name)) return 'green';
    if (['ColorF0Red', 'Red', 'VK_RED'].includes(name)) return 'red';
  }
  return null;
}

function activate() {
  if (togglePanel) togglePanel();
  else pendingToggle = !pendingToggle;
}

function handleShortcut(event) {
  const button = settingsButton(event);
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const now = Date.now();
  if (event.type === 'keyup') {
    const handledPress = heldButton === button;
    heldButton = null;
    lastHeldEvent = 0;
    // Release-only remotes still work; a normal down/press/up sequence toggles
    // once. Ignore duplicate releases from a single physical press.
    if (
      !handledPress &&
      (lastReleaseButton !== button || now - lastReleaseTime > 150)
    )
      activate();
    lastReleaseButton = button;
    lastReleaseTime = now;
    return;
  }
  const duplicate =
    heldButton === button && (event.repeat || now - lastHeldEvent < 600);
  heldButton = button;
  lastHeldEvent = now;
  if (!duplicate) activate();
}

for (const type of ['keydown', 'keypress', 'keyup'])
  window.addEventListener(type, handleShortcut, true);
window.addEventListener('blur', () => {
  heldButton = null;
  lastHeldEvent = 0;
});

export function registerSettingsShortcut(toggle) {
  togglePanel = toggle;
  if (pendingToggle) {
    pendingToggle = false;
    activate();
  }
}
