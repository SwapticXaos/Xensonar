#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const appLines = app.split(/\r?\n/).length;

const files = {
  keyboardGridRefs: 'src/features/xensonar/input/useResonanceKeyboardGridRuntimeRefs.ts',
  spectralForgeEntry: 'src/features/xensonar/rooms/useSpectralForgeEntryUploadState.ts',
  audioContextRefs: 'src/features/xensonar/audio/useAudioContextRuntimeRefs.ts',
  metaRoulette: 'src/features/xensonar/rooms/useMetaPresetRouletteState.ts',
};

const contents = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, exists(file) ? read(file) : '']));

const protectedFiles = [
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  'src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts',
  'src/features/xensonar/rootFollow/useRootFollowRuntimeBoundary.ts',
  'src/features/xensonar/material/useMaterialLoopRuntimeBoundary.ts',
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const checks = {
  hookFilesExist: Object.values(files).every(exists),
  appImportsAllRuntimeRefHooks: [
    'useResonanceKeyboardGridRuntimeRefs',
    'useSpectralForgeEntryUploadState',
    'useAudioContextRuntimeRefs',
    'useMetaPresetRouletteState',
  ].every((needle) => app.includes(needle)),
  keyboardGridHookOwnsRefs: [
    'const keyboardMirrorRef = useRef(true)',
    'const activeGridLineFreqRef = useRef<number | null>(null)',
    'const previousGridLineFreqRef = useRef<number | null>(null)',
    'const rootFollowInputTargetHzRef = useRef<number | null>(null)',
    'const resonanceKeyboardPitchLaneRef = useRef(createResonanceKeyboardPitchLaneState())',
    'const activeGridDragStepRef = useRef<number | null>(null)',
  ].every((needle) => contents.keyboardGridRefs.includes(needle)),
  appNoLongerOwnsKeyboardGridRefsDirectly: [
    'const keyboardMirrorRef = useRef(true);',
    'const activeGridLineFreqRef = useRef<number | null>(null);',
    'const rootFollowInputTargetHzRef = useRef<number | null>(null);',
    'const resonanceKeyboardPitchLaneRef = useRef(createResonanceKeyboardPitchLaneState());',
    'const activeGridDragStepRef = useRef<number | null>(null);',
  ].every((needle) => !app.includes(needle)),
  spectralForgeEntryHookOwnsBridgeState: [
    'spectralForgeExternalAudioFile',
    'setSpectralForgeExternalAudioFile',
    'spectralForgeExternalAudioOrigin',
    'setSpectralForgeExternalAudioOrigin',
    'spectralForgeEntryScrollIntent',
    'setSpectralForgeEntryScrollIntent',
    'spectralForgeCutUploadSequenceRef',
    'spectralForgeCutUploadRafIdsRef',
  ].every((needle) => contents.spectralForgeEntry.includes(needle)),
  appUsesSpectralForgeEntryContractObject: app.includes('const spectralForgeEntryUploadState = useSpectralForgeEntryUploadState();')
    && app.includes('spectralForgeEntryUploadState.spectralForgeCutUploadRafIdsRef')
    && app.includes('spectralForgeEntryUploadState.spectralForgeExternalAudioFile'),
  appNoLongerImportsSpectralForgeEntryTypes: !app.includes('contracts/spectralForgeEntryIntent'),
  audioContextHookOwnsWarmupAndLatchRefs: [
    'activeScheduledTonesRef',
    'audioCtxRef',
    'audioWarmupDoneRef',
    'audioWarmupPromiseRef',
    'keyboardPitchAudioReadyLatchRef',
  ].every((needle) => contents.audioContextRefs.includes(needle)),
  appNoLongerOwnsAudioContextRefsDirectly: [
    'const activeScheduledTonesRef = useRef<{ osc: OscillatorNode;',
    'const audioCtxRef = useRef<AudioContext | null>(null);',
    'const audioWarmupDoneRef = useRef(false);',
    'const audioWarmupPromiseRef = useRef<Promise<void> | null>(null);',
    'const keyboardPitchAudioReadyLatchRef = useRef({ ready: false, pending: false });',
  ].every((needle) => !app.includes(needle)),
  audioContextHookDoesNotConnectOrSchedule: !/connect\(|start\(|stop\(|setTargetAtTime|linearRampToValueAtTime|safeApplyAttack|safeApplyExponentialRelease/.test(contents.audioContextRefs),
  metaRouletteHookOwnsEntropyAndSpinState: [
    'mandalaPresetColorOverrides',
    'mandalaRandomizingPresetId',
    'roulettePreviewPresetId',
    'rouletteIsSpinning',
    'mouseEntropyRef',
    'lastMouseEntropyStampRef',
    'mandalaSpinTokenRef',
    'rouletteSpinTokenRef',
  ].every((needle) => contents.metaRoulette.includes(needle)),
  appUsesMetaRouletteContractObject: app.includes('const metaPresetRouletteState = useMetaPresetRouletteState();')
    && app.includes('metaPresetRouletteState.mouseEntropyRef')
    && app.includes('metaPresetRouletteState.roulettePreviewPresetId'),
  metaRouletteHookDoesNotApplyPresetsOrAudio: !/applyMetaPreset|AudioContext|OscillatorNode|GainNode|playWaveStartSound|updateLiveMasteringSystem/.test(contents.metaRoulette),
  appStillOwnsBehaviorBodies: [
    'const commitResonanceCursorY = (',
    'const playWaveStartSound = (',
    'const ensureAudioReady = async () =>',
    'const startMetaPresetRoulette = () =>',
    'useSpectralForgeCutUploadBridge({',
  ].every((needle) => app.includes(needle)),
  protectedFilesPresent: protectedFiles.every(exists),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  appLineCountUnder7010: appLines < 7010,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, contents[key].split(/\r?\n/).length])),
  movedScope: [
    'keyboard/grid runtime refs',
    'SpectralForge cut-upload entry state/refs',
    'AudioContext warmup/latch refs and active scheduled tone registry',
    'MetaPreset mandala/roulette entropy and spin state',
  ],
  explicitlyNotMoved: [
    'Wellenstarter sound emission',
    'Root-Follow runtime',
    'Materialspur runtime',
    'Room III / Myzel node-device audio',
    'Audio node scheduling/ramping',
    'MetaPreset application body',
    'SpectralForge cut-upload bridge behavior',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
