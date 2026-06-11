import { Layer, Annotation, RemoteLayerPayload, ExportData, PublicLayerSummary, SharedLayerEntry, SupabaseAnnotationRow } from './types';
import { supabase } from './supabase';
import { MAX_USERNAME_LENGTH, MAX_IMPORT_SIZE_BYTES, DEFAULT_IS_PUBLIC } from '../content/constants';

const CURRENT_STORAGE_VERSION = 4;
const DEFAULT_TOAST_DURATION = 5;

function keyForOwnerToken(): string {
  return 'ownerToken';
}

function keyForUsername(): string {
  return 'username';
}

function keyForDefaultPublic(): string {
  return 'defaultIsPublic';
}

function keyForSharedLayerIds(): string {
  return 'sharedLayerIds';
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
    const sanitized = name.trim().substring(0, MAX_USERNAME_LENGTH);
    await chrome.storage.local.set({ [keyForUsername()]: sanitized });
  },

  async getDefaultIsPublic(): Promise<boolean> {
    const result = await chrome.storage.local.get(keyForDefaultPublic());
    return result[keyForDefaultPublic()] ?? DEFAULT_IS_PUBLIC;
  },

  async setDefaultIsPublic(val: boolean): Promise<void> {
    await chrome.storage.local.set({ [keyForDefaultPublic()]: val });
  },

  async getSharedLayerIds(): Promise<string[]> {
    const result = await chrome.storage.local.get(keyForSharedLayerIds());
    return result[keyForSharedLayerIds()] || [];
  },

  async setSharedLayerIds(ids: string[]): Promise<void> {
    await chrome.storage.local.set({ [keyForSharedLayerIds()]: ids });
  },

  async addSharedLayerId(layerId: string): Promise<void> {
    const ids = await this.getSharedLayerIds();
    if (!ids.includes(layerId)) {
      ids.push(layerId);
      await this.setSharedLayerIds(ids);
    }
  },

  async removeSharedLayerId(layerId: string): Promise<void> {
    const ids = await this.getSharedLayerIds();
    const filtered = ids.filter(id => id !== layerId);
    await this.setSharedLayerIds(filtered);
  },

  async findLayerByVideo(videoId: string): Promise<Layer | null> {
    const result = await chrome.storage.local.get(keyForVideoIndex(videoId));
    const layerId: string | undefined = result[keyForVideoIndex(videoId)];
    if (!layerId) return null;
    return this.getLayer(layerId);
  },

  async findOwnLayerByVideo(videoId: string, ownerToken: string): Promise<Layer | null> {
    const allData = await chrome.storage.local.get(null);
    for (const key of Object.keys(allData)) {
      if (key.startsWith('layer:')) {
        const layer = allData[key] as Layer;
        if (layer.youtubeVideoId === videoId && layer.ownerToken === ownerToken) {
          return layer;
        }
      }
    }
    return null;
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
    const writes: Record<string, Layer | Annotation | string | boolean> = {};

    writes[keyForLayer(layer.id)] = layer;

    if (layer.ownerToken === (await this.getOwnerToken())) {
      writes[keyForVideoIndex(layer.youtubeVideoId)] = layer;
    }

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

  async fetchRemoteLayer(layerIdOrSlug: string): Promise<RemoteLayerPayload | null> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(layerIdOrSlug);

      let query = supabase.from('layers').select('*');

      if (isUuid) {
        query = query.eq('id', layerIdOrSlug);
      } else {
        query = query.eq('slug', layerIdOrSlug);
      }

      const { data: layerData, error: layerError } = await query.single();

      if (layerError) {
        console.error('[LocalStorageManager] Supabase layer error:', JSON.stringify(layerError));
        return null;
      }
      if (!layerData) {
        console.warn('[LocalStorageManager] No layer data found for:', layerIdOrSlug);
        return null;
      }

      const layerId = layerData.id;

      const { data: annData, error: annError } = await supabase
        .from('annotations')
        .select('*')
        .eq('layer_id', layerId);

      if (annError) {
        console.error('[LocalStorageManager] Supabase annotations error:', annError);
        return null;
      }

      const typedAnnData: SupabaseAnnotationRow[] = (annData ?? []) as SupabaseAnnotationRow[];

      const layer: Layer = {
        id: layerData.id,
        ownerToken: layerData.owner_token,
        ownerName: layerData.owner_name || '',
        youtubeVideoId: layerData.video_id,
        title: layerData.title,
        annotationIds: typedAnnData.map(a => a.id),
        syncState: 'synced',
        isPublic: layerData.is_public ?? false,
        likeCount: layerData.like_count ?? 0,
        dislikeCount: layerData.dislike_count ?? 0,
        createdAt: layerData.created_at,
        updatedAt: layerData.updated_at
      };

      const annotations: Annotation[] = typedAnnData.map(a => ({
        id: a.id,
        layerId: a.layer_id,
        timestampSeconds: a.timestamp_seconds,
        content: a.content,
        toastDurationSeconds: a.toast_duration_seconds,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));

      return { layer, annotations };
    } catch (err) {
      console.error('[LocalStorageManager] fetchRemoteLayer failed:', err);
      return null;
    }
  },

  async fetchPublicLayers(videoId: string, ownerToken: string): Promise<PublicLayerSummary[]> {
    try {
      const { data: layerData, error: layerError } = await supabase
        .from('layers')
        .select('id, owner_token, owner_name, video_id, title, is_public, like_count, dislike_count, created_at, updated_at')
        .eq('video_id', videoId)
        .eq('is_public', true)
        .neq('owner_token', ownerToken);

      if (layerError || !layerData) {
        console.error('[LocalStorageManager] fetchPublicLayers error:', layerError);
        return [];
      }

      const summaries: PublicLayerSummary[] = [];

      for (const ld of layerData) {
        const { count, error: countError } = await supabase
          .from('annotations')
          .select('*', { count: 'exact', head: true })
          .eq('layer_id', ld.id);

        const { data: reactionData } = await supabase
          .from('layer_reactions')
          .select('reaction_type')
          .eq('layer_id', ld.id)
          .eq('owner_token', ownerToken)
          .maybeSingle();

        summaries.push({
          layer: {
            id: ld.id,
            ownerToken: ld.owner_token,
            ownerName: ld.owner_name || '',
            youtubeVideoId: ld.video_id,
            title: ld.title,
            annotationIds: [],
            syncState: 'synced',
            isPublic: ld.is_public,
            likeCount: ld.like_count ?? 0,
            dislikeCount: ld.dislike_count ?? 0,
            createdAt: ld.created_at,
            updatedAt: ld.updated_at
          },
          annotationCount: countError ? 0 : (count ?? 0),
          userReaction: reactionData ? reactionData.reaction_type as 'like' | 'dislike' : null
        });
      }

      summaries.sort((a, b) => (b.layer.likeCount - b.layer.dislikeCount) - (a.layer.likeCount - a.layer.dislikeCount));

      return summaries;
    } catch (err) {
      console.error('[LocalStorageManager] fetchPublicLayers failed:', err);
      return [];
    }
  },

  async fetchPublicLayerAnnotations(layerId: string): Promise<Annotation[]> {
    try {
      const { data: annData, error: annError } = await supabase
        .from('annotations')
        .select('*')
        .eq('layer_id', layerId);

      if (annError || !annData) return [];

      return (annData as SupabaseAnnotationRow[]).map(a => ({
        id: a.id,
        layerId: a.layer_id,
        timestampSeconds: a.timestamp_seconds,
        content: a.content,
        toastDurationSeconds: a.toast_duration_seconds,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
    } catch {
      return [];
    }
  },

  async toggleReaction(layerId: string, ownerToken: string, reactionType: 'like' | 'dislike'): Promise<{ likeCount: number; dislikeCount: number; userReaction: 'like' | 'dislike' | null }> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('layer_reactions')
        .select('id, reaction_type')
        .eq('layer_id', layerId)
        .eq('owner_token', ownerToken)
        .maybeSingle();

      if (fetchError) {
        console.error('[LocalStorageManager] toggleReaction fetch error:', fetchError.message, fetchError.details, fetchError.hint);
        return { likeCount: 0, dislikeCount: 0, userReaction: null };
      }

      let finalReaction: 'like' | 'dislike' | null = reactionType;

      if (existing) {
        if (existing.reaction_type === reactionType) {
          const { error: deleteError } = await supabase
            .from('layer_reactions')
            .delete()
            .eq('id', existing.id);
          if (deleteError) console.error('[LocalStorageManager] toggleReaction delete error:', deleteError.message, deleteError.details);
          finalReaction = null;
        } else {
          const { error: updateError } = await supabase
            .from('layer_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id);
          if (updateError) console.error('[LocalStorageManager] toggleReaction update error:', updateError.message, updateError.details);
        }
      } else {
        const { error: insertError } = await supabase
          .from('layer_reactions')
          .insert({ layer_id: layerId, owner_token: ownerToken, reaction_type: reactionType });
        if (insertError) console.error('[LocalStorageManager] toggleReaction insert error:', insertError.message, insertError.details);
      }

      const { count: lc } = await supabase
        .from('layer_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('layer_id', layerId)
        .eq('reaction_type', 'like');

      const { count: dc } = await supabase
        .from('layer_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('layer_id', layerId)
        .eq('reaction_type', 'dislike');

      const likeCount = lc ?? 0;
      const dislikeCount = dc ?? 0;

      await supabase
        .from('layers')
        .update({ like_count: likeCount, dislike_count: dislikeCount })
        .eq('id', layerId);

      return { likeCount, dislikeCount, userReaction: finalReaction };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[LocalStorageManager] toggleReaction failed:', message);
      return { likeCount: 0, dislikeCount: 0, userReaction: null };
    }
  },

  async setLayerPublicRemote(layerId: string, isPublic: boolean): Promise<void> {
    await supabase
      .from('layers')
      .update({ is_public: isPublic })
      .eq('id', layerId);
  },

  queueBackgroundSync(_layerId: string): void {
    try {
      chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC' });
    } catch {
      /* Extension context may be invalidated — intentional no-op */
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

    if (currentVersion < 4) {
      migratoryState = this.migrateV3ToV4(migratoryState);
    }

    migratoryState.storageVersion = CURRENT_STORAGE_VERSION;
    await chrome.storage.local.set(migratoryState);
  },

  migrateV3ToV4(oldState: Record<string, unknown>): Record<string, unknown> {
    const updatedState = { ...oldState };
    const keys = Object.keys(oldState);

    for (const key of keys) {
      if (key.startsWith('layer:')) {
        const layer = oldState[key] as Record<string, unknown> | undefined;
        if (layer) {
          const patch: Record<string, unknown> = {};
          if (!('isPublic' in layer)) patch.isPublic = DEFAULT_IS_PUBLIC;
          if (!('likeCount' in layer)) patch.likeCount = 0;
          if (!('dislikeCount' in layer)) patch.dislikeCount = 0;
          if (Object.keys(patch).length > 0) {
            updatedState[key] = { ...layer, ...patch };
          }
        }
      }
    }

    if (!updatedState.sharedLayerIds) {
      updatedState.sharedLayerIds = [];
    }

    return updatedState;
  },

  migrateV2ToV3(oldState: Record<string, unknown>): Record<string, unknown> {
    const updatedState = { ...oldState };
    const keys = Object.keys(oldState);

    for (const key of keys) {
      if (key.startsWith('layer:')) {
        const layer = oldState[key] as Record<string, unknown> | undefined;
        if (layer && !('ownerName' in layer)) {
          updatedState[key] = { ...layer, ownerName: '' };
        }
      }
      if (key.startsWith('annotation:')) {
        const ann = oldState[key] as Record<string, unknown> | undefined;
        if (ann && !('toastDurationSeconds' in ann)) {
          updatedState[key] = { ...ann, toastDurationSeconds: DEFAULT_TOAST_DURATION };
        }
      }
    }

    return updatedState;
  },

  migrateV1ToV2(oldState: Record<string, unknown>): Record<string, unknown> {
    const updatedState = { ...oldState };
    const keys = Object.keys(oldState);

    keys.forEach(key => {
      if (key.startsWith('annotations:')) {
        const layerId = key.split(':')[1];
        const rawArray = oldState[key] as unknown[];

        delete updatedState[key];

        const indexKey = `layer:${layerId}`;
        const existing = updatedState[indexKey] as Record<string, unknown> | undefined;
        if (existing) {
          updatedState[indexKey] = { ...existing, annotationIds: rawArray.map(a => ((a as Record<string, unknown>) as { id: string }).id) };
        }

        rawArray.forEach((annotation: unknown) => {
          const ann = annotation as Record<string, unknown>;
          const annId = (ann as { id: string }).id;
          updatedState[`annotation:${layerId}:${annId}`] = ann;
        });
      }
    });

    return updatedState;
  },

  async exportLayer(layerId: string): Promise<ExportData | null> {
    const layer = await this.getLayer(layerId);
    if (!layer) return null;
    const annotations = await this.getAnnotationsForLayer(layerId);
    return { version: 4, layer, annotations };
  },

  async importLayer(payload: ExportData): Promise<void> {
    const totalSize = JSON.stringify(payload).length;
    if (totalSize > MAX_IMPORT_SIZE_BYTES) {
      throw new Error('Imported file exceeds 2 MB safety boundary.');
    }

    const layer = payload.layer;
    layer.annotationIds = payload.annotations.map(a => a.id);
    layer.syncState = 'queued';
    layer.updatedAt = new Date().toISOString();
    if (!layer.ownerName) {
      layer.ownerName = '';
    }
    if (layer.isPublic === undefined) {
      layer.isPublic = DEFAULT_IS_PUBLIC;
    }
    if (layer.likeCount === undefined) {
      layer.likeCount = 0;
    }
    if (layer.dislikeCount === undefined) {
      layer.dislikeCount = 0;
    }
    const annotations = payload.annotations.map(a => ({
      ...a,
      toastDurationSeconds: a.toastDurationSeconds ?? DEFAULT_TOAST_DURATION,
    }));
    await this.saveLayerLocally(layer, annotations);
    this.queueBackgroundSync(layer.id);
  }
};