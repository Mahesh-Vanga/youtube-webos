import { configRead, configAddChangeListener } from './config';
import { requireElement } from './player_api/helpers';
import { videoRectangle, type Framing } from './video-framing';

const style = document.createElement('style');
document.head.appendChild(style);
let video: HTMLVideoElement | null = null;
let pending = false;

function applyFraming() {
  pending = false;
  let css = '';
  // YouTube moves/hides the video for previews and navigation. Do not override
  // its hidden state or resize recommendations, controls, captions or dialogs.
  if (
    video &&
    document.body.classList.contains('WEB_PAGE_TYPE_WATCH') &&
    video.style.display !== 'none' &&
    !video.style.top.startsWith('-')
  ) {
    const rectangle = videoRectangle(
      window.innerWidth,
      window.innerHeight,
      video.videoWidth,
      video.videoHeight,
      configRead('screenFit') as Framing,
      configRead('videoZoom')
    );
    if (rectangle) {
      css = `body.WEB_PAGE_TYPE_WATCH video[data-ytaf-picture] {
        width: ${rectangle.width}px !important; height: ${rectangle.height}px !important;
        left: ${rectangle.left}px !important; top: ${rectangle.top}px !important;
      }`;
    }
  }
  // Do not write the video inline style: YouTube owns it, and the existing
  // screensaver fix observes it. A separate rule avoids observer feedback loops.
  if (style.textContent !== css) style.textContent = css;
}

function schedule() {
  if (pending) return;
  pending = true;
  window.requestAnimationFrame(applyFraming);
}

configAddChangeListener('screenFit', schedule);
configAddChangeListener('videoZoom', schedule);
window.addEventListener('resize', schedule);
new MutationObserver(schedule).observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});

async function attach() {
  video = await requireElement('video', HTMLVideoElement);
  video.setAttribute('data-ytaf-picture', '');
  video.addEventListener('loadedmetadata', schedule);
  video.addEventListener('resize', schedule);
  new MutationObserver(schedule).observe(video, {
    attributes: true,
    attributeFilter: ['style']
  });
  schedule();
}

attach().catch((error) => console.warn('Picture framing unavailable:', error));
