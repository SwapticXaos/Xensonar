import { buildAppGlobalInputLowRiskCallsites, type BuildAppGlobalInputLowRiskCallsitesArgs } from './appGlobalInputAndMetronomeSourceBuilder';
import { useAppGlobalBrowserInputCallsiteBoundary, type AppGlobalBrowserInputCallsiteBoundaryArgs } from './useAppGlobalBrowserInputCallsiteBoundary';
import { useResonanceKeyCaptureGate, type UseResonanceKeyCaptureGateOptions } from './useResonanceKeyCaptureGate';

export type AppGlobalInputLowRiskBoundaryState<TPulse = unknown> = {
  readonly globalBrowserInput: AppGlobalBrowserInputCallsiteBoundaryArgs;
  readonly metronomePulse: TPulse;
  readonly keyCaptureMountedAtLegacyCallsite: true;
  readonly browserBoundaryMustMountAtLegacyCallsite: true;
  readonly ownsKeyboardMusicalCommands: false;
  readonly ownsArrowMotionRaf: false;
  readonly ownsStableRhythmLaneScheduler: false;
  readonly ownsAudio: false;
};

export const APP_GLOBAL_INPUT_LOW_RISK_HOOK_EXTRACTION_CONTRACT = {
  patch: '3.2.91.6.9.179_app_global_input_low_risk_hook_extraction',
  scope: 'low-risk-key-capture-and-browser-boundary-only',
  preservesSplitLegacyHookCallsites: true,
  keyCaptureWrapped: true,
  browserBoundaryWrapped: true,
  metronomePulsePassthroughOnly: true,
  keyboardMusicalCommandOwned: false,
  arrowMotionRafOwned: false,
  stableRhythmLaneSchedulerOwned: false,
  runtimeOwned: false,
  audioOwned: false,
  visibleUiChangedByHook: false,
} as const;

export function useAppGlobalInputLowRiskKeyCaptureBoundary<
  TKeyRef extends AppGlobalBrowserInputCallsiteBoundaryArgs['keyRef'],
  TNexusParamsRef extends UseResonanceKeyCaptureGateOptions['nexusParamsRef'],
  TPulse,
  TSchedulePulse,
  TClearPulse,
>(
  args: BuildAppGlobalInputLowRiskCallsitesArgs<
    TKeyRef,
    TNexusParamsRef,
    TPulse,
    TSchedulePulse,
    TClearPulse
  >,
): AppGlobalInputLowRiskBoundaryState<TPulse> {
  const callsites = buildAppGlobalInputLowRiskCallsites(args);

  useResonanceKeyCaptureGate(callsites.resonanceKeyCaptureGate);

  return {
    globalBrowserInput: callsites.globalBrowserInput,
    metronomePulse: callsites.stableMetronomeVisualPulse.metronomePulse,
    keyCaptureMountedAtLegacyCallsite: true,
    browserBoundaryMustMountAtLegacyCallsite: true,
    ownsKeyboardMusicalCommands: false,
    ownsArrowMotionRaf: false,
    ownsStableRhythmLaneScheduler: false,
    ownsAudio: false,
  };
}

export function useAppGlobalInputLowRiskBrowserBoundary(
  boundary: Pick<AppGlobalInputLowRiskBoundaryState, 'globalBrowserInput' | 'browserBoundaryMustMountAtLegacyCallsite'>,
): void {
  useAppGlobalBrowserInputCallsiteBoundary(boundary.globalBrowserInput);
}
