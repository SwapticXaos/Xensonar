import type { AppGlobalBrowserInputCallsiteBoundaryArgs } from './useAppGlobalBrowserInputCallsiteBoundary';
import type { UseResonanceKeyCaptureGateOptions } from './useResonanceKeyCaptureGate';

export type AppGlobalInputActivationGateSource<TRoom = unknown> = {
  readonly room: TRoom;
  readonly nexusActive: boolean;
  readonly resonanceInputActive: boolean;
  readonly gameInputActive: boolean;
  readonly sourceOwnerStillApp: true;
};

export type AppGlobalBrowserContainmentSource<TKeyRef = unknown> = {
  readonly gameInputActive: boolean;
  readonly resonanceInputActive: boolean;
  readonly keyRef: TKeyRef;
  readonly sourceOwnerStillApp: true;
};

export type AppInputIndicatorAndCaptureGateSource<TNexusParamsRef = unknown, TIndicator = unknown> = {
  readonly resonanceInputActive: boolean;
  readonly resonanceInputIndicator: TIndicator;
  readonly nexusParamsRef: TNexusParamsRef;
  readonly sourceOwnerStillApp: true;
};

export type AppStableMetronomeVisualPulseSource<TPulse = unknown, TSchedulePulse = unknown, TClearPulse = unknown> = {
  readonly metronomePulse: TPulse;
  readonly scheduleStableRhythmMetronomePulse: TSchedulePulse;
  readonly clearStableRhythmMetronomeTimeouts: TClearPulse;
  readonly sourceOwnerStillApp: true;
};

export type AppHighRiskInlineSourceMarker<TSourceNames extends readonly string[] = readonly string[]> = {
  readonly sourceNames: TSourceNames;
  readonly sourceOwnerStillApp: true;
  readonly handlerBodiesStillInline: true;
  readonly ownsRuntime: false;
  readonly ownsAudio: false;
  readonly ownsScheduling: false;
};

export type BuildAppGlobalInputAndMetronomeSourceInput<
  TRoom = unknown,
  TKeyRef = unknown,
  TNexusParamsRef = unknown,
  TIndicator = unknown,
  TPulse = unknown,
  TSchedulePulse = unknown,
  TClearPulse = unknown,
> = {
  readonly activationGate: AppGlobalInputActivationGateSource<TRoom>;
  readonly globalBrowserContainment: AppGlobalBrowserContainmentSource<TKeyRef>;
  readonly inputIndicatorAndCaptureGate: AppInputIndicatorAndCaptureGateSource<TNexusParamsRef, TIndicator>;
  readonly stableMetronomeVisualPulse: AppStableMetronomeVisualPulseSource<TPulse, TSchedulePulse, TClearPulse>;
};

export type AppGlobalInputAndMetronomeSource<
  TRoom = unknown,
  TKeyRef = unknown,
  TNexusParamsRef = unknown,
  TIndicator = unknown,
  TPulse = unknown,
  TSchedulePulse = unknown,
  TClearPulse = unknown,
> = BuildAppGlobalInputAndMetronomeSourceInput<
  TRoom,
  TKeyRef,
  TNexusParamsRef,
  TIndicator,
  TPulse,
  TSchedulePulse,
  TClearPulse
> & {
  readonly resonanceKeyboardMusicalCommand: typeof RESONANCE_KEYBOARD_MUSICAL_COMMAND_INLINE_SOURCE;
  readonly resonanceArrowMotionRaf: typeof RESONANCE_ARROW_MOTION_RAF_INLINE_SOURCE;
  readonly stableRhythmLaneScheduler: typeof STABLE_RHYTHM_LANE_SCHEDULER_INLINE_SOURCE;
};

const INLINE_SOURCE_FLAGS = {
  sourceOwnerStillApp: true,
  handlerBodiesStillInline: true,
  ownsRuntime: false,
  ownsAudio: false,
  ownsScheduling: false,
} as const;

const RESONANCE_KEYBOARD_MUSICAL_COMMAND_INLINE_SOURCE = {
  sourceNames: [
    'handleResonanceKeyDown',
    'handleResonanceKeyUp',
    'runResonanceKeyboardInputRouter',
    'runResonanceKeyboardKeyUpRouter',
  ] as const,
  ...INLINE_SOURCE_FLAGS,
} as const;

const RESONANCE_ARROW_MOTION_RAF_INLINE_SOURCE = {
  sourceNames: [
    'resonanceArrowMotionRequestAnimationFrame',
    'commitResonanceCursorY',
    'focusCursorLastInputRef',
  ] as const,
  ...INLINE_SOURCE_FLAGS,
} as const;

const STABLE_RHYTHM_LANE_SCHEDULER_INLINE_SOURCE = {
  sourceNames: [
    'resolveStableRhythmLaneTimeWindow',
    'buildStableRhythmLaneStepPlan',
    'executeStableRhythmLaneStepPlan',
    'nexusRefs.current.nextAbsoluteStep',
  ] as const,
  ...INLINE_SOURCE_FLAGS,
} as const;


export type AppGlobalInputLowRiskCallsiteNormalization<
  TPulse = unknown,
  TSchedulePulse = unknown,
  TClearPulse = unknown,
> = {
  readonly resonanceKeyCaptureGate: UseResonanceKeyCaptureGateOptions;
  readonly globalBrowserInput: AppGlobalBrowserInputCallsiteBoundaryArgs;
  readonly stableMetronomeVisualPulse: AppStableMetronomeVisualPulseSource<TPulse, TSchedulePulse, TClearPulse>;
  readonly sourceOwnerStillApp: true;
  readonly normalizesOnlyLowRiskCallsites: true;
  readonly highRiskBodiesStillInlineInApp: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
  readonly schedulingOwned: false;
};

export const APP_GLOBAL_INPUT_LOW_RISK_CALLSITE_NORMALIZATION_PROBE = {
  cleanupKind: 'app-global-input-low-risk-callsite-normalization',
  normalizedCallsites: [
    'useResonanceKeyCaptureGate',
    'useAppGlobalBrowserInputCallsiteBoundary',
    'stableMetronomeVisualPulse passthrough',
  ] as const,
  normalizesOnlyLowRiskCallsites: true,
  highRiskBodiesStillInlineInApp: true,
  ownsRuntime: false,
  ownsAudio: false,
  ownsScheduling: false,
  ownsMusicalCommand: false,
  explicitlyNotNormalized: [
    'resonance keyboard musical command handler bodies',
    'arrow-motion requestAnimationFrame cursor loop',
    'stable rhythm lane scheduler loop',
  ] as const,
} as const;

export const APP_GLOBAL_INPUT_AND_METRONOME_SOURCE_BUILDER_PROBE = {
  cleanupKind: 'app-global-input-and-metronome-source-builder-probe',
  readinessGroups: [
    'activationGateSource',
    'globalBrowserContainmentSource',
    'inputIndicatorAndCaptureGateSource',
    'stableMetronomeVisualPulseSource',
    'resonanceKeyboardMusicalCommandSource',
    'resonanceArrowMotionRafSource',
    'stableRhythmLaneSchedulerSource',
  ] as const,
  ownsRuntime: false,
  ownsAudio: false,
  ownsScheduling: false,
  ownsMusicalCommand: false,
  ownsBrowserEventContainment: false,
  ownsPackagePersistence: false,
  ownsRoomLifecycle: false,
  onlyGroupsPreparedSources: true,
  explicitlyNotMoved: [
    'resonance keydown and keyup handler bodies',
    'runResonanceKeyboardInputRouter and runResonanceKeyboardKeyUpRouter call bodies',
    'arrow-motion requestAnimationFrame cursor loop',
    'stable rhythm lane scheduler loop',
    'drum, bass, Material, Myzel, Root-Follow, Wellenstarter, Partikel, and audio runtime ownership',
    'nexusRefs.current.nextAbsoluteStep ownership',
  ] as const,
} as const;

export function buildAppGlobalInputAndMetronomeSource<
  TRoom,
  TKeyRef,
  TNexusParamsRef,
  TIndicator,
  TPulse,
  TSchedulePulse,
  TClearPulse,
>(
  source: BuildAppGlobalInputAndMetronomeSourceInput<
    TRoom,
    TKeyRef,
    TNexusParamsRef,
    TIndicator,
    TPulse,
    TSchedulePulse,
    TClearPulse
  >,
): AppGlobalInputAndMetronomeSource<
  TRoom,
  TKeyRef,
  TNexusParamsRef,
  TIndicator,
  TPulse,
  TSchedulePulse,
  TClearPulse
> {
  return {
    ...source,
    resonanceKeyboardMusicalCommand: RESONANCE_KEYBOARD_MUSICAL_COMMAND_INLINE_SOURCE,
    resonanceArrowMotionRaf: RESONANCE_ARROW_MOTION_RAF_INLINE_SOURCE,
    stableRhythmLaneScheduler: STABLE_RHYTHM_LANE_SCHEDULER_INLINE_SOURCE,
  };
}


export function normalizeAppGlobalInputLowRiskCallsites<
  TRoom,
  TKeyRef extends AppGlobalBrowserInputCallsiteBoundaryArgs['keyRef'],
  TNexusParamsRef extends UseResonanceKeyCaptureGateOptions['nexusParamsRef'],
  TIndicator,
  TPulse,
  TSchedulePulse,
  TClearPulse,
>(
  source: AppGlobalInputAndMetronomeSource<
    TRoom,
    TKeyRef,
    TNexusParamsRef,
    TIndicator,
    TPulse,
    TSchedulePulse,
    TClearPulse
  >,
): AppGlobalInputLowRiskCallsiteNormalization<TPulse, TSchedulePulse, TClearPulse> {
  return {
    resonanceKeyCaptureGate: {
      resonanceInputActive: source.inputIndicatorAndCaptureGate.resonanceInputActive,
      nexusParamsRef: source.inputIndicatorAndCaptureGate.nexusParamsRef,
    },
    globalBrowserInput: {
      gameInputActive: source.globalBrowserContainment.gameInputActive,
      resonanceInputActive: source.globalBrowserContainment.resonanceInputActive,
      keyRef: source.globalBrowserContainment.keyRef,
    },
    stableMetronomeVisualPulse: source.stableMetronomeVisualPulse,
    sourceOwnerStillApp: true,
    normalizesOnlyLowRiskCallsites: true,
    highRiskBodiesStillInlineInApp: true,
    runtimeOwned: false,
    audioOwned: false,
    schedulingOwned: false,
  };
}

export type BuildAppGlobalInputLowRiskCallsitesArgs<
  TKeyRef extends AppGlobalBrowserInputCallsiteBoundaryArgs['keyRef'],
  TNexusParamsRef extends UseResonanceKeyCaptureGateOptions['nexusParamsRef'],
  TPulse = unknown,
  TSchedulePulse = unknown,
  TClearPulse = unknown,
> = {
  readonly gameInputActive: boolean;
  readonly resonanceInputActive: boolean;
  readonly keyRef: TKeyRef;
  readonly nexusParamsRef: TNexusParamsRef;
  readonly metronomePulse: TPulse;
  readonly scheduleStableRhythmMetronomePulse: TSchedulePulse;
  readonly clearStableRhythmMetronomeTimeouts: TClearPulse;
};

export function buildAppGlobalInputLowRiskCallsites<
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
): AppGlobalInputLowRiskCallsiteNormalization<TPulse, TSchedulePulse, TClearPulse> {
  return {
    resonanceKeyCaptureGate: {
      resonanceInputActive: args.resonanceInputActive,
      nexusParamsRef: args.nexusParamsRef,
    },
    globalBrowserInput: {
      gameInputActive: args.gameInputActive,
      resonanceInputActive: args.resonanceInputActive,
      keyRef: args.keyRef,
    },
    stableMetronomeVisualPulse: {
      metronomePulse: args.metronomePulse,
      scheduleStableRhythmMetronomePulse: args.scheduleStableRhythmMetronomePulse,
      clearStableRhythmMetronomeTimeouts: args.clearStableRhythmMetronomeTimeouts,
      sourceOwnerStillApp: true,
    },
    sourceOwnerStillApp: true,
    normalizesOnlyLowRiskCallsites: true,
    highRiskBodiesStillInlineInApp: true,
    runtimeOwned: false,
    audioOwned: false,
    schedulingOwned: false,
  };
}

