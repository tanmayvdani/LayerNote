import { layerStore } from '../layer-state';
import { formatTimestamp, parseTimestamp } from '../utils';
import { MAX_CONTENT_LENGTH } from '../constants';

let currentVideo: HTMLVideoElement | null = null;

export function renderCreateBar(video: HTMLVideoElement | null): HTMLElement {
  currentVideo = video;
  const state = layerStore.getState();
  if (state.isViewerMode) return document.createElement('div');

  const bar = document.createElement('div');
  bar.className = 'layer-create-bar';

  const tsBadge = document.createElement('button');
  tsBadge.className = 'layer-ts-badge';
  tsBadge.id = 'layer-ts-badge';
  tsBadge.textContent = video ? formatTimestamp(video.currentTime) : '0:00';
  tsBadge.title = 'Click to update to current time';
  tsBadge.addEventListener('click', () => {
    if (video) {
      tsBadge.textContent = formatTimestamp(video.currentTime);
    }
  });

  const input = document.createElement('input');
  input.id = 'layer-note-input';
  input.className = 'layer-note-input';
  input.type = 'text';
  input.placeholder = 'Add a note\u2026';
  input.maxLength = MAX_CONTENT_LENGTH;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnnotation(tsBadge, input);
    }
  });

  bar.appendChild(tsBadge);
  bar.appendChild(input);
  return bar;
}

function submitAnnotation(tsBadge: HTMLElement, input: HTMLInputElement): void {
  const content = input.value.trim();
  if (!content) return;

  let seconds = 0;
  if (currentVideo) {
    seconds = currentVideo.currentTime;
    tsBadge.textContent = formatTimestamp(seconds);
  } else {
    seconds = parseTimestamp(tsBadge.textContent || '0:00');
    if (isNaN(seconds)) seconds = 0;
  }

  layerStore.getState().addAnnotation(content, seconds);
  input.value = '';

  if (currentVideo) {
    tsBadge.textContent = formatTimestamp(currentVideo.currentTime);
  }
}