import { Annotation } from '../storage/types';
import { layerStore } from './layer-state';

class HighPrecisionSyncEngine {
  private videoElement: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private shownInThisPlayback: Set<string> = new Set();
  private lastExecutedBucket: number | null = null;

  public attachToPlayer(video: HTMLVideoElement) {
    this.detach();
    this.videoElement = video;

    video.addEventListener('play', this.startLoop);
    video.addEventListener('pause', this.stopLoop);
    video.addEventListener('seeked', this.handleSeek);

    if (!video.paused) {
      this.startLoop();
    }
  }

  public detach() {
    this.stopLoop();
    if (this.videoElement) {
      this.videoElement.removeEventListener('play', this.startLoop);
      this.videoElement.removeEventListener('pause', this.stopLoop);
      this.videoElement.removeEventListener('seeked', this.handleSeek);
      this.videoElement = null;
    }
    this.shownInThisPlayback.clear();
    this.lastExecutedBucket = null;
  }

  private startLoop = () => {
    if (!this.rafId) {
      this.renderLoop();
    }
  };

  private stopLoop = () => {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  private handleSeek = () => {
    this.shownInThisPlayback.clear();
    this.lastExecutedBucket = null;
  };

  private renderLoop = () => {
    if (!this.videoElement) return;

    const currentTime = this.videoElement.currentTime;
    const currentBucket = Math.floor(currentTime);

    const state = layerStore.getState();
    const indexMap = state.timeIndexMap;

    const searchBuckets = [currentBucket - 1, currentBucket, currentBucket + 1];
    const detectedNotes: Annotation[] = [];

    for (const bucket of searchBuckets) {
      const matchSet = indexMap.get(bucket);
      if (matchSet) {
        for (const note of matchSet) {
          const delta = Math.abs(currentTime - note.timestampSeconds);
          if (delta <= 0.4 && !this.shownInThisPlayback.has(note.id)) {
            detectedNotes.push(note);
          }
        }
      }
    }

    if (detectedNotes.length > 0) {
      for (const note of detectedNotes) {
        this.shownInThisPlayback.add(note.id);
      }
      OverlayNotificationSystem.enqueue(detectedNotes);
    }

    this.lastExecutedBucket = currentBucket;
    this.rafId = requestAnimationFrame(this.renderLoop);
  };
}

export const SyncEngineInstance = new HighPrecisionSyncEngine();

class OverlayNotificationSystem {
  private static container: HTMLElement | null = null;
  private static activeToasts: Map<string, HTMLElement> = new Map();
  private static readonly MAX_VISIBLE = 3;

  public static enqueue(annotations: Annotation[]): void {
    if (!layerStore.getState().toastsVisible) return;

    this.ensureContainer();

    for (const ann of annotations) {
      if (this.activeToasts.has(ann.id)) continue;
      if (this.activeToasts.size >= this.MAX_VISIBLE) break;

      this.renderToast(ann);
    }
  }

  public static dismiss(annotationId: string): void {
    const el = this.activeToasts.get(annotationId);
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'opacity 0.2s, transform 0.2s';
      setTimeout(() => {
        el.remove();
        this.activeToasts.delete(annotationId);
      }, 200);
    }
  }

  public static hideAll(): void {
    for (const [id, el] of this.activeToasts) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'opacity 0.2s, transform 0.2s';
    }
    setTimeout(() => {
      for (const [, el] of this.activeToasts) {
        el.remove();
      }
      this.activeToasts.clear();
      if (this.container) {
        this.container.style.display = 'none';
      }
    }, 200);
  }

  public static showContainer(): void {
    this.ensureContainer();
    if (this.container) {
      this.container.style.display = '';
    }
  }

  private static ensureContainer(): void {
    if (this.container && document.contains(this.container)) return;

    const existing = document.getElementById('layer-annotation-overlay');
    if (existing) {
      this.container = existing;
      return;
    }

    const moviePlayer = document.querySelector<HTMLDivElement>('#movie_player');
    if (moviePlayer) {
      this.mountInPlayer(moviePlayer);
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'layer-annotation-overlay';
    this.container.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999!important;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:600px;width:calc(100% - 40px);';
    document.body.appendChild(this.container);

    this.observeForPlayer();
  }

  private static mountInPlayer(playerContainer: HTMLDivElement): void {
    this.container = document.createElement('div');
    this.container.id = 'layer-annotation-overlay';
    this.container.style.cssText = 'position:absolute;bottom:52px;left:12px;z-index:9999!important;display:flex;flex-direction:column-reverse;gap:6px;pointer-events:none;max-width:min(420px, calc(100% - 24px));';
    playerContainer.appendChild(this.container);
  }

  private static observeForPlayer(): void {
    const observer = new MutationObserver(() => {
      const moviePlayer = document.querySelector<HTMLDivElement>('#movie_player');
      if (moviePlayer && this.container && this.container.parentElement !== moviePlayer) {
        this.container.remove();
        this.mountInPlayer(moviePlayer);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private static renderToast(ann: Annotation): void {
    if (!this.container) return;

    const duration = ann.toastDurationSeconds * 1000;

    const toast = document.createElement('div');
    toast.id = `layer-toast-${ann.id}`;
    toast.style.cssText = 'position:relative;background:rgba(0,0,0,0.9);color:#fff;padding:10px 14px;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;pointer-events:auto;user-select:text;box-shadow:0 2px 8px rgba(0,0,0,0.5);animation:layer-toast-appear 0.25s ease-out;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);transition:opacity 0.2s,transform 0.2s;z-index:9999!important;width:fit-content;max-width:100%;';

    const timeStr = this.formatTimestamp(ann.timestampSeconds);
    const contentHtml = this.linkifyContent(ann.content);
    toast.innerHTML = `<div style="font-size:11px;color:#3ea6ff;margin-bottom:3px;font-weight:500;">${timeStr}</div><div>${contentHtml}</div>`;

    toast.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') return;
      this.dismiss(ann.id);
    });

    this.container.appendChild(toast);
    this.activeToasts.set(ann.id, toast);

    setTimeout(() => {
      this.dismiss(ann.id);
    }, duration);
  }

  private static formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private static linkifyContent(text: string): string {
    const urlPattern = /(https?:\/\/[^\s<>"')\]]+)/g;
    const escaped = OverlayNotificationSystem.escapeHtml(text);
    return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#3ea6ff;text-decoration:underline;pointer-events:auto;">$1</a>');
  }
}

export { OverlayNotificationSystem };