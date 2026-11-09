export const SPECTRAL_FORGE_ENTRY_REASONS = {
  CUT_UPLOAD: 'cut-upload',
} as const;

export const SPECTRAL_FORGE_ENTRY_TARGETS = {
  MATERIAL_INTAKE_GATEWAY: 'material-intake-gateway',
} as const;

export const SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN = SPECTRAL_FORGE_ENTRY_REASONS.CUT_UPLOAD;
export const SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET = SPECTRAL_FORGE_ENTRY_TARGETS.MATERIAL_INTAKE_GATEWAY;

export type SpectralForgeExternalAudioOrigin = typeof SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN;
export type SpectralForgeEntryScrollReason = typeof SPECTRAL_FORGE_ENTRY_REASONS[keyof typeof SPECTRAL_FORGE_ENTRY_REASONS];
export type SpectralForgeEntryScrollTarget = typeof SPECTRAL_FORGE_ENTRY_TARGETS[keyof typeof SPECTRAL_FORGE_ENTRY_TARGETS];

export type SpectralForgeEntryScrollIntent = {
  reason: SpectralForgeEntryScrollReason;
  target: SpectralForgeEntryScrollTarget;
  token: string;
  createdAt: number;
};

export function createCutUploadEntryScrollIntent(token: string | number, createdAt = Date.now()): SpectralForgeEntryScrollIntent {
  return {
    reason: SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN,
    target: SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET,
    token: `cut-upload:${token}`,
    createdAt,
  };
}

export function isSpectralForgeEntryScrollIntent(value: unknown): value is SpectralForgeEntryScrollIntent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SpectralForgeEntryScrollIntent>;
  return candidate.reason === SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN
    && candidate.target === SPECTRAL_FORGE_MATERIAL_INTAKE_GATEWAY_TARGET
    && typeof candidate.token === 'string'
    && candidate.token.length > 0
    && typeof candidate.createdAt === 'number'
    && Number.isFinite(candidate.createdAt);
}

export function isMaterialIntakeGatewayIntent(intent: SpectralForgeEntryScrollIntent | null | undefined): intent is SpectralForgeEntryScrollIntent {
  return isSpectralForgeEntryScrollIntent(intent);
}

export function isCutUploadMaterialIntakeIntent(intent: SpectralForgeEntryScrollIntent | null | undefined): intent is SpectralForgeEntryScrollIntent {
  return isMaterialIntakeGatewayIntent(intent);
}
