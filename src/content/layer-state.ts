import { createStore } from 'zustand/vanilla';
import { Layer, Annotation } from '../storage/types';
import { LocalStorageManager } from '../storage/local';

interface LayerState {
  videoId: string | null;
  activeLayer: Layer | null;
  annotations: Map<string, Annotation>;
  timeIndexMap: Map<number, Annotation[]>;
  isViewerMode: boolean;
  syncStatus: 'idle' | 'syncing' | 'queued' | 'error';
  lastError: string | null;
  toastDurationSeconds: number;

  initializeForVideo: (videoId: string, sharedLayerId?: string | null) => Promise<void>;
  createLayer: (title: string) => Promise<void>;
  addAnnotation: (content: string, timestampSeconds: number) => Promise<void>;
  updateAnnotation: (annotationId: string, content: string, timestampSeconds: number) => void;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  setToastDuration: (seconds: number) => void;
  reset: () => void;
  rebuildIndex: () => void;
}

export const layerStore = createStore<LayerState>((set, get) => ({
  videoId: null,
  activeLayer: null,
  annotations: new Map(),
  timeIndexMap: new Map(),
  isViewerMode: false,
  syncStatus: 'idle',
  lastError: null,
  toastDurationSeconds: 5,

  initializeForVideo: async (videoId, sharedLayerId = null) => {
    get().reset();
    set({ videoId });

    try {
      const ownerToken = await LocalStorageManager.getOwnerToken();

      if (sharedLayerId) {
        set({ syncStatus: 'syncing' });
        const remotePayload = await LocalStorageManager.fetchRemoteLayer(sharedLayerId);

        if (!remotePayload) {
          throw new Error('Shared layer payload could not be retrieved from the cloud layer.');
        }

        const isViewer = remotePayload.layer.ownerToken !== ownerToken;

        const annotationMap = new Map<string, Annotation>();
        remotePayload.annotations.forEach(ann => annotationMap.set(ann.id, ann));

        set({
          activeLayer: remotePayload.layer,
          annotations: annotationMap,
          isViewerMode: isViewer,
          syncStatus: 'idle'
        });

        await LocalStorageManager.saveLayerLocally(remotePayload.layer, remotePayload.annotations);
      } else {
        const localLayer = await LocalStorageManager.findLayerByVideo(videoId);
        if (localLayer) {
          const localAnnotations = await LocalStorageManager.getAnnotationsForLayer(localLayer.id);
          const annotationMap = new Map<string, Annotation>();
          localAnnotations.forEach(ann => annotationMap.set(ann.id, ann));

          set({
            activeLayer: localLayer,
            annotations: annotationMap,
            isViewerMode: localLayer.ownerToken !== ownerToken
          });
        }
      }

      get().rebuildIndex();
    } catch (err: any) {
      set({ lastError: err.message || 'Initialization failed', syncStatus: 'error' });
    }
  },

  createLayer: async (title) => {
    const { videoId } = get();
    if (!videoId) return;

    const sanitizedTitle = title.trim().substring(0, 100) || `Notes for video ${videoId}`;
    const ownerToken = await LocalStorageManager.getOwnerToken();

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      ownerToken,
      youtubeVideoId: videoId,
      title: sanitizedTitle,
      annotationIds: [],
      syncState: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set({ activeLayer: newLayer, annotations: new Map(), isViewerMode: false });

    await LocalStorageManager.saveLayerLocally(newLayer, []);
    LocalStorageManager.queueBackgroundSync(newLayer.id);
  },

  addAnnotation: async (content, timestampSeconds) => {
    const { activeLayer, isViewerMode } = get();
    if (!activeLayer || isViewerMode) return;

    const sanitizedContent = content.trim().substring(0, 200);
    if (sanitizedContent.length === 0) return;

    const currentAnnotations = new Map(get().annotations);
    if (currentAnnotations.size >= 5000) {
      set({ lastError: 'Layer runtime annotation safety boundary limit hit (5,000 entries max).' });
      return;
    }

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      layerId: activeLayer.id,
      timestampSeconds,
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentAnnotations.set(newAnnotation.id, newAnnotation);

    const updatedLayer = {
      ...activeLayer,
      annotationIds: [...activeLayer.annotationIds, newAnnotation.id],
      syncState: 'queued' as const,
      updatedAt: new Date().toISOString()
    };

    set({ activeLayer: updatedLayer, annotations: currentAnnotations });
    get().rebuildIndex();

    await LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(currentAnnotations.values()));
    LocalStorageManager.queueBackgroundSync(updatedLayer.id);
  },

  updateAnnotation: (annotationId, content, timestampSeconds) => {
    const { activeLayer, isViewerMode, annotations } = get();
    if (!activeLayer || isViewerMode || !annotations.has(annotationId)) return;

    const sanitizedContent = content.trim().substring(0, 200);
    if (sanitizedContent.length === 0) return;

    const existing = annotations.get(annotationId)!;
    const updated: Annotation = {
      ...existing,
      content: sanitizedContent,
      timestampSeconds,
      updatedAt: new Date().toISOString()
    };

    const currentAnnotations = new Map(annotations);
    currentAnnotations.set(annotationId, updated);

    const updatedLayer = {
      ...activeLayer,
      syncState: 'queued' as const,
      updatedAt: new Date().toISOString()
    };

    set({ activeLayer: updatedLayer, annotations: currentAnnotations });
    get().rebuildIndex();

    LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(currentAnnotations.values()));
  },

  deleteAnnotation: async (annotationId) => {
    const { activeLayer, isViewerMode, annotations } = get();
    if (!activeLayer || isViewerMode || !annotations.has(annotationId)) return;

    const currentAnnotations = new Map(annotations);
    currentAnnotations.delete(annotationId);

    const updatedLayer = {
      ...activeLayer,
      annotationIds: activeLayer.annotationIds.filter(id => id !== annotationId),
      syncState: 'queued' as const,
      updatedAt: new Date().toISOString()
    };

    set({ activeLayer: updatedLayer, annotations: currentAnnotations });
    get().rebuildIndex();

    await LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(currentAnnotations.values()));
    LocalStorageManager.queueBackgroundSync(updatedLayer.id);
  },

  setToastDuration: (seconds) => {
    const clamped = Math.min(30, Math.max(5, Math.round(seconds)));
    set({ toastDurationSeconds: clamped });
  },

  reset: () => set({
    activeLayer: null,
    annotations: new Map(),
    timeIndexMap: new Map(),
    isViewerMode: false,
    syncStatus: 'idle',
    lastError: null
  }),

  rebuildIndex: () => {
    const indexMap = new Map<number, Annotation[]>();
    get().annotations.forEach((ann) => {
      const bucket = Math.floor(ann.timestampSeconds);
      if (!indexMap.has(bucket)) {
        indexMap.set(bucket, []);
      }
      indexMap.get(bucket)!.push(ann);
    });
    set({ timeIndexMap: indexMap });
  }
}));