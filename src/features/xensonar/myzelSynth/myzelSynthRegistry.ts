import { DEFAULT_MYZEL_CENTRAL_COLOR_MIXER, normalizeMyzelCentralColorMixer } from '../../resonance/myzelCentralColorMixer';
import {
  DEFAULT_NODAL_DEVICE_MATRIX,
  NODAL_DEVICE_DEFINITIONS,
  NODAL_TARGET_DEFINITIONS,
  normalizeNodalDeviceMatrix,
} from '../../resonance/nodalDeviceMatrix';
import { DEFAULT_NODAL_MOD_ROUTES } from '../../resonance/nodalModulationMatrix';
import {
  ensureSemanticInteractionDevice,
} from '../../resonance/semanticInteractionDevice';
import {
  ensureTopologicalResonator,
} from '../../resonance/topologicalResonanceMatrix';

import type {
  MyzelSynthAudioDeviceRefs,
  MyzelSynthDeviceDefinition,
  MyzelSynthRegisteredAudioDevices,
  MyzelSynthRuntimePolicy,
  MyzelSynthRuntimeSnapshot,
} from './myzelSynthRegistryTypes';

export type * from './myzelSynthRegistryTypes';

export function ensureMyzelSynthRegisteredAudioDevices(
  ctx: AudioContext,
  refs: MyzelSynthAudioDeviceRefs,
  targetBus: AudioNode | null | undefined,
  noiseBuffer?: AudioBuffer | null,
): MyzelSynthRegisteredAudioDevices {
  return {
    semantic: ensureSemanticInteractionDevice(ctx, refs, targetBus, noiseBuffer),
    topological: ensureTopologicalResonator(ctx, refs, targetBus),
  };
}

export const MYZEL_SYNTH_DEVICE_REGISTRY: readonly MyzelSynthDeviceDefinition[] = [
  {
    id: 'central-color-voice',
    label: 'Myzel-Farbstimme',
    role: 'voice-mixer',
    runtimeFile: 'src/features/resonance/myzelCentralColorMixer.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-audio-graph',
  },
  {
    id: 'nodal-device-matrix',
    label: 'Nodale Gerätematrix',
    role: 'relation-device',
    runtimeFile: 'src/features/resonance/nodalDeviceMatrix.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-audio-graph',
  },
  {
    id: 'semantic-interaction-device',
    label: 'Semantic Interaction Device',
    role: 'semantic-device',
    runtimeFile: 'src/features/resonance/semanticInteractionDevice.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-audio-graph',
  },
  {
    id: 'topological-resonance-matrix',
    label: 'Topological Resonance Matrix',
    role: 'topological-device',
    runtimeFile: 'src/features/resonance/topologicalResonanceMatrix.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-audio-graph',
  },
  {
    id: 'spatial-aura-field',
    label: 'Myzel Spatial Aura Field',
    role: 'spatial-field',
    runtimeFile: 'src/features/topology/myzelSpatialEffectField.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-frame-runtime',
  },
  {
    id: 'resident-field-frame',
    label: 'Resident Field Frame',
    role: 'resident-field',
    runtimeFile: 'src/features/topology/residentFieldFrame.ts',
    status: 'registered',
    appTsxBoundary: 'no-inline-frame-runtime',
  },
];

export function createDefaultMyzelSynthRuntimePolicy(): MyzelSynthRuntimePolicy {
  return {
    enabled: true,
    colorMixer: DEFAULT_MYZEL_CENTRAL_COLOR_MIXER,
    nodalDeviceMatrix: DEFAULT_NODAL_DEVICE_MATRIX,
    nodalModRoutes: DEFAULT_NODAL_MOD_ROUTES,
  };
}

export function normalizeMyzelSynthRuntimePolicy(policy: Partial<MyzelSynthRuntimePolicy> | null | undefined): MyzelSynthRuntimePolicy {
  return {
    enabled: policy?.enabled ?? true,
    colorMixer: normalizeMyzelCentralColorMixer(policy?.colorMixer),
    nodalDeviceMatrix: normalizeNodalDeviceMatrix(policy?.nodalDeviceMatrix),
    nodalModRoutes: policy?.nodalModRoutes ?? DEFAULT_NODAL_MOD_ROUTES,
  };
}

export function describeMyzelSynthRuntime(policy: Partial<MyzelSynthRuntimePolicy> | null | undefined): MyzelSynthRuntimeSnapshot {
  const normalized = normalizeMyzelSynthRuntimePolicy(policy);
  return {
    policy: normalized,
    source: policy ? 'user-state' : 'default',
    deviceCount: MYZEL_SYNTH_DEVICE_REGISTRY.length,
    activeNodalTargetCount: NODAL_TARGET_DEFINITIONS.filter((target) => target.active).length,
  };
}

export function listMyzelNodalDeviceLabels(): string[] {
  return NODAL_DEVICE_DEFINITIONS.map((device) => device.label);
}
