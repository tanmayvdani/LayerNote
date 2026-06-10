import { layerStore } from './layer-state';
import { SyncEngineInstance } from './timestamp-engine';
import { LocalStorageManager } from '../storage/local';
import { mountSidebarUI } from './ui/sidebar';

const YT_VIDEO_SELECTOR = 'video.html5-main-video';

function waitForVideoElement(): Promise<HTMLVideoElement> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLVideoElement>(YT_VIDEO_SELECTOR);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLVideoElement>(YT_VIDEO_SELECTOR);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function injectOverlayStyles(): void {
  if (document.getElementById('layer-overlay-styles')) return;

  const style = document.createElement('style');
  style.id = 'layer-overlay-styles';
  style.textContent = `
    @keyframes layer-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function initializeLinkInterception(): void {
  window.addEventListener('yt-navigate-finish', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const sharedLayerId = urlParams.get('layer');

    if (videoId) {
      layerStore.getState().initializeForVideo(videoId, sharedLayerId);
    }
  });
}

export async function initializeExtension(): Promise<void> {
  injectOverlayStyles();
  await LocalStorageManager.runMigrationPipeline();

  initializeLinkInterception();

  const currentUrl = new URL(window.location.href);
  const videoId = currentUrl.searchParams.get('v');
  const sharedLayerId = currentUrl.searchParams.get('layer');

  if (videoId) {
    await layerStore.getState().initializeForVideo(videoId, sharedLayerId);

    const video = await waitForVideoElement();
    SyncEngineInstance.attachToPlayer(video);
    mountSidebarUI(video);
  } else {
    mountSidebarUI(null);
  }
}

initializeExtension();