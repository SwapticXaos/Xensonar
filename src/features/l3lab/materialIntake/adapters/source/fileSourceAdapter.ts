import { prepareAudioSourceAsset } from '../../../spectralForge/audio/AudioImporter';
import type { IntakeSource, MaterialSourceAdapter } from '../../types';

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'source';
}

export const fileSourceAdapter: MaterialSourceAdapter = {
  id: 'local-file',
  label: 'Lokale Datei',
  canImportFile: true,
  async loadFromFile(file: File): Promise<IntakeSource> {
    const sourceAsset = await prepareAudioSourceAsset(file);
    return {
      id: `local-${slugify(file.name)}-${Math.random().toString(36).slice(2, 8)}`,
      label: file.name,
      kind: 'audio',
      durationSec: sourceAsset.originalDuration,
      waveformPreview: sourceAsset.waveformPreview,
      sourceAsset,
      nativeAsset: file,
    };
  },
};
