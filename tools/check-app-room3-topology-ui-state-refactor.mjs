#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/room3/useRoom3TopologyUiState.ts';
const hook = exists(hookPath) ? read(hookPath) : '';
const typePath = 'src/features/xensonar/room3/room3TopologyUiStateTypes.ts';
const typeContract = exists(typePath) ? read(typePath) : '';
const actionsPath = 'src/features/xensonar/room3/room3TopologyActions.ts';
const actions = exists(actionsPath) ? read(actionsPath) : '';
const topologyRuntimeLoopPath = 'src/features/xensonar/myzelSynth/useAppMyzelTopologyRuntimeLoopBoundary.ts';
const topologyRuntimeLoop = exists(topologyRuntimeLoopPath) ? read(topologyRuntimeLoopPath) : '';
const nodeDeviceRuntimePath = 'src/features/xensonar/room3/useRoom3NodeDeviceAudioFrameRuntime.ts';
const nodeDeviceRuntime = exists(nodeDeviceRuntimePath) ? read(nodeDeviceRuntimePath) : '';
const appLines = app.split(/\r?\n/).length;
const hookLines = hook.split(/\r?\n/).length;

const oldInlineStateMarkers = [
  'const [myzelEnabled, setMyzelEnabled] = useState(false);',
  'const [myzelPostFxGroup, setMyzelPostFxGroup] = useState<MyzelPostFxGroupId>("master");',
  'const [room3BodyControls, setRoom3BodyControls] = useState<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS);',
  'const installationFieldConfigRef = useRef(DEFAULT_INSTALLATION_FIELD_CONFIG);',
  'const topologyRefs = useRef({\n    nodes: [] as SemanticNode[],',
  'const myzelAudioFieldEnvelopeRef = useRef(createRoom3NodeDeviceAudioEnvelope());',
];

const checks = {
  hookFileExists: exists(hookPath),
  appUsesRoom3TopologyUiStateHook: app.includes('useRoom3TopologyUiState();'),
  appNoLongerOwnsLargeRoom3StateCluster: oldInlineStateMarkers.every((needle) => !app.includes(needle)),
  hookOwnsRoom3StateAndRefs: [
    'const [myzelEnabled, setMyzelEnabled] = useState(false)',
    'const [myzelPostFxGroup, setMyzelPostFxGroup] = useState<MyzelPostFxGroupId>("master")',
    'const [room3BodyControls, setRoom3BodyControls] = useState<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS)',
    'const installationFieldConfigRef = useRef(DEFAULT_INSTALLATION_FIELD_CONFIG)',
    'const topologyRefs = useRef<TopologyAudioRefs>',
    'const myzelAudioFieldEnvelopeRef = useRef(createRoom3NodeDeviceAudioEnvelope())',
    'const room3TopologyStateRefs = useMemo<Room3TopologyStateRefs>',
  ].every((needle) => hook.includes(needle)),
  hookExportsFutureSeamContract: [
    'export type Room3TopologyStateRefs',
    'export type Room3TopologyUiState',
  ].every((needle) => typeContract.includes(needle)) &&
    hook.includes('from \"./room3TopologyUiStateTypes\"') &&
    hook.includes('room3TopologyStateRefs'),
  remainingAudioRuntimeSeamsStayOutsideUiStateHook:
    app.includes('const ensureMyzelSynth = (ctx: AudioContext) => {') &&
    app.includes('useRoom3TopologyRuntimeEntry({') &&
    topologyRuntimeLoop.includes('advanceMyzelSynthRoom3Runtime({') &&
    nodeDeviceRuntime.includes('updateRoom3NodeDeviceAudioFrame({') &&
    !hook.includes('advanceMyzelSynthRoom3Runtime({') &&
    !hook.includes('updateRoom3NodeDeviceAudioFrame({'),
  room3TopologyActionsBoundaryOwnsModePowerReset: [
    'export function buildRoom3TopologyActions',
    'const resetMyzelTopologyNodes = () => {',
    'const setMyzelModeAndPower = (mode: MyzelTopologyMode) => {',
    'const toggleMyzelEnabled = () => {',
  ].every((needle) => actions.includes(needle)),
  appNoLongerOwnsModePowerResetInline: [
    'const resetMyzelTopologyNodes = () => {',
    'const setMyzelModeAndPower = (mode: MyzelTopologyMode) => {',
    'const toggleMyzelEnabled = () => {',
  ].every((needle) => !app.includes(needle)),
  hookDoesNotConstructOrConnectAudioNodes: !/createOscillator\(|createGain\(|createBiquadFilter\(|connect\(|\.start\(|\.stop\(|ensureMyzelSynthRegisteredAudioDevices|advanceMyzelSynthRoom3Runtime|updateRoom3NodeDeviceAudioFrame|safeApplyAttack|safeApplyExponentialRelease|setTargetAtTime|linearRampToValueAtTime/.test(hook),
  appLineCountUnder6860: appLines < 6860,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines,
  movedScope: [
    'Room III / Myzel UI state cluster',
    'Topology canvas refs and drag refs',
    'Installation resident UI state and saved constellation state',
    'Room III body mirror refs and topology runtime mutable refs',
    'Myzel post-FX UI state and router refs',
  ],
  explicitlyNotMoved: [
    'Myzel synth registry / registered audio device constructors',
    'Room III node-device audio frame updates',
    'Topology RAF/runtime loop',
    'Myzel synth audio warmup/unlock mechanics',
    'Legacy topology audio graph behavior',
    'Wellenstarter, Root-Follow, Materialspur, package payload',
  ],
  futureSeamsMadeClearer: [
    'useRoom3TopologyRuntimeBoundary can later consume room3TopologyStateRefs instead of App.tsx locals',
    'room3TopologyActions can later move into a dedicated Room III controller without rediscovering mode/power/reset contracts',
    'useRoom3AudioDeviceRuntime can later be split from UI state without re-finding the state cluster',
    'buildTopologyRuntimeEntry can later receive a compact Room3TopologyStateRefs contract',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
