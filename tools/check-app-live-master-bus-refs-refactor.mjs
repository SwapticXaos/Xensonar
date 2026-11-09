#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts';
const hook = exists(hookPath) ? read(hookPath) : '';
const appLines = app.split(/\r?\n/).length;

const protectedFiles = [
  'src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts',
  'src/features/xensonar/audio/useLiveMasteringUiState.ts',
  'src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts',
  'src/features/xensonar/rooms/useResonanceActionHoldState.ts',
  'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const oldInlineRefNeedles = [
  'const finalMixBusRef = useRef<GainNode | null>(null);',
  'const drumMixBusRef = useRef<GainNode | null>(null);',
  'const masterMixBusRef = useRef<GainNode | null>(null);',
  'const finalLimiterRef = useRef<DynamicsCompressorNode | null>(null);',
  'const finalClipperRef = useRef<WaveShaperNode | null>(null);',
  'const finalOutputTrimRef = useRef<GainNode | null>(null);',
  'const finalMixAnalyserRef = useRef<AnalyserNode | null>(null);',
  'const preFxTapAnalyserRef = useRef<AnalyserNode | null>(null);',
  'const postFxTapAnalyserRef = useRef<AnalyserNode | null>(null);',
  'const monitorTapAnalyserRef = useRef<AnalyserNode | null>(null);',
  'const liveMasteringRef = useRef<LiveMasteringSystem | null>(null);',
  'const noDrumRecordClipperRef = useRef<WaveShaperNode | null>(null);',
  'const noDrumRecordLimiterRef = useRef<DynamicsCompressorNode | null>(null);',
  'const noDrumRecordOutputRef = useRef<GainNode | null>(null);',
  'const recordingDestinationWithDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);',
  'const recordingDestinationWithoutDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);',
];

const checks = {
  hookFileExists: exists(hookPath),
  appImportsLiveMasterBusRefsHook: app.includes('useLiveMasterBusRuntimeRefs'),
  appUsesLiveMasterBusRefsHook: app.includes('} = useLiveMasterBusRuntimeRefs();'),
  appNoLongerImportsLiveMasteringSystemType: !app.includes('type LiveMasteringSystem'),
  appNoLongerImportsLiveMasterBusRuntimeRefsType: !app.includes('type LiveMasterBusRuntimeRefs'),
  appNoLongerOwnsInlineLiveMasterRefs: oldInlineRefNeedles.every((needle) => !app.includes(needle)),
  appStillUsesBoundaryRuntimes: [
    'ensureFinalMixBusRuntime(ctx, liveMasterBusRuntimeRefs)',
    'ensureDrumMixBusRuntime(ctx, liveMasterBusRuntimeRefs)',
    'getLiveMasterBusRuntime(ctx, liveMasterBusRuntimeRefs, role)',
    'getLiveMasterEffectBusRuntime(ctx, liveMasterBusRuntimeRefs, effect)',
    'ensureLiveMasterRecordingDestinationRuntime(ctx, liveMasterBusRuntimeRefs, mode)',
  ].every((needle) => app.includes(needle)),
  appStillReadsAnalyserRefs: ['finalMixAnalyserRef.current', 'preFxTapAnalyserRef.current', 'postFxTapAnalyserRef.current', 'monitorTapAnalyserRef.current'].every((needle) => app.includes(needle)),
  hookOwnsAllLiveMasterRefs: oldInlineRefNeedles.every((needle) => hook.includes(needle.replace('const ', 'const '))),
  hookExportsRuntimeRefsContract: hook.includes('liveMasterBusRuntimeRefs: LiveMasterBusRuntimeRefs') && hook.includes('return {') && hook.includes('liveMasterBusRuntimeRefs,'),
  hookMemoizesRuntimeRefsObject: hook.includes('useMemo<LiveMasterBusRuntimeRefs>'),
  hookDoesNotTouchRuntimeBehavior: !/ensureFinalMixBusRuntime|ensureDrumMixBusRuntime|getLiveMasterBusRuntime|getLiveMasterEffectBusRuntime|connect\(|setTargetAtTime|updateLiveMasteringSystem/.test(hook),
  protectedFilesPresent: protectedFiles.every(exists),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  appLineCountUnder7010: appLines < 7010,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: hook.split(/\r?\n/).length,
  movedScope: [
    'Live-Master bus refs',
    'recording destination refs',
    'audio tap analyser scratch refs',
    'stable LiveMasterBusRuntimeRefs object contract',
  ],
  explicitlyNotMoved: [
    'live master bus runtime behavior',
    'recording runtime behavior',
    'audio tap snapshot computation',
    'FX control scheduler',
    'Wellenstarter sound emission',
    'Root-Follow runtime',
    'Room III / Myzel node-device audio',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
