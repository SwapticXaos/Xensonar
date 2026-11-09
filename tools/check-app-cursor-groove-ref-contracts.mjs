#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const app = read('src/App.tsx');
const appLines = app.split(/\r?\n/).length;
const files = {
  cursor: 'src/features/xensonar/rooms/useResonanceCursorRuntimeState.ts',
  field: 'src/features/xensonar/rooms/useResonanceFieldRuntimeRefs.ts',
  groove: 'src/features/xensonar/groove/useGroovePlaybackRuntimeRefs.ts',
};
const contents = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, exists(file) ? read(file) : '']));

const checks = {
  hookFilesExist: Object.values(files).every(exists),
  appImportsHookContracts: [
    'useResonanceCursorRuntimeState',
    'useResonanceFieldRuntimeRefs',
    'useGroovePlaybackRuntimeRefs',
  ].every((needle) => app.includes(needle)),
  cursorHookOwnsHudAndFocusRefs: [
    'const [cursorHudHz, setCursorHudHz] = useState(() => initialCursorHz)',
    'const cursorHudHzRef = useRef(initialCursorHz)',
    'const cursorHudLastUpdateRef = useRef(0)',
    'const focusCursorRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 })',
    'const focusCursorLastInputRef = useRef<ResonanceFocusCursorSource>("auto")',
  ].every((needle) => contents.cursor.includes(needle)),
  appNoLongerOwnsCursorHudAndFocusRefsDirectly: [
    'const [cursorHudHz, setCursorHudHz] = useState(() => freqFromY(GAME_HEIGHT / 2));',
    'const cursorHudHzRef = useRef(freqFromY(GAME_HEIGHT / 2));',
    'const cursorHudLastUpdateRef = useRef(0);',
    'const focusCursorRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });',
    'const focusCursorLastInputRef = useRef<"mouse" | "keyboard" | "arrow" | "grid" | "auto">("auto");',
  ].every((needle) => !app.includes(needle)),
  fieldHookOwnsCanvasArrowAndWaveRefs: [
    'const nexusCanvasRef = useRef<HTMLCanvasElement>(null)',
    'const nexusArrowRef = useRef({ left: false, right: false, up: false, down: false })',
    'const waveLaunchAtRef = useRef(0)',
    'const waveImpactDecayRef = useRef(1)',
  ].every((needle) => contents.field.includes(needle)),
  appNoLongerOwnsFieldRefsDirectly: [
    'const nexusCanvasRef = useRef<HTMLCanvasElement>(null);',
    'const nexusArrowRef = useRef({ left: false, right: false, up: false, down: false });',
    'const waveLaunchAtRef = useRef(0);',
    'const waveImpactDecayRef = useRef(1);',
  ].every((needle) => !app.includes(needle)),
  grooveHookOwnsPatternAndClipRefs: [
    'const rhythmForgeDrumPatternRef = useRef<GeneratedPattern | null>(null)',
    'const rhythmForgeBassPatternRef = useRef<GeneratedPattern | null>(null)',
    'const rhythmForgeSeedRef = useRef(0x59a17)',
    'const psyBassPatternRef = useRef<PsyBassPattern | null>(null)',
    'const bassClipPlaybackCacheRef = useRef<{ id: string; clip: BassClip | null }>({ id: "", clip: null })',
    'const bassClipBarRootRef = useRef<{ clipId: string; barIndex: number; rootHz: number }>({ clipId: "", barIndex: -1, rootHz: 49 })',
  ].every((needle) => contents.groove.includes(needle)),
  appNoLongerOwnsGrooveRefsDirectly: [
    'const rhythmForgeDrumPatternRef = useRef<GeneratedPattern | null>(null);',
    'const rhythmForgeBassPatternRef = useRef<GeneratedPattern | null>(null);',
    'const rhythmForgeSeedRef = useRef(0x59a17);',
    'const psyBassPatternRef = useRef<PsyBassPattern | null>(null);',
    'const bassClipPlaybackCacheRef = useRef<{ id: string; clip: BassClip | null }>({ id: "", clip: null });',
  ].every((needle) => !app.includes(needle)),
  hooksDoNotScheduleOrConnectAudio: [contents.cursor, contents.field, contents.groove].every((content) => !/connect\(|start\(|stop\(|safeApplyAttack|safeApplyExponentialRelease|setTargetAtTime|linearRampToValueAtTime/.test(content)),
  appStillOwnsBehaviorBodies: [
    'const commitResonanceCursorY = (',
    'const previewKeyboardWindowShift = (',
    'const playWaveStartSound = (',
    'generateRhythmForgePattern({',
    'generatePsyBassPattern(buildPsyBassPatternRequest({',
    'scheduleBassClipStep({',
  ].every((needle) => app.includes(needle)),
  appLineCountUnder6950: appLines < 6950,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  hookLines: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, exists(file) ? read(file).split(/\r?\n/).length : 0])),
  movedScope: [
    'cursor HUD/focus refs',
    'resonance field canvas/arrow/wave refs',
    'groove playback pattern/cache refs',
  ],
  explicitlyNotMoved: [
    'cursor commit behavior',
    'keyboard pitch behavior',
    'Wellenstarter sound emission',
    'stable rhythm scheduling',
    'bass/drum step playback',
    'Root-Follow and Materialspur runtimes',
  ],
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
