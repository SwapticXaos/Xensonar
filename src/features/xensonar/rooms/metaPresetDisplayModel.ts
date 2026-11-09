import { META_PRESETS } from '../domain/metaPresets';
import type { MetaPresetId } from '../domain/metaPresetTypes';
import { MANDALA_PRESET_COLORS } from './resonanceUiConfig';
import { resolveMetaPreset } from './metaPresetResolver';

type BuildMetaPresetDisplayModelArgs = {
  activeMetaPresetId: MetaPresetId | null;
  roulettePreviewPresetId: MetaPresetId | null;
  sessionMetaOverrides: Parameters<typeof resolveMetaPreset>[1];
  mandalaPresetColorOverrides: Partial<Record<MetaPresetId, string>>;
};

export function buildMetaPresetDisplayModel(args: BuildMetaPresetDisplayModelArgs) {
  const activeMetaPreset = args.activeMetaPresetId
    ? resolveMetaPreset(args.activeMetaPresetId, args.sessionMetaOverrides)
    : null;
  const highlightedMandalaPresetId = args.roulettePreviewPresetId ?? args.activeMetaPresetId;
  const mandalaPresetColors = Object.fromEntries(
    META_PRESETS.map((preset, idx) => [
      preset.id,
      args.mandalaPresetColorOverrides[preset.id] ??
        MANDALA_PRESET_COLORS[idx % MANDALA_PRESET_COLORS.length],
    ]),
  ) as Record<MetaPresetId, string>;

  return {
    activeMetaPreset,
    highlightedMandalaPresetId,
    mandalaPresetColors,
  };
}
