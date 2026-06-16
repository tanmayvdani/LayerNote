import { layerStore } from './layer-state';
import { SyncEngineInstance } from './timestamp-engine';
import { LocalStorageManager } from '../storage/local';
import { mountSidebarUI, setActiveVideo } from './ui/sidebar';
import { VIDEO_SELECTOR } from './constants';

function waitForVideoElement(): Promise<HTMLVideoElement> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
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
  style.textContent = '';
  document.head.appendChild(style);
}

let lastInitializedVideoId: string | null = null;

export function initializeLinkInterception(): void {
  window.addEventListener('yt-navigate-finish', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    const sharedLayerId = urlParams.get('layer');

    if (videoId) {
      if (videoId === lastInitializedVideoId && !sharedLayerId) return;
      lastInitializedVideoId = videoId;
      layerStore.getState().initializeForVideo(videoId, sharedLayerId);

      waitForVideoElement().then((video) => {
        SyncEngineInstance.attachToPlayer(video);
        setActiveVideo(video);
      });
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
    lastInitializedVideoId = videoId;
    await layerStore.getState().initializeForVideo(videoId, sharedLayerId);

    const video = await waitForVideoElement();
    SyncEngineInstance.attachToPlayer(video);
    mountSidebarUI(video);
  } else {
    mountSidebarUI(null);
  }
}

initializeExtension();