export type SyncState = 'synced' | 'queued' | 'error';

export interface Layer {
  id: string;
  ownerToken: string;
  ownerName: string;
  youtubeVideoId: string;
  title: string;
  annotationIds: string[];
  syncState: SyncState;
  createdAt: string;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  layerId: string;
  timestampSeconds: number;
  content: string;
  toastDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteLayerPayload {
  layer: Layer;
  annotations: Annotation[];
}

export interface SupabaseAnnotationRow {
  id: string;
  layer_id: string;
  timestamp_seconds: number;
  content: string;
  toast_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface ExportData {
  version: 3;
  layer: Layer;
  annotations: Annotation[];
}