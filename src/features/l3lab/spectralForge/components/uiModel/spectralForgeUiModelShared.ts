export type UiModelTone = 'cyan' | 'neutral';

export function formatSpectralForgeLocaleDate(value: number): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function buildSpectralForgeSelectedEntryClass(
  selected: boolean,
  tone: UiModelTone = 'cyan',
): string {
  if (!selected) return 'border-neutral-800 bg-neutral-950/40';
  return tone === 'cyan'
    ? 'border-cyan-600/70 bg-cyan-950/20'
    : 'border-neutral-600/70 bg-neutral-900/50';
}

export function formatSpectralForgeCountLabel(count: number, singular: string, plural = singular): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
