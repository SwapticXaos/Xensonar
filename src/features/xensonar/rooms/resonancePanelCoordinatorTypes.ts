import type { ComponentProps } from 'react';
import type { buildResonanceStagePanelProps } from './resonanceStageController';
import type {
  buildResonanceControlCorePanelProps,
  buildResonanceGrooveBassPanelProps,
  buildResonanceSoundPalettePanelProps,
} from './resonancePanelProps';
import type { ResonanceParallelEffectsPanel } from './ResonanceParallelEffectsPanel';
import type { RecordingTakePanel } from './RecordingTakePanel';

type ResonanceBurstDiagnosticsPanelComponent =
  typeof import('./ResonanceBurstDiagnosticsPanel')['ResonanceBurstDiagnosticsPanel'];

export type BuildResonancePanelSuitePropsArgs = {
  stage: Parameters<typeof buildResonanceStagePanelProps>[0];
  controlCore: Parameters<typeof buildResonanceControlCorePanelProps>[0];
  soundPalette: Parameters<typeof buildResonanceSoundPalettePanelProps>[0];
  parallelEffects: ComponentProps<typeof ResonanceParallelEffectsPanel>;
  grooveBass: Parameters<typeof buildResonanceGrooveBassPanelProps>[0];
  recordingTake: ComponentProps<typeof RecordingTakePanel>;
  burstDiagnostics: ComponentProps<ResonanceBurstDiagnosticsPanelComponent>;
};

export type ResonancePanelSuiteProps = {
  resonanceStagePanelProps: ReturnType<typeof buildResonanceStagePanelProps>;
  resonanceControlCorePanelProps: ReturnType<typeof buildResonanceControlCorePanelProps>;
  resonanceSoundPalettePanelProps: ReturnType<typeof buildResonanceSoundPalettePanelProps>;
  resonanceParallelEffectsPanelProps: ComponentProps<typeof ResonanceParallelEffectsPanel>;
  resonanceGrooveBassPanelProps: ReturnType<typeof buildResonanceGrooveBassPanelProps>;
  recordingTakePanelProps: ComponentProps<typeof RecordingTakePanel>;
  resonanceBurstDiagnosticsPanelProps: ComponentProps<ResonanceBurstDiagnosticsPanelComponent>;
};
