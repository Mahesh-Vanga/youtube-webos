import { configRead, configWrite, configAddChangeListener } from './config';
import { showNotification } from './ui';

let token: number | undefined;
function updateTimer() {
  window.clearTimeout(token);
  token = undefined;
  const minutes = configRead('sleepTimerMinutes');
  if (!minutes) return;
  token = window.setTimeout(
    () => {
      const video = document.querySelector('video');
      if (video) video.pause();
      configWrite('sleepTimerMinutes', 0);
      showNotification('Sleep timer: playback paused', 3000);
    },
    minutes * 60 * 1000
  );
}
configAddChangeListener('sleepTimerMinutes', updateTimer);
updateTimer();
