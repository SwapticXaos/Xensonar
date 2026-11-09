#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceKeyboardPitchCommandAssemblyBoundary.ts';
const contractPath = 'src/features/xensonar/input/wellenstarterBallPositionContract.ts';
const lanePath = 'src/features/xensonar/input/resonanceKeyboardPitchLane.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const app = read(appPath);
const router = exists(routerPath) ? read(routerPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const contract = exists(contractPath) ? read(contractPath) : '';
const lane = read(lanePath);
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const handleBodyMatch = app.match(/const handleResonanceKeyDown = \(event: KeyboardEvent\) => \{[\s\S]*?\n    \};\n\n    const handleResonanceKeyUp/);
const handleBody = handleBodyMatch?.[0] ?? '';
const routeBody = router || handleBody;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  wsbPositionContractFileExists: exists(contractPath),
  appImportsBoundary: router.includes('runResonanceKeyboardPitchCommandAssemblyBoundary')
    && router.includes('resonanceKeyboardPitchCommandAssemblyBoundary')
    && app.includes('useAppResonanceKeyboardInputEffectBoundary'),
  appDelegatesPitchCommand: routeBody.includes('runResonanceKeyboardPitchCommandAssemblyBoundary({')
    && routeBody.includes('keyboardMirrorActive')
    && routeBody.includes('rootFollowLoopActive')
    && routeBody.includes('commitCursorY,'),
  appNoLongerOwnsInlinePitchIndexResolution: !handleBody.includes('const pitchIdx = getKeyboardPitchIndexFromEvent')
    && !handleBody.includes('const mappedPitchIdx = keyboardMirrorRef.current')
    && !handleBody.includes('const command = resolveResonanceKeyboardPitchCommand({'),
  boundaryOwnsPitchKeyResolution: boundary.includes('getKeyboardPitchIndexFromEvent(event, KAMMERTON_KEY_MAP, KAMMERTON_KEY_CODE_MAP)')
    && boundary.includes('getMirroredKeyboardPitchIndex(pitchIdx, KAMMERTON_KEYS.length)'),
  boundaryOwnsWsbPositionAssembly: boundary.includes('resolveKeyboardWellenstarterBallPosition({')
    && boundary.includes("wsbTarget.kind === 'muted-keyboard-wsb-position'")
    && boundary.includes('syncRootFollowInput: rootFollowLoopActive'),
  boundaryRestoresPitchLaneGlissGuard: boundary.includes('resolveResonanceKeyboardPitchCommand({')
    && boundary.includes("command.kind === 'continuous-gliss-target'")
    && boundary.includes('previewWave: false')
    && boundary.includes("recordAdaptiveAction('keyboard-input-gliss-coalesced')")
    && boundary.includes('pitchLaneState')
    && boundary.includes('nowMs'),
  boundaryKeepsRootFollowPolicyOutOfPitchHotpath: !boundary.includes('resolveResonanceRootFollowControlDecision({')
    && !boundary.includes('noteWaveStarterKeyboardEventAdmissionHotPath(')
    && !boundary.includes('rootFollowControlDecision'),
  contractOwnsKeyboardWindowMapping: contract.includes('keyboardWindowFrequency(')
    && contract.includes('targetY: yFromFreq(targetHz)')
    && contract.includes("kind: 'keyboard-wsb-position'"),
  boundaryDoesNotTouchAudioNodesOrRoutingDomains: !/AudioContext|OscillatorNode|GainNode|\.connect\(|\.start\(|\.stop\(|dispatchParticlePlayback|playNexusAgentTone|playWaveStartSound|selectMaterialLoopDirect|selectRootFollowLoopDirect|setGridMode|changeGridTuning|cycleParticleSystem|cycleChurchMode|triggerDirectedPulse/.test(boundary),
  laneStillOwnsGlissAndChordHeuristicsForFutureCompatibility: lane.includes('continuous-gliss-target')
    && lane.includes('chordClusterCount')
    && lane.includes('directPreviewCooldownUntilMs')
    && lane.includes('glissActiveUntilMs'),
  appLineCountDidNotGrow: appLines < 5662,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'keyboard pitch key lookup',
    'keyboard mirror pitch mapping',
    'Keyboard→Wellenstarter-Ball position resolution',
    'Root-Follow reads WSB position via cursor commit sync',
    '6.8.7 keyboard gliss/chord preview gating restored inside pitch command assembly',
    'keyboard hold-repeat emission gating remains separate',
  ],
  explicitlyNotMoved: [
    'cursor commit implementation',
    'root-follow runtime implementation',
    'Wellenstarter audio implementation',
    'Hold Pattern Werkbank',
    'grid tuning / grid mode hotkeys',
    'material/root-follow loop hotkeys',
    'particle-system hotkeys',
    'auxiliary directed-wave hotkeys',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
