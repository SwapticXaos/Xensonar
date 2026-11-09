#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/audio/useResonanceFxRuntimeRefs.ts';
const hook = exists(hookPath) ? read(hookPath) : '';
const appLines = app.split(/\r?\n/).length;

const directAppRefNeedles = [
  'const finalMixProbeRef = useRef<DescriptorProbe | null>(null);',
  'const collectiveMemoryFramesRef = useRef<DescriptorFrame[]>([]);',
  'const collectiveMemoryWindowRef = useRef(8);',
  'const collectiveMemorySummaryRef = useRef<DescriptorSummary | null>(null);',
  'const psychedelicSpiralRef = useRef<PsychedelicSpiralDevice | null>(null);',
  'const transientDriveFxRef = useRef<TransientDriveDeviceRefs | null>(null);',
  'const enterHoldPsyFxRef = useRef<EnterHoldPsyFxDevice | null>(null);',
  'const schwarmdeuterRef = useRef<Schwarmdeuter | null>(null);',
];

const checks = {
  hookFileExists: exists(hookPath),
  appImportsHook: app.includes('useResonanceFxRuntimeRefs'),
  hookOwnsDescriptorRefs: [
    'const finalMixProbeRef = useRef<DescriptorProbe | null>(null)',
    'const collectiveMemoryFramesRef = useRef<DescriptorFrame[]>([])',
    'const collectiveMemoryWindowRef = useRef(8)',
    'const collectiveMemorySummaryRef = useRef<DescriptorSummary | null>(null)',
  ].every((needle) => hook.includes(needle)),
  hookOwnsDeviceRefs: [
    'const collectiveFxRef = useRef<CollectiveMemoryFxRefs>(createCollectiveMemoryFxRefs())',
    'const psychedelicSpiralRef = useRef<PsychedelicSpiralDevice | null>(null)',
    'const transientDriveFxRef = useRef<TransientDriveDeviceRefs | null>(null)',
    'const enterHoldPsyFxRef = useRef<EnterHoldPsyFxDevice | null>(null)',
    'const schwarmdeuterRef = useRef<Schwarmdeuter | null>(null)',
  ].every((needle) => hook.includes(needle)),
  hookOwnsSharedSendRefShape: [
    'export type ResonanceFxSourceSends = {',
    'const createResonanceFxSourceSends = (): ResonanceFxSourceSends => ({',
    'const psychedelicSpiralSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends())',
    'const transientDriveSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends())',
    'const schwarmdeuterSendsRef = useRef<ResonanceFxSourceSends>(createResonanceFxSourceSends())',
  ].every((needle) => hook.includes(needle)),
  appNoLongerOwnsDirectFxRefAtoms: directAppRefNeedles.every((needle) => !app.includes(needle)),
  appStillOwnsFxCreationAndSchedulerBehavior: [
    'const ensureCollectiveMemoryFx = (ctx: AudioContext) => {',
    'const ensurePsychedelicSpiralDevice = (ctx: AudioContext) => {',
    'const ensureTransientDriveDevice = (ctx: AudioContext) => {',
    'const ensureEnterHoldPsyFxDevice = (ctx: AudioContext) => {',
    'const ensureSchwarmdeuterDevice = (ctx: AudioContext) => {',
    'createControlScheduler({',
  ].every((needle) => app.includes(needle)),
  hookDoesNotConstructOrConnectAudio: !/createCollectiveMemoryEffect|createPsychedelicSpiralDevice|createTransientDriveDevice|createEnterHoldPsyFxDevice|new Schwarmdeuter|connect\(|setTargetAtTime|linearRampToValueAtTime/.test(hook),
  nexusRefsDuplicateCursorYRemoved: !app.includes('cursorY: GAME_HEIGHT / 2,\n    cursorY: GAME_HEIGHT / 2,'),
  myzelSynthRegistryBoundaryUntouchedByThisCheck: [
    'advanceMyzelSynthRoom3Runtime',
    'renderMyzelSynthRoom3RuntimeCanvas',
    'buildMyzelResidentFieldRuntimeFrame',
    'collectMyzelResidentFieldRuntimeWaveEvents',
  ].every((needle) => app.includes(needle)) && !hook.includes('MyzelSynth') && !hook.includes('advanceMyzelSynth'),
  appLineCountUnder6935: appLines < 6935,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: hook ? hook.split(/\r?\n/).length : 0,
  movedScope: [
    'live/resonance FX descriptor refs',
    'collective memory FX refs',
    'psychedelic spiral/transient drive/enter-hold/schwarmdeuter refs',
    'shared drone/particles/waves/myzel send ref shape',
  ],
  explicitlyNotMoved: [
    'FX construction and connection behavior',
    'FX control scheduler behavior',
    'Wellenstarter/Root-Follow/Materialspur runtimes',
    'Myzel synth registry boundary and constructors',
  ],
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
