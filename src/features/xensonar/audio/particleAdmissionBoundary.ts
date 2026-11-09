import type { AudioPressureEventKind, AudioPressureSource } from '@/core/audio/audioPressureMap';
import type { RefucktorAudioGuardState, RefucktorVoiceKind } from '@/features/resonance/refucktorAudioGuard';
import { getRefucktorVoiceAdmission } from '@/features/resonance/refucktorAudioGuard';
import { recordParticleVoicePoolAdmission } from './particleVoicePoolLiveReport';

export type ParticleAdmissionRecordCount = (
  source: AudioPressureSource,
  action: AudioPressureEventKind,
  count?: number,
) => void;

export interface ParticleAdmissionRuntime {
  guardState: RefucktorAudioGuardState;
  recordAudioPressureCount: ParticleAdmissionRecordCount;
}

export interface ParticleAdmissionRequest {
  nowSec: number;
  sourceKind: RefucktorVoiceKind;
  volume: number;
}

export interface ParticleAdmissionResult {
  allowed: boolean;
  volume: number;
  source: AudioPressureSource;
}

export const PARTICLE_ADMISSION_MIN_VOLUME = 0.0005;

export function resolveParticleAdmissionPressureSource(
  sourceKind: RefucktorVoiceKind,
): AudioPressureSource {
  return sourceKind === 'resident' ? 'resident-synth-tone' : 'particle-synth-tone';
}

export function resolveParticleAdmissionRequest(
  runtime: ParticleAdmissionRuntime,
  request: ParticleAdmissionRequest,
): ParticleAdmissionResult {
  const source = resolveParticleAdmissionPressureSource(request.sourceKind);
  const admission = getRefucktorVoiceAdmission(
    runtime.guardState,
    request.nowSec,
    request.sourceKind,
    request.volume,
  );

  if (!admission.allowed) {
    runtime.recordAudioPressureCount(source, 'voice-rejected', 1);
    recordParticleVoicePoolAdmission({
      sourceKind: request.sourceKind,
      pressureSource: source,
      action: 'voice-rejected',
      requestedVolume: request.volume,
      admittedVolume: 0,
    });
    return { allowed: false, volume: 0, source };
  }

  const scaledVolume = request.volume * admission.volumeScale;
  if (scaledVolume <= PARTICLE_ADMISSION_MIN_VOLUME) {
    runtime.recordAudioPressureCount(source, 'voice-rejected', 1);
    recordParticleVoicePoolAdmission({
      sourceKind: request.sourceKind,
      pressureSource: source,
      action: 'voice-rejected',
      requestedVolume: request.volume,
      admittedVolume: 0,
    });
    return { allowed: false, volume: 0, source };
  }

  runtime.recordAudioPressureCount(source, 'voice-admitted', 1);
  recordParticleVoicePoolAdmission({
    sourceKind: request.sourceKind,
    pressureSource: source,
    action: 'voice-admitted',
    requestedVolume: request.volume,
    admittedVolume: scaledVolume,
  });
  return { allowed: true, volume: scaledVolume, source };
}
