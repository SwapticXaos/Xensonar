export function isForge3BodyActive(
  sourceAsset: unknown | null,
  sourcePreviewMode: string | null | undefined,
): boolean {
  return !!sourceAsset && sourcePreviewMode === 'forge';
}

export function getForge3BodyUiLabel(active: boolean): string {
  return active ? 'Körper aktiv' : 'Körper inaktiv';
}
