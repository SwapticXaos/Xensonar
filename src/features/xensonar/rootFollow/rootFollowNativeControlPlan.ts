import {
  normalizeRootFollowImpulseRasterPolicy,
  type RootFollowImpulseRasterPolicy,
} from './rootFollowImpulseRasterPolicy';
import {
  resolveRootFollowGranularSettings,
  type RootFollowGranularSettings,
} from './rootFollowGranularSettings';
import type {
  RootFollowBankEntryConfig,
  RootFollowSynthPatternSnapshot,
  RootFollowSynthPatchSnapshot,
} from './rootFollowTypes';

export const ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS = {
  maxTracks: 16,
  maxNotes: 512,
  maxCompiledCurvePointsPerNote: 512,
  maxImpulsePatternSteps: 64,
  maxLoopDurationSec: 600,
} as const;

export type RootFollowNativeMaterialProgramV1 = {
  version: 1;
  kind: 'material';
  entryId: string;
  assetHandle: number;
  loopStartSec: number;
  loopEndSec: number;
  desiredLoopDurationSec: number;
  transportAnchorFrame: number;
  anchorHz: number | null;
  granulationMode: 'flowing' | 'grainy';
  granular: RootFollowGranularSettings;
  impulseRaster: RootFollowImpulseRasterPolicy;
  outputTopology: {
    masterRole: 'rhythm';
    auxDomains: ['forge'];
  };
};

export type RootFollowNativeSynthProgramV1 = {
  version: 1;
  kind: 'synth-direct';
  entryId: string;
  transportAnchorFrame: number;
  pattern: RootFollowSynthPatternSnapshot;
  patch: RootFollowSynthPatchSnapshot | null;
  outputTopology: {
    masterRole: 'rhythm';
    auxDomains: ['forge'];
  };
};

export type RootFollowNativeProgramV1 =
  | RootFollowNativeMaterialProgramV1
  | RootFollowNativeSynthProgramV1;

export type RootFollowNativeRealtimeStateV1 = {
  version: 1;
  programId: string;
  generation: number;
  sourceFrame: number;
  rootHz: number;
  volume: number;
  gateOpen: boolean;
};

export type RootFollowNativeLifecycleCommandV1 =
  | { version: 1; type: 'stop-program'; programId: string; generation: number }
  | { version: 1; type: 'panic'; generation: number };

export type RootFollowNativePlanResult =
  | { ok: true; program: RootFollowNativeProgramV1 }
  | { ok: false; reason: string };

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const validId = (value: unknown) =>
  typeof value === 'string' && value.length > 0 && value.length <= 160;

function validateSynthPattern(pattern: RootFollowSynthPatternSnapshot): string | null {
  if (pattern.tracks.length > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxTracks)
    return 'too-many-tracks';
  if (pattern.notes.length > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxNotes)
    return 'too-many-notes';
  for (const note of pattern.notes) {
    if ((note.compiledGainCurve?.length ?? 0) > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxCompiledCurvePointsPerNote)
      return 'gain-curve-too-large';
    if ((note.compiledPitchSemitones?.length ?? 0) > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxCompiledCurvePointsPerNote)
      return 'pitch-curve-too-large';
  }
  return null;
}

export function buildRootFollowNativeProgram(args: {
  entryId: string;
  entryConfig: RootFollowBankEntryConfig;
  transportAnchorFrame: number;
  material?: {
    assetHandle: number;
    loopStartSec: number;
    loopEndSec: number;
    desiredLoopDurationSec: number;
    anchorHz: number | null;
    granulationMode: 'flowing' | 'grainy';
    granularSettings: RootFollowGranularSettings;
    impulseRaster: Partial<RootFollowImpulseRasterPolicy>;
  };
}): RootFollowNativePlanResult {
  if (!validId(args.entryId)) return { ok: false, reason: 'invalid-entry-id' };
  if (!Number.isSafeInteger(args.transportAnchorFrame) || args.transportAnchorFrame < 0)
    return { ok: false, reason: 'invalid-transport-anchor-frame' };

  if (
    args.entryConfig.sourceKind === 'synth' &&
    args.entryConfig.renderMode === 'direct'
  ) {
    const pattern = args.entryConfig.synthPattern;
    if (!pattern) return { ok: false, reason: 'missing-synth-pattern' };
    const invalid = validateSynthPattern(pattern);
    if (invalid) return { ok: false, reason: invalid };
    return {
      ok: true,
      program: {
        version: 1,
        kind: 'synth-direct',
        entryId: args.entryId,
        transportAnchorFrame: args.transportAnchorFrame,
        pattern,
        patch: args.entryConfig.synthPatch ?? null,
        outputTopology: { masterRole: 'rhythm', auxDomains: ['forge'] },
      },
    };
  }

  if (args.entryConfig.sourceKind !== 'material')
    return { ok: false, reason: 'unsupported-render-class' };
  const material = args.material;
  if (!material) return { ok: false, reason: 'missing-material-plan' };
  if (!Number.isSafeInteger(material.assetHandle) || material.assetHandle < 0)
    return { ok: false, reason: 'invalid-asset-handle' };
  if (!finite(material.loopStartSec) || !finite(material.loopEndSec) || material.loopEndSec <= material.loopStartSec)
    return { ok: false, reason: 'invalid-loop-window' };
  if (!finite(material.desiredLoopDurationSec) || material.desiredLoopDurationSec <= 0 || material.desiredLoopDurationSec > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxLoopDurationSec)
    return { ok: false, reason: 'invalid-loop-duration' };
  if (material.anchorHz !== null && (!finite(material.anchorHz) || material.anchorHz <= 0))
    return { ok: false, reason: 'invalid-anchor-hz' };

  const impulseRaster = normalizeRootFollowImpulseRasterPolicy(material.impulseRaster);
  if (impulseRaster.pattern.length > ROOT_FOLLOW_NATIVE_PROGRAM_LIMITS.maxImpulsePatternSteps)
    return { ok: false, reason: 'impulse-pattern-too-large' };
  const granular = resolveRootFollowGranularSettings(
    material.granularSettings,
    material.granulationMode,
  );
  return {
    ok: true,
    program: {
      version: 1,
      kind: 'material',
      entryId: args.entryId,
      assetHandle: material.assetHandle,
      loopStartSec: material.loopStartSec,
      loopEndSec: material.loopEndSec,
      desiredLoopDurationSec: material.desiredLoopDurationSec,
      transportAnchorFrame: args.transportAnchorFrame,
      anchorHz: material.anchorHz,
      granulationMode: material.granulationMode,
      granular,
      impulseRaster,
      outputTopology: { masterRole: 'rhythm', auxDomains: ['forge'] },
    },
  };
}

export function buildRootFollowNativeRealtimeState(args: {
  programId: string;
  generation: number;
  sourceFrame: number;
  rootHz: number;
  volume: number;
  gateOpen: boolean;
}): RootFollowNativeRealtimeStateV1 | null {
  if (!validId(args.programId)) return null;
  if (!Number.isSafeInteger(args.generation) || args.generation < 1) return null;
  if (!Number.isSafeInteger(args.sourceFrame) || args.sourceFrame < 0) return null;
  if (!finite(args.rootHz) || !finite(args.volume)) return null;
  return {
    version: 1,
    programId: args.programId,
    generation: args.generation,
    sourceFrame: args.sourceFrame,
    rootHz: Math.max(27.5, Math.min(3520, args.rootHz)),
    volume: Math.max(0, Math.min(1, args.volume)),
    gateOpen: args.gateOpen === true,
  };
}

export function rootFollowNativeStopCommand(args: {
  programId: string;
  generation: number;
}): RootFollowNativeLifecycleCommandV1 | null {
  if (!validId(args.programId)) return null;
  if (!Number.isSafeInteger(args.generation) || args.generation < 1) return null;
  return { version: 1, type: 'stop-program', programId: args.programId, generation: args.generation };
}

export function rootFollowNativePanicCommand(generation: number): RootFollowNativeLifecycleCommandV1 | null {
  if (!Number.isSafeInteger(generation) || generation < 1) return null;
  return { version: 1, type: 'panic', generation };
}
