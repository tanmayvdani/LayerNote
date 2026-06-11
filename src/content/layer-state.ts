import { createStore } from 'zustand/vanilla';
import { Layer, Annotation, ActiveTab, PublicLayerSummary, SharedLayerEntry } from '../storage/types';
import { LocalStorageManager } from '../storage/local';
import { buildAnnotationMap } from './utils';
import { MAX_ANNOTATIONS_PER_LAYER, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, TOAST_DURATION_MIN, TOAST_DURATION_MAX, MAX_USERNAME_LENGTH, DEFAULT_IS_PUBLIC } from './constants';

interface LayerState {
  videoId: string | null;
  activeLayer: Layer | null;
  annotations: Map<string, Annotation>;
  timeIndexMap: Map<number, Annotation[]>;
  activeTab: ActiveTab;
  sharedLayers: Map<string, SharedLayerEntry>;
  publicLayers: PublicLayerSummary[];
  expandedPublicLayerId: string | null;
  expandedPublicAnnotations: Annotation[];
  syncStatus: 'idle' | 'syncing' | 'queued' | 'error';
  lastError: string | null;
  toastDurationSeconds: number;
  username: string;
  toastsVisible: boolean;
  defaultIsPublic: boolean;

  initializeForVideo: (videoId: string, sharedLayerId?: string | null) => Promise<void>;
  createLayer: (title: string) => Promise<void>;
  addAnnotation: (content: string, timestampSeconds: number) => Promise<void>;
  updateAnnotation: (annotationId: string, content: string, timestampSeconds: number) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  setToastDuration: (seconds: number) => void;
  setUsername: (name: string) => Promise<void>;
  toggleToastsVisible: () => void;
  reset: () => void;
  rebuildIndex: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  addSharedLayer: (layerId: string) => Promise<void>;
  removeSharedLayer: (layerId: string) => Promise<void>;
  likeLayer: (layerId: string) => Promise<void>;
  dislikeLayer: (layerId: string) => Promise<void>;
  toggleLayerPublic: () => Promise<void>;
  setDefaultIsPublic: (val: boolean) => Promise<void>;
  loadPublicLayers: () => Promise<void>;
  expandPublicLayer: (layerId: string) => Promise<void>;
  collapsePublicLayer: () => void;
  switchToOwnLayer: () => Promise<void>;
  switchToSharedLayer: () => Promise<void>;
}

export const layerStore = createStore<LayerState>((set, get) => ({
  videoId: null,
  activeLayer: null,
  annotations: new Map(),
  timeIndexMap: new Map(),
  activeTab: 'own',
  sharedLayers: new Map(),
  publicLayers: [],
  expandedPublicLayerId: null,
  expandedPublicAnnotations: [],
  syncStatus: 'idle',
  lastError: null,
  toastDurationSeconds: TOAST_DURATION_MIN,
  username: '',
  toastsVisible: true,
  defaultIsPublic: DEFAULT_IS_PUBLIC,

  initializeForVideo: async (videoId, sharedLayerId = null) => {
    get().reset();
    set({ videoId });

    try {
      const ownerToken = await LocalStorageManager.getOwnerToken();
      const storedUsername = await LocalStorageManager.getUsername();
      const storedDefaultPublic = await LocalStorageManager.getDefaultIsPublic();
      set({ username: storedUsername, defaultIsPublic: storedDefaultPublic });

      const ownLayer = await LocalStorageManager.findOwnLayerByVideo(videoId, ownerToken);

      if (ownLayer) {
        const ownAnnotations = await LocalStorageManager.getAnnotationsForLayer(ownLayer.id);
        const ownAnnotationMap = buildAnnotationMap(ownAnnotations);
        set({
          activeLayer: ownLayer,
          annotations: ownAnnotationMap,
          activeTab: 'own'
        });
      }

      if (sharedLayerId) {
        set({ syncStatus: 'syncing' });
        const remotePayload = await LocalStorageManager.fetchRemoteLayer(sharedLayerId);

        if (remotePayload) {
          const isOwnLayer = remotePayload.layer.ownerToken === ownerToken;

          if (isOwnLayer) {
            const ownAnnotations = buildAnnotationMap(remotePayload.annotations);
            set({
              activeLayer: remotePayload.layer,
              annotations: ownAnnotations,
              activeTab: 'own'
            });
          } else {
            const sharedEntry: SharedLayerEntry = {
              layer: remotePayload.layer,
              annotations: remotePayload.annotations
            };
            const currentShared = new Map(get().sharedLayers);
            currentShared.set(remotePayload.layer.id, sharedEntry);
            set({ sharedLayers: currentShared, syncStatus: 'idle' });

            if (!ownLayer) {
              set({
                activeLayer: remotePayload.layer,
                annotations: buildAnnotationMap(remotePayload.annotations),
                activeTab: sharedLayerId ? 'shared' : 'own'
              });
            }
          }

          await LocalStorageManager.saveLayerLocally(remotePayload.layer, remotePayload.annotations);
          await LocalStorageManager.addSharedLayerId(remotePayload.layer.id);
        } else {
          const localLayer = await LocalStorageManager.getLayer(sharedLayerId);
          if (localLayer && localLayer.youtubeVideoId === videoId) {
            const localAnnotations = await LocalStorageManager.getAnnotationsForLayer(localLayer.id);
            const isOwnLayer = localLayer.ownerToken === ownerToken;

            if (isOwnLayer) {
              set({
                activeLayer: localLayer,
                annotations: buildAnnotationMap(localAnnotations),
                activeTab: 'own'
              });
            } else {
              const sharedEntry: SharedLayerEntry = {
                layer: localLayer,
                annotations: localAnnotations
              };
              const currentShared = new Map(get().sharedLayers);
              currentShared.set(localLayer.id, sharedEntry);
              set({ sharedLayers: currentShared });

              if (!ownLayer) {
                set({
                  activeLayer: localLayer,
                  annotations: buildAnnotationMap(localAnnotations),
                  activeTab: 'shared'
                });
              }
            }
          } else {
            set({ syncStatus: 'error', lastError: 'Could not load shared layer.' });
          }
        }
      }

      const persistedSharedIds = await LocalStorageManager.getSharedLayerIds();
      for (const sid of persistedSharedIds) {
        if (sid === sharedLayerId) continue;
        const remotePayload = await LocalStorageManager.fetchRemoteLayer(sid);
        if (remotePayload) {
          const currentShared = new Map(get().sharedLayers);
          currentShared.set(remotePayload.layer.id, {
            layer: remotePayload.layer,
            annotations: remotePayload.annotations
          });
          set({ sharedLayers: currentShared });
          await LocalStorageManager.saveLayerLocally(remotePayload.layer, remotePayload.annotations);
        }
      }

      get().rebuildIndex();
    } catch (err: unknown) {
      set({ lastError: err instanceof Error ? err.message : String(err), syncStatus: 'error' });
    }
  },

  createLayer: async (title) => {
    const { videoId, defaultIsPublic } = get();
    if (!videoId) return;

    const sanitizedTitle = title.trim().substring(0, MAX_TITLE_LENGTH) || `Notes for video ${videoId}`;
    const ownerToken = await LocalStorageManager.getOwnerToken();
    const currentUsername = get().username;

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      ownerToken,
      ownerName: currentUsername,
      youtubeVideoId: videoId,
      title: sanitizedTitle,
      annotationIds: [],
      syncState: 'queued',
      isPublic: defaultIsPublic,
      likeCount: 0,
      dislikeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set({
      activeLayer: newLayer,
      annotations: new Map(),
      activeTab: 'own'
    });

    await LocalStorageManager.saveLayerLocally(newLayer, []);
    LocalStorageManager.queueBackgroundSync(newLayer.id);
  },

  addAnnotation: async (content, timestampSeconds) => {
    const { activeLayer } = get();
    if (!activeLayer) return;

    const sanitizedContent = content.trim().substring(0, MAX_CONTENT_LENGTH);
    if (sanitizedContent.length === 0) return;

    const currentAnnotations = new Map(get().annotations);
    if (currentAnnotations.size >= MAX_ANNOTATIONS_PER_LAYER) {
      set({ lastError: `Layer runtime annotation safety boundary limit hit (${MAX_ANNOTATIONS_PER_LAYER.toLocaleString()} entries max).` });
      return;
    }

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      layerId: activeLayer.id,
      timestampSeconds,
      content: sanitizedContent,
      toastDurationSeconds: get().toastDurationSeconds,
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

  updateAnnotation: async (annotationId, content, timestampSeconds) => {
    const { activeLayer, annotations } = get();
    if (!activeLayer || !annotations.has(annotationId)) return;

    const sanitizedContent = content.trim().substring(0, MAX_CONTENT_LENGTH);
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

    await LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(currentAnnotations.values()));
  },

  deleteAnnotation: async (annotationId) => {
    const { activeLayer, annotations } = get();
    if (!activeLayer || !annotations.has(annotationId)) return;

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
    const clamped = Math.min(TOAST_DURATION_MAX, Math.max(TOAST_DURATION_MIN, Math.round(seconds)));
    set({ toastDurationSeconds: clamped });
  },

  setUsername: async (name) => {
    const sanitized = name.trim().substring(0, MAX_USERNAME_LENGTH);
    set({ username: sanitized });
    await LocalStorageManager.setUsername(sanitized);

    const { activeLayer } = get();
    if (activeLayer) {
      const updatedLayer = {
        ...activeLayer,
        ownerName: sanitized,
        syncState: 'queued' as const,
        updatedAt: new Date().toISOString()
      };
      set({ activeLayer: updatedLayer });
      await LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(get().annotations.values()));
      LocalStorageManager.queueBackgroundSync(updatedLayer.id);
    }
  },

  toggleToastsVisible: () => {
    set({ toastsVisible: !get().toastsVisible });
  },

  reset: () => set({
    videoId: null,
    activeLayer: null,
    annotations: new Map(),
    timeIndexMap: new Map(),
    activeTab: 'own',
    sharedLayers: new Map(),
    publicLayers: [],
    expandedPublicLayerId: null,
    expandedPublicAnnotations: [],
    syncStatus: 'idle',
    lastError: null,
    toastDurationSeconds: TOAST_DURATION_MIN,
    username: '',
    toastsVisible: true,
    defaultIsPublic: DEFAULT_IS_PUBLIC
  }),

  rebuildIndex: () => {
    const indexMap = new Map<number, Annotation[]>();

    const ownAnnotations = Array.from(get().annotations.values());
    for (const ann of ownAnnotations) {
      const bucket = Math.floor(ann.timestampSeconds);
      if (!indexMap.has(bucket)) indexMap.set(bucket, []);
      indexMap.get(bucket)!.push(ann);
    }

    for (const [, entry] of get().sharedLayers) {
      for (const ann of entry.annotations) {
        const bucket = Math.floor(ann.timestampSeconds);
        if (!indexMap.has(bucket)) indexMap.set(bucket, []);
        indexMap.get(bucket)!.push(ann);
      }
    }

    set({ timeIndexMap: indexMap });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  addSharedLayer: async (layerId) => {
    const { sharedLayers, videoId } = get();
    if (sharedLayers.has(layerId)) return;

    set({ syncStatus: 'syncing' });
    const remotePayload = await LocalStorageManager.fetchRemoteLayer(layerId);

    if (remotePayload) {
      const currentShared = new Map(sharedLayers);
      currentShared.set(remotePayload.layer.id, {
        layer: remotePayload.layer,
        annotations: remotePayload.annotations
      });
      set({ sharedLayers: currentShared, syncStatus: 'idle' });
      await LocalStorageManager.saveLayerLocally(remotePayload.layer, remotePayload.annotations);
      await LocalStorageManager.addSharedLayerId(remotePayload.layer.id);
      get().rebuildIndex();
    } else {
      set({ syncStatus: 'error', lastError: 'Could not load shared layer.' });
    }
  },

  removeSharedLayer: async (layerId) => {
    const currentShared = new Map(get().sharedLayers);
    currentShared.delete(layerId);
    set({ sharedLayers: currentShared });
    await LocalStorageManager.removeSharedLayerId(layerId);
    get().rebuildIndex();
  },

  likeLayer: async (layerId) => {
    const ownerToken = await LocalStorageManager.getOwnerToken();
    const result = await LocalStorageManager.toggleReaction(layerId, ownerToken, 'like');
    const { publicLayers } = get();
    const updated = publicLayers.map(pl =>
      pl.layer.id === layerId
        ? { ...pl, layer: { ...pl.layer, likeCount: result.likeCount, dislikeCount: result.dislikeCount }, userReaction: result.userReaction }
        : pl
    );
    set({ publicLayers: updated });
  },

  dislikeLayer: async (layerId) => {
    const ownerToken = await LocalStorageManager.getOwnerToken();
    const result = await LocalStorageManager.toggleReaction(layerId, ownerToken, 'dislike');
    const { publicLayers } = get();
    const updated = publicLayers.map(pl =>
      pl.layer.id === layerId
        ? { ...pl, layer: { ...pl.layer, likeCount: result.likeCount, dislikeCount: result.dislikeCount }, userReaction: result.userReaction }
        : pl
    );
    set({ publicLayers: updated });
  },

  toggleLayerPublic: async () => {
    const { activeLayer } = get();
    if (!activeLayer) return;

    const newPublic = !activeLayer.isPublic;
    const updatedLayer = {
      ...activeLayer,
      isPublic: newPublic,
      syncState: 'queued' as const,
      updatedAt: new Date().toISOString()
    };
    set({ activeLayer: updatedLayer });

    await LocalStorageManager.saveLayerLocally(updatedLayer, Array.from(get().annotations.values()));
    LocalStorageManager.queueBackgroundSync(updatedLayer.id);
    await LocalStorageManager.setLayerPublicRemote(updatedLayer.id, newPublic);
  },

  setDefaultIsPublic: async (val) => {
    set({ defaultIsPublic: val });
    await LocalStorageManager.setDefaultIsPublic(val);
  },

  loadPublicLayers: async () => {
    const { videoId } = get();
    if (!videoId) return;

    const ownerToken = await LocalStorageManager.getOwnerToken();
    const result = await LocalStorageManager.fetchPublicLayers(videoId, ownerToken);
    set({ publicLayers: result });
  },

  expandPublicLayer: async (layerId) => {
    const annotations = await LocalStorageManager.fetchPublicLayerAnnotations(layerId);
    set({ expandedPublicLayerId: layerId, expandedPublicAnnotations: annotations });
  },

  collapsePublicLayer: () => {
    set({ expandedPublicLayerId: null, expandedPublicAnnotations: [] });
  },

  switchToOwnLayer: async () => {
    const { videoId } = get();
    if (!videoId) return;

    const ownerToken = await LocalStorageManager.getOwnerToken();
    const ownLayer = await LocalStorageManager.findOwnLayerByVideo(videoId, ownerToken);

    if (!ownLayer) {
      await get().createLayer('');
      return;
    }

    const ownAnnotations = await LocalStorageManager.getAnnotationsForLayer(ownLayer.id);
    const ownAnnotationMap = buildAnnotationMap(ownAnnotations);

    set({
      activeLayer: ownLayer,
      annotations: ownAnnotationMap,
      activeTab: 'own'
    });

    get().rebuildIndex();
  },

  switchToSharedLayer: async () => {
    const { sharedLayers, videoId } = get();
    if (sharedLayers.size === 0) return;

    if (sharedLayers.size === 1) {
      const entry = Array.from(sharedLayers.values())[0];
      set({
        activeLayer: entry.layer,
        annotations: buildAnnotationMap(entry.annotations),
        activeTab: 'shared'
      });
      get().rebuildIndex();
    } else {
      set({ activeTab: 'shared' });
    }
  }
}));