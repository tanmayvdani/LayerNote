import { LocalStorageManager } from '../storage/local';
import { supabase } from '../storage/supabase';
import { SYNC_ALARM_PERIOD_MINUTES } from '../content/constants';

chrome.runtime.onInstalled.addListener(async () => {
  await LocalStorageManager.runMigrationPipeline();
});

chrome.alarms.create('sync_retry_alarm', { periodInMinutes: SYNC_ALARM_PERIOD_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync_retry_alarm') {
    await processOutboundSyncQueue();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRIGGER_SYNC') {
    processOutboundSyncQueue();
  }
});

async function processOutboundSyncQueue(): Promise<void> {
  const pendingLayers = await LocalStorageManager.getUnsyncedLayers();

  for (const layer of pendingLayers) {
    try {
      const annotations = await LocalStorageManager.getAnnotationsForLayer(layer.id);

      const isPublic = layer.isPublic ?? false;
      const likeCount = layer.likeCount ?? 0;
      const dislikeCount = layer.dislikeCount ?? 0;

      const { error: layerError } = await supabase
        .from('layers')
        .upsert({
          id: layer.id,
          owner_token: layer.ownerToken,
          owner_name: layer.ownerName || '',
          video_id: layer.youtubeVideoId,
          title: layer.title,
          is_public: isPublic,
          like_count: likeCount,
          dislike_count: dislikeCount,
          updated_at: new Date().toISOString()
        });

      if (layerError) {
        console.error('Sync layer upsert error:', layerError.message, layerError.details, layerError.hint);
        throw layerError;
      }

      const { error: annError } = await supabase
        .from('annotations')
        .upsert(annotations.map(ann => ({
          id: ann.id,
          layer_id: ann.layerId,
          video_id: layer.youtubeVideoId,
          timestamp_seconds: ann.timestampSeconds,
          content: ann.content,
          toast_duration_seconds: ann.toastDurationSeconds,
          updated_at: new Date().toISOString()
        })));

      if (annError) {
        console.error('Sync annotations upsert error:', annError.message, annError.details, annError.hint);
        throw annError;
      }

      await LocalStorageManager.updateLayerSyncState(layer.id, 'synced');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
      console.error('Sync failed for layer', layer.id, message);
      await LocalStorageManager.updateLayerSyncState(layer.id, 'error');
    }
  }
}