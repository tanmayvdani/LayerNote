import { LocalStorageManager } from '../storage/local';

chrome.runtime.onInstalled.addListener(async () => {
  await LocalStorageManager.runMigrationPipeline();
});

chrome.alarms.create('sync_retry_alarm', { periodInMinutes: 5 });

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

      const response = await fetch('https://api.layernotes.app/v1/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Token': layer.ownerToken
        },
        body: JSON.stringify({ layer, annotations })
      });

      if (response.ok) {
        await LocalStorageManager.updateLayerSyncState(layer.id, 'synced');
      }
    } catch {
      await LocalStorageManager.updateLayerSyncState(layer.id, 'error');
      break;
    }
  }
}