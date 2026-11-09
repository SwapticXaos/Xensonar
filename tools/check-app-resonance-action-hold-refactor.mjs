#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/rooms/useResonanceActionHoldState.ts';
const commandBoundaryPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const hook = exists(hookPath) ? read(hookPath) : '';
const commandBoundary = exists(commandBoundaryPath) ? read(commandBoundaryPath) : '';
const enterGestureBoundaryPath = 'src/features/xensonar/input/enterWaveHotkeyGestureBoundary.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const keyUpRouterPath = 'src/features/xensonar/input/resonanceKeyboardKeyUpRouter.ts';
const enterGestureBoundary = exists(enterGestureBoundaryPath) ? read(enterGestureBoundaryPath) : '';
const router = exists(routerPath) ? read(routerPath) : '';
const keyUpRouter = exists(keyUpRouterPath) ? read(keyUpRouterPath) : '';
const appLines = app.split(/\r?\n/).length;

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  'src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts',
  'src/features/xensonar/material/loopLaneUiState.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const checks = {
  hookFileExists: exists(hookPath),
  appImportsActionHoldHook: app.includes('useResonanceActionHoldState'),
  appUsesActionHoldHookWithResonanceGate: app.includes('} = useResonanceActionHoldState(resonanceInputActive);'),
  appNoLongerOwnsActionBadgeState: !app.includes('const [resonanceActionBadges, setResonanceActionBadges] = useState'),
  appNoLongerOwnsHoldRefsDirectly: [
    'const waveSoundSwellHeldRef = useRef(false);',
    'const waveSoundSwellRef = useRef(0);',
    'const waveStartOctaveHoldRef = useRef(false);',
    'const longToneHoldRef = useRef(false);',
    'const enterHoldRef = useRef(false);',
  ].every((needle) => !app.includes(needle)),
  hotkeyCommandsStillUseContractSetters: [
    'setSustainHoldActive',
    'setSwellHoldActive',
    'setOctaveHoldActive',
    'setEnterHoldActive',
  ].every((needle) => app.includes(needle) || commandBoundary.includes(needle))
    && commandBoundary.includes('actions.setSustainHoldActive(true)')
    && commandBoundary.includes('actions.setSustainHoldActive(false)')
    && commandBoundary.includes('actions.setSwellHoldActive(true)')
    && commandBoundary.includes('actions.setSwellHoldActive(false)')
    && commandBoundary.includes('actions.setOctaveHoldActive(true)')
    && commandBoundary.includes('actions.setOctaveHoldActive(false)')
    && commandBoundary.includes('actions.setEnterHoldActive?.(false)'),
  appDelegatesHoldKeyCommandsThroughBoundary: (app.includes('handleResonanceMomentaryHoldKeyDown(event')
    && app.includes('handleResonanceHoldKeyUp(event'))
    || (router.includes('runResonanceMomentaryHoldKeyDownBoundary(event')
      && (app.includes('runResonanceKeyUpHoldBoundary({')
        || (app.includes('runResonanceKeyboardKeyUpRouter({')
          && keyUpRouter.includes('runResonanceKeyUpHoldBoundary({')))),
  appStillReleasesHeldScheduledTones: app.includes('releaseHeldScheduledTones();'),
  appStillReadsHoldRefsInSoundPaths: app.includes('longToneHoldRef.current') && app.includes('waveSoundSwellRef.current') && app.includes('waveStartOctaveHoldRef.current') && app.includes('enterHoldRef.current'),
  hotkeyRoutingStillOwnsMusicalCommandAssemblies: app.includes('const handleResonanceKeyDown = (event: KeyboardEvent)') && router.includes('runResonanceAuxiliaryHotkeyRoutingBoundary({') && (app.includes('runEnterWaveHotkeyGesture(buildNexusRippleGestureRuntime())') || enterGestureBoundary.includes('runtime.playWaveStartSound(runtime.freqFromY(launch.cursorY), false);') || commandBoundary.includes('playWaveStartSound(freqFromY(launch.cursorY), false)')), 
  appStillOwnsCursorAndWaveEmissionBodies: app.includes('const commitResonanceCursorY = (') && app.includes('const playWaveStartSound = ('),
  hookOwnsRefsAndBadges: [
    'const [resonanceActionBadges, setResonanceActionBadges]',
    'const waveSoundSwellHeldRef = useRef(false)',
    'const waveSoundSwellRef = useRef(0)',
    'const waveStartOctaveHoldRef = useRef(false)',
    'const longToneHoldRef = useRef(false)',
    'const enterHoldRef = useRef(false)',
  ].every((needle) => hook.includes(needle)),
  hookDefinesNamedHoldSetters: [
    'setSustainHoldActive',
    'setSwellHoldActive',
    'setOctaveHoldActive',
    'setEnterHoldActive',
    'resetResonanceActionHolds',
  ].every((needle) => hook.includes(needle)),
  hookKeepsSwellRampConstants: hook.includes('+ 0.028') && hook.includes('- 0.12'),
  hookDoesNotTouchAudioNodes: !/OscillatorNode|GainNode|AudioContext|playWaveStartSound|triggerDirectedPulse/.test(hook),
  protectedFilesPresent: protectedFiles.every(exists),
  packageRoundtripProofStillEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out'),
  appLineCountUnder7025: appLines < 7025,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: hook.split(/\r?\n/).length,
  movedScope: [
    'resonance action badges',
    'sustain/swell/octave/enter hold refs',
    'swell ramp frame ticker',
    'inactive hold reset contract',
  ],
  explicitlyNotMoved: [
    'full resonance hotkey routing listener',
    'Wellenstarter sound emission',
    'keyboard pitch / cursor commit logic',
    'Root-Follow runtime',
    'Materialspur runtime',
    'Room III / Myzel node-device audio',
    'workspace package musical payload serialization',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
