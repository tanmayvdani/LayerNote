import { layerStore } from '../layer-state';

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
  input.maxLength = 200;

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

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimestamp(raw: string): number {
  const parts = raw.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}