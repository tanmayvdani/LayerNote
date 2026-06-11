import { Annotation } from '../storage/types';

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseTimestamp(raw: string): number {
  const parts = raw.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export async function clipboardCopy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function buildAnnotationMap(annotations: Annotation[]): Map<string, Annotation> {
  const map = new Map<string, Annotation>();
  for (const ann of annotations) {
    map.set(ann.id, ann);
  }
  return map;
}