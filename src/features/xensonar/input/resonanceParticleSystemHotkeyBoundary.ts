import { getModesForSystem, type ChurchMode, type ParticleSystem } from '../domain/instrumentData';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';

type ResonanceParticleSystemHotkeyEvent = Pick<KeyboardEvent, 'key'>;

type ResonanceParticleSystemHotkeyParams = Pick<AppNexusParams, 'particleSystem' | 'churchMode'>;

type RunResonanceParticleSystemHotkeyBoundaryArgs = {
  event: ResonanceParticleSystemHotkeyEvent;
  params: ResonanceParticleSystemHotkeyParams;
  setChurchMode: (nextMode: ChurchMode) => void;
  cycleParticleSystem: (direction: 1 | -1) => void;
  preventDefault: () => void;
};

function resolveNextChurchModeForParticleSystem(
  particleSystem: ParticleSystem,
  currentMode: ChurchMode,
  direction: 1 | -1,
): ChurchMode | null {
  const particleModes = getModesForSystem(particleSystem);
  const currentIndex = particleModes.findIndex((mode) => mode.value === currentMode);
  if (currentIndex === -1) return null;
  const nextIndex = (currentIndex + direction + particleModes.length) % particleModes.length;
  return particleModes[nextIndex]?.value ?? null;
}

export function runResonanceParticleSystemHotkeyBoundary(
  args: RunResonanceParticleSystemHotkeyBoundaryArgs,
): boolean {
  const { event, params, setChurchMode, cycleParticleSystem, preventDefault } = args;
  const key = event.key;

  if (key === 'm' || key === 'n') {
    const nextMode = resolveNextChurchModeForParticleSystem(
      params.particleSystem,
      params.churchMode,
      key === 'n' ? 1 : -1,
    );
    if (nextMode) setChurchMode(nextMode);
    preventDefault();
    return true;
  }

  if (key === '-' || key === '_') {
    cycleParticleSystem(key === '_' ? -1 : 1);
    preventDefault();
    return true;
  }

  return false;
}
