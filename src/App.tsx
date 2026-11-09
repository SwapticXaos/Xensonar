import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reportXensonarPromiseFailure } from "@/features/xensonar/diagnostics/runtimeIssueReporter";
import { recordAudioPressureAdaptiveAction, recordAudioPressureCount, resolveAudioPressureBiasFromSnapshot, snapshotAudioPressureMap } from "./core/audio/audioPressureMap";
import { getAudioNowSec, quantizeUpToStep } from "./core/time/unifiedTime";
import { useXenpolarController } from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import { useAppXenpolarGameArenaRuntimeBoundary } from "./features/xensonar/rooms/useAppXenpolarGameArenaRuntimeBoundary";
import { useAppAudioControlSchedulerRuntimeBoundary } from "./features/xensonar/audio/useAppAudioControlSchedulerRuntimeBoundary";
import { useAppAudioDeviceRackRuntimeBoundary } from "./features/xensonar/audio/useAppAudioDeviceRackRuntimeBoundary";
import { useAppAudioReadinessRuntimeBoundary } from "./features/xensonar/audio/useAppAudioReadinessRuntimeBoundary";
import { useAppSharedAudioOutputBridgeRuntimeBoundary } from "./features/xensonar/audio/useAppSharedAudioOutputBridgeRuntimeBoundary";
import { MYZEL_POST_FX_GROUPS, summarizeHandoffProfile } from "./features/xensonar/architecture/machineRooms";
import { isEditableTarget } from "./features/xensonar/resonanceKeyboard";
import {
  DRONE_JI_OVERTONES,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
  formatHzCompact,
  GAME_HEIGHT,
  GAME_WIDTH,
  getTuningSteps,
  TOPO_HEIGHT,
  TOPO_WIDTH,
} from "./features/xensonar/domain/instrumentData";
import type {
  QuantizeGrid,
} from "./features/xensonar/domain/instrumentData";
import { buildWaveStarterSoundMenuOptions } from "./features/soundLibrary/waveStarterSoundMenuModel";
import { resolveWaveStarterPlaybackSelection } from "./features/soundLibrary/waveStarterSoundAdapter";
import { buildParticleSoundMenuOptions } from "./features/soundLibrary/particleSoundMenuModel";
import { useAudioBurstRecorderRuntimeBoundary } from "./features/xensonar/diagnostics/burstDiagnosticsRuntime";
import { isInstallationResidentBallCouplingActive } from "./features/topology/installationAudioPolicy";
import { resolveInterpreterMyzelBaseHz } from "./features/resonance/interpreterConfig";

import { createTransientRuntime } from "./features/resonance/transientRuntime";
import { XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS, XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS } from "./features/xensonar/audio/audioLaneContracts";
import { createRefucktorAudioGuardState, resetRefucktorAudioGuardState } from "./features/resonance/refucktorAudioGuard";
import { AppShellFrame } from "./features/xensonar/layout/AppShellFrame";
import { useAppResonanceChromeRuntimeBoundary } from "./features/xensonar/layout/useAppResonanceChromeRuntimeBoundary";
import { useAppRoomShellBoundary } from "./features/xensonar/layout/useAppRoomShellBoundary";
import { useAppResonanceScreenRuntimeAssembly } from "./features/xensonar/layout/useAppResonanceScreenRuntimeAssembly";
import { buildAppResonanceAuxPanelPresentationSource, buildAppResonanceScreenCorePanelsPresentationSource, buildAppResonanceScreenSoundPalettePresentationSource, buildAppResonanceScreenStagePresentationSource, buildAppResonanceSoundPaletteActionSource, buildAppRoomScenePresentationSource } from "./features/xensonar/layout/appPresentationSourceBuilders";
import { buildAppResonanceChromeGrooveStatusPresentationSource, buildAppResonanceChromeHeaderPresentationSource, buildAppResonanceChromeSideRailsPresentationSource, buildAppResonanceChromeStatusPresentationSource } from "./features/xensonar/layout/appResonanceChromePresentationSources";
import { useAppResonancePanelPropsBoundary } from "./features/xensonar/layout/useAppResonancePanelPropsBoundary";
import { useAppSurfaceFrameShellBoundary } from "./features/xensonar/layout/useAppSurfaceFrameShellBoundary";
import { buildAppResonancePanelCallsiteSources } from "./features/xensonar/layout/appResonancePanelCallsiteSources";
import { ensureMyzelSynthRegisteredAudioDevices } from "./features/xensonar/myzelSynth/myzelSynthRegistry";
import { useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary } from "./features/xensonar/room3/useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary";
import { useNodalDeviceMatrixActions, useRoom3StateMirrorEffects } from "./features/xensonar/room3/room3AppStateBridges";
import { useRoom3TopologyUiState } from "./features/xensonar/room3/useRoom3TopologyUiState";
import { useRoom3TopologyRuntimeEntry } from "./features/xensonar/room3/useRoom3TopologyRuntimeEntry";
import { useAppRoomSceneRuntimeBoundary } from "./features/xensonar/room3/useAppRoomSceneRuntimeBoundary";
import { buildRoom3TopologyActions } from "./features/xensonar/room3/room3TopologyActions";
import { usePerformanceCrisisUiPolicyState } from "./features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState";
import { createResonanceFieldStepClockState } from "./features/xensonar/rooms/resonanceFieldStepClock";
import { useQuantizedTrafficBoundary } from "./features/xensonar/audioTraffic/useQuantizedTrafficBoundary";
import { startQuantizedCollisionRuntime } from "./features/xensonar/audioTraffic/quantizedCollisionRuntime";
import { markWaveOvertoneArpEnqueue, markWaveOvertoneArpQueueClear, startWaveOvertoneArpRuntime } from "./features/xensonar/audioTraffic/waveOvertoneArpRuntime";
import { renameSelectedDrumConfigAction, removeSelectedDrumConfigAction } from "./features/xensonar/drumConfig/drumConfigActions";
import { useAppDrumConfigCallsiteBoundary } from "./features/xensonar/drumConfig/useAppDrumConfigCallsiteBoundary";
import { readBassClipById } from "./features/xensonar/groove/bassClipLibrary";
import { useMaterialLoopBridgeRuntimeBoundary, useMaterialLoopPlaybackRuntimeBoundary } from "./features/xensonar/material/useMaterialLoopRuntimeBoundary";
import { buildAppMaterialRootFollowWorkspacePorts } from "./features/xensonar/material/appMaterialRootFollowWorkspacePorts";
import { useRootFollowRuntimeBoundaryRefs } from "./features/xensonar/rootFollow/rootFollowRuntimeBoundary";
import { createRootFollowAnchorHzReader, useRootFollowPlaybackRuntimeBoundary, useRootFollowPlayfieldGateBoundary } from "./features/xensonar/rootFollow/useRootFollowRuntimeBoundary";
import { normalizeRootFollowGranularSettings } from "./features/xensonar/rootFollow/rootFollowGranularSettings";
import { primeRootFollowWorkletLiveness } from "./features/xensonar/rootFollow/rootFollowWorkletShadowBridge";
import { StationaryRhythmWorkletProbeOverlay } from "./features/xensonar/audio/StationaryRhythmWorkletProbeOverlay";
import { useAppStationaryRhythmProbeBoundary } from "./features/xensonar/audio/useAppStationaryRhythmProbeBoundary";
import { useMaterialLoopRuntimeBoundaryRefs } from "./features/xensonar/material/materialLoopRuntimeBoundary";
import { isForgeHotkeyTarget } from "./features/xensonar/rooms/resonanceInputRouting";
import {
  BASE_WAVE_MAX_RADIUS,
  buildWaveOvertoneArpSequence,
  clamp,
  createMyzelDriveCurve,
  freqFromY,
  getQuantizeStepSeconds,
  getWaveOvertoneArpStepSeconds,
  hexToRgba,
  snapYToGrid,
  yFromFreq,
  type ActiveWaveOvertone,
} from "./features/xensonar/rooms/resonanceRuntimeMath";
import {
  MATERIAL_LOOP_HOTKEY_KEYS,
  MATERIAL_LOOP_HOTKEY_LABELS,
  type WaveOvertoneMixPresetId,
} from "./features/xensonar/rooms/resonanceUiConfig";
import {
  SCHWARM_MATERIAL_OPTIONS,
} from "./features/xensonar/rooms/resonanceFxDefaults";
import { useRecordingRuntimeBoundary } from "./features/xensonar/recording/useRecordingRuntimeBoundary";
import { createActiveDroneOvertoneMixReader } from "./features/xensonar/audio/appActiveDroneOvertoneMixReader";
import { buildAppMyzelDroneGraphPorts, configureAppMyzelSynthGraphDefaults, connectAppMyzelSynthAirRouting, connectAppMyzelSynthAuxFxSends, connectAppMyzelSynthConstellationRouting, connectAppMyzelSynthCoreRouting, connectAppMyzelSynthFormantRouting, connectAppMyzelSynthOutputRouting, connectAppMyzelSynthOvertoneRouting, connectAppMyzelSynthPostFxSend, createAppMyzelSynthGraphNodeSet, registerAppMyzelSynthGraphNodes, startAppMyzelSynthConstellationOscillators, startAppMyzelSynthCoreOscillators, startAppMyzelSynthOvertoneOscillators } from "./features/xensonar/audio/appMyzelDroneGraphPorts";
import { previewKeyboardWindowShiftAction } from "./features/xensonar/rooms/keyboardWindowActions";
import { useResonanceKeyboardGridRuntimeRefs } from "./features/xensonar/input/useResonanceKeyboardGridRuntimeRefs";
import { disposeWaveStarterLaneRuntimeRef, requestWaveStarterLaneAttack, type WaveStarterEmitOptions, type WaveStarterLaneRuntime } from "./features/xensonar/audio/waveStarterLaneRuntimeBridge";
import { emitWaveStarterAttack } from "./features/xensonar/audio/waveStarterEmitAttackBoundary";
import { asLegacy9061WaveStarterDirectOptions, isImmediateKeyboardWaveStarterGesture, requiresModernWaveStarterLane } from "./features/xensonar/audio/waveStarter9061DirectContract";
import { createWaveStarterDirectSafeLane, type WaveStarterDirectSafeLane } from "./features/xensonar/audio/waveStarterDirectSafeLane";
import { useWaveStarterHoldGestureLoopBridge } from "./features/xensonar/input/useWaveStarterHoldGestureLoopBridge";
import { useAppNexusAudioActionSurfaceBoundary } from "./features/xensonar/audio/useAppNexusAudioActionSurfaceBoundary";
import { useAppDroneGraphRoutingBoundary } from "./features/xensonar/audio/useAppDroneGraphRoutingBoundary";
import { useAppManualJiOvertoneLifecycleBoundary } from "./features/xensonar/audio/useAppManualJiOvertoneLifecycleBoundary";
import { useAppDroneFrameMixSyncBoundary } from "./features/xensonar/audio/useAppDroneFrameMixSyncBoundary";
import { useAppSecondaryDroneOscillatorLifecycleBoundary } from "./features/xensonar/audio/useAppSecondaryDroneOscillatorLifecycleBoundary";
import { useAppMyzelTopologyRuntimeLoopBoundary } from "./features/xensonar/myzelSynth/useAppMyzelTopologyRuntimeLoopBoundary";
import { useAppRoom3BodyAudioRuntimeBoundary } from "./features/xensonar/audio/useAppRoom3BodyAudioRuntimeBoundary";
import { useWaveStarterSoundRuntime } from "./features/xensonar/audio/useWaveStarterSoundRuntime";
import { resolveWaveStarterEmitState } from "./features/xensonar/audio/waveStarterEmitState";
import { useNativeWaveStarterPilot } from "./features/xensonar/audio/useNativeWaveStarterPilot";
import { useBrowserWaveStarterImplant } from "./features/xensonar/browserImplant/useBrowserWaveStarterImplant";
import { useBrowserEntrophonImplant } from "./features/xensonar/browserImplant/useBrowserEntrophonImplant";
import { useNativeRootFollowMaterialPilot } from "./features/xensonar/rootFollow/useNativeRootFollowMaterialPilot";
import { isEntrophonWaveVoiceActive } from "./core/audio/xensonarMicrotonalSoundEngine";
import { useAudioContextRuntimeRefs } from "./features/xensonar/audio/useAudioContextRuntimeRefs";
import { enterXensonarHauptraumRoute } from "./features/xensonar/layout/hauptraumNavigationContract";
import { scheduleMasterRecordingRackScroll } from "./features/xensonar/recording/recordingRackScrollBridge";
import { primeMyzelFromYAction, resolveResonanceCursorYAction, syncCursorHudFromYAction, updateFocusCursorAction } from "./features/xensonar/rooms/resonanceCursorWorkflows";
import { useResonanceMaterialFocusDefaults } from "./features/xensonar/rooms/useResonanceMaterialFocusDefaults";
import { useAppResonanceHousekeepingBoundary } from "./features/xensonar/rooms/useAppResonanceHousekeepingBoundary";
import { useAppResonanceNexusMainLoopBoundary } from "./features/xensonar/rooms/useAppResonanceNexusMainLoopBoundary";
import { useAppNexusParamsState } from "./features/xensonar/rooms/useAppNexusParamsState";
import { runNexusDirectedPulseGesture, runNexusRippleGesture } from "./features/xensonar/rooms/nexusRippleGestureBoundary";
import { useSpectralForgeCutUploadBridge } from "./features/xensonar/rooms/useSpectralForgeCutUploadBridge";
import { useResonanceFxUiState } from "./features/xensonar/rooms/useResonanceFxUiState";
import { useAppMetaPresetActionBoundary } from "./features/xensonar/meta/useAppMetaPresetActionBoundary";
import { useAppMetaPresetSessionBoundary } from "./features/xensonar/meta/useAppMetaPresetSessionBoundary";
import { useAppMetaPresetRouletteBoundary } from "./features/xensonar/meta/useAppMetaPresetRouletteBoundary";
import { useResonanceCursorRuntimeState } from "./features/xensonar/rooms/useResonanceCursorRuntimeState";
import { useResonanceFieldRuntimeRefs } from "./features/xensonar/rooms/useResonanceFieldRuntimeRefs";
import { useAppLiveMasteringCallsiteBoundary } from "./features/xensonar/audio/useAppLiveMasteringCallsiteBoundary";
import { usePostMasterPcmOutput } from "./features/xensonar/audio/usePostMasterPcmOutput";
import { useResonanceFxRuntimeRefs } from "./features/xensonar/audio/useResonanceFxRuntimeRefs";
import { useTransientMonitorTicker } from "./features/xensonar/diagnostics/useTransientMonitorTicker";
import { useAppGlobalInputLowRiskBrowserBoundary, useAppGlobalInputLowRiskKeyCaptureBoundary } from "./features/xensonar/input/useAppGlobalInputLowRiskBoundary";
import { useAppResonanceInputShellBoundary } from "./features/xensonar/input/useAppResonanceInputShellBoundary";
import { useAppResonanceArrowMotionRaf } from "./features/xensonar/input/useAppResonanceArrowMotionRaf";
import { useAppResonanceKeyboardInputEffectBoundary } from "./features/xensonar/input/useAppResonanceKeyboardInputEffectBoundary";
import { useAppStableRhythmLaneSchedulerEffectProbe } from "./features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe";
import { useGroovePlaybackRuntimeRefs } from "./features/xensonar/groove/useGroovePlaybackRuntimeRefs";
import { useStableRhythmMetronomePulse } from "./features/xensonar/rooms/useStableRhythmMetronomePulse";
import { runEnterWaveHotkeyGesture } from "./features/xensonar/input/enterWaveHotkeyGestureBoundary";
import { clearResonanceTransientQueues, createResonanceNexusRuntimeRefs, readResonanceCursorSnapshot, writeResonanceCursorY } from "./features/xensonar/rooms/resonanceNexusRuntimeRefs";
import { buildAppResonanceOvertoneActionPorts } from "./features/xensonar/rooms/appResonanceOvertoneActionPorts";
import { buildAppResonanceManualGridActionPorts } from "./features/xensonar/rooms/appResonanceManualGridActionPorts";
import { buildAppResonanceParticleAgentActionPorts } from "./features/xensonar/rooms/appResonanceParticleAgentActionPorts";
import { buildAppResonanceParticleSystemModeActionPorts } from "./features/xensonar/rooms/appResonanceParticleSystemModeActionPorts";
import { buildAppResonancePresetPreviewActionPorts } from "./features/xensonar/rooms/appResonancePresetPreviewActionPorts";
import { buildAppRoom3PreviewResidentActionPort } from "./features/xensonar/room3/appRoom3PreviewResidentActionPort";


const getAudioEnginePressureBiasForTransientRuntime = () => {
  const snapshot = snapshotAudioPressureMap(750);
  return resolveAudioPressureBiasFromSnapshot(snapshot).pressureBias;
};

export function App() {
  const { room, setRoom, familyRequestedActive, setFamilyRequestedActive, spectralForgeEntryUploadState, xenpolarShortcutActive } = useAppRoomShellBoundary();
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const liveMasteringCallsiteBoundary = useAppLiveMasteringCallsiteBoundary();
  const {
    finalOutputTrimRef,
    finalMixAnalyserRef,
    preFxTapAnalyserRef,
    postFxTapAnalyserRef,
    monitorTapAnalyserRef,
    audioTapScratchRef,
    liveMasteringRef,
    liveMasterBusRuntimeRefs,
    liveMasteringEnabled, setLiveMasteringEnabled, liveMasteringStrength, setLiveMasteringStrength,
    liveMasteringGlue, setLiveMasteringGlue, liveMasteringAir, setLiveMasteringAir,
    liveMasterMonitor, setLiveMasterMonitor, setAudioEventIntakeMonitor,
    audioEventIntakeMonitorRef, audioTapMonitor, setAudioTapMonitor,
  } = liveMasteringCallsiteBoundary;
  usePostMasterPcmOutput({ audioCtx, finalOutputTrimRef });
  const audioBurstRuntime = useAudioBurstRecorderRuntimeBoundary();
  const {
    audioBurstRecorder,
    audioPairTherapistStatus,
    setAudioPairTherapistStatus,
    trafficRef: audioTrafficForensicsRef,
  } = audioBurstRuntime;
  const [quantizeGrid, setQuantizeGrid] = useState<QuantizeGrid>(16);
  const [particleQuantizeReferenceBars, setParticleQuantizeReferenceBars] = useState(1);
  const [gridTempoBpm, setGridTempoBpm] = useState(108);
  const quantizeStepMs = Math.round(getQuantizeStepSeconds(gridTempoBpm, quantizeGrid, particleQuantizeReferenceBars) * 1000);
  const refucktorAudioGuardRef = useRef(createRefucktorAudioGuardState());
  const waveStarterLaneRuntimeRef = useRef<WaveStarterLaneRuntime | null>(null);
  const waveStarterDirectSafeLaneRef = useRef<WaveStarterDirectSafeLane | null>(null);
  const waveStarterDirectEmitRef = useRef<(baseFreq: number, isSector: boolean, options?: WaveStarterEmitOptions) => void>(() => {});
  const browserWaveStarterImplant = useBrowserWaveStarterImplant({ audioCtx, liveMasterBusRuntimeRefs });
  const browserEntrophonImplant = useBrowserEntrophonImplant({ audioCtx, liveMasterBusRuntimeRefs });
  const nativeWaveStarterPilot = useNativeWaveStarterPilot();
  const nativeRflMaterialPilot = useNativeRootFollowMaterialPilot();
  const resonanceFieldStepClockRef = useRef(createResonanceFieldStepClockState());
    const {
    metronomePulse,
    scheduleStableRhythmMetronomePulse,
    clearStableRhythmMetronomeTimeouts,
  } = useStableRhythmMetronomePulse();
  const materialLoopRuntimeRefs = useMaterialLoopRuntimeBoundaryRefs();
  const rootFollowRuntimeRefs = useRootFollowRuntimeBoundaryRefs();

  const room3Topology = useRoom3TopologyUiState();
  const {
    myzelEnabled, setMyzelEnabled, tParams, setTParams, myzelInterpreterMix,
    myzelCentralColorMixer, nodalDeviceMatrix, setNodalDeviceMatrix,
    myzelDriveEnabled, keyboardWindowStamp, setKeyboardWindowStamp,
    myzelPattern, setMyzelPattern, myzelPostFxGroup, setMyzelPostFxGroup,
    myzelPostFxDepth, myzelPostFxParallel,
    myzelPostFxEnabled, setMyzelPostFxEnabled, myzelFollowForgeHandoff,
    setMyzelPostFxMonitor, myzelBallMode, setMyzelBallMode, myzelNodeMode, setMyzelNodeMode,
    myzelStep16ths, setMyzelStep16ths, room3BodyEnabled, setRoom3BodyEnabled, room3BodyControls, setRoom3BodyControls,
    myzelTopologyMode, setMyzelTopologyMode, myzelInstallationMix,
    installationFieldConfig, setInstallationFieldConfig, installationFieldConfigRef,
    selectedResidentId,
    residentAddFrequencySlider, customResidentSoundPreset,
    customResidentElasticPitch, savedResidentConstellations,
    installationSharedFieldActiveRef, room3BodyEnabledRef, room3BodyControlsRef, myzelTopologyModeRef, myzelInstallationMixRef,
    myzelLegacyAudioRef, myzelInterpreterMixRef, myzelCentralColorMixerRef, nodalDeviceMatrixRef,
    myzelPostFxRouterRef, myzelPostFxSendsRef, myzelPostFxConnectionsRef, myzelPrimedYRef, myzelPrimedSourceRef,
    topologyCanvasRef, topologyDragRef, topologyRefs, setSystemState, myceliumSnapshotRef, constellationStateRef,
    myceliumDroneAmountRef, myceliumDroneModRef, myzelLayerModRef, myzelGateRef, myzelAudioFieldEnvelopeRef,
    myzelFieldSpaceBoostRef, semanticInteractionEnvelopeRef, topologicalResonatorEnvelopeRef, room3ModFieldRef,
    room3TimbreStateRef, room3ModalStateRef, room3BodyCurveRef, topologyLoopErrorRef, topologyLastStatusRef,
    installationSharedFieldFlags,
  } = room3Topology;
  const {
    cursorHudHz,
    setCursorHudHz,
    cursorHudHzRef,
    cursorHudLastUpdateRef,
    focusCursorRef,
    focusCursorLastInputRef,
  } = useResonanceCursorRuntimeState();

  const {
    gameCanvasRef,
    gameRefs,
    gameActive,
    setGameActive,
    gameHud,
    setGameHud,
    xenpolarView,
    setXenpolarView,
    arenaSeedStatus,
    setArenaSeedStatus,
    arenaInterpreterRef,
    getArenaInterpreterSnapshot,
    handleArenaSeedExport,
    resonanzwandererStatus,
    resonanzwandererBusy,
    resonanzwandererCanExport,
    handleResonanzwandererExportToXensonar,
    handleResonanzwandererExportToSpectralForge,
    handleResonanzwandererExportToSyntheticForge,
  } = useXenpolarController({
    room,
    setRoom,
    clampValue: clamp,
  });

  const {
    nexusCanvasRef,
    nexusArrowRef,
    waveLaunchAtRef,
    waveImpactDecayRef,
  } = useResonanceFieldRuntimeRefs();
  const [impactDecayOn] = useState(false);
  const metaPresetSessionBoundary = useAppMetaPresetSessionBoundary();
  const { activeOvertoneMixer, setActiveOvertoneMixer, activeMetaPresetId, setActiveMetaPresetId, sessionMetaOverrides, setSessionMetaOverrides, metaPresetRouletteState } = metaPresetSessionBoundary;
  const {
    keyboardMirrorRef,
    activeGridLineFreqRef,
    activeGridLineSinceRef,
    previousGridLineFreqRef,
    previousGridLineAtRef,
    rootFollowInputTargetHzRef,
    resonanceKeyboardPitchLaneRef,
    keyboardWindowOffsetRef,
    activeGridDragStepRef,
    activeGridDragStartYRef,
    activeGridDragBaseOffsetRef,
    activeGridDragMovedRef,
  } = useResonanceKeyboardGridRuntimeRefs();
  const transientRuntimeRef = useRef(createTransientRuntime({
    ...XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS,
    sourceMinOccupancyMs: XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS,
    silentHotPathSources: { wave: true },
    getExternalPressureBias: getAudioEnginePressureBiasForTransientRuntime,
  }));
  const {
    rhythmForgeDrumPatternRef,
    rhythmForgeBassPatternRef,
    rhythmForgeDrumBarIndexRef,
    rhythmForgeBassBarIndexRef,
    rhythmForgeSeedRef,
    psyBassPatternRef,
    psyBassBarIndexRef,
    bassClipPlaybackCacheRef,
    bassClipBarRootRef,
  } = useGroovePlaybackRuntimeRefs();
  const {
    activeScheduledTonesRef,
    audioCtxRef,
    audioWarmupDoneRef,
    audioWarmupPromiseRef,
    keyboardPitchAudioReadyLatchRef,
  } = useAudioContextRuntimeRefs();
  const {
    finalMixProbeRef,
    collectiveMemoryFramesRef,
    collectiveMemoryWindowRef,
    collectiveMemorySummaryRef,
    collectiveFxRef,
    psychedelicSpiralRef,
    psychedelicSpiralSendsRef,
    transientDriveFxRef,
    enterHoldPsyFxRef,
    transientDriveSendsRef,
    enterHoldPsyFxSendsRef,
    schwarmdeuterRef,
    schwarmdeuterSendsRef,
  } = useResonanceFxRuntimeRefs();
  const nexusRefs = useRef(createResonanceNexusRuntimeRefs({
    gameWidth: GAME_WIDTH,
    gameHeight: GAME_HEIGHT,
  }));
  const [nexusActive, setNexusActive] = useState(false);
  const {
    rootFollowPlayfieldInside,
    setRootFollowPlayfieldInsideGate,
  } = useRootFollowPlayfieldGateBoundary();


  const [droneVolume, setDroneVolume] = useState(0);
  const [waveSoundEnabled, setWaveSoundEnabled] = useState(true);
  const [waveSoundVolume, setWaveSoundVolume] = useState(0.22);
  const {
    keyRef,
    gameInputActive,
    resonanceInputActive,
    resonanceInputIndicator,
    resonanceActionBadges,
    waveSoundSwellRef,
    waveStartOctaveHoldRef,
    longToneHoldRef,
    enterHoldRef,
    setSustainHoldActive,
    setSwellHoldActive,
    setOctaveHoldActive,
    setEnterHoldActive,
    resetResonanceActionHolds,
  } = useAppResonanceInputShellBoundary({ room, nexusActive });
  const scrollbarInsetPx = 18;

  const primeMyzelFromY = (y: number, source: "resonance" | "topology" | "wave" | "toggle" | "auto" = "auto") => {
    primeMyzelFromYAction(y, myzelPrimedYRef, myzelPrimedSourceRef, GAME_HEIGHT, source);
  };

  const syncCursorHudFromY = (y: number) => {
    syncCursorHudFromYAction({
      y,
      gameHeight: GAME_HEIGHT,
      cursorHudHzRef,
      cursorHudLastUpdateRef,
      setCursorHudHz,
      freqFromY,
      nowMs: performance.now(),
    });
  };

  const updateFocusCursor = (rawX: number, rawY: number, source: "mouse" | "keyboard" | "arrow" | "grid" | "auto" = "mouse") => updateFocusCursorAction(
    rawX,
    rawY,
    focusCursorRef,
    focusCursorLastInputRef,
    GAME_WIDTH,
    GAME_HEIGHT,
    source,
  );

  const resolveResonanceCursorY = (
    rawY: number,
    params: typeof nexusParamsRef.current = nexusParamsRef.current,
  ) => resolveResonanceCursorYAction(rawY, params, GAME_HEIGHT, snapYToGrid);

  const commitResonanceCursorY = (
    rawY: number,
    options: {
      syncHud?: boolean;
      previewWave?: boolean;
      waveStarterOptions?: WaveStarterEmitOptions;
      syncRootFollowInput?: boolean;
      refreshKeyboardWindow?: boolean;
      primeSource?: "resonance" | "topology" | "wave" | "toggle" | "auto";
    } = {},
  ) => {
    const nextY = resolveResonanceCursorY(rawY);
    writeResonanceCursorY(nexusRefs, nextY);
    const nextRootTargetHz = clamp(freqFromY(nextY), 27.5, 3520);
    if (options.syncRootFollowInput !== false && Number.isFinite(nextRootTargetHz)) {
      rootFollowInputTargetHzRef.current = nextRootTargetHz;
    }
    if (options.syncHud !== false) {
      syncCursorHudFromY(nextY);
    }
    if (options.refreshKeyboardWindow) {
      setKeyboardWindowStamp((prev) => prev + 1);
    }
    if (options.primeSource && myzelEnabled && nexusParamsRef.current.bassRootMode === "auto") {
      primeMyzelFromY(nextY, options.primeSource);
    }
    if (options.previewWave) {
      playWaveStartSound(freqFromY(nextY), false, options.waveStarterOptions);
    }
    return nextY;
  };

  const previewKeyboardWindowShift = (direction: 1 | -1) => previewKeyboardWindowShiftAction({
    params: nexusParamsRef.current,
    direction,
    keyboardWindowOffsetRef,
    setKeyboardWindowStamp,
    commitResonanceCursorY,
  });


  const markWaveLaunch = () => {
    waveLaunchAtRef.current = getAudioNowSec(audioCtx);
    waveImpactDecayRef.current = 1;
  };

  const resetResonanceTransientState = () => {
    const refs = nexusRefs.current;
    clearResonanceTransientQueues(nexusRefs);
    waveCollisionQueueRef.current = [];
    particleQuantizeSeenRef.current = refs.agents.map(() => 0);
    resetRefucktorAudioGuardState(refucktorAudioGuardRef.current);
    refs.agents.forEach((agent) => {
      agent.lastHit = 0;
      agent.lastHitAudioTimeSec = 0;
      agent.lastHitGain = 1;
      agent.lastHitX = agent.x;
      agent.lastHitY = agent.y;
      agent.history = [];
    });
    releaseHeldScheduledTones();
    const ctx = audioCtxRef.current ?? audioCtx;
    if (ctx) {
      const now = ctx.currentTime;
      refs.delayFeedback?.gain.setTargetAtTime(0.0001, now, 0.025);
      refs.gain?.gain.setTargetAtTime(0.0001, now, 0.025);
      refs.gainB?.gain.setTargetAtTime(0.0001, now, 0.025);
    }
  };

  const getInterpreterMyzelBaseHz = () => resolveInterpreterMyzelBaseHz(
    myzelPrimedYRef.current,
    readResonanceCursorSnapshot(nexusRefs).cursorY,
    myceliumSnapshotRef.current,
    freqFromY,
    DRONE_MIN_FREQ,
    DRONE_MAX_FREQ,
    myzelInterpreterMix.hybridBlend,
  );

  const [waveSoundPreset, setWaveSoundPreset] = useState<string>("tape_halo");
  const [selectedWaveOvertonePreset, setSelectedWaveOvertonePreset] = useState<WaveOvertoneMixPresetId>("bright_ladder");
  const { waveStarterSampleEntries, waveSoundRuntimeRef } = useWaveStarterSoundRuntime(
    waveSoundEnabled,
    waveSoundVolume,
    waveSoundPreset,
  );
  useRoom3StateMirrorEffects({
    installationFieldConfig,
    installationFieldConfigRef,
    savedResidentConstellations,
    room3BodyEnabled,
    room3BodyEnabledRef,
    room3BodyControls,
    room3BodyControlsRef,
    myzelTopologyMode,
    myzelTopologyModeRef,
    myzelInstallationMix,
    myzelInstallationMixRef,
    myzelInterpreterMix,
    myzelInterpreterMixRef,
    myzelCentralColorMixer,
    myzelCentralColorMixerRef,
    nodalDeviceMatrix,
    nodalDeviceMatrixRef,
  });

  const {
    handleNodalDeviceEnabledChange,
    handleNodalDeviceAmountChange,
    handleNodalDeviceTargetChange,
  } = useNodalDeviceMatrixActions(setNodalDeviceMatrix);

  const waveStarterSoundMenuOptions = useMemo(() => buildWaveStarterSoundMenuOptions(waveStarterSampleEntries), [waveStarterSampleEntries]);
  const particleSoundMenuOptions = useMemo(() => buildParticleSoundMenuOptions(waveStarterSampleEntries), [waveStarterSampleEntries]);

  useEffect(() => () => {
    disposeWaveStarterLaneRuntimeRef(waveStarterLaneRuntimeRef);
    waveStarterDirectSafeLaneRef.current?.dispose();
    waveStarterDirectSafeLaneRef.current = null;
  }, []);

  const getWaveStarterLaneRuntimeBridgeDeps = () => ({
    runtimeRef: waveStarterLaneRuntimeRef,
    getPressureBias: () => resolveAudioPressureBiasFromSnapshot(snapshotAudioPressureMap(750)).pressureBias,
    getActiveScheduledToneCount: () => activeScheduledTonesRef.current.length,
    getPolicy: () => waveStarterPolicyRef.current,
    getAudioContext: () => audioCtxRef.current ?? audioCtx,
    recordAdaptiveAction: recordAudioPressureAdaptiveAction,
    emitAttack: (baseFreq: number, isSector: boolean, options?: WaveStarterEmitOptions) => waveStarterDirectEmitRef.current(baseFreq, isSector, options),
  });

  const getWaveStarterDirectSafeLane = () => {
    let lane = waveStarterDirectSafeLaneRef.current;
    if (lane) return lane;
    lane = createWaveStarterDirectSafeLane({
      diagnosticName: "direct-input",
      getAudioFrame: () => {
        const ctx = audioCtxRef.current;
        return ctx?.state === 'running' ? Math.round(ctx.currentTime * ctx.sampleRate) : NaN;
      },
      getPressureBias: () => resolveAudioPressureBiasFromSnapshot(snapshotAudioPressureMap(750)).pressureBias,
      getActiveScheduledToneCount: () => activeScheduledTonesRef.current.length,
      emitDirectAttack: (baseFreq, isSector, directOptions) => {
        waveStarterDirectEmitRef.current(
          baseFreq,
          isSector,
          asLegacy9061WaveStarterDirectOptions(directOptions),
        );
      },
    });
    waveStarterDirectSafeLaneRef.current = lane;
    return lane;
  };

  const playWaveStartSound = (baseFreq: number, isSector: boolean = false, options?: WaveStarterEmitOptions) => {
    const modernLane = requiresModernWaveStarterLane(options);
    // Musician-first contract: a physical keyboard hit is not scheduled backlog.
    // Handle it at the moment JS receives it and let the local transient/voice gate
    // decide now-or-never. Do not put it through the stale-age / per-quantum safe
    // lane that protects non-interactive control traffic.
    if (!modernLane && isImmediateKeyboardWaveStarterGesture(options)) {
      waveStarterDirectEmitRef.current(
        baseFreq,
        isSector,
        asLegacy9061WaveStarterDirectOptions(options),
      );
      return;
    }
    // P0N 366 render-class ownership: Native currently owns only the normal direct
    // synth-preset class. Hold/Worklet-special requests retain their proven Legacy
    // owner until that renderer class is explicitly ported. Running Root Follow must
    // never silently collapse these requests onto the temporary P0 sine body.
    if (!modernLane) {
      getWaveStarterDirectSafeLane().request(baseFreq, isSector, options);
      return;
    }

    requestWaveStarterLaneAttack(getWaveStarterLaneRuntimeBridgeDeps(), baseFreq, isSector, options);
  };

  const emitWaveStartSound = (baseFreq: number, isSector: boolean = false, options?: WaveStarterEmitOptions) => {
    const runtime = waveSoundRuntimeRef.current;
    const waveCursor = readResonanceCursorSnapshot(nexusRefs);

    // P0N 360 pilot boundary: only the normal 90.61 direct synth path may become
    // Native-owned. Sample presets and all explicitly modern/special paths keep
    // their existing Legacy/Worklet ownership. Ownership is decided before any
    // WebAudio graph work for this gesture.
    if (options?.legacy9061DirectGate === true) {
      const selection = resolveWaveStarterPlaybackSelection(
        options.waveStarterPresetOverride ?? runtime.preset,
      );
      const entrophonActive = isEntrophonWaveVoiceActive();
      const immediateKeyboard = isImmediateKeyboardWaveStarterGesture(options);
      if (selection.kind === 'sample') {
        browserWaveStarterImplant.noteLegacyBypass('sample-preset', selection.sampleId);
      }
      // Keyboard/Glissando is the live instrument surface. With Entrophon OFF it
      // intentionally bypasses the C11 timestamp/reservation/MessagePort corridor
      // and falls through to the existing 90.61/6.8.7-style direct renderer below.
      // Entrophon ON still falls through and is cut over at its dedicated resolved
      // scheduled-tone boundary, so its own timbre/renderer semantics remain intact.
      if (selection.kind === 'preset' && !entrophonActive && !immediateKeyboard) {
        const resolved = resolveWaveStarterEmitState({
          baseFreq,
          isSector,
          cursorX: waveCursor.cursorX,
          octaveHeld: waveStartOctaveHoldRef.current,
          swell: waveSoundSwellRef.current,
          runtimeVolume: runtime.volume,
          waveTimbreGradientEnabled: nexusParamsRef.current.waveTimbreGradientEnabled,
          waveTimbreGradientX: nexusParamsRef.current.waveTimbreGradientX,
          waveVolumeGradientEnabled: nexusParamsRef.current.waveVolumeGradientEnabled,
          waveVolumeGradientX: nexusParamsRef.current.waveVolumeGradientX,
          options,
        });
        if (browserWaveStarterImplant.tryAttack({
          frequencyHz: resolved.playbackFreq,
          volume: resolved.volume,
          isSector,
          requestedAtMs: options.requestedAtMs,
          soundId: selection.presetId,
        })) return;
        if (nativeWaveStarterPilot.tryAttack({
          frequencyHz: resolved.playbackFreq,
          volume: resolved.volume,
          isSector,
          requestedAtMs: options.requestedAtMs,
          forceSustainExtend: options.forceSustainExtend,
          soundId: selection.presetId,
          rootFollowActive: !!nParamsUI.rootFollowLoopActive,
        })) return;
      }
      // Samples remain on their existing renderer. Entrophon intentionally falls
      // through to the scheduled-tone boundary, where the fully resolved voice is
      // now cut over to its dedicated C11/WASM render class (or Legacy before READY).
    }

    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return;
    emitWaveStarterAttack({
      ctx,
      baseFreq,
      isSector,
      options,
      runtime,
      cursor: waveCursor,
      octaveHeld: waveStartOctaveHoldRef.current,
      swellBlend: waveSoundSwellRef.current,
      heldLong: longToneHoldRef.current,
      nexusSound: {
        waveTimbreGradientEnabled: nexusParamsRef.current.waveTimbreGradientEnabled,
        waveTimbreGradientX: nexusParamsRef.current.waveTimbreGradientX,
        waveVolumeGradientEnabled: nexusParamsRef.current.waveVolumeGradientEnabled,
        waveVolumeGradientX: nexusParamsRef.current.waveVolumeGradientX,
        waveOvertonesEnabled: nexusParamsRef.current.waveOvertonesEnabled,
        waveOvertones: nexusParamsRef.current.waveOvertones,
        waveOvertoneWaveform: nexusParamsRef.current.waveOvertoneWaveform,
        waveOvertoneMode: nexusParamsRef.current.waveOvertoneMode,
        waveOvertoneGlobalLevel: nexusParamsRef.current.waveOvertoneGlobalLevel,
      },
      fxRoutes: {
        ensureCollectiveMemoryFx,
        ensurePsychedelicSpiralDevice,
        ensureTransientDriveDevice,
        ensureEnterHoldPsyFxDevice,
        ensureSchwarmdeuterDevice,
        ensureMyzelPostFxRouter,
      },
      fxTargets: {
        transientDriveWaves: transientDriveSendsRef.current.waves,
        psychedelicSpiralWaves: psychedelicSpiralSendsRef.current.waves,
        collectiveMemoryWaves: collectiveFxRef.current.waves?.input,
        enterHoldPsyFxWaves: enterHoldPsyFxSendsRef.current.waves,
        enterHoldPsyFxEnabled,
        enterHoldActive: enterHoldRef.current,
        schwarmdeuterWaves: schwarmdeuterSendsRef.current.waves,
        myzelPostFxWaves: myzelPostFxSendsRef.current.waves,
      },
      activeScheduledTonesRef,
      transientRuntime: transientRuntimeRef.current,
      beginTransientEvent: (source, requestedVoices, intensity) => beginTransientEvent(source, requestedVoices, intensity),
      getWaveOutput: (audioContext) => getLiveMasterBus(audioContext, "space"),
      primeMyzelFromY,
      playScheduledTone,
      triggerBodyExciter: triggerRoom3BodyExciter,
      enqueueOvertoneArp: enqueueWaveOvertoneArp,
    });
  };
  waveStarterDirectEmitRef.current = emitWaveStartSound;
  const {
    initialOvertonesByPreset,
    nexusParamsRef,
    nParamsUI,
    updateNParams,
    rootFollowUiStorageKey,
  } = useAppNexusParamsState();
  const appGlobalInputLowRiskBoundary = useAppGlobalInputLowRiskKeyCaptureBoundary({
    gameInputActive,
    resonanceInputActive,
    keyRef,
    nexusParamsRef,
    metronomePulse,
    scheduleStableRhythmMetronomePulse,
    clearStableRhythmMetronomeTimeouts,
  });
  const {
    quantizeAnchorRef,
    waveCollisionQueueRef,
    particleQuantizeSeenRef,
    particleQuantizeTimerRef,
    waveOvertoneArpQueueRef,
    waveOvertoneArpTimerRef,
    quantizedTrafficQueueRefs,
    waveOvertoneArpTrafficRefs,
    setGridTempoBpmWithTrafficReset,
    setQuantizeGridMode,
    cycleQuantizeGrid,
  } = useQuantizedTrafficBoundary({
    nexusRefs,
    nexusParamsRef,
    trafficRef: audioTrafficForensicsRef,
    setGridTempoBpm,
    setQuantizeGrid,
  });
  const performanceCrisisUiPolicyState = usePerformanceCrisisUiPolicyState({
    particleQuantizeGrid: quantizeGrid,
  });
  const { performanceCrisisRuntimePolicy } = performanceCrisisUiPolicyState;
  const waveStarterPolicyRef = useRef(performanceCrisisRuntimePolicy.waveStarter);
  waveStarterPolicyRef.current = performanceCrisisRuntimePolicy.waveStarter;
  const {
    exportedDrumConfigs,
    selectedExportedDrumConfig,
  } = useAppDrumConfigCallsiteBoundary({
    drumConfigId: nParamsUI.drumConfigId,
    drumConfigMode: nParamsUI.drumConfigMode,
    nexusParamsRef,
    updateNParams,
  });

  const renameSelectedDrumConfig = async () => {
    await renameSelectedDrumConfigAction({ selectedExportedDrumConfig });
  };

  const removeSelectedDrumConfig = async () => {
    await removeSelectedDrumConfigAction({
      selectedExportedDrumConfig,
      currentDrumConfigId: () => nexusParamsRef.current.drumConfigId,
      updateNParams,
    });
  };

  const resonanceFxUiState = useResonanceFxUiState();
  const {
    collectiveMemoryEnabled,
    setCollectiveMemoryEnabled,
    collectiveMemoryWindow,
    setCollectiveMemoryWindow,
    collectiveMemoryUi,
    setCollectiveMemoryUi,
    setCollectiveMemoryMonitor,
    psychedelicSpiralEnabled,
    setPsychedelicSpiralEnabled,
    psychedelicSpiralFollow,
    setPsychedelicSpiralFollow,
    psychedelicSpiralUi,
    setPsychedelicSpiralUi,
    setPsychedelicSpiralMonitor,
    enterHoldPsyFxEnabled,
    enterHoldPsyFxUi,
    transientDriveUi,
    setTransientDriveUi,
    updateTransientDriveSource,
    schwarmEnabled,
    schwarmUi,
    setSchwarmMonitor,
    setControlPerfMonitor,
    setTransientRuntimeMonitor,
  } = resonanceFxUiState;

  useTransientMonitorTicker({ transientRuntimeRef, setTransientRuntimeMonitor });

  const getActiveDroneOvertoneMix = createActiveDroneOvertoneMixReader({ nexusParamsRef });

  const audioDeviceRackRuntimeBoundary = useAppAudioDeviceRackRuntimeBoundary({
    liveMasterBusRuntimeRefs,
    finalMixAnalyserRef,
    audioEventIntakeMonitorRef,
    audioTapScratchRef,
    preFxTapAnalyserRef,
    postFxTapAnalyserRef,
    monitorTapAnalyserRef,
    setAudioEventIntakeMonitor,
    setAudioTapMonitor,
    audioBurstRuntime,
    rootFollowRuntimeRefs,
    transientRuntimeRef,
    nParamsUI,
    liveMasterMonitor,
    room,
    waveSoundEnabled,
    liveMasteringEnabled,
    collectiveMemoryUi,
    collectiveFxRef,
    finalMixProbeRef,
    psychedelicSpiralRef,
    psychedelicSpiralSendsRef,
    psychedelicSpiralEnabled,
    psychedelicSpiralUi,
    transientDriveFxRef,
    transientDriveSendsRef,
    enterHoldPsyFxRef,
    enterHoldPsyFxSendsRef,
    enterHoldPsyFxEnabled,
    enterHoldPsyFxUi,
    schwarmdeuterRef,
    schwarmdeuterSendsRef,
    schwarmEnabled,
    schwarmUi,
    nexusRefs,
    nexusParamsRef,
    myzelPostFxRouterRef,
    myzelPostFxSendsRef,
    myzelPostFxConnectionsRef,
    gameRefs,
  });
  const {
    ensureFinalMixBus,
    ensureDrumMixBus,
    getLiveMasterBus,
    ensureRecordingDestination,
    ensureExternalGameRecordingCaptureBus,
    recordAudioTapSnapshot,
    beginTransientEvent,
    ensureCollectiveMemoryFx,
    ensurePsychedelicSpiralDevice,
    ensureTransientDriveDevice,
    ensureEnterHoldPsyFxDevice,
    ensureSchwarmdeuterDevice,
    ensureMyzelPostFxRouter,
    collectSchwarmSnapshots,
  } = audioDeviceRackRuntimeBoundary;


  const getCurrentRootFollowAnchorHz = createRootFollowAnchorHzReader({
    getCursorY: () => nexusRefs.current.cursorY,
    freqFromY,
    minHz: 27.5,
    maxHz: 3520,
  });

  const getCurrentRootFollowInputHz = () => {
    const targetHz = rootFollowInputTargetHzRef.current;
    if (typeof targetHz === 'number' && Number.isFinite(targetHz)) {
      return clamp(targetHz, 27.5, 3520);
    }
    return getCurrentRootFollowAnchorHz();
  };

  const setRootFollowAuditionPitchHz = useCallback((hz: number) => {
    if (!Number.isFinite(hz)) return;
    rootFollowInputTargetHzRef.current = clamp(hz, 27.5, 3520);
  }, []);


  useSpectralForgeCutUploadBridge({
    spectralForgeCutUploadRafIdsRef: spectralForgeEntryUploadState.spectralForgeCutUploadRafIdsRef,
    spectralForgeCutUploadSequenceRef: spectralForgeEntryUploadState.spectralForgeCutUploadSequenceRef,
    setSpectralForgeExternalAudioFile: spectralForgeEntryUploadState.setSpectralForgeExternalAudioFile,
    setSpectralForgeExternalAudioOrigin: spectralForgeEntryUploadState.setSpectralForgeExternalAudioOrigin,
    setSpectralForgeEntryScrollIntent: spectralForgeEntryUploadState.setSpectralForgeEntryScrollIntent,
    setRoom,
  });

  const {
    recentLoopHotkeyEntries,
    recentRootFollowHotkeyEntries,
    selectedLoopMaterial,
    selectedRootFollowLoop,
    selectedRootFollowLoopConfig,
    managedLoopMaterial,
    selectedLoopHandoffProfile,
    rootFollowPreviewActive,
    materialLoopPanelProps,
    selectMaterialLoopDirect,
    toggleMaterialLoopDirect,
    browseMaterialLoopWithUmlaut,
    selectRootFollowLoopDirect,
    toggleRootFollowLoopDirect,
    browseRootFollowLoopWithUmlaut,
  } = useMaterialLoopBridgeRuntimeBoundary({
    nParamsUI: {
      materialLoopActive: nParamsUI.materialLoopActive,
      materialLoopId: nParamsUI.materialLoopId,
      materialLoopSyncToBeat: nParamsUI.materialLoopSyncToBeat,
      materialLoopTimeMode: nParamsUI.materialLoopTimeMode,
      materialLoopVolume: nParamsUI.materialLoopVolume,
      rootFollowLoopActive: nParamsUI.rootFollowLoopActive,
      rootFollowLoopId: nParamsUI.rootFollowLoopId,
      rootFollowLoopTimeMode: nParamsUI.rootFollowLoopTimeMode,
      rootFollowLoopVolume: nParamsUI.rootFollowLoopVolume,
      rootFollowLoopGranulationMode: nParamsUI.rootFollowLoopGranulationMode,
      rootFollowGranularSettings: normalizeRootFollowGranularSettings(nParamsUI.rootFollowGranularSettings, nParamsUI.rootFollowLoopGranulationMode),
      rootFollowImpulsRasterEvery: nParamsUI.rootFollowImpulsRasterEvery,
      rootFollowImpulsRasterCycleDiv: nParamsUI.rootFollowImpulsRasterCycleDiv,
      rootFollowImpulsRasterClockMode: nParamsUI.rootFollowImpulsRasterClockMode,
      rootFollowImpulsRasterPattern: nParamsUI.rootFollowImpulsRasterPattern,
      resonanceHotkeyMode: nParamsUI.resonanceHotkeyMode,
      quantizeBpm: nParamsUI.quantizeBpm,
      drumActive: nParamsUI.drumActive,
      drumPattern: nParamsUI.drumPattern,
      drumConfigMode: nParamsUI.drumConfigMode,
      drumConfigId: nParamsUI.drumConfigId,
      drumVolume: nParamsUI.drumVolume,
    },
    getCurrentMaterialLoopId: () => nexusParamsRef.current.materialLoopId,
    getCurrentMaterialLoopActive: () => nexusParamsRef.current.materialLoopActive,
    updateNParams,
    clampIndex: clamp,
    hotkeyCount: MATERIAL_LOOP_HOTKEY_KEYS.length,
    validGroups: MYZEL_POST_FX_GROUPS,
    myzelFollowForgeHandoff,
    setMyzelPostFxGroup,
    hotkeyLabels: MATERIAL_LOOP_HOTKEY_LABELS,
    getCurrentRootFollowAnchorHz,
    getDefaultRootFollowAnchorHz: () => Math.max(1, nexusParamsRef.current.gridBase / 2),
    setRootFollowAuditionPitchHz,
  });

  const returnToXensonarHauptraum = useCallback(() => {
    enterXensonarHauptraumRoute({ setRoom, setFamilyRequestedActive });
  }, []);

  const myzelDroneGraphPorts = buildAppMyzelDroneGraphPorts({
    nexusRefs,
    getDroneVolume: () => droneVolume,
    getLiveMasterBus,
    ensureCollectiveMemoryFx,
    ensurePsychedelicSpiralDevice,
    myzelPostFxSendsRef,
    myzelPostFxConnectionsRef,
    psychedelicSpiralSendsRef,
    transientDriveSendsRef,
    schwarmdeuterSendsRef,
  });
  const { myzelSynthGraph: myzelSynthGraphPorts } = myzelDroneGraphPorts;
  const { ensureDroneGraphRouting } = useAppDroneGraphRoutingBoundary(myzelDroneGraphPorts.droneGraphRouting);

  const applyRealtimeDroneOvertones = (mix?: Record<string, number>, timbreOverride?: number) => {
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return;
    const refs = nexusRefs.current;
    ensureDroneGraphRouting(ctx);

    const current = nexusParamsRef.current;
    const activeMix = mix ?? current.droneJIOvertones;
    const timbre = clamp(timbreOverride ?? current.droneTimbre ?? 0, 0, 1);
    const droneHardMuted = droneVolume <= 0.0005;
    const now = ctx.currentTime;
    const master = refs.manualJiMaster;
    if (master) {
      master.gain.setTargetAtTime(droneHardMuted ? 0.0001 : 0.28 + timbre * 0.72, now, 0.035);
    }
    for (const node of DRONE_JI_OVERTONES) {
      const gainNode = nexusRefs.current.manualJiGains[node.label];
      if (!gainNode) continue;
      const slider = clamp(activeMix[node.label] ?? 0, 0, 1);
      const perPartial = droneHardMuted ? 0 : slider * (0.008 + 0.07 * timbre);
      gainNode.gain.setTargetAtTime(perPartial, now, 0.035);
    }
  };

  const ensureMyzelSynth = (ctx: AudioContext) => {
    const refs = myzelSynthGraphPorts.nexusRefs.current;
    if (refs.myzelMasterGain) return refs.myzelMasterGain;

    const nodes = createAppMyzelSynthGraphNodeSet(ctx);
    configureAppMyzelSynthGraphDefaults(nodes, {
      driveEnabled: myzelDriveEnabled,
      driveAmount: myzelInterpreterMix.driveAmount,
      createDriveCurve: createMyzelDriveCurve,
    });

    connectAppMyzelSynthCoreRouting(nodes);
    connectAppMyzelSynthFormantRouting(nodes);
    connectAppMyzelSynthOvertoneRouting(nodes);
    startAppMyzelSynthOvertoneOscillators(nodes);
    connectAppMyzelSynthConstellationRouting(nodes);
    startAppMyzelSynthConstellationOscillators(nodes);
    const myzelOutputBus = refs.droneGroupBus ?? myzelSynthGraphPorts.getLiveMasterBus(ctx, "drone");
    connectAppMyzelSynthOutputRouting(nodes, myzelOutputBus);
    ensureMyzelSynthRegisteredAudioDevices(ctx, refs, myzelOutputBus, refs.noiseBuffer);
    connectAppMyzelSynthAirRouting(nodes, myzelOutputBus);
    connectAppMyzelSynthAuxFxSends(nodes, myzelSynthGraphPorts, ctx);
    startAppMyzelSynthCoreOscillators(nodes);

    registerAppMyzelSynthGraphNodes(refs, nodes);
    connectAppMyzelSynthPostFxSend(nodes, myzelSynthGraphPorts);

    return nodes.master;
  };

  const audioReadinessRuntimeBoundary = useAppAudioReadinessRuntimeBoundary({
    audioCtx,
    setAudioCtx,
    audioCtxRef,
    audioWarmupDoneRef,
    audioWarmupPromiseRef,
    keyboardPitchAudioReadyLatchRef,
    ensureFinalMixBus,
    getLiveMasterBus,
    applyRealtimeDroneOvertones,
    ensureMyzelSynth,
    liveDeviceWarmups: [
      { id: "collective-memory", ensure: ensureCollectiveMemoryFx },
      { id: "psychedelic-spiral", ensure: ensurePsychedelicSpiralDevice },
      { id: "transient-drive", ensure: ensureTransientDriveDevice },
      { id: "enter-hold", ensure: ensureEnterHoldPsyFxDevice },
      { id: "schwarmdeuter", ensure: ensureSchwarmdeuterDevice },
      { id: "myzel-post", ensure: ensureMyzelPostFxRouter },
    ],
    getLiveSampleSelections: () => [
      waveSoundRuntimeRef.current.preset,
      nexusParamsRef.current.particlePreset,
      installationFieldConfigRef.current.residentSound,
      customResidentSoundPreset,
    ],
  });
  const {
    initAudio,
    prewarmAudioRuntime,
    ensureAudioReady,
    ensureKeyboardPitchAudioReadyOnce,
    warmMyzelAudioRuntime,
  } = audioReadinessRuntimeBoundary;

  useAppSharedAudioOutputBridgeRuntimeBoundary({
    audioCtxRef,
    ensureAudioReady,
    ensureExternalGameRecordingCaptureBus,
    getLiveMasterBus,
  });

  const {
    resetAudioPairTherapistRuntime,
    rootFollowHealth,
    workspacePackageActivationReport,
    clearRootFollowBrowserState,
    reactivateRootFollowFromLoadedPackage,
  } = buildAppMaterialRootFollowWorkspacePorts({
    audioContextState: audioCtxRef.current?.state ?? audioCtx?.state ?? 'kein AudioContext',
    selectedRootFollowLoop,
    fallbackSelectedLoopId: nParamsUI.rootFollowLoopId ?? null,
    rootFollowLoopActive: !!nParamsUI.rootFollowLoopActive,
    rootFollowPreviewActive,
    rootFollowPlayfieldInside,
    rootFollowEntries: materialLoopPanelProps.rootFollowLoopEntries?.length ?? 0,
    materialEntries: materialLoopPanelProps.exportedLoopMaterials ?? [],
    selectedLoopMaterial,
    rootFollowUiStorageKey,
    rootFollowRuntimeRefs,
    materialLoopRuntimeRefs,
    updateNParams,
    setAudioPairTherapistStatus,
    resetResonanceTransientState,
    audioTrafficForensicsRef,
    ensureAudioReady,
    prewarmAudioRuntime,
  });

  const recordingRuntime = useRecordingRuntimeBoundary({
    ensureAudioReady,
    ensureRecordingDestination,
    isEditableTarget,
    isForgeHotkeyTarget,
  });

  const toggleHeaderRecording = useCallback(() => {
    if (recordingRuntime.recordingActive) {
      recordingRuntime.recordingTake.stopRecording();
      enterXensonarHauptraumRoute({ setRoom, setFamilyRequestedActive });
      scheduleMasterRecordingRackScroll('smooth');
      return;
    }
    void recordingRuntime.recordingTake.startRecording().catch((error) => {
      reportXensonarPromiseFailure('runtime', 'header-master-recording-start', error);
    });
  }, [recordingRuntime.recordingActive, recordingRuntime.recordingTake, setFamilyRequestedActive, setRoom]);

  const room3TopologyActions = buildRoom3TopologyActions({
    topologyRefs,
    topologyWidth: TOPO_WIDTH,
    topologyHeight: TOPO_HEIGHT,
    installationFieldConfig,
    setInstallationFieldConfig,
    setMyzelTopologyMode,
    setMyzelEnabled,
    setMyzelNodeMode,
    setMyzelPattern,
    setMyzelPostFxEnabled,
    setSystemState,
    topologyLoopErrorRef,
    warmMyzelAudioRuntime,
    myzelEnabled,
  });
  const { resetMyzelTopologyNodes, setMyzelModeAndPower, toggleMyzelEnabled } = room3TopologyActions;


  const {
    setDronePreset,
    setDroneOvertone,
    setWaveOvertone,
    applyWaveOvertonePreset,
  } = buildAppResonanceOvertoneActionPorts({
    nexusParamsRef,
    updateNParams,
  });

  const enqueueWaveOvertoneArp = (
    baseFreq: number,
    baseVolume: number,
    activeMix: ActiveWaveOvertone[],
    isSector: boolean,
  ) => {
    const params = nexusParamsRef.current;
    if (!params.waveOvertonesEnabled) return;
    if (!(params.waveOvertoneMode === "arp" || params.waveOvertoneMode === "hybrid")) return;
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx || activeMix.length === 0) return;

    const overtoneGlobalLevel = clamp(params.waveOvertoneGlobalLevel ?? 1, 0, 2.5);
    const bpm = Math.max(40, params.quantizeBpm || gridTempoBpm || 108);
    const step = getWaveOvertoneArpStepSeconds(bpm, params.waveOvertoneArpRate);
    const firstDueTime = quantizeUpToStep(getAudioNowSec(ctx), step, Math.min(0.012, step * 0.35));
    const sequence = buildWaveOvertoneArpSequence(activeMix, params.waveOvertoneArpPattern, params.waveOvertoneArpSteps);
    if (!sequence.length) return;

    const durationMul = params.waveOvertoneArpRate === 64 ? 1.65 : params.waveOvertoneArpRate === 32 ? 1.34 : 1.08;
    const noteDuration = clamp(step * durationMul, 0.05, isSector ? 0.18 : 0.16);
    const waveform = params.waveOvertoneWaveform as OscillatorType;
    const baseCutoff = waveform === "sawtooth" || waveform === "square" ? 2100 : 2500;

    sequence.forEach((entry, index) => {
      const accent = index === 0 ? 1.16 : index % 4 === 0 ? 1.08 : index % 2 === 0 ? 1.02 : 0.96;
      waveOvertoneArpQueueRef.current.push({
        dueTime: firstDueTime + index * step,
        freq: clamp(baseFreq * entry.node.ratio, 45, 3600),
        amp: clamp(baseVolume * (0.18 + entry.amount * 0.34) * accent * overtoneGlobalLevel * (isSector ? 1.08 : 1), 0.0001, 0.42),
        duration: noteDuration,
        waveform,
        cutoff: clamp(baseCutoff + entry.amount * 1800, 900, 5200),
        q: 1.2 + entry.amount * 1.8,
        prominence: 0.56 + entry.amount * 0.26,
      });
    });

    const overflowTrimmed = Math.max(0, waveOvertoneArpQueueRef.current.length - 384);
    if (overflowTrimmed > 0) {
      waveOvertoneArpQueueRef.current.splice(0, overflowTrimmed);
    }
    // 90.61 silent Wellenstarter contract: queue trimming is kept, but the
    // enqueue hot path does not publish traffic-forensics objects per hit.
    void markWaveOvertoneArpEnqueue;
  };

  const {
    toggleManualGridStepMute,
    setManualGridStepOffset,
    changeGridTuning,
    getVisibleGridLines,
  } = buildAppResonanceManualGridActionPorts({
    nexusParamsRef,
    nexusRefs,
    updateNParams,
    commitResonanceCursorY,
    keyboardWindowOffsetRef,
    setKeyboardWindowStamp,
  });

  useEffect(() => {
    if (!nParamsUI.waveOvertonesEnabled || nParamsUI.waveOvertoneMode === "direct") {
      markWaveOvertoneArpQueueClear(waveOvertoneArpTrafficRefs, "ui-mode-disabled");
    }
  }, [nParamsUI.waveOvertonesEnabled, nParamsUI.waveOvertoneMode]);

  useEffect(() => startWaveOvertoneArpRuntime({
    audioCtx,
    getAudioCtx: () => audioCtxRef.current ?? audioCtx,
    room,
    refs: {
      waveOvertoneArpQueueRef,
      waveOvertoneArpTimerRef,
      // 90.61 silent Wellenstarter contract: the ARP runtime may play/trim,
      // but it does not feed traffic-forensics while the direct path is hot.
    },
    beginTransientEvent: (source, requestedVoices, intensity) => beginTransientEvent(source, requestedVoices, intensity),
    playScheduledTone,
    getTargets: () => [transientDriveSendsRef.current.waves, collectiveFxRef.current.waves?.input],
  }), [audioCtx, room]);

  useEffect(() => startQuantizedCollisionRuntime({
    audioCtx,
    room,
    gridTempoBpm,
    quantizeGrid,
    quantizeReferenceBars: particleQuantizeReferenceBars,
    refs: quantizedTrafficQueueRefs,
    freqFromY,
    clamp,
    playNexusAgentTone,
    getAudioPressureBias: getAudioEnginePressureBiasForTransientRuntime,
    getParticlePolicy: () => performanceCrisisRuntimePolicy.particles,
  }), [audioCtx, room, gridTempoBpm, quantizeGrid, particleQuantizeReferenceBars, nParamsUI.quantizeOn, nParamsUI.particlePreset, nParamsUI.agentEnabled, nParamsUI.agentVolumes, nParamsUI.particleSystem, nParamsUI.churchMode, performanceCrisisRuntimePolicy.particles]);

  useEffect(() => {
    if (room !== "RESONANCE" || nexusActive) return;
    resetResonanceTransientState();
  }, [room, nexusActive]);

  const {
    setParticleSystem,
    cycleParticleSystem,
    setChurchMode,
    setGridMode,
  } = buildAppResonanceParticleSystemModeActionPorts({
    nexusParamsRef,
    nexusRefs,
    updateNParams,
    commitResonanceCursorY,
  });

  const metaPresetActionBoundary = useAppMetaPresetActionBoundary({
    sessionMetaOverrides,
    nParamsUI,
    nexusParamsRef,
    nexusRefs,
    initialOvertonesByPreset,
    topologyLoopErrorRef,
    setActiveMetaPresetId,
    setActiveOvertoneMixer,
    setTParams,
    setSystemState,
    setMyzelEnabled,
    setMyzelPattern,
    setMyzelBallMode,
    setMyzelNodeMode,
    setMyzelStep16ths,
    setDroneVolume,
    setWaveSoundEnabled,
    setWaveSoundVolume,
    setWaveSoundPreset,
    setQuantizeGridMode,
    setGridTempoBpmWithTrafficReset,
    setRoom3BodyEnabled,
    setRoom3BodyControls,
    setCollectiveMemoryEnabled,
    setCollectiveMemoryWindow,
    setCollectiveMemoryUi,
    setPsychedelicSpiralEnabled,
    setPsychedelicSpiralFollow,
    setPsychedelicSpiralUi,
    setTransientDriveUi,
    setLiveMasteringEnabled,
    setLiveMasteringStrength,
    setLiveMasteringGlue,
    setLiveMasteringAir,
    changeGridTuning,
    setGridMode,
    setParticleSystem,
    setChurchMode,
    updateNParams,
    primeMyzelFromY,
    applyRealtimeDroneOvertones,
  });
  const { applyMetaPreset } = metaPresetActionBoundary;

  const metaPresetRouletteBoundary = useAppMetaPresetRouletteBoundary({
    metaPresetRouletteState,
    audioCtxRef,
    setSessionMetaOverrides,
    applyMetaPreset,
  });
  const { randomizeMetaPresetForSession, startMetaPresetRoulette } = metaPresetRouletteBoundary;

  useMaterialLoopPlaybackRuntimeBoundary({
    audioCtx: audioCtxRef.current ?? audioCtx,
    nexusActive,
    materialLoopActive: nParamsUI.materialLoopActive,
    selectedLoopMaterial,
    quantizeBpm: nParamsUI.quantizeBpm,
    materialLoopTimeMode: nParamsUI.materialLoopTimeMode,
    materialLoopVolume: nParamsUI.materialLoopVolume,
    materialLoopSyncToBeat: nParamsUI.materialLoopSyncToBeat,
    refs: materialLoopRuntimeRefs,
    getRhythmBus: (audioContext) => getLiveMasterBus(audioContext, "rhythm"),
    ensureMyzelPostFxRouter,
    getForgeSend: () => myzelPostFxSendsRef.current.forge,
  });

  useRootFollowPlaybackRuntimeBoundary({
    audioCtx: audioCtxRef.current ?? audioCtx,
    nexusActive,
    rootFollowLoopActive: nParamsUI.rootFollowLoopActive,
    selectedRootFollowLoop,
    selectedRootFollowLoopConfig,
    quantizeBpm: nParamsUI.quantizeBpm,
    rootFollowLoopTimeMode: nParamsUI.rootFollowLoopTimeMode,
    rootFollowLoopVolume: nParamsUI.rootFollowLoopVolume,
    rootFollowLoopGranulationMode: nParamsUI.rootFollowLoopGranulationMode,
    rootFollowGranularSettings: normalizeRootFollowGranularSettings(nParamsUI.rootFollowGranularSettings, nParamsUI.rootFollowLoopGranulationMode),
    rootFollowImpulsRasterEvery: nParamsUI.rootFollowImpulsRasterEvery,
    rootFollowImpulsRasterCycleDiv: nParamsUI.rootFollowImpulsRasterCycleDiv,
    rootFollowImpulsRasterClockMode: nParamsUI.rootFollowImpulsRasterClockMode,
    rootFollowImpulsRasterPattern: nParamsUI.rootFollowImpulsRasterPattern,
    refs: rootFollowRuntimeRefs,
    trafficRef: audioTrafficForensicsRef,
    getRhythmBus: (audioContext) => getLiveMasterBus(audioContext, "rhythm"),
    ensureMyzelPostFxRouter,
    getForgeSend: () => myzelPostFxSendsRef.current.forge,
    rootFollowPreviewActive,
    rootFollowPlayfieldInside,
    playfieldCursorInside: rootFollowPreviewActive || rootFollowPlayfieldInside,
    getCurrentRootHz: getCurrentRootFollowInputHz,
    getAudioPressureBias: getAudioEnginePressureBiasForTransientRuntime,
    rootFollowPolicy: performanceCrisisRuntimePolicy.rootFollow,
  });


  useEffect(() => {
    const rootFollowVoiceEngineMode = performanceCrisisUiPolicyState.rootFollowVoiceEngineMode;
    const shouldPrime =
      rootFollowVoiceEngineMode === "worklet-stable-lane-pilot" ||
      rootFollowVoiceEngineMode === "worklet-granular-pilot" ||
      rootFollowVoiceEngineMode === "worklet-granular-primary-candidate" ||
      rootFollowVoiceEngineMode === "worklet-direct-pilot" ||
      rootFollowVoiceEngineMode === "worklet-shadow" ||
      rootFollowVoiceEngineMode === "worklet-granular-shadow" ||
      rootFollowVoiceEngineMode === "worklet-buffer-shadow";
    if (!shouldPrime) return;
    const rootFollowPrimeCtx = audioCtxRef.current ?? audioCtx;
    if (!rootFollowPrimeCtx) return;
    void primeRootFollowWorkletLiveness({
      ctx: rootFollowPrimeCtx,
      trafficRef: audioTrafficForensicsRef,
      reason: "root-follow-worklet-liveness-prime",
    });
  }, [audioCtx, performanceCrisisUiPolicyState.rootFollowVoiceEngineMode, audioTrafficForensicsRef]);


  useAppAudioControlSchedulerRuntimeBoundary({
    audioCtx,
    ensureFinalMixBus,
    ensureCollectiveMemoryFx,
    ensureTransientDriveDevice,
    ensureEnterHoldPsyFxDevice,
    ensureSchwarmdeuterDevice,
    ensurePsychedelicSpiralDevice,
    collectSchwarmSnapshots,
    recordAudioTapSnapshot,
    setControlPerfMonitor,
    setCollectiveMemoryMonitor,
    setPsychedelicSpiralMonitor,
    setSchwarmMonitor,
    setMyzelPostFxMonitor,
    setLiveMasterMonitor,
    collectiveMemoryEnabled,
    collectiveMemoryWindow,
    collectiveMemoryUi,
    psychedelicSpiralEnabled,
    psychedelicSpiralFollow,
    psychedelicSpiralUi,
    transientDriveUi,
    nParamsUI,
    myzelEnabled,
    room3BodyEnabled,
    myzelPostFxEnabled,
    myzelPostFxGroup,
    myzelPostFxDepth,
    myzelPostFxParallel,
    droneVolume,
    waveSoundEnabled,
    waveSoundVolume,
    liveMasteringEnabled,
    liveMasteringStrength,
    liveMasteringGlue,
    liveMasteringAir,
    schwarmEnabled,
    schwarmUi,
    enterHoldPsyFxEnabled,
    enterHoldPsyFxUi,
    liveMasterMonitor,
    nexusParamsRef,
    collectiveMemoryWindowRef,
    collectiveFxRef,
    collectiveMemoryFramesRef,
    collectiveMemorySummaryRef,
    finalMixProbeRef,
    psychedelicSpiralRef,
    psychedelicSpiralSendsRef,
    transientDriveFxRef,
    transientDriveSendsRef,
    enterHoldPsyFxRef,
    enterHoldPsyFxSendsRef,
    schwarmdeuterRef,
    schwarmdeuterSendsRef,
    myzelPostFxRouterRef,
    room3TimbreStateRef,
    myceliumSnapshotRef,
    myzelGateRef,
    myzelLayerModRef,
    room3BodyControlsRef,
    myzelInterpreterMixRef,
    liveMasteringRef,
    finalOutputTrimRef,
    preFxTapAnalyserRef,
    postFxTapAnalyserRef,
    monitorTapAnalyserRef,
    deviceEnsureFunctionsComeFromAudioDeviceRackBoundary: true,
    controlSchedulerRuntimeBoundaryExtractedFromAppTsx: true,
    noWaveStarterBassOrRootFollowHotPathMoved: true,
    fullBrowserSanityRequiredAfterThisCut: true,
  });

  const nexusAudioActionSurface = useAppNexusAudioActionSurfaceBoundary({
    audioCtx,
    getAudioCtx: () => audioCtxRef.current ?? audioCtx,
    activeScheduledTonesRef,
    transientRuntimeRef,
    longToneHoldRef,
    getNoiseBuffer: () => nexusRefs.current.noiseBuffer,
    refucktorAudioGuardRef,
    particleRuntime: {
      getParticlePreset: () => nexusParamsRef.current.particlePreset,
      getParticleGradientX: () => nexusParamsRef.current.particleGradientX,
      getParticleGradientY: () => nexusParamsRef.current.particleGradientY,
      getParticleSampleProfileMode: () => nexusParamsRef.current.particleSampleProfileMode,
    },
    particleFx: {
      ensureCollectiveMemoryFx,
      ensurePsychedelicSpiralDevice,
      ensureTransientDriveDevice,
      ensureEnterHoldPsyFxDevice,
      ensureSchwarmdeuterDevice,
      ensureMyzelPostFxRouter,
    },
    particleAuxTargets: {
      getTransientDriveParticles: () => transientDriveSendsRef.current.particles,
      getPsychedelicSpiralParticles: () => psychedelicSpiralSendsRef.current.particles,
      getCollectiveMemoryParticles: () => collectiveFxRef.current.particles?.input,
      getSchwarmdeuterParticles: () => schwarmdeuterSendsRef.current.particles,
      getMyzelPostFxParticles: () => myzelPostFxSendsRef.current.particles,
    },
    room3BodyRuntime: {
      getEnabled: () => myzelEnabled,
      getBodyEnabled: () => room3BodyEnabledRef.current,
      getTopologyMode: () => myzelTopologyModeRef.current,
      getDestination: () => nexusRefs.current.room3BodyExciterGain,
      getModal: () => room3ModalStateRef.current,
      getControls: () => room3BodyControlsRef.current,
    },
    beginTransientEvent,
    ensureFinalMixBus,
    recordAudioPressureCount,
    recordAudioPressureAdaptiveAction,
    silentHotPathSources: { wave: true },
    noWaveStarterPolicyOwnedHere: true,
    noRootFollowPolicyOwnedHere: true,
  });
  const {
    playScheduledTone,
    triggerRoom3BodyExciter,
    releaseHeldScheduledTones,
    playNexusAgentTone,
  } = nexusAudioActionSurface;


  const {
    activeParticleNodes,
    toggleNexusAgent,
    setNexusAgentVolume,
  } = buildAppResonanceParticleAgentActionPorts({
    particleSystem: nParamsUI.particleSystem,
    audioCtx,
    audioCtxRef,
    nexusParamsRef,
    nexusRefs,
    updateNParams,
    playNexusAgentTone,
  });


  const {
    previewWavePresetSelection,
    previewParticlePresetSelectionAction,
  } = buildAppResonancePresetPreviewActionPorts({
    initAudio,
    waveSoundRuntimeRef,
    nexusParamsRef,
    waveOvertoneArpQueueRef,
    playWaveStartSound,
    playNexusAgentTone,
    gameWidth: GAME_WIDTH,
    gameHeight: GAME_HEIGHT,
  });


  const { enterArenaWorkspace, startGameRun } = useAppXenpolarGameArenaRuntimeBoundary({
    room,
    setRoom,
    gameCanvasRef,
    gameRefs,
    gameActive,
    setGameActive,
    setGameHud,
    keyRef,
    arenaInterpreterRef,
    getArenaInterpreterSnapshot,
    setArenaSeedStatus,
    initAudio: async () => { await initAudio(); },
    playScheduledTone,
    clampValue: clamp,
  });

  const {
    shouldEmitWellenstartHoldAudio,
    shouldEmitKeyboardHoldWavePreview,
    releaseWaveStarterHoldGestureForKey,
    resolveKeyboardWaveStarterSoundPreset,
  } = useWaveStarterHoldGestureLoopBridge({
    resonanceInputActive,
    audioCtx,
    audioCtxRef,
    activeScheduledTonesRef,
    longToneHoldRef,
    nexusParamsRef,
    nexusRefs,
    gridTempoBpm,
    waveSoundPreset,
    freqFromY,
    playWaveStartSound,
    recordAudioPressureAdaptiveAction,
  });

  const buildNexusRippleGestureRuntime = (
    playAudio = true,
    resolvePlayAudio?: (payload: { cursorY: number; freq: number }) => boolean,
  ) => ({
    nexusActive,
    refs: nexusRefs.current,
    params: nexusParamsRef.current,
    baseWaveMaxRadius: BASE_WAVE_MAX_RADIUS,
    clampValue: clamp,
    freqFromY,
    markWaveLaunch,
    playWaveStartSound,
    playAudio,
    resolvePlayAudio,
  });

  const spawnNexusRipple = (direction?: "left" | "right" | "up" | "down") => {
    runNexusRippleGesture(buildNexusRippleGestureRuntime(), direction);
  };

  const triggerDirectedPulse = (direction: "left" | "right" | "up" | "down") => {
    runNexusDirectedPulseGesture(buildNexusRippleGestureRuntime(), direction);
  };

  useAppManualJiOvertoneLifecycleBoundary({
    audioCtx,
    nexusActive,
    nexusRefs,
    nexusParamsRef,
    getLiveMasterBus,
    noJiOscillatorOwnershipResolvedHere: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  });

  useAppResonanceKeyboardInputEffectBoundary({
    resonanceInputActive,
    audioCtx,
    myzelEnabled,
    managedLoopMaterial,
    paramsRef: nexusParamsRef,
    arrowStateRef: nexusArrowRef,
    nexusRefs,
    keyboardMirrorRef,
    keyboardWindowOffsetRef,
    pitchLaneStateRef: resonanceKeyboardPitchLaneRef,
    exportedDrumConfigs,
    recentLoopHotkeyEntries,
    recentRootFollowHotkeyEntries,
    rootFollowInputTargetHzRef,
    rootFollowLoopActive: !!nParamsUI.rootFollowLoopActive,
    actions: {
      setSustainHoldActive,
      setSwellHoldActive,
      setOctaveHoldActive,
      setEnterHoldActive,
      releaseHeldScheduledTones,
      ensureAudioReady,
      reportAudioReadyFailure: (error, context) => reportXensonarPromiseFailure('audio', 'resonance-hotkey-audio-ready', error, context),
      ensureKeyboardPitchAudioReadyOnce,
      cycleQuantizeGrid,
      runEnterWaveGesture: (options) => runEnterWaveHotkeyGesture(
        buildNexusRippleGestureRuntime(true, ({ freq }) =>
          shouldEmitWellenstartHoldAudio(!!options?.isRepeat, freq),
        ),
      ),
      shouldEmitKeyboardHoldWavePreview,
      resolveKeyboardWaveStarterSoundPreset,
      releaseWaveStarterHoldGestureForKey,
      updateNParams,
      triggerDirectedPulse,
      previewKeyboardWindowShift,
      changeGridTuning,
      setGridMode,
      setChurchMode,
      cycleParticleSystem,
      selectMaterialLoopDirect,
      selectRootFollowLoopDirect,
      toggleMaterialLoopDirect,
      toggleRootFollowLoopDirect,
      browseMaterialLoopWithUmlaut,
      browseRootFollowLoopWithUmlaut,
      toggleNexusAgent,
      setKeyboardWindowStamp,
      getAudioPressureBias: getAudioEnginePressureBiasForTransientRuntime,
      getActiveScheduledToneCount: () => activeScheduledTonesRef.current.length,
      recordAdaptiveAction: recordAudioPressureAdaptiveAction,
      commitCursorY: commitResonanceCursorY,
    },
  });

  useAppMyzelTopologyRuntimeLoopBoundary({
    myzelEnabled,
    room,
    tParams,
    bassRootMode: nParamsUI.bassRootMode,
    selectedResidentId,
    topologyCanvasRef,
    topologyDragRef,
    topologyRefs,
    myceliumSnapshotRef,
    constellationStateRef,
    topologyLoopErrorRef,
    topologyLastStatusRef,
    myzelPrimedYRef,
    setSystemState,
    resetMyzelTopologyNodes,
    primeMyzelFromY,
    noUiChangedByBoundary: true,
    noAudioPolicyChangedByBoundary: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  });

  useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);

  useAppResonanceArrowMotionRaf({
    resonanceInputActive,
    myzelEnabled,
    bassRootMode: nParamsUI.bassRootMode,
    nexusParamsRef,
    nexusArrowRef,
    nexusRefs,
    focusCursorLastInputRef,
    gameWidth: GAME_WIDTH,
    clampValue: clamp,
    commitCursorY: commitResonanceCursorY,
  });

  const {
    installationSharedFieldActive,
    installAttractCursor,
    installAttractOscillatorBall,
  } = installationSharedFieldFlags;

  useAppResonanceHousekeepingBoundary({
    audioCtx,
    nexusActive,
    resonanceInputActive,
    myzelEnabled,
    tParams,
    nParamsUI,
    myzelBallMode,
    myzelNodeMode,
    myzelDriveEnabled,
    myzelInterpreterMix,
    installationSharedFieldActive,
    myceliumSnapshotRef,
    myceliumDroneAmountRef,
    myceliumDroneModRef,
    myzelGateRef,
    myzelLayerModRef,
    installationSharedFieldActiveRef,
    keyboardWindowOffsetRef,
    setKeyboardWindowStamp,
    commitResonanceCursorY,
    nexusRefs,
    nexusParamsRef,
    impactDecayOn,
    waveLaunchAtRef,
    waveImpactDecayRef,
    resetResonanceActionHolds,
    releaseHeldScheduledTones,
  });

  useAppSecondaryDroneOscillatorLifecycleBoundary({
    room,
    nexusActive,
    audioCtx,
    nexusRefs,
  });

  useAppResonanceNexusMainLoopBoundary({
    room,
    nexusActive,
    audioCtx,
    getLiveMasterBus,
    nexusRefs,
    nexusParamsRef,
    applyRealtimeDroneOvertones,
    nexusCanvasRef,
    myceliumDroneModRef,
    myzelEnabled,
    myzelLayerModRef,
    myzelGateRef,
    room3BodyEnabled,
    room3TimbreStateRef,
    droneVolume,
    resonanceFieldStepClockRef,
    installationSharedFieldActive,
    topologyRefs,
    installationFieldConfigRef,
    performanceCrisisRuntimePolicy,
    audioCtxRef,
    playNexusAgentTone,
    gridTempoBpm,
    quantizeGrid,
    particleQuantizeReferenceBars,
    quantizeAnchorRef,
    waveCollisionQueueRef,
    focusCursorRef,
    getVisibleGridLines,
    activeGridLineFreqRef,
    activeGridLineSinceRef,
    previousGridLineFreqRef,
    previousGridLineAtRef,
    keyboardWindowOffsetRef,
  });

  useAppDroneFrameMixSyncBoundary({
    audioCtx,
    nexusActive,
    nexusRefs,
    droneVolume,
    nParamsUI,
    myzelEnabled,
    myzelGateRef,
    myzelLayerModRef,
    myceliumDroneModRef,
    room3BodyEnabled,
    room3BodyControls,
    room3TimbreStateRef,
    room3ModalStateRef,
    noUiChangedByBoundary: true,
    noGainNormalization: true,
    noManualJiCollapse: true,
    noJiOscRouteResolution: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  });

  const readStableMusicLaneBeatWorkletOnly = useCallback(
    () => false,
    [],
  );

  useAppStableRhythmLaneSchedulerEffectProbe({
    audioCtx,
    nexusActive,
    ensureDrumMixBus,
    freqFromY,
    myceliumSnapshotRef,
    bassNoteAction: {
      nexusParamsRef,
      ensureFinalMixBus,
      enterHoldPsyFxEnabled,
      enterHoldRef,
      ensureEnterHoldPsyFxDevice,
      enterHoldPsyFxSendsRef,
    },
    myzelLayerStepAction: {
      nexusRefs,
      myzelEnabled,
      myzelTopologyModeRef,
      bassRootMode: nParamsUI.bassRootMode,
      bassRootHz: nParamsUI.bassRootHz,
      readInterpreterMyzelBaseHz: getInterpreterMyzelBaseHz,
      ensureMyzelSynth,
      myceliumSnapshotRef,
      myzelStep16ths,
      myzelLayerModRef,
      myzelGateRef,
      intensityGlobal: tParams.intensityGlobal,
      myzelBallMode,
      myzelNodeMode,
      myzelPattern,
      myzelInterpreterMix,
      readActiveDroneOvertoneMix: getActiveDroneOvertoneMix,
    },
    boundaryPorts: {
      rhythmForgeDrumPatternRef,
      rhythmForgeBassPatternRef,
      rhythmForgeDrumBarIndexRef,
      rhythmForgeBassBarIndexRef,
      rhythmForgeSeedRef,
      psyBassPatternRef,
      psyBassBarIndexRef,
      bassClipPlaybackCacheRef,
      bassClipBarRootRef,
      readBassClipById,
      scheduleStableRhythmMetronomePulse,
    },
    schedulerLoop: {
      nexusParamsRef,
      nexusRefs,
      selectedExportedDrumConfig,
      clearStableRhythmMetronomeTimeouts,
    },
    stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true,
    reactLifecycleNowHookOwned: true,
    appStillSuppliesEffectInputs: true,
    schedulerLoopStillProbeOwned: true,
    hotPathAddsNoPerStepBuilder: true,
    browserFunctionalSanityRequiredAfterThisCut: true,
    readStableMusicLaneBeatWorkletOnly,
  });

  useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary({
    audioCtx,
    nexusActive,
    nexusRefs,
    myzelEnabled,
    myzelTopologyMode,
    myzelTopologyModeRef,
    nParamsUI: {
      bassRootMode: nParamsUI.bassRootMode,
      bassRootHz: nParamsUI.bassRootHz,
    },
    getInterpreterMyzelBaseHz,
    getLiveMasterBus,
    ensureMyzelSynth,
    refs: {
      myceliumSnapshotRef,
      myzelCentralColorMixerRef,
      nodalDeviceMatrixRef,
      myzelAudioFieldEnvelopeRef,
      semanticInteractionEnvelopeRef,
      topologicalResonatorEnvelopeRef,
      myzelLayerModRef,
      myzelInterpreterMixRef,
      myzelGateRef,
      myzelFieldSpaceBoostRef,
      myzelLegacyAudioRef,
      myzelInstallationMixRef,
      installationSharedFieldActiveRef,
      installationFieldConfigRef,
    },
    policies: {
      myzelDriveEnabled,
      droneMinFreq: DRONE_MIN_FREQ,
      droneMaxFreq: DRONE_MAX_FREQ,
      isInstallationResidentBallCouplingActive,
    },
  });

  useAppRoom3BodyAudioRuntimeBoundary({
    audioCtx,
    nexusActive,
    nexusRefs,
    myzelEnabled,
    nParamsUI: {
      bassRootMode: nParamsUI.bassRootMode,
      bassRootHz: nParamsUI.bassRootHz,
      dronePreset: nParamsUI.dronePreset,
    },
    myceliumSnapshotRef,
    myzelGateRef,
    room3BodyControlsRef,
    myzelInterpreterMixRef,
    myzelPrimedYRef,
    room3ModFieldRef,
    room3TimbreStateRef,
    room3ModalStateRef,
    room3BodyEnabledRef,
    myzelTopologyModeRef,
    room3BodyCurveRef,
    getLiveMasterBus,
    noUiChangedByBoundary: true,
    noRouteRewrite: true,
    noModalBodyNormalization: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  });

  useResonanceMaterialFocusDefaults({ setDronePreset, updateNParams, setDroneVolume, setWaveSoundVolume, setWaveSoundPreset });

  // Global chrome manager buttons are handled by the global manager window host.
  // They no longer route through the Hauptraum just to mount a window.

  const {
    activeMetaPreset,
    highlightedMandalaPresetId,
    mandalaPresetColors,
    activeMyzelRootHz,
    selectedResidentNode,
    residentBaseHz,
    residentAddFrequencyHz,
    appResonanceChromeRuntimeArgs,
  } = useAppResonanceChromeRuntimeBoundary({
    display: {
      metaPreset: {
        activeMetaPresetId,
        roulettePreviewPresetId: metaPresetRouletteState.roulettePreviewPresetId,
        sessionMetaOverrides,
        mandalaPresetColorOverrides: metaPresetRouletteState.mandalaPresetColorOverrides,
      },
      resonanceStatus: {
        particleSystem: nParamsUI.particleSystem,
        churchMode: nParamsUI.churchMode,
        gridTuning: nParamsUI.gridTuning,
        gridMode: nParamsUI.gridMode,
        manualGridMutedSteps: nParamsUI.manualGridMutedSteps,
        manualGridStepOffsets: nParamsUI.manualGridStepOffsets,
        activeParticleNodeCount: activeParticleNodes.length,
        agentEnabled: nParamsUI.agentEnabled,
        bassRootMode: nParamsUI.bassRootMode,
        bassRootHz: nParamsUI.bassRootHz,
      },
      topologyResident: {
        getInterpreterMyzelBaseHz,
        residentSystem: installationFieldConfig.residentSystem,
        selectedResidentId,
        topologyNodes: topologyRefs.current.nodes,
        residentAddFrequencySlider,
      },
      keyboardWindow: {
        gridBase: nParamsUI.gridBase,
        keyboardWindowOffset: keyboardWindowOffsetRef.current,
      },
    },
    header: buildAppResonanceChromeHeaderPresentationSource({
      room,
      recordingActive: recordingRuntime.recordingActive,
      recordingDurationLabel: recordingRuntime.recordingTake.formatDuration(recordingRuntime.recordingState.durationMs),
      onToggleRecordingFromHeader: toggleHeaderRecording,
      logoMarkerPulses: recordingRuntime.logoMarkerPulses,
      xenpolarShortcutActive,
      addLogoMarker: () => recordingRuntime.addRecordingMarker("logo"),
      setFamilyRequestedActive,
      setRoom,
      setXenpolarView,
    }),
    status: buildAppResonanceChromeStatusPresentationSource({
      nParamsUI,
      cursorHudHz,
      materialLoopName: selectedLoopMaterial?.name ?? null,
      rootFollowLoopName: selectedRootFollowLoop?.name ?? null,
      onOpenMaterialLoopManager: undefined,
      onOpenRootFollowLoopManager: undefined,
      onOpenDrumPatternManager: undefined,
      onOpenBassPatternManager: undefined,
      resonanceActionBadges,
      driveActive: myzelDriveEnabled,
      formatHzCompact,
    }),
    sideRails: buildAppResonanceChromeSideRailsPresentationSource({
      isRecording: recordingRuntime.recordingActive,
      sideMarkerPulses: recordingRuntime.sideMarkerPulses,
      scrollbarInsetPx,
      addSideMarker: () => recordingRuntime.addRecordingMarker("side"),
      triggerSideMarkerPulse: recordingRuntime.triggerSideMarkerPulse,
    }),
    grooveStatus: buildAppResonanceChromeGrooveStatusPresentationSource({
      exportedDrumConfigs,
      nParamsUI,
    }),
  });
  void keyboardWindowStamp;

  const {
    previewPendingCustomResident,
  } = buildAppRoom3PreviewResidentActionPort({
    ensureAudioReady,
    residentAddFrequencyHz,
    customResidentSoundPreset,
    customResidentElasticPitch,
    installationFieldConfigRef,
    playNexusAgentTone,
  });

  const room3RuntimeEntry = useRoom3TopologyRuntimeEntry({
    room3Topology,
    residentBaseHz,
    residentAddFrequencyHz,
    particleSoundsMuted: nParamsUI.particleMute,
    setMyzelModeAndPower,
    setRoom,
    updateNParams,
  });
  const {
    toggleInstallResidents,
    setInstallResidentVolumeLevel,
    setInstallResidentSystemValue,
    setInstallResidentModeValue,
    openInstallationTopologyRoom,
    installationSharedFieldController,
  } = room3RuntimeEntry;


  const {
    materialTrackPanelProps,
    burstDiagnosticsPanelProps,
    performanceCrisisPanelProps,
    resonanceControlRuntimeProps,
    particleSystemRuntimeProps,
  } = useAppResonancePanelPropsBoundary(buildAppResonancePanelCallsiteSources({
    materialTrack: {
      nParamsUI, updateNParams, metronomePulse: appGlobalInputLowRiskBoundary.metronomePulse,
      enterArenaWorkspace, exportedDrumConfigs, selectedExportedDrumConfig, renameSelectedDrumConfig,
      removeSelectedDrumConfig, materialLoopPanelProps,
      previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef },
    },
    burstDiagnostics: {
      audioTapMonitor, audioBurstRecorder, audioPairTherapistStatus, rootFollowHealth,
      activeStressScenarioId: audioBurstRuntime.activeStressScenarioId,
      onChangeStressScenarioId: audioBurstRuntime.setActiveStressScenarioId,
      workspacePackageActivationReport, audioBurstRuntime,
      exportContextSource: { room, liveMasteringEnabled, gridTempoBpm, quantizeGrid, particleQuantizeReferenceBars, materialLoopActive: nParamsUI.materialLoopActive, waveSoundEnabled },
      recovery: { onRunAudioPairTherapistReset: resetAudioPairTherapistRuntime, onClearRootFollowBrowserState: clearRootFollowBrowserState, onReactivateRootFollowFromPackage: reactivateRootFollowFromLoadedPackage },
    },
    performanceCrisis: {
      uiPolicyState: performanceCrisisUiPolicyState,
      rootFollowGranulationSource: { nParamsUI, updateNParams },
      audioBurstRecorder,
    },
    resonanceControl: {
      state: { nParamsUI, droneVolume, transientDriveUi, quantizeGrid, particleQuantizeReferenceBars, gridTempoBpm, quantizeStepMs, myzelEnabled, myzelStep16ths, installationFieldConfig },
      gridAndTuning: { updateNParams, setChurchMode, changeGridTuning, setGridMode, getTuningSteps, commitResonanceCursorY, setQuantizeGrid, setParticleQuantizeReferenceBars, setGridTempoBpm: setGridTempoBpmWithTrafficReset },
      trafficRefs: { nexusRefs, quantizeAnchorRef, waveCollisionQueueRef, particleQuantizeSeenRef, particleQuantizeTimerRef },
      toneActions: { setDroneVolume, applyRealtimeDroneOvertones, updateTransientDriveSource },
      myzelInstallation: { toggleMyzelEnabled, setMyzelStep16ths, toggleInstallResidents, setInstallResidentVolumeLevel, setInstallResidentSystemValue, setInstallResidentModeValue, openInstallationTopologyRoom },
    },
    particleSystem: {
      selection: { setParticleSystem, activeParticleNodes },
      particlePresets: particleSoundMenuOptions,
      agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume },
    },
  }));

  const resonanceAuxPanelSource = buildAppResonanceAuxPanelPresentationSource({
    parallelEffects: {
      resonanceFxUiState,
      sharedFormatters: { formatHzCompact },
      schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS,
      liveMastering: liveMasteringCallsiteBoundary,
    },
    grooveBass: materialTrackPanelProps,
    recordingTake: recordingRuntime.recordingTake,
    burstDiagnostics: burstDiagnosticsPanelProps,
  });

  const resonanceSoundPaletteActionSource = buildAppResonanceSoundPaletteActionSource({
    setSelectedWaveOvertonePreset,
    randomizeMetaPresetForSession,
    applyMetaPreset,
  });

  const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({
    chrome: appResonanceChromeRuntimeArgs,
    auxPanels: resonanceAuxPanelSource,
    soundPaletteActions: resonanceSoundPaletteActionSource,
    stage: buildAppResonanceScreenStagePresentationSource({
      activity: {
        nexusActive,
        resonanceInputIndicator,
        setNexusActive,
      },
      canvas: {
        nexusCanvasRef,
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT,
        spawnNexusRipple,
      },
      audioReadiness: {
        ensureAudioReady,
        prewarmAudioRuntime,
        resetResonanceTransientState,
        audioCtx,
      },
      gridCursor: {
        updateNParams,
        nexusParamsRef,
        updateFocusCursor,
        activeGridDragStepRef,
        activeGridDragStartYRef,
        activeGridDragBaseOffsetRef,
        activeGridDragMovedRef,
        getVisibleGridLines,
        yFromFreq,
        setManualGridStepOffset,
        commitResonanceCursorY,
        toggleManualGridStepMute,
      },
      installationGate: {
        installationSharedFieldActive,
        installationSharedFieldController,
        nexusRefs,
        setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate,
      },
    }),
    soundPalette: buildAppResonanceScreenSoundPalettePresentationSource({
      presetMenus: {
        waveSoundPresets: waveStarterSoundMenuOptions,
      },
      metaMandala: {
        mandalaPresetColors,
        mandalaRandomizingPresetId: metaPresetRouletteState.mandalaRandomizingPresetId,
        rouletteIsSpinning: metaPresetRouletteState.rouletteIsSpinning,
        highlightedMandalaPresetId,
        activeMetaPreset,
        activeMetaPresetId,
        sessionMetaOverrides,
        startMetaPresetRoulette,
        hexToRgba,
      },
      waveControls: {
        waveSoundPreset,
        waveSoundEnabled,
        setWaveSoundEnabled,
        waveSoundVolume,
        setWaveSoundVolume,
        setDronePreset,
        setWaveSoundPreset,
        previewWavePresetSelection,
      },
      overtoneControls: {
        activeOvertoneMixer,
        setActiveOvertoneMixer,
        selectedWaveOvertonePreset,
        applyWaveOvertonePreset,
        setWaveOvertone,
        setDroneOvertone,
      },
    }),
    corePanels: buildAppResonanceScreenCorePanelsPresentationSource({
      resonanceControl: resonanceControlRuntimeProps,
      particleSystem: particleSystemRuntimeProps,
    }),
  });
  const appRoomSceneRuntimeSource = buildAppRoomScenePresentationSource({
    contracts: {
      room3Topology,
      room3RuntimeEntry,
    },
    topology: {
      handoffScene: {
        freqFromY,
        selectedLoopHandoffProfile,
        selectedLoopMaterial,
        summarizeHandoffProfile,
        setFamilyRequestedActive,
        setRoom,
        activeMyzelRootHz,
      },
      runtimeScene: {
        setMyzelModeAndPower,
        toggleMyzelEnabled,
        resetMyzelTopologyNodes,
      },
    },
    installation: {
      deviceScene: {
        particleSoundsMuted: nParamsUI.particleMute,
        onNodalDeviceEnabledChange: handleNodalDeviceEnabledChange,
        onNodalDeviceAmountChange: handleNodalDeviceAmountChange,
        onNodalDeviceTargetChange: handleNodalDeviceTargetChange,
      },
      residentScene: {
        previewPendingCustomResident,
        selectedResidentNode,
        residentBaseHz,
        residentAddFrequencyHz,
      },
    },
    viewport: {
      xenpolarScene: {
        familyRequestedActive,
        installationSharedFieldController,
        xenpolarView,
        setXenpolarView,
        resonanzwandererStatus,
        resonanzwandererBusy,
        resonanzwandererCanExport,
        handleResonanzwandererExportToXensonar,
        handleResonanzwandererExportToSpectralForge,
        handleResonanzwandererExportToSyntheticForge,
      },
      gameArenaScene: {
        gameActive,
        gameHud,
        gameCanvasRef,
        arenaSeedStatus,
        handleArenaSeedExport,
        startGameRun,
        returnToXensonarHauptraum,
      },
      spectralForgeEntryUploadState,
    },
  });

  const {
    snapshot: stationaryRhythmWorkletSnapshot,
    toggleProbe: toggleStationaryRhythmWorkletProbe,
  } = useAppStationaryRhythmProbeBoundary({
    ui: nParamsUI,
    tempoBpm: gridTempoBpm,
    ensureAudioReady,
    resolveDestination: (ctx) => getLiveMasterBus(ctx, "rhythm"),
  });

  const appRoomScenes = useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource);

  const appShellFrameProps = useAppSurfaceFrameShellBoundary({
    room,
    resonanceScreen: resonanceScreenRuntime,
    roomScenes: appRoomScenes,
    performanceCrisisPanelProps,
  });

  return (
    <>
      <AppShellFrame {...appShellFrameProps} />
      {browserWaveStarterImplant.snapshot.enabled ? (
        <div
          data-xensonar-browser-wave-starter-implant
          style={{
            position: 'fixed',
            left: 12,
            bottom: 12,
            zIndex: 99999,
            border: '1px solid rgba(167,243,208,0.55)',
            background: 'rgba(4,18,14,0.92)',
            color: '#d1fae5',
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            maxWidth: 330,
          }}
        >
          <div><strong>C11 Browser Implant</strong></div>
          <div>state: {browserWaveStarterImplant.snapshot.state}</div>
          <div>owner: {browserWaveStarterImplant.snapshot.ownsLane ? 'c11-wasm/reserved' : 'legacy'}</div>
          <div>{browserWaveStarterImplant.snapshot.sampleRate || '-'} Hz · {browserWaveStarterImplant.snapshot.transport ?? '-'}</div>
          <div>submitted: {browserWaveStarterImplant.snapshot.submittedAttacks} · ingress failed: {browserWaveStarterImplant.snapshot.failedSubmissions}</div>
          <div>legacy bypass: {browserWaveStarterImplant.snapshot.legacyBypasses} · {browserWaveStarterImplant.snapshot.lastBypassReason ?? '-'}</div>
          <div>Direct route: {browserWaveStarterImplant.snapshot.lastBypassReason === 'sample-preset'
            ? 'Legacy · Sample-Preset (noch nicht migriert)'
            : browserWaveStarterImplant.snapshot.ownsLane
              ? 'C11/WASM für Direct-Synth-Core'
              : 'Legacy'}</div>
          <div>Entrophon: {browserEntrophonImplant.snapshot.state} · {browserEntrophonImplant.snapshot.ownsRenderClass
            ? 'C11/WASM normal · Hold Legacy'
            : 'Legacy bis C11 READY'}</div>
          <div>last sound: {browserWaveStarterImplant.snapshot.lastSoundId ?? '-'}</div>
          {browserWaveStarterImplant.snapshot.lastError ? <div>error: {browserWaveStarterImplant.snapshot.lastError}</div> : null}
          <button
            type="button"
            onClick={() => { browserWaveStarterImplant.testTone(); }}
            disabled={browserWaveStarterImplant.snapshot.state !== 'ready'}
            style={{ marginTop: 6, fontSize: 11, fontWeight: 700 }}
          >
            C11 Testton
          </button>
          <button
            type="button"
            onClick={() => { browserWaveStarterImplant.panic(); }}
            disabled={!browserWaveStarterImplant.snapshot.ownsLane || browserWaveStarterImplant.snapshot.state === 'panicked'}
            style={{ marginTop: 6, marginLeft: 6, fontSize: 11 }}
          >
            Browser Panic
          </button>
          <button
            type="button"
            onClick={() => { browserWaveStarterImplant.downloadRuntimeDiagnostic(); }}
            style={{ marginTop: 6, marginLeft: 6, fontSize: 11, fontWeight: 700 }}
          >
            Runtime-Diagnose ZIP
          </button>
        </div>
      ) : null}
      {nativeWaveStarterPilot.snapshot.enabled ? (
        <div
          data-xensonar-native-wave-starter-pilot
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            zIndex: 99999,
            border: '1px solid rgba(103,232,249,0.55)',
            background: 'rgba(4,12,18,0.9)',
            color: '#cffafe',
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            maxWidth: 320,
          }}
        >
          <div><strong>Native Wellenstarter Pilot</strong></div>
          <div>state: {nativeWaveStarterPilot.snapshot.state}</div>
          <div>owner: {nativeWaveStarterPilot.snapshot.ownsLane ? 'native/reserved' : 'legacy'}</div>
          {nativeWaveStarterPilot.snapshot.physicalAudio ? (
            <div>{nativeWaveStarterPilot.snapshot.sampleRate} Hz · Q{nativeWaveStarterPilot.snapshot.deviceQuantumFrames}</div>
          ) : null}
          <div>attacks: {nativeWaveStarterPilot.snapshot.acceptedAttacks} ok / {nativeWaveStarterPilot.snapshot.failedAttacks} failed</div>
          <div>RFL-on native attacks: {nativeWaveStarterPilot.snapshot.rflAcceptedAttacks} ok / {nativeWaveStarterPilot.snapshot.rflFailedAttacks} failed</div>
          <div>last native sound: {nativeWaveStarterPilot.snapshot.lastSoundId ?? '-'}</div>
          <div>native peak: {nativeWaveStarterPilot.snapshot.nativePeak.toFixed(4)} · voices: {nativeWaveStarterPilot.snapshot.nativeVoicesStarted}</div>
          <button
            type="button"
            onClick={() => { nativeWaveStarterPilot.testTone(); }}
            disabled={nativeWaveStarterPilot.snapshot.state !== 'ready'}
            style={{ marginTop: 6, marginRight: 6 }}
          >
            Native Test Tone
          </button>
          {nativeWaveStarterPilot.snapshot.lastError ? <div>error: {nativeWaveStarterPilot.snapshot.lastError}</div> : null}
          <button
            type="button"
            onClick={() => { void nativeWaveStarterPilot.panic(); }}
            disabled={!nativeWaveStarterPilot.snapshot.ownsLane || nativeWaveStarterPilot.snapshot.state === 'panicked'}
            style={{ marginTop: 6, fontSize: 11 }}
          >
            Native Panic
          </button>
          <button
            type="button"
            onClick={() => { void nativeWaveStarterPilot.endPilot(); }}
            disabled={nativeWaveStarterPilot.snapshot.state === 'ended'}
            style={{ marginTop: 6, marginLeft: 6, fontSize: 11 }}
          >
            End Pilot
          </button>
        </div>
      ) : null}
      <StationaryRhythmWorkletProbeOverlay
        snapshot={stationaryRhythmWorkletSnapshot}
        onToggleProbe={toggleStationaryRhythmWorkletProbe}
      />
    </>
  );
}
