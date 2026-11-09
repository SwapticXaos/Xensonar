import type { MutableRefObject } from 'react';
import { getResidentCollisionOutputAmp } from '../../topology/installationAudioPolicy';
import type { InstallationFieldConfig, InstallationResidentSoundPreset } from '../../topology/installationFieldConfig';
import { resolveResidentSoundDefinition } from '../../topology/residentSoundCatalog';
import type { AppNexusAgentToneAction } from '../audio/useAppNexusAudioActionSurfaceBoundary';

export type AppRoom3PreviewResidentActionPort = {
  readonly previewPendingCustomResident: () => Promise<void>;
};

export type BuildAppRoom3PreviewResidentActionPortInput = {
  readonly ensureAudioReady: () => Promise<AudioContext | null | undefined>;
  readonly residentAddFrequencyHz: number;
  readonly customResidentSoundPreset: InstallationResidentSoundPreset;
  readonly customResidentElasticPitch: boolean;
  readonly installationFieldConfigRef: MutableRefObject<InstallationFieldConfig>;
  readonly playNexusAgentTone: AppNexusAgentToneAction;
};

export const APP_ROOM3_PREVIEW_RESIDENT_ACTION_PORT_PROBE = {
  cleanupKind: 'app-room3-preview-resident-action-port',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsResidentCatalog: false,
  onlyMovesExistingResidentPreviewCallsiteWiring: true,
  movedFromAppCallsite: [
    'previewPendingCustomResident',
  ] as const,
  explicitlyNotMoved: [
    'resident sound catalog resolution',
    'resident collision amplitude policy',
    'particle-agent tone rendering',
    'Room III topology runtime',
    'Wellenstarter, Root-Follow and Materialspur behavior',
  ] as const,
} as const;

export function buildAppRoom3PreviewResidentActionPort({
  ensureAudioReady,
  residentAddFrequencyHz,
  customResidentSoundPreset,
  customResidentElasticPitch,
  installationFieldConfigRef,
  playNexusAgentTone,
}: BuildAppRoom3PreviewResidentActionPortInput): AppRoom3PreviewResidentActionPort {
  const previewPendingCustomResident = async () => {
    const ctx = await ensureAudioReady();
    if (!ctx) return;
    const residentSound = resolveResidentSoundDefinition(customResidentSoundPreset, { elasticPitch: customResidentElasticPitch });
    playNexusAgentTone(
      residentAddFrequencyHz * residentSound.collision.freqMul,
      getResidentCollisionOutputAmp(installationFieldConfigRef.current, 0.16, residentSound.collision.ampMul),
      undefined,
      undefined,
      residentSound.collision.preset,
      undefined,
      'resident',
    );
  };

  return { previewPendingCustomResident };
}
