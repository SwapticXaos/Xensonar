import { resolveParticlePlaybackRoute, type ParticlePlaybackRoute } from '@/features/soundLibrary/particlePitchRouting';
import type { ParticleGradientPreset, ParticlePreset } from '@/features/xensonar/domain/instrumentData';
import { computeParticleGradientAxes } from '@/features/xensonar/rooms/resonanceRuntimeMath';
import { resolveParticleSynthTonePlan, type ParticleSynthTonePlan, type ParticleTonePlanAxes } from './particleSynthTonePlan';

export interface ParticleTonePlanningRuntime {
  currentTimeSec: number;
}

export interface ParticleTonePlanningRequest {
  freq: number;
  volume: number;
  when?: number;
  presetOverride?: string;
  particlePreset: string;
  particleGradientX: ParticleGradientPreset;
  particleGradientY: ParticleGradientPreset;
  impactPosition?: { x: number; y: number };
}

export interface ParticleTonePlanningResult {
  selectionId: string;
  playbackRoute: ParticlePlaybackRoute;
  synthPresetId: ParticlePreset;
  offset: number;
  axes: ParticleTonePlanAxes;
  synthTonePlan: ParticleSynthTonePlan;
}

export function resolveParticleTonePlanningRequest(
  runtime: ParticleTonePlanningRuntime,
  request: ParticleTonePlanningRequest,
): ParticleTonePlanningResult {
  const selectionId = request.presetOverride ?? request.particlePreset;
  const playbackRoute = resolveParticlePlaybackRoute(selectionId);
  const offset = request.when !== undefined ? Math.max(0, request.when - runtime.currentTimeSec) : 0;
  const axes = request.impactPosition
    ? computeParticleGradientAxes(
        request.impactPosition.x,
        request.impactPosition.y,
        request.particleGradientX,
        request.particleGradientY,
      )
    : { brightness: 0, attackHardness: 0 };
  const synthTonePlan = resolveParticleSynthTonePlan({
    preset: playbackRoute.synthPresetId,
    freq: request.freq,
    offset,
    volume: request.volume,
    axes,
    sampleRoute: playbackRoute.kind === 'sample',
  });

  return {
    selectionId,
    playbackRoute,
    synthPresetId: playbackRoute.synthPresetId,
    offset,
    axes,
    synthTonePlan,
  };
}
