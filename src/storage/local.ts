import { Layer, Annotation, RemoteLayerPayload, ExportV1 } from './types';

const CURRENT_STORAGE_VERSION = 3;
const API_BASE = 'https://api.layernotes.app/v1';
const DEFAULT_TOAST_DURATION = 5;

function keyForOwnerToken(): string {
  return 'ownerToken';
}

function keyForUsername(): string {
  return 'username';
}

function keyForLayer(layerId: string): string {
  return `layer:${layerId}`;
}

function keyForAnnotation(layerId: string, annotationId: string): string {
  return `annotation:${layerId}:${annotationId}`;
}

function keyForAnnotationsList(layerId: string): string {
  return `annotations:${layerId}`;
}

function keyForVideoIndex(videoId: string): string {
  return `video:${videoId}`;
}

export const LocalStorageManager = {
  async getOwnerToken(): Promise<string> {
    const result = await chrome.storage.local.get(keyForOwnerToken());
    if (result[keyForOwnerToken()]) {
      return result[keyForOwnerToken()];
    }
    const newToken = crypto.randomUUID();
    await chrome.storage.local.set({ [keyForOwnerToken()]: newToken });
    return newToken;
  },

  async getUsername(): Promise<string> {
    const result = await chrome.storage.local.get(keyForUsername());
    return result[keyForUsername()] || '';
  },

  async setUsername(name: string): Promise<void> {
    const sanitized = name.trim().substring(0, 50);
    await chrome.storage.local.set({ [keyForUsername()]: sanitized });
  },

  async findLayerByVideo(videoId: string): Promise<Layer | null> {
    const result = await chrome.storage.local.get(keyForVideoIndex(videoId));
    const layerId: string | undefined = result[keyForVideoIndex(videoId)];
    if (!layerId) return null;
    return this.getLayer(layerId);
  },

  async getLayer(layerId: string): Promise<Layer | null> {
    const result = await chrome.storage.local.get(keyForLayer(layerId));
    return result[keyForLayer(layerId)] ?? null;
  },

  async getAnnotationsForLayer(layerId: string): Promise<Annotation[]> {
    const layer = await this.getLayer(layerId);
    if (!layer) return [];

    const keys = layer.annotationIds.map(id => keyForAnnotation(layerId, id));
    if (keys.length === 0) return [];

    const result = await chrome.storage.local.get(keys);
    return keys.map(k => result[k]).filter(Boolean);
  },

  async saveLayerLocally(layer: Layer, annotations: Annotation[]): Promise<void> {
    const writes: Record<string, any> = {};

    writes[keyForLayer(layer.id)] = layer;
    writes[keyForVideoIndex(layer.youtubeVideoId)] = layer.id;

    annotations.forEach(ann => {
      writes[keyForAnnotation(layer.id, ann.id)] = ann;
    });

    await chrome.storage.local.set(writes);
  },

  async updateLayerSyncState(layerId: string, syncState: 'synced' | 'queued' | 'error'): Promise<void> {
    const layer = await this.getLayer(layerId);
    if (!layer) return;

    layer.syncState = syncState;
    layer.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ [keyForLayer(layerId)]: layer });
  },

  async getUnsyncedLayers(): Promise<Layer[]> {
    const allData = await chrome.storage.local.get(null);
    const layers: Layer[] = [];

    for (const key of Object.keys(allData)) {
      if (key.startsWith('layer:') && allData[key].syncState !== 'synced') {
        layers.push(allData[key]);
      }
    }

    return layers;
  },

  async fetchRemoteLayer(layerId: string): Promise<RemoteLayerPayload | null> {
    try {
      const response = await fetch(`${API_BASE}/layers/${layerId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  queueBackgroundSync(_layerId: string): void {
    try {
      chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC' });
    } catch {
      // Extension context may be invalidated
    }
  },

  async runMigrationPipeline(): Promise<void> {
    const data = await chrome.storage.local.get('storageVersion');
    const currentVersion = data.storageVersion ? Number(data.storageVersion) : 1;

    if (currentVersion >= CURRENT_STORAGE_VERSION) return;

    let migratoryState = await chrome.storage.local.get(null);

    if (currentVersion === 1) {
      migratoryState = this.migrateV1ToV2(migratoryState);
    }

    if (currentVersion < 3) {
      migratoryState = this.migrateV2ToV3(migratoryState);
    }

    migratoryState.storageVersion = CURRENT_STORAGE_VERSION;
    await chrome.storage.local.set(migratoryState);
  },

  migrateV2ToV3(oldState: Record<string, any>): Record<string, any> {
    const updatedState = { ...oldState };
    const keys = Object.keys(oldState);

    for (const key of keys) {
      if (key.startsWith('layer:')) {
        const layer = oldState[key];
        if (layer && !('ownerName' in layer)) {
          updatedState[key] = { ...layer, ownerName: '' };
        }
      }
      if (key.startsWith('annotation:')) {
        const ann = oldState[key];
        if (ann && !('toastDurationSeconds' in ann)) {
          updatedState[key] = { ...ann, toastDurationSeconds: DEFAULT_TOAST_DURATION };
        }
      }
    }

    return updatedState;
  },

  migrateV1ToV2(oldState: Record<string, any>): Record<string, any> {
    const updatedState = { ...oldState };
    const keys = Object.keys(oldState);

    keys.forEach(key => {
      if (key.startsWith('annotations:')) {
        const layerId = key.split(':')[1];
        const rawArray = oldState[key] as any[];

        delete updatedState[key];

        const indexKey = `layer:${layerId}`;
        if (updatedState[indexKey]) {
          updatedState[indexKey].annotationIds = rawArray.map(a => a.id);
        }

        rawArray.forEach(annotation => {
          updatedState[`annotation:${layerId}:${annotation.id}`] = annotation;
        });
      }
    });

    return updatedState;
  },

  async exportLayer(layerId: string): Promise<ExportV1 | null> {
    const layer = await this.getLayer(layerId);
    if (!layer) return null;
    const annotations = await this.getAnnotationsForLayer(layerId);
    return { version: 3, layer, annotations };
  },

  async importLayer(payload: ExportV1): Promise<void> {
    const totalSize = JSON.stringify(payload).length;
    if (totalSize > 2 * 1024 * 1024) {
      throw new Error('Imported file exceeds 2 MB safety boundary.');
    }

    const layer = payload.layer;
    layer.annotationIds = payload.annotations.map(a => a.id);
    layer.syncState = 'queued';
    layer.updatedAt = new Date().toISOString();
    if (!layer.ownerName) {
      layer.ownerName = '';
    }
    const annotations = payload.annotations.map(a => ({
      ...a,
      toastDurationSeconds: a.toastDurationSeconds ?? DEFAULT_TOAST_DURATION,
    }));
    await this.saveLayerLocally(layer, annotations);
    this.queueBackgroundSync(layer.id);
  }
};