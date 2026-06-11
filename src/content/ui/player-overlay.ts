import { layerStore } from '../layer-state';
import { formatTimestamp } from '../utils';
import { MAX_CONTENT_LENGTH } from '../constants';

let overlayEl: HTMLElement | null = null;
let currentVideo: HTMLVideoElement | null = null;

export function setVideoRef(video: HTMLVideoElement | null): void {
  currentVideo = video;
}

export function showPlayerOverlay(): void {
  dismissPlayerOverlay();

  const moviePlayer = document.querySelector<HTMLDivElement>('#movie_player');
  if (!moviePlayer) return;

  const state = layerStore.getState();
  if (!state.activeLayer) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'layer-player-overlay';
  overlayEl.className = 'layer-player-overlay';

  const bar = document.createElement('div');
  bar.className = 'layer-player-overlay-bar';

  const tsBadge = document.createElement('button');
  tsBadge.className = 'layer-ts-badge';
  if (currentVideo) {
    tsBadge.textContent = formatTimestamp(currentVideo.currentTime);
  } else {
    tsBadge.textContent = '0:00';
  }
  tsBadge.title = 'Click to update to current time';
  tsBadge.addEventListener('click', () => {
    if (currentVideo) {
      tsBadge.textContent = formatTimestamp(currentVideo.currentTime);
    }
  });

  const input = document.createElement('input');
  input.className = 'layer-player-overlay-input';
  input.type = 'text';
  input.placeholder = 'Add a note\u2026';
  input.maxLength = MAX_CONTENT_LENGTH;

  const submit = () => {
    const content = input.value.trim();
    if (!content) {
      dismissPlayerOverlay();
      return;
    }

    let seconds = 0;
    if (currentVideo) {
      seconds = currentVideo.currentTime;
    } else {
      const parsed = parseFloat(tsBadge.textContent || '0');
      seconds = isNaN(parsed) ? 0 : parsed;
    }

    layerStore.getState().addAnnotation(content, seconds);
    dismissPlayerOverlay();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      dismissPlayerOverlay();
    }
  });

  const backdrop = document.createElement('div');
  backdrop.className = 'layer-player-overlay-backdrop';
  backdrop.addEventListener('click', () => {
    dismissPlayerOverlay();
  });

  bar.appendChild(tsBadge);
  bar.appendChild(input);
  overlayEl.appendChild(backdrop);
  overlayEl.appendChild(bar);

  moviePlayer.appendChild(overlayEl);

  requestAnimationFrame(() => {
    input.focus();
  });
}

export function dismissPlayerOverlay(): void {
  if (overlayEl && overlayEl.parentElement) {
    overlayEl.remove();
  }
  overlayEl = null;
}

export function isPlayerOverlayVisible(): boolean {
  return overlayEl !== null && document.contains(overlayEl);
}