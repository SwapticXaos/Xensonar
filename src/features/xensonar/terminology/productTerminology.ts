/**
 * Xensonar product terminology.
 *
 * Rule: UI/product names are primary. Historical implementation names may remain
 * behind compatibility aliases, but new cross-domain APIs, reports and user-facing
 * strings should use the names defined here.
 */
export const XENSONAR_TERMS = {
  spectralForge: 'SpectralForge',
  syntheticForge: 'SyntheticForge',
  melodicLoop: 'Melodic Loop',
  drumMachine: 'Drum Machine',
  materialTrack: 'Materialspur',
  rootFollowLoop: 'Root Follow Loop',
  tinkeringPackage: 'Xensonar Tüftelpaket',
  nodalInstallation: 'Nodal Installation',
} as const;

export type XensonarProductTerm = (typeof XENSONAR_TERMS)[keyof typeof XENSONAR_TERMS];

/**
 * Historical implementation vocabulary. These are not product/UI names.
 * Keep only for migration and compatibility documentation.
 */
export const XENSONAR_LEGACY_IMPLEMENTATION_TERMS = {
  canonicalForge: 'CanonicalForge',
  forge2: 'Forge 2',
  forge1: 'Forge 1',
} as const;

export const SYNTHETIC_FORGE_WORKSPACE_LABELS = {
  'wave-material': 'Archivierter Wave-/Material-Bereich',
  'microtonal-logic': 'Drum Machine / Melodic Loop',
} as const;
