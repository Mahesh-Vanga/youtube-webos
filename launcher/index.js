import { launchTVApp } from '../src/tv-service.js';

const button = document.getElementById('open');
const status = document.getElementById('status');
function openPlayer() {
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = 'Opening YouTube Extended…';
  launchTVApp('youtube.leanback.v4')
    .then(() => {
      status.textContent =
        'YouTube Extended was opened. This shortcut uses your existing player and settings.';
    })
    .catch((error) => {
      status.textContent = `${error.message} Check that YouTube Extended is installed in Homebrew Channel.`;
    })
    .finally(() => {
      button.disabled = false;
    });
}
button.addEventListener('click', openPlayer);
document.addEventListener('keydown', (event) => {
  if (event.keyCode === 461 || event.keyCode === 27) {
    event.preventDefault();
    window.close();
  }
});
button.focus();
openPlayer();
