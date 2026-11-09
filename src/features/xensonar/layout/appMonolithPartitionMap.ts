export const APP_MONOLITH_PARTITION_KEYS = [
  'resonancePanelProps',
  'resonanceScreenRuntimeAssembly',
  'roomSceneRuntimeBoundary',
  'roomScreenSurfaceMount',
  'globalInputAndMetronome',
  'livePerformanceState',
  'stableAudioLaneRuntime',
  'room3TopologyRuntime',
  'resonanceNexusMainLoop',
] as const;

export type AppMonolithPartitionKey = typeof APP_MONOLITH_PARTITION_KEYS[number];

export type AppMonolithPartitionStatus =
  | 'source-normalized'
  | 'assembly-extracted'
  | 'contract-audited'
  | 'source-builder-probed'
  | 'low-risk-callsite-normalized'
  | 'adapter-shape-audited'
  | 'adapter-callsite-probed'
  | 'arrow-motion-raf-shape-audited'
  | 'arrow-motion-raf-callsite-source-probed'
  | 'arrow-motion-raf-hook-extracted'
  | 'stable-rhythm-lane-scheduler-shape-audited'
  | 'stable-rhythm-lane-scheduler-callsite-source-probed'
  | 'stable-rhythm-lane-scheduler-action-port-shape-audited'
  | 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'
  | 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'
  | 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'
  | 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'
  | 'rhythm-forge-drum-cache-helper-probed'
  | 'bass-clip-root-binding-helper-probed'
  | 'rhythm-forge-bass-cache-helper-probed'
  | 'rhythm-forge-pattern-cache-shared-helper-probed'
  | 'stable-rhythm-lane-scheduler-cache-refs-callsite-grouped'
  | 'stable-rhythm-lane-boundary-groove-locals-normalized'
  | 'rhythm-forge-cache-request-builder-probed'
  | 'psy-bass-cache-request-builder-probed'
  | 'stable-rhythm-lane-cache-request-builders-probed'
  | 'stable-rhythm-lane-read-ports-callsite-grouped'
  | 'stable-rhythm-lane-action-ports-callsite-grouped'
  | 'stable-rhythm-lane-read-action-ports-grouped'
  | 'stable-rhythm-lane-step-voice-values-grouped'
  | 'stable-rhythm-lane-drum-step-branch-classifier-probed'
  | 'stable-rhythm-lane-bass-step-branch-classifier-probed'
  | 'stable-rhythm-lane-step-branch-classifiers-probed'
  | 'stable-rhythm-lane-pattern-cache-commit-probed'
  | 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'
  | 'stable-rhythm-lane-boundary-ports-builder-probed'
  | 'stable-rhythm-lane-boundary-ports-contract-probed'
  | 'stable-rhythm-lane-step-action-boundary-args-builder-probed'
  | 'stable-rhythm-lane-step-runners-probed'
  | 'stable-rhythm-lane-myzel-step-runner-probed'
  | 'stable-rhythm-lane-quantized-bass-step-values-probed'
  | 'stable-rhythm-lane-step-execution-frame-probed'
  | 'stable-rhythm-lane-step-execution-runner-probed'
  | 'stable-rhythm-lane-step-execution-frame-builder-probed'
  | 'stable-rhythm-lane-runner-call-plan-probed'
  | 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'
  | 'stable-rhythm-lane-call-plan-registry-vocabulary-probed'
  | 'stable-rhythm-lane-scheduler-loop-probed'
  | 'stable-rhythm-lane-bass-note-action-probed'
  | 'stable-rhythm-lane-hot-path-result-trimmed'
  | 'stable-rhythm-lane-myzel-layer-step-action-probed'
  | 'stable-rhythm-lane-effect-args-contract-probed'
  | 'stable-rhythm-lane-scheduler-effect-hook-probed'
  | 'resonance-keyboard-input-effect-boundary-extracted'
  | 'stable-rhythm-lane-runner-call-plan-fixture-probed'
  | 'stable-rhythm-lane-runner-call-plan-parity-probed'
  | 'psy-bass-cache-helper-probed'
  | 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'
  | 'input-metronome-scaffolding-contracted'
  | 'global-input-low-risk-hook-extracted'
  | 'source-readiness-audited'
  | 'readiness-candidate'
  | 'runtime-owned-outside-app-refactor'
  | 'audio-control-scheduler-runtime-boundary-extracted'
  | 'audio-device-rack-runtime-boundary-extracted'
  | 'audio-readiness-runtime-boundary-extracted'
  | 'drone-graph-routing-boundary-extracted'
  | 'manual-ji-overtone-lifecycle-boundary-extracted'
  | 'ji-overtone-master-lifecycle-boundary-extracted'
  | 'drone-frame-mix-sync-audited'
  | 'drone-frame-mix-sync-boundary-extracted'
  | 'myzel-topology-runtime-loop-boundary-extracted'
  | 'room3-body-audio-audited'
  | 'room3-body-audio-runtime-boundary-extracted'
  | 'resonance-nexus-main-loop-segment-audited'
  | 'resident-traffic-bridge-audited'
  | 'resident-traffic-bridge-io-snapshotted'
  | 'resident-traffic-bridge-frame-boundary-extracted'
  | 'particle-simulation-frame-boundary-extracted'
  | 'resonance-nexus-main-loop-boundary-extracted'
  | 'resonance-nexus-runtime-sessions-separated';

export type AppMonolithPartitionRisk =
  | 'low'
  | 'medium'
  | 'high';

export type AppMonolithPartitionEntry = {
  readonly key: AppMonolithPartitionKey;
  readonly currentAppRole: string;
  readonly currentBoundaryOrSeam: string;
  readonly status: AppMonolithPartitionStatus;
  readonly nextUsefulMove: string;
  readonly splitTarget: string;
  readonly risk: AppMonolithPartitionRisk;
  readonly appMustKeepVisible: readonly string[];
  readonly doNotCollapseWith: readonly AppMonolithPartitionKey[];
  readonly runtimeOwned: false;
  readonly audioMutating: false;
  readonly schedulingOwned: false;
  readonly packagePersistenceOwned: false;
  readonly visibleUiChangedByMap: false;
};

export const APP_MONOLITH_PARTITION_MAP = {
  resonancePanelProps: {
    key: 'resonancePanelProps',
    currentAppRole: 'collects materialTrack, burstDiagnostics, performanceCrisis, resonanceControl, and particleSystem source groups',
    currentBoundaryOrSeam: 'useAppResonancePanelPropsBoundary',
    status: 'source-normalized',
    nextUsefulMove: 'keep as stabilized panel input seam; do not keep extracting panel internals until a concrete duplicate structure appears',
    splitTarget: 'panel-props-source-normalization-layer',
    risk: 'medium',
    appMustKeepVisible: [
      'resonanceControl.state/gridAndTuning/trafficRefs/toneActions/myzelInstallation',
      'burstDiagnostics recovery/export sources',
      'particleSystem agentActions',
    ],
    doNotCollapseWith: ['roomSceneRuntimeBoundary', 'stableAudioLaneRuntime'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  resonanceScreenRuntimeAssembly: {
    key: 'resonanceScreenRuntimeAssembly',
    currentAppRole: 'passes named chrome, auxPanel, soundPalette, stage, and core panel sources into the Resonance screen assembly',
    currentBoundaryOrSeam: 'useAppResonanceScreenRuntimeAssembly',
    status: 'assembly-extracted',
    nextUsefulMove: 'treat as the first real screen assembly seam; next growth should prefer RoomScenes rather than piling more logic into this assembly',
    splitTarget: 'resonance-screen-runtime-source-assembly',
    risk: 'medium',
    appMustKeepVisible: [
      'stage.audioReadiness',
      'stage.gridCursor',
      'stage.installationGate / setRootFollowPlayfieldInsideGate',
      'soundPalette action bodies',
    ],
    doNotCollapseWith: ['roomScreenSurfaceMount', 'globalInputAndMetronome'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  roomSceneRuntimeBoundary: {
    key: 'roomSceneRuntimeBoundary',
    currentAppRole: 'passes grouped RoomScenes contract/topology/installation/viewport sources through a thin source builder into the RoomScenes boundary',
    currentBoundaryOrSeam: 'buildAppRoomSceneRuntimeSource plus useAppRoomSceneRuntimeBoundary',
    status: 'source-builder-probed',
    nextUsefulMove: 'RoomScenes source builder is now green; next move should audit whether surface mount can consume named roomScene source without owning Room III runtime',
    splitTarget: 'room-scene-runtime-source-builder-probe',
    risk: 'high',
    appMustKeepVisible: [
      'room3RuntimeEntry action bodies',
      'topology handoff profile and activeMyzelRootHz',
      'installation nodal device handlers',
      'viewport SpectralForge entry upload and scroll-intent consumption',
    ],
    doNotCollapseWith: ['resonanceScreenRuntimeAssembly', 'roomScreenSurfaceMount', 'stableAudioLaneRuntime'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  roomScreenSurfaceMount: {
    key: 'roomScreenSurfaceMount',
    currentAppRole: 'passes grouped surface mount sources through a thin builder into the surface frame boundary',
    currentBoundaryOrSeam: 'buildAppSurfaceFrameMountSource plus useAppSurfaceFrameRuntimeBoundary plus AppMainContent/AppRoomViewport mount contracts',
    status: 'source-builder-probed',
    nextUsefulMove: 'treat as stabilized surface mount seam; source-builder probe complete with no room lifecycle or viewport mount extraction; do not move AppMainContent/AppRoomViewport gates without a separate UI mount audit',
    splitTarget: 'surface-frame-and-room-viewport-mount-layer',
    risk: 'medium',
    appMustKeepVisible: [
      'room value',
      'performanceCrisisPanelProps side panel gate',
      'AppRoomViewport scene selection semantics',
    ],
    doNotCollapseWith: ['roomSceneRuntimeBoundary', 'resonancePanelProps'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  globalInputAndMetronome: {
    key: 'globalInputAndMetronome',
    currentAppRole: 'coordinates extracted low-risk global-input hook wrappers, keyboard-command adapter callsite probe, extracted arrow-motion RAF hook, stable rhythm lane scheduler compact callsite source, stable rhythm lane scheduler action-port shape audit, stable rhythm lane scheduler pre-step context compact builder, stable rhythm lane scheduler action-port arg-normalization/cache-mutation seam audit, stable rhythm lane scheduler cache mutation seam shape audit, APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS rhythm-forge drum cache helper candidate first, bass-clip root-binding cache helper candidate second, rhythm-forge bass cache helper probed third, shared RhythmForge pattern-cache helper probed across drum/bass wrappers, psybass cache helper probed fourth, extracted stable rhythm lane step-action boundary, named stable scheduler cacheRefs callsite group, local groove descriptor/base-swing normalization inside the step-action boundary, RhythmForge cache request builder probe, PsyBass cache request builder probe, read-port callsite group, action-port callsite group, step locals builder, drum/bass step voice values builders, explicit drum/bass step branch classifiers, explicit pattern-cache commit helper for RhythmForge/PsyBass pattern writes, explicit bass-clip root-binding commit helper, stable rhythm lane boundary ports builder, step-action boundary args builder, DrumStepRunner/BassStepRunner/MyzelStepRunner probes, quantized bass step values probe, shared step execution frame probe, combined step execution runner probe, step execution frame builder probe, runner call-plan probe, runner call-plan Shadow-Parity probe, runner call-plan Fixture-Probe, shared Call-Plan Contract Registry probe, Call-Plan Registry vocabulary source probe, explicit stable rhythm lane boundary ports contract probe, extracted stable rhythm lane scheduler loop probe, extracted stable rhythm lane bass note action probe, hot path runner result metadata trim, extracted Myzel layer step action probe, stable rhythm lane Effect args contract probe, stable rhythm lane scheduler effect hook probe, and metronome/input indicator state',
    currentBoundaryOrSeam: 'useAppGlobalInputLowRiskKeyCaptureBoundary, useAppGlobalInputLowRiskBrowserBoundary, APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_CALLSITE_PROBE, APP_RESONANCE_KEYBOARD_COMMAND_ADAPTER_SHAPE_AUDIT, APP_RESONANCE_ARROW_MOTION_RAF_SHAPE_AUDIT, useAppResonanceArrowMotionRaf, buildAppResonanceArrowMotionRafCompactCallsiteSource, APP_STABLE_RHYTHM_LANE_SCHEDULER_SHAPE_AUDIT, buildAppStableRhythmLaneSchedulerCompactCallsiteSource, buildAppStableRhythmLaneSchedulerInlineActionPort, APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_SHAPE_AUDIT, APP_STABLE_RHYTHM_LANE_SCHEDULER_PRESTEP_CONTEXT_SHAPE_AUDIT, buildAppStableRhythmLaneSchedulerPrestepContext, APP_STABLE_RHYTHM_LANE_SCHEDULER_ACTION_PORT_ARG_NORMALIZATION_OR_CACHE_MUTATION_SEAM_AUDIT, APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_MUTATION_SEAM_SHAPE_AUDIT, APP_STABLE_RHYTHM_LANE_SCHEDULER_CACHE_HELPER_CANDIDATE_AUDITS, resolveAppRhythmForgeDrumCacheHelperProbe, resolveAppBassClipRootBindingHelperProbe, resolveAppRhythmForgeBassCacheHelperProbe, resolveAppRhythmForgePatternCacheHelperProbe, buildAppRhythmForgePatternCacheRequestProbe, resolveAppPsyBassCacheHelperProbe, buildAppPsyBassCacheRequestProbe, executeAppStableRhythmLaneSchedulerStepActionBoundary, AppStableRhythmLaneSchedulerCacheRefs, AppStableRhythmLaneSchedulerReadPorts, AppStableRhythmLaneSchedulerActionPorts, buildAppStableRhythmLaneSchedulerStepLocalsProbe, buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe, buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe, resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe, resolveAppStableRhythmLaneSchedulerBassStepBranchProbe, commitAppStableRhythmLanePatternCacheCandidateProbe, commitAppStableRhythmLaneBassClipRootBindingProbe, buildAppStableRhythmLaneSchedulerBoundaryPortsProbe, appStableRhythmLaneSchedulerBoundaryPortsContractProbe, buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe, runAppStableRhythmLaneDrumStepProbe, runAppStableRhythmLaneBassStepProbe, runAppStableRhythmLaneMyzelStepProbe, buildAppStableRhythmLaneQuantizedBassStepValuesProbe, buildAppStableRhythmLaneStepExecutionFrameProbe, executeAppStableRhythmLaneStepExecutionFrameProbe, buildAppStableRhythmLaneStepExecutionFrameFromBoundaryProbe, buildAppStableRhythmLaneRunnerCallPlanProbe, APP_STABLE_RHYTHM_LANE_RUNNER_CALL_PLAN_CONTRACT_CASES, AppStableRhythmLaneRunnerCallPlanSchedulerCall, AppStableRhythmLaneRunnerCallPlanCacheContract, AppStableRhythmLaneRunnerCallPlanStep, buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe, assertAppStableRhythmLaneRunnerCallPlanParityProbe, runAppStableRhythmLaneRunnerCallPlanFixtureProbe, startAppStableRhythmLaneSchedulerLoopProbe, buildAppStableRhythmLaneBassNoteActionProbe, buildAppStableRhythmLaneMyzelLayerStepActionProbe, buildAppStableRhythmLaneEffectArgsContractProbe, useAppStableRhythmLaneSchedulerEffectProbe, hot path runner result metadata trimmed in Drum/Bass/Myzel runners, stableRhythmLaneStepExecutionFrame, stableRhythmLaneSchedulerBoundaryPorts, stableRhythmLaneStepActionBoundaryArgs, grooveDescriptors, rhythmForgeBaseSwing, stableRhythmLaneSchedulerDrumStepVoiceValues, stableRhythmLaneSchedulerBassStepVoiceValues, useAppGlobalBrowserInputCallsiteBoundary, and input/metronome audits',
    status: 'resonance-keyboard-input-effect-boundary-extracted',
    nextUsefulMove: 'Resonance keyboard input effect boundary owns keydown/keyup listener lifecycle while existing routers retain command interpretation; next move should prefer MetaPreset action boundary or keyboard guard-drift cleanup, not Wellenstarter/Root-Follow/Bass/Drum hot-path extraction.',
    splitTarget: 'resonance-keyboard-input-effect-boundary',
    risk: 'high',
    appMustKeepVisible: [
      'gameInputActive / resonanceInputActive distinction',
      'keyRef ownership',
      'metronomePulse and quantize-grid timing truth',
      'resonance keyboard input effect boundary owns keydown/keyup listener lifecycle; existing routers retain command interpretation',
      'arrow-motion RAF hook extracted; stable scheduler remains protected and keyboard command meaning remains router-owned',
      'stable rhythm lane scheduler callsite source probe only; scheduler loop stays inline',
      'stable rhythm lane scheduler action-port shape audit only; action-port closures stay inline',
      'stable rhythm lane scheduler pre-step context shape audit remains active; step/bar/root/groove provenance is guarded',
      'stable rhythm lane scheduler pre-step context compact builder only; scheduler loop and action-port closures stay inline',
      'stable rhythm lane scheduler action-port arg normalization/cache-mutation seam audit only; cache/ref mutations stay inline',
      'stable rhythm lane scheduler cache mutation seam shape audit only; cache writes stay inline',
      'stable rhythm lane scheduler cache helper candidate audits only; rhythm-forge drum, bass-clip root-binding, rhythm-forge bass, and psybass helpers now probed; cache writes are now explicit cacheRefs inside the step-action boundary',
      'stable rhythm lane scheduler step-action boundary extracted; outer scheduler transport remains App-owned',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-step-execution-frame-builder-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-step-execution-runner-probed'",
      'pattern-cache commit helper centralizes RhythmForge/PsyBass pattern cache writes only; sound scheduling remains explicit in the boundary',
      'bass-clip root-binding commit helper centralizes BassClip playback-cache and bar-frozen-root ref writes only; scheduleBassClipStep and quantize/playBassNote action ports remain boundary-owned',
      'stable rhythm lane boundary ports builder assembles cacheRefs/readPorts/actionPorts once before the schedule closure; transport, timer loop, step planning, cache writes, and sound scheduling remain App/Boundary-owned',
      'stable rhythm lane step-action boundary args builder compacts the non-stale boundary call arguments only; transport, timer loop, step planning, cache writes, and sound scheduling remain App/Boundary-owned',
      'stable rhythm lane DrumStepRunner owns exported/rhythmforge/classic drum branch execution inside the boundary layer; transport and timer loop remain App-owned',
      'stable rhythm lane BassStepRunner owns clip/rhythmforge/psybass/classic bass branch execution inside the boundary layer; playBassNote remains an action port and transport remains App-owned',
      'stable rhythm lane MyzelStepRunner owns only applyMyzelLayerStep dispatch inside the boundary layer; transport and timer loop remain App-owned',
      'stable rhythm lane runner call-plan Shadow-Parity probe records metronome/drum/bass/myzel branch intent cases and asserts observed call plans without scheduling, cache mutation, quantize reads, audio action, timer work, or moving Transport-Verantwortung; Transport-Verantwortung bleibt App-owned',
      'stable rhythm lane runner call-plan Fixture-Probe executes synthetic call-plan examples through the parity assertion surface and covers metronome/drum/bass/myzel branches without scheduling, cache mutation, quantize reads, audio action, timer work, or moving Transport-Verantwortung; Transport-Verantwortung bleibt App-owned',
      'stable rhythm lane runner Call-Plan Contract Registry is the shared source for branch→scheduler/cache/quantize intent used by call-plan builder, Shadow-Parity, and Fixture-Probe; duplicate tables are intentionally collapsed without scheduling, cache mutation, quantize reads, audio action, timer work, or moving Transport-Verantwortung; Transport-Verantwortung bleibt App-owned',
      'stable rhythm lane Call-Plan Registry now also owns the shared vocabulary types for scheduler-call/cache-contract/plan-step; CallPlanProbe re-exports compatibility types but no longer defines the shared vocabulary',
      'stable rhythm lane scheduler loop body is extracted into startAppStableRhythmLaneSchedulerLoopProbe; App.tsx keeps the React useEffect gate and dependency list, while the loop probe owns the timer body and nextAbsoluteStep ref write through the same App nexus ref; no audio body, playBassNote, applyMyzelLayerStep, cache mutation, or UI path is moved',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-scheduler-loop-probed'",
      'stable rhythm lane boundary ports contract separates cache/read/action port type source from the StepActionBoundary executor; boundary remains execution gate only; Frame vorbereiten → Frame ausführen still describes the small boundary form while Transport-Verantwortung, Timer-Verantwortung, nextAbsoluteStep-Zeitwahrheit, cache writes, audio action, and step planning remain unmoved',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-boundary-ports-contract-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-runner-call-plan-parity-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-runner-call-plan-probed'",
      'stable rhythm lane quantized bass step values are built only in clip/rhythmforge/psybass branches; classic bass does not read quantizeBpm and playBassNote remains an action port',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-myzel-step-runner-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-step-runners-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-step-action-boundary-args-builder-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-boundary-ports-builder-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-pattern-cache-commit-probed'",
      'shared RhythmForge pattern cache helper is under the drum/bass wrappers only; drum/bass scheduling remains semantically split',
      'stable rhythm lane scheduler cacheRefs are grouped once at the callsite and typed by the boundary; ref objects still point to App-owned refs',
      'Myzel layer step action extracted from App.tsx; it is built once per stable-rhythm Effect and must not become per-step builder Verwaltung',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-myzel-layer-step-action-probed'",
      'Stable rhythm lane effect args contract groups bass/Myzel action creation, boundary port assembly, and scheduler loop args into one Effect-local contract; React lifecycle remains App-owned and no call-plan observer or per-step builder is added to the live audio path',
      'CallPlan/Parity/Fixture remain cold proof paths while live-audio hot path runner result metadata stays trimmed',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-scheduler-effect-hook-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-hot-path-result-trimmed'",
      'stable rhythm lane scheduler step-action boundary now names grooveDescriptors and rhythmForgeBaseSwing once before role-specific helper calls',
      'RhythmForge cache request builder normalizes kind/seedSalt/flavor/root/swing/descriptors but does not write cache refs or schedule sound',
      'PsyBass cache request builder normalizes seedSalt/style/pressure/root/swing/descriptors but does not write cache refs or schedule sound',
      'stable rhythm lane read ports are grouped once at the App callsite and passed as AppStableRhythmLaneSchedulerReadPorts; read closures are no longer allocated inside every non-stale step call',
      'stable rhythm lane action ports are grouped once at the App callsite and passed as AppStableRhythmLaneSchedulerActionPorts; musical actions stay in the same separated drum/bass/myzel paths',
      'stable rhythm lane step locals builder derives step/bar/drumStyle/root/grooveDescriptors/rhythmForgeBaseSwing after the non-stale guard; pre-step provenance remains boundary-owned',
      'stable rhythm lane drum/bass step voice values builders normalize level/kit/grit/root/stepDuration defaults only; Drum/Bass scheduling and cache writes remain split inside the boundary',
      'stable rhythm lane drum step branch classifier maps inactive/exported/rhythmforge/classic before scheduling; classifier itself has no cache writes, audio, or scheduler ownership',
      'stable rhythm lane bass step branch classifier maps inactive/clip/rhythmforge/psybass/classic before scheduling; clip priority remains before rhythmforge/psy/classic and classifier itself has no cache writes, audio, or scheduler ownership',
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-drum-step-branch-classifier-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-bass-step-branch-classifier-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-step-voice-values-grouped'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-action-ports-callsite-grouped'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-read-ports-callsite-grouped'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-cache-request-builders-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-boundary-groove-locals-normalized'",
      "successor lineage marker for older guards: status: 'rhythm-forge-cache-request-builder-probed'",
      "successor lineage marker for older guards: status: 'psy-bass-cache-request-builder-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-scheduler-cache-refs-callsite-grouped'",
      "successor lineage marker for older guards: status: 'rhythm-forge-pattern-cache-shared-helper-probed'",
      "successor lineage marker for older guards: status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'",
      'input/metronome scaffolding contraction only; App.tsx line count must shrink without moving ownership',
      'low-risk key-capture and browser input hooks are extracted without moving musical keyboard commands',
      'arrow-motion RAF hook extracted without absorbing keyboard commands or stable scheduler',
      'resonance keyboard input effect boundary owns keydown/keyup listener lifecycle while existing routers retain command interpretation; no new queue/call-plan/registry introduced',
    ],
    doNotCollapseWith: ['resonanceScreenRuntimeAssembly', 'roomScreenSurfaceMount', 'stableAudioLaneRuntime'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  livePerformanceState: {
    key: 'livePerformanceState',
    currentAppRole: 'owns UI state hooks and runtime ref containers for performance/crisis/live-mastering state; audio-control scheduler, audio device rack, audio-readiness, Drone graph-routing shell, manual JI lifecycle, canonical filter-routed jiOsc layer, and Drone frame mix sync now live outside App.tsx' ,
    currentBoundaryOrSeam: 'useAppAudioControlSchedulerRuntimeBoundary plus useAppAudioDeviceRackRuntimeBoundary plus useAppAudioReadinessRuntimeBoundary plus useAppDroneGraphRoutingBoundary plus useAppManualJiOvertoneLifecycleBoundary plus resonanceJiFilterLayer plus useAppDroneFrameMixSyncBoundary plus APP_DRONE_FRAME_MIX_SYNC_AUDIT plus live performance state shape/dependency/contract audits',
    status: 'drone-frame-mix-sync-boundary-extracted',
    nextUsefulMove: 'Drone frame mix sync boundary extracted as a pure refactor; no UI changed, no gain normalization, no JI/manual collapse, no Wellenstarter/Root-Follow live policy change; next audio-adjacent move should audit Myzel/Topology or Room3 Body rather than add visible UI',
    splitTarget: 'drone-frame-mix-sync-boundary',
    risk: 'medium',
    appMustKeepVisible: [
      'performanceCrisisUiPolicyState',
      'liveMasteringCallsiteBoundary',
      'audioBurstRuntime and recorder role separation',
      'audio-control scheduler runtime boundary; no WaveStarter/Bass/Root-Follow hot path moved',
      'audio-device rack runtime boundary; bus/FX ensure surface extracted without absorbing WaveStarter/Bass/Root-Follow hot paths',
      'audio-readiness runtime boundary; AudioContext start/resume, warmup sweep, Worklet smoke-test, and keyboard pitch audio latch extracted without moving WaveStarter/Bass/Root-Follow/Room3-Body hot paths',
      'drone graph-routing boundary; bus shell, drive insert, flanger/formant and FX sends extracted while manual JI, jiOsc ownership ambiguity, syncDroneMix frame authority, Wellenstarter, Root-Follow, Bass/Drum and Room3 Body hot paths remain untouched',
      'manual JI lifecycle boundary extracted without collapsing jiOscs/manualJiOscs or Wellenstarter/Root-Follow live policy',
      'historical JI overtone master lifecycle boundary remains in source as a non-canonical comparison path but is no longer mounted from App after the live-green filter-route ownership resolution',
      'lineage marker: jiOsc ownership-resolution plan remains protected after JI overtone lifecycle extraction',
      "successor lineage marker for older guards: status: 'ji-overtone-master-lifecycle-boundary-extracted'",
      "successor lineage marker for older guards: firstSafeMove: 'ji-overtone-master-lifecycle-boundary-extracted'",
      'Drone frame mix sync boundary extracted as a pure refactor; no UI changed, no gain normalization, no JI/manual collapse, no Wellenstarter/Root-Follow live policy change',
      "successor lineage marker for older guards: status: 'drone-graph-routing-boundary-extracted'",
      "successor lineage marker for older guards: firstSafeMove: 'drone-graph-routing-boundary-extracted'",
    ],
    doNotCollapseWith: ['stableAudioLaneRuntime', 'resonancePanelProps'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  stableAudioLaneRuntime: {
    key: 'stableAudioLaneRuntime',
    currentAppRole: 'is referenced by App-owned state and controls but should remain an audio-runtime lane concern',
    currentBoundaryOrSeam: 'audio/stableRhythmLane and AudioTraffic/AudioPressure witnesses',
    status: 'runtime-owned-outside-app-refactor',
    nextUsefulMove: 'only expose telemetry or controls through narrow sources; never collapse lane runtime into UI assembly patches',
    splitTarget: 'stable-audio-lane-runtime-module',
    risk: 'high',
    appMustKeepVisible: [
      'Drum/Bass/Material lane protection priority',
      'AudioTraffic burst windows',
      'AudioPressureWitness role',
    ],
    doNotCollapseWith: ['globalInputAndMetronome', 'resonanceScreenRuntimeAssembly', 'roomSceneRuntimeBoundary'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
  room3TopologyRuntime: {
    key: 'room3TopologyRuntime',
    currentAppRole: 'connects Room III topology UI state, runtime entry actions, scene handoff props, delegates the Myzel/Topology RAF loop to a narrow runtime boundary, and delegates the Room3 Body Audio creation/RAF/cleanup body to a narrow runtime boundary',
    currentBoundaryOrSeam: 'useRoom3TopologyRuntimeEntry plus useAppRoomSceneRuntimeBoundary plus useAppMyzelTopologyRuntimeLoopBoundary plus useAppRoom3BodyAudioRuntimeBoundary plus APP_ROOM3_BODY_AUDIO_AUDIT',
    status: 'room3-body-audio-runtime-boundary-extracted',
    nextUsefulMove: 'Room3 Body Audio runtime boundary extracted as pure refactor; creation, RAF, and cleanup move together; no UI changed, no route rewrite, no modal-body normalization, no Wellenstarter/Root-Follow live policy change',
    splitTarget: 'room3-body-audio-runtime-boundary',
    risk: 'high',
    appMustKeepVisible: [
      'topology canvas handlers',
      'nodal device handlers',
      'resident preview action',
      'installationSharedFieldController crossing into Resonance stage gate',
      'Myzel/Topology runtime loop boundary extracted as pure refactor; no UI changed, no audio policy changed, no Wellenstarter/Root-Follow live policy moved',
      'Room3 Body Audio audited as a pure refactor-prep map; no UI changed, no audio node lifecycle moved, no route rewrite, no modal-body normalization, no Wellenstarter/Root-Follow live policy change',
      'Room3 Body Audio runtime boundary extracted as pure refactor; creation, RAF, and cleanup move together; no UI changed, no route rewrite, no modal-body normalization, no Wellenstarter/Root-Follow live policy change',
    ],
    doNotCollapseWith: ['stableAudioLaneRuntime', 'resonancePanelProps'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },

  resonanceNexusMainLoop: {
    key: 'resonanceNexusMainLoop',
    currentAppRole: 'App supplies Resonance Nexus runtime ports; the lifecycle boundary now composes an explicit core-audio session and a separate RAF frame runtime while preserving one React effect and cleanup order',
    currentBoundaryOrSeam: 'useAppResonanceNexusMainLoopBoundary composes resonanceNexusCoreAudioSession + resonanceNexusFrameRuntime; frame runtime delegates Drone audio writes, field/particle/resident traffic, and overlay kernels',
    status: 'resonance-nexus-runtime-sessions-separated',
    nextUsefulMove: 'live-smoke Patch 265 before considering any further lifecycle split. The next question is stale snapshot/live-reader semantics, not additional file slicing',
    splitTarget: 'resonance-nexus-core-audio-session-plus-frame-runtime',
    risk: 'high',
    appMustKeepVisible: [
      'Patch 260 whole-body move established the boundary; Patches 261-265 split field/overlay/frame kernels and now compose core audio + RAF sessions under one preserved React lifecycle',
      'hook order and Effect dependencies remain exactly room/nexusActive/audioCtx; no snapshot-to-live reader conversion in the boundary move',
      'primary drone graph setup/cleanup now live in resonanceNexusCoreAudioSession; canonical jiOsc ownership is the live-green filter-routed resonanceJiFilterLayer',
      'primary drone frame writes remain a musical frame-authority, not generic state sync',
      'ripple/sector pulse mutation order must remain before resident wave event collection',
      'resident traffic bridge touches quantize anchor, collision queue, and direct playNexusAgentTone branch; no new queue/call-plan layer here',
      'resident traffic bridge frame boundary is called from the same Nexus RAF slot and owns residentFieldFrame projection, residentWaveEvents collection, quantized queue branch, direct resident-tone branch, and sourceKey/targetKind provenance as a pure refactor seam',
      'particle simulation frame boundary owns only advance/render callsites; installationAttractors provenance, resident traffic bridge, quantize anchor, and Wellenstarter/Root-Follow live policy remain outside',
      'Particle simulation frame boundary extracted as pure refactor; no UI changed, no particle policy rewrite, no resident traffic policy ownership, no Wellenstarter/Root-Follow live policy change',
      "successor lineage marker for older guards: status: 'resident-traffic-bridge-frame-boundary-extracted'",
      "successor lineage marker for older guards: firstSafeMove: 'resident-traffic-bridge-frame-boundary-extracted'",
      "successor lineage marker for older guards: splitTarget: 'resident-traffic-bridge-frame-boundary'",
      'grid/keyboard window drawing mutates active/previous line refs and must not be treated as static UI',
      'Resonance Nexus main loop segmented as audit-only; no UI changed, no audio node lifecycle moved, no visual clock split, no resident traffic policy moved, no Wellenstarter/Root-Follow live policy change',
      'Resident traffic bridge IO snapshotted as audit-only follow-up; no UI changed, no runtime moved, no frame-order move, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no Wellenstarter/Root-Follow live policy change',
      'Resident traffic bridge frame boundary extracted as pure refactor; no UI changed, frame call remains in the same Nexus RAF slot, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no resident sound normalization, no Wellenstarter/Root-Follow live policy change',
      'Resident traffic bridge audited as a pure follow-up to the Nexus main-loop segment audit; no UI changed, no runtime moved, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no Wellenstarter/Root-Follow live policy change',
      "successor lineage marker for older guards: status: 'resident-traffic-bridge-audited'",
      "successor lineage marker for older guards: firstSafeMove: 'resident-traffic-bridge-audited'",
      "successor lineage marker for older guards: status: 'resonance-nexus-main-loop-segment-audited'",
      "successor lineage marker for older guards: firstSafeMove: 'resonance-nexus-main-loop-segment-audited'",
      "successor lineage marker: status: 'resonance-nexus-main-loop-boundary-extracted'",
      "current lineage marker: status: 'resonance-nexus-runtime-sessions-separated'",
      "current lineage marker: firstSafeMove: 'resonance-nexus-main-loop-boundary-extracted'",
      "successor lineage marker for older guards: firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'",
    ],
    doNotCollapseWith: ['stableAudioLaneRuntime', 'globalInputAndMetronome', 'room3TopologyRuntime', 'livePerformanceState'],
    runtimeOwned: false,
    audioMutating: false,
    schedulingOwned: false,
    packagePersistenceOwned: false,
    visibleUiChangedByMap: false,
  },
} as const satisfies Record<AppMonolithPartitionKey, AppMonolithPartitionEntry>;

export const APP_MONOLITH_PARTITION_NEXT_CUTS = {
  currentPatchRole: 'Patch 265 completes the post-260 Resonance Nexus internal split: core audio session, synchronous RAF frame runtime, field/traffic kernels and overlay are explicit while one React lifecycle preserves start/cleanup order',
  strongestNextCandidate: 'resonanceNexusMainLoop',
  firstSafeMove: 'resonance-nexus-runtime-sessions-separated',
  explicitlyAvoidNext: [
    'stableAudioLaneRuntime extraction through App.tsx',
    'globalInputAndMetronome collapse into screen assembly',
    'Room III Body Audio runtime extraction that does not preserve creation + RAF + cleanup as one body boundary',
    'surface mount source builder that moves AppMainContent mount gates or room lifecycle',
    'keyboard-command adapter shape audit that absorbs resonance keyboard musical command bodies',
    'arrow-motion RAF hook extraction that absorbs keyboard commands or stable scheduler ownership',
    'global input source builder that absorbs stable rhythm lane scheduling or drum/bass scheduling callbacks',
    'stable rhythm lane scheduler callsite source probe that moves setTimeout, action-port fanout, nextAbsoluteStep, or drum/bass/Myzel scheduling ownership',
    'stable rhythm lane scheduler action-port shape audit that moves metronome, drum, bass, or Myzel action closures',
    'stable rhythm lane scheduler pre-step context shape audit that moves step, barIndex, root, drumStyle, lane-kit, or groove ownership',
    'audio-control scheduler extraction that absorbs WaveStarter attack, Bass Pattern/Root-Follow-like loop, or Root-Follow cursor-following live paths',
    'audio-device rack extraction that turns WaveStarter/Bass/Root-Follow live attacks into managed call-plan routes',
    'audio-readiness extraction that absorbs WaveStarter attack, Root-Follow rendering, Bass/Drum lane scheduling, or Room3 Body Audio ownership',
    'drone graph-routing extraction that resolves jiOsc ownership, collapses manualJiOscs into jiOscs, absorbs syncDroneMix frame authority, or changes Wellenstarter/Root-Follow live policy',
    'JI overtone master lifecycle extraction that collapses manualJiOscs into jiOscs, removes the main-loop fallback without listening-aware route decision, moves syncDroneMix frame authority, or changes Wellenstarter/Root-Follow live policy',
    'Drone frame mix sync boundary changes UI, normalizes gain behavior, collapses manualJiOscs into jiOscs, resolves jiOsc route without listening proof, or changes Wellenstarter/Root-Follow live policy',
    'Resident traffic bridge extraction that changes quantize-anchor provenance, queue policy, direct-vs-queued branching, resident sound resolution, Wellenstarter/Root-Follow live policy, or frame mutation order',
    'Particle simulation frame boundary that changes UI, rewrites particle policy, absorbs resident traffic policy, changes installationAttractors provenance, or changes Wellenstarter/Root-Follow live policy',
    'Resonance Nexus main-loop boundary follow-up that changes Effect dependencies, converts captured values into live readers, resolves jiOsc fallback ownership, changes frame order, or separates creation from cleanup before live-smoke',
    'Myzel/Topology runtime loop boundary changes UI, creates audio nodes, changes Myzel snapshot semantics, or absorbs Wellenstarter/Root-Follow live policy',
    'Room3 Body Audio audit that changes UI, moves audio nodes, rewrites routes, normalizes modal body behavior, or absorbs Wellenstarter/Root-Follow live policy',
    'Resonance Nexus main loop audit that extracts runtime, changes UI, moves audio nodes, splits the visual clock, changes resident traffic quantize policy, or absorbs Wellenstarter/Root-Follow live policy',
    'resonance keyboard input extraction that changes Wellenstarter attack policy, Root-Follow pitch policy, Materialspur selection semantics, or stable rhythm scheduling',
  ] as const,
} as const;
