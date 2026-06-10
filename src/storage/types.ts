export type SyncState = 'synced' | 'queued' | 'error';

export interface Layer {
  id: string;
  ownerToken: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface RemoteLayerPayload {
  layer: Layer;
  annotations: Annotation[];
}

export interface ExportV1 {
  version: 2;
  layer: Layer;
  annotations: Annotation[];
}