#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const appLines = app.split(/\r?\n/).length;
const files = {
  metronome: 'src/features/xensonar/rooms/useStableRhythmMetronomePulse.ts',
  inputIndicator: 'src/features/xensonar/input/useResonanceInputIndicator.ts',
  keyCapture: 'src/features/xensonar/input/useResonanceKeyCaptureGate.ts',
};
const contents = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, exists(file) ? read(file) : '']));

const appStillOwnsStableRhythmBehavior = [
  'resolveStableRhythmLaneTimeWindow({',
  'buildStableRhythmLaneStepPlan({',
  'executeStableRhythmLaneStepPlan(stationaryPlan, {',
  'scheduleDrumStep: (plan) => {',
  'scheduleBassStep: (plan) => {',
].every((needle) => app.includes(needle));

const checks = {
  hookFilesExist: Object.values(files).every(exists),
  appImportsHookContracts: [
    'useStableRhythmMetronomePulse',
    'useResonanceInputIndicator',
    'useResonanceKeyCaptureGate',
  ].every((needle) => app.includes(needle)),
  metronomeHookOwnsPulseAndTimeouts: [
    'const [metronomePulse, setMetronomePulse] = useState(0)',
    'const metronomeTimeoutsRef = useRef<number[]>([])',
    'scheduleStableRhythmMetronomePulse',
    'clearStableRhythmMetronomeTimeouts',
  ].every((needle) => contents.metronome.includes(needle)),
  appNoLongerOwnsMetronomePulseAndTimeoutsDirectly: [
    'const [metronomePulse, setMetronomePulse] = useState(0);',
    'const metronomeTimeoutsRef = useRef<number[]>([]);',
    'metronomeTimeoutsRef.current.push(timeoutId);',
    'metronomeTimeoutsRef.current.forEach((id) => window.clearTimeout(id));',
  ].every((needle) => !app.includes(needle)),
  inputIndicatorHookOwnsFocusPointerListeners: [
    'window.addEventListener("focusin", refreshResonanceInputIndicator)',
    'window.addEventListener("focusout", refreshResonanceInputIndicator)',
    'window.addEventListener("pointerdown", refreshResonanceInputIndicator)',
    'setResonanceInputIndicator(isEditableTarget(document.activeElement))',
  ].every((needle) => contents.inputIndicator.includes(needle)),
  appNoLongerOwnsInputIndicatorListenerBodyDirectly: [
    'const [resonanceInputIndicator, setResonanceInputIndicator] = useState(false);',
    'const refreshResonanceInputIndicator = () => {',
    'window.addEventListener("focusin", refreshResonanceInputIndicator);',
    'window.addEventListener("pointerdown", refreshResonanceInputIndicator);',
  ].every((needle) => !app.includes(needle)),
  keyCaptureHookOwnsPreventDefaultGate: [
    'shouldCaptureResonanceKey(event, nexusParamsRef.current.quantizeOn)',
    'event.preventDefault()',
    'window.addEventListener("keydown", onKeyCapture, true)',
  ].every((needle) => contents.keyCapture.includes(needle)),
  appNoLongerOwnsResonanceKeyCaptureBodyDirectly: [
    'const onKeyCapture = (event: KeyboardEvent) => {',
    'shouldCaptureResonanceKey(event, nexusParamsRef.current.quantizeOn)',
    'window.addEventListener("keydown", onKeyCapture, true);',
  ].every((needle) => !app.includes(needle)),
  hooksDoNotConstructOrConnectAudio: Object.values(contents).every((content) => !/connect\(|start\(|stop\(|safeApplyAttack|safeApplyExponentialRelease|setTargetAtTime|linearRampToValueAtTime|generateRhythmForgePattern|generatePsyBassPattern|scheduleBassClipStep|scheduleClassicBassPatternStep|scheduleExportedDrumConfigStep/.test(content)),
  appStillOwnsStableRhythmBehavior,
  appLineCountUnder6910: appLines < 6910,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, exists(file) ? read(file).split(/\r?\n/).length : 0])),
  movedScope: [
    'stable rhythm metronome pulse state and timeout cleanup',
    'resonance input indicator focus/pointer listener body',
    'resonance key capture preventDefault gate',
  ],
  explicitlyNotMoved: [
    'stable rhythm prefill window and step planning',
    'drum/bass scheduling bodies',
    'Wellenstarter sound emission',
    'Root-Follow and Materialspur runtimes',
    'Room III/Myzel audio devices',
  ],
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
