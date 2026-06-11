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

      const { error: layerError } = await supabase
        .from('layers')
        .upsert({
          id: layer.id,
          owner_token: layer.ownerToken,
          owner_name: layer.ownerName,
          video_id: layer.youtubeVideoId,
          title: layer.title,
          is_public: layer.isPublic,
          like_count: layer.likeCount,
          dislike_count: layer.dislikeCount,
          updated_at: new Date().toISOString()
        });

      if (layerError) throw layerError;

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

      if (annError) throw annError;

      await LocalStorageManager.updateLayerSyncState(layer.id, 'synced');
    } catch (err) {
      console.error('Sync failed for layer', layer.id, err);
      await LocalStorageManager.updateLayerSyncState(layer.id, 'error');
    }
  }
}