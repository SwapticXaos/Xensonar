import type { StampData } from '../../audio/SpectralData';
import type { CustomStampEntry } from '../../customStampLibrary';
import {
  buildSpectralForgeSelectedEntryClass,
  formatSpectralForgeCountLabel,
  formatSpectralForgeLocaleDate,
} from '../uiModel/spectralForgeUiModelShared';

export const CUSTOM_STAMP_LIBRARY_EMPTY_MESSAGE =
  'Noch keine Custom-Stempel gespeichert. Mit dem Stempelwerkzeug einen Bereich greifen oder ein Preset laden und hier sichern.';

export function formatCustomStampDate(value: number): string {
  return formatSpectralForgeLocaleDate(value);
}

export function formatCustomStampCountLabel(count: number): string {
  return formatSpectralForgeCountLabel(count, 'Stempel');
}

export function resolveCustomStampExpandGlyph(expanded: boolean): '▲' | '▼' {
  return expanded ? '▲' : '▼';
}

export function resolveSendStampButtonLabel(sentFlash: boolean): string {
  return sentFlash ? 'Gesendet ✓' : 'Stempel als Sample an Melodic Loop senden';
}

export function formatCurrentStampSummary(stampData: StampData): string {
  return `Aktueller Stempel im Werkzeug: ${stampData.width}×${stampData.height} · kann direkt gespeichert werden.`;
}

export function formatCustomStampEntryMeta(entry: Pick<CustomStampEntry, 'width' | 'height' | 'updatedAt'>): string {
  return `${entry.width}×${entry.height} · geändert ${formatCustomStampDate(entry.updatedAt)}`;
}

export function resolveCustomStampEntryClass(selected: boolean): string {
  return buildSpectralForgeSelectedEntryClass(selected);
}

