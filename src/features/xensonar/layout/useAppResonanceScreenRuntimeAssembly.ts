import { buildAppResonanceScreenRuntimeSource } from './appResonanceScreenRuntimeSourceBuilder';
import { buildAppResonanceScreenSoundPaletteSource } from './appResonanceScreenSoundPaletteSourceBuilder';
import { buildAppResonanceScreenStageSource } from './appResonanceScreenStageSourceBuilder';
import { useAppResonanceScreenRuntimeBoundary } from './useAppResonanceScreenRuntimeBoundary';
import type { UseAppResonanceScreenRuntimeAssemblyArgs } from './useAppResonanceScreenRuntimeAssemblyTypes';

export type { AppResonanceScreenRuntimeAssemblyCorePanelsInput, UseAppResonanceScreenRuntimeAssemblyArgs } from './useAppResonanceScreenRuntimeAssemblyTypes';
export const APP_RESONANCE_SCREEN_RUNTIME_ASSEMBLY_EXTRACT = {
  candidateModuleName: 'useAppResonanceScreenRuntimeAssembly',
  cleanupKind: 'app-resonance-screen-runtime-assembly-extract',
  appOwnsSensitiveSourceInputComposition: true,
  assemblyOwnsSourceBuilderCallOrder: true,
  assemblyOwnsRuntime: false,
  assemblyMutatesAudio: false,
  assemblyOwnsRoomLifecycle: false,
  assemblyOwnsPackagePersistence: false,
  assemblyOwnsRootFollowRuntime: false,
  assemblyOwnsStageRuntime: false,
  assemblyOwnsSoundPaletteRuntime: false,
  assemblyOwnsAuxPanelFlattening: false,
  assemblyOwnsPanelRuntimeArgsFlattening: false,
  assemblyOwnsScreenRuntimeEntryComposition: false,
  assemblyBuildOrder: [
    'stageSource',
    'soundPaletteSource',
    'screenRuntimeSource',
    'screenRuntimeBoundary',
  ] as const,
  explicitlyNotMoved: [
    'Stage source input groups remain visible at the App.tsx callsite',
    'SoundPalette source input groups remain visible at the App.tsx callsite',
    'Aux panel source normalization and flattening remain in the AuxPanel boundary chain',
    'Panel runtime args flattening remains in appResonanceScreenPanelRuntimeArgs',
    'Screen runtime entry composition remains in useAppResonanceScreenRuntimeBoundary',
    'No Stage handler, audio-readiness, grid/cursor, Root-Follow gate, preview, roulette, scheduler or package behavior moved',
  ] as const,
} as const;

export function useAppResonanceScreenRuntimeAssembly({
  chrome,
  auxPanels,
  soundPaletteActions,
  stage,
  soundPalette,
  corePanels,
}: UseAppResonanceScreenRuntimeAssemblyArgs): ReturnType<typeof useAppResonanceScreenRuntimeBoundary> {
  const resonanceStageSource = buildAppResonanceScreenStageSource(stage);
  const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource(soundPalette);
  const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({
    chrome,
    auxPanels,
    soundPaletteActions,
    corePanels: {
      stage: resonanceStageSource,
      resonanceControl: corePanels.resonanceControl,
      particleSystem: corePanels.particleSystem,
      soundPalette: resonanceSoundPaletteSource,
    },
  });

  return useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);
}
