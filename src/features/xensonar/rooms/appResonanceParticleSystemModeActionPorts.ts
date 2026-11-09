import type { MutableRefObject } from 'react';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  type ChurchMode,
  type ParticleSystem,
} from '../domain/instrumentData';
import {
  buildChurchModeContract,
  buildGridModeContract,
  buildParticleSystemContract,
} from '../domain/appGridModeContracts';
import type { AppNexusParams, NexusUiPatch } from './nexusParamsInitialState';
import type { ResonanceNexusRuntimeRefObject } from './resonanceNexusRuntimeRefs';

type CommitCursorY = (rawY: number, options?: { syncHud?: boolean; refreshKeyboardWindow?: boolean }) => number;

export type AppResonanceParticleSystemModeActionPorts = {
  readonly setParticleSystem: (system: ParticleSystem) => void;
  readonly cycleParticleSystem: (direction?: 1 | -1) => void;
  readonly setChurchMode: (mode: ChurchMode) => void;
  readonly setGridMode: (mode: ChurchMode) => void;
};

export type BuildAppResonanceParticleSystemModeActionPortsInput = {
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly updateNParams: (partial: NexusUiPatch) => void;
  readonly commitResonanceCursorY: CommitCursorY;
};

export const APP_RESONANCE_PARTICLE_SYSTEM_MODE_ACTION_PORTS_PROBE = {
  cleanupKind: 'app-resonance-particle-system-mode-action-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsKeyboardPolicy: false,
  ownsRootFollowAnchorPolicy: false,
  onlyMovesExistingParticleSystemAndModeUiActions: true,
  movedFromAppCallsite: [
    'setParticleSystem',
    'cycleParticleSystem',
    'setChurchMode',
    'setGridMode',
  ] as const,
  explicitlyNotMoved: [
    'particle simulation loop',
    'quantized collision runtime',
    'manual grid mute/offset actions',
    'resonance keyboard input effect',
    'Wellenstarter and Root-Follow behavior',
  ] as const,
} as const;

export function buildAppResonanceParticleSystemModeActionPorts({
  nexusParamsRef,
  nexusRefs,
  updateNParams,
  commitResonanceCursorY,
}: BuildAppResonanceParticleSystemModeActionPortsInput): AppResonanceParticleSystemModeActionPorts {
  const setParticleSystem = (system: ParticleSystem) => {
    const { nodes, nexusPatch } = buildParticleSystemContract(
      system,
      nexusParamsRef.current.churchMode,
    );
    const centerX = GAME_WIDTH * 0.5;
    const centerY = GAME_HEIGHT * 0.5;
    nexusRefs.current.agents = nodes.map((node, idx) => ({
      x: centerX + Math.cos((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      y: centerY + Math.sin((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      ratio: node.ratio,
      label: node.label,
      phase: Math.random() * Math.PI * 2,
      lastHit: 0,
      lastHitAudioTimeSec: 0,
      lastHitGain: 1,
      lastHitX: centerX,
      lastHitY: centerY,
      history: [],
    }));
    const currentParams = nexusParamsRef.current;
    updateNParams({
      ...nexusPatch,
      quantizeOn: currentParams.quantizeOn,
      quantizeBpm: currentParams.quantizeBpm,
    });
  };

  const cycleParticleSystem = (direction: 1 | -1 = 1) => {
    const systems: ParticleSystem[] = ['ji', '12edo', 'bp'];
    const current = nexusParamsRef.current.particleSystem;
    const currentIndex = systems.indexOf(current);
    const nextIndex = (currentIndex + direction + systems.length) % systems.length;
    setParticleSystem(systems[nextIndex]);
  };

  const setChurchMode = (mode: ChurchMode) => {
    const { nextEnabled, nexusPatch } = buildChurchModeContract(
      nexusParamsRef.current.particleSystem,
      mode,
    );
    nexusRefs.current.agents.forEach((agent, idx) => {
      if (idx >= nextEnabled.length) return;
      agent.lastHit = nextEnabled[idx] ? 0 : Number.POSITIVE_INFINITY;
      agent.lastHitAudioTimeSec = undefined;
    });
    updateNParams(nexusPatch);
  };

  const setGridMode = (mode: ChurchMode) => {
    const { nexusPatch } = buildGridModeContract(
      nexusParamsRef.current.gridTuning,
      mode,
    );

    updateNParams(nexusPatch);

    if (nexusParamsRef.current.lockCursorToGrid) {
      commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
    }
  };

  return {
    setParticleSystem,
    cycleParticleSystem,
    setChurchMode,
    setGridMode,
  };
}
