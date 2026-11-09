export const WORKSPACE_PACKAGE_DEFAULT_TITLE = 'Xensonar Tüftelpaket';

export function normalizeWorkspacePackageTitle(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || WORKSPACE_PACKAGE_DEFAULT_TITLE;
}
