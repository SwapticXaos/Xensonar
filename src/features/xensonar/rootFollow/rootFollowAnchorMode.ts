export const ROOT_FOLLOW_ANCHOR_MODE = {
  FLEXIBLE: 'flexible',
  FIXED_HZ: 'fixed-hz',
} as const;

export type RootFollowAnchorModeKind = typeof ROOT_FOLLOW_ANCHOR_MODE[keyof typeof ROOT_FOLLOW_ANCHOR_MODE];

export type FlexibleRootFollowAnchorMode = {
  mode: typeof ROOT_FOLLOW_ANCHOR_MODE.FLEXIBLE;
};

export type FixedRootFollowAnchorMode = {
  mode: typeof ROOT_FOLLOW_ANCHOR_MODE.FIXED_HZ;
  rootHz: number;
};

export type RootFollowAnchorMode = FlexibleRootFollowAnchorMode | FixedRootFollowAnchorMode;

export const ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS = {
  minHz: 1,
  maxHz: 3520,
  stepHz: 0.1,
} as const;

export const ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP = 'Einstieg des Cursors in das Tuning-Raster definiert die Loop-Verankerung live; bei hohen Rasterstufen kann dieser spontane Ankerwechsel knistern.';
export const ROOT_FOLLOW_FLEXIBLE_ANCHOR_BUTTON_LABEL = 'Flexibel (knistert manchmal)';

export function normalizeRootFollowAnchorHz(value: unknown): number | null {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseFloat(value.replace(',', '.'))
      : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS.minHz, parsed) : null;
}

export function resolveRootFollowAnchorMode(rootHz: unknown): RootFollowAnchorMode {
  const normalized = normalizeRootFollowAnchorHz(rootHz);
  return normalized === null
    ? { mode: ROOT_FOLLOW_ANCHOR_MODE.FLEXIBLE }
    : { mode: ROOT_FOLLOW_ANCHOR_MODE.FIXED_HZ, rootHz: normalized };
}

export function rootFollowAnchorModeToRootHz(mode: RootFollowAnchorMode): number | null {
  return mode.mode === ROOT_FOLLOW_ANCHOR_MODE.FIXED_HZ ? normalizeRootFollowAnchorHz(mode.rootHz) : null;
}

export function isFlexibleRootFollowAnchorMode(mode: RootFollowAnchorMode): mode is FlexibleRootFollowAnchorMode {
  return mode.mode === ROOT_FOLLOW_ANCHOR_MODE.FLEXIBLE;
}

export function formatRootFollowAnchorHz(rootHz: unknown): string {
  const normalized = normalizeRootFollowAnchorHz(rootHz);
  return normalized === null ? '—' : `${normalized.toFixed(1)} Hz`;
}

export function formatRootFollowAnchorMode(mode: RootFollowAnchorMode): string {
  return mode.mode === ROOT_FOLLOW_ANCHOR_MODE.FLEXIBLE ? 'flexibel' : formatRootFollowAnchorHz(mode.rootHz);
}
