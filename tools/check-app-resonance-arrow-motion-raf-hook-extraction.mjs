#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const hookPath = 'src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts';
const sourceProbePath = 'src/features/xensonar/input/appResonanceArrowMotionRafCallsiteSourceProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appResonanceArrowMotionRafShapeAudit.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const sourceProbe = exists(sourceProbePath) ? read(sourceProbePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const hookLines = hook.split(/\r?\n/).length;
const indexOf = (needle) => app.indexOf(needle);

const browserBoundaryIndex = indexOf('useAppGlobalInputLowRiskBrowserBoundary(appGlobalInputLowRiskBoundary);');
const arrowHookIndex = indexOf('useAppResonanceArrowMotionRaf({');
const keyboardDownIndex = indexOf('const handleResonanceKeyDown = (event: KeyboardEvent) =>');
const stableSchedulerIndex = indexOf('const schedule = () => {');

const forbiddenHookNeedles = [
  'runResonanceKeyboardInputRouter',
  'runResonanceKeyboardKeyUpRouter',
  'runEnterWaveHotkeyGesture',
  'resolveStableRhythmLaneTimeWindow',
  'buildStableRhythmLaneStepPlan',
  'executeStableRhythmLaneStepPlan',
  'nexusRefs.current.nextAbsoluteStep',
  'scheduleExportedDrumConfigStep',
  'scheduleRhythmForgeDrumStep',
  'scheduleClassicBassPatternStep',
  'schedulePsyBassStep',
  'playBassNote',
  'ensureAudioReady',
  'createOscillator',
  'createGain',
  '.connect(',
  '.start(',
  'window.setTimeout',
  'window.clearTimeout',
];

const requiredHookNeedles = [
  'import { useEffect } from \'react\';',
  'buildAppResonanceArrowMotionRafCompactCallsiteSource',
  'export const runAppResonanceArrowMotionRafFrame',
  'export const useAppResonanceArrowMotionRaf',
  'const speed = nexusParamsRef.current.cursorSpeed;',
  'nexusArrowRef.current.left',
  'nexusArrowRef.current.right',
  'nexusArrowRef.current.up',
  'nexusArrowRef.current.down',
  'if (!nexusParamsRef.current.lockCursorToGrid)',
  'nexusRefs.current.cursorX -= speed;',
  'nexusRefs.current.cursorX += speed;',
  'nexusRefs.current.cursorY -= speed;',
  'nexusRefs.current.cursorY += speed;',
  'arrowMotionRafSource.actions.clampValue(',
  'focusCursorLastInputRef.current = arrowMotionRafSource.provenance.arrowInputSource;',
  "arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: 'resonance' });",
  'const arrowMotionRafSource = buildAppResonanceArrowMotionRafCompactCallsiteSource(args);',
  'if (!arrowMotionRafSource.effectGate.resonanceInputActive) return;',
  'runAppResonanceArrowMotionRafFrame(arrowMotionRafSource);',
  'raf = requestAnimationFrame(tick);',
  'return () => cancelAnimationFrame(raf);',
  '}, [args.resonanceInputActive, args.myzelEnabled, args.bassRootMode]);',
];

const oldInlineAppNeedles = [
  'const appResonanceArrowMotionRafCallsiteSource = buildAppResonanceArrowMotionRafCompactCallsiteSource({',
  'const arrowMotionRafSource = appResonanceArrowMotionRafCallsiteSource;',
  'const { nexusParamsRef, nexusArrowRef, nexusRefs, focusCursorLastInputRef } = arrowMotionRafSource.runtimeRefs;',
  'arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });',
];

const checks = {
  expectedFilesExist: [
    appPath,
    hookPath,
    sourceProbePath,
    shapeAuditPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast180: /^3\.2\.91\.6\.9\.(18[0-9]|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-arrow-motion-raf-hook-extraction'] ===
    'node tools/check-app-resonance-arrow-motion-raf-hook-extraction.mjs',
  appStayedNearChatStartAfterCacheHelperProbes: appLines <= 5498,
  appImportsAndCallsHook:
    app.includes('import { useAppResonanceArrowMotionRaf } from "./features/xensonar/input/useAppResonanceArrowMotionRaf";') &&
    app.includes('useAppResonanceArrowMotionRaf({') &&
    app.includes('bassRootMode: nParamsUI.bassRootMode,') &&
    app.includes('gameWidth: GAME_WIDTH,') &&
    app.includes('clampValue: clamp,') &&
    app.includes('commitCursorY: commitResonanceCursorY,'),
  appNoLongerBuildsArrowRafSourceInline:
    !app.includes('buildAppResonanceArrowMotionRafCompactCallsiteSource') &&
    oldInlineAppNeedles.every((needle) => !app.includes(needle)),
  hookCallsiteKeepsEffectOrder:
    keyboardDownIndex >= 0 && browserBoundaryIndex > keyboardDownIndex && arrowHookIndex > browserBoundaryIndex,
  hookContainsExpectedRafBody: requiredHookNeedles.every((needle) => hook.includes(needle)),
  hookDoesNotAbsorbKeyboardStableLaneOrAudio: forbiddenHookNeedles.every((needle) => !hook.includes(needle)),
  hookUsesSourceProbeNotNewRuntime:
    hook.includes("from './appResonanceArrowMotionRafCallsiteSourceProbe'") &&
    sourceProbe.includes('buildAppResonanceArrowMotionRafCompactCallsiteSource') &&
    !exists('src/features/xensonar/input/appResonanceArrowMotionRafRuntime.ts'),
  appStillOwnsKeyboardCommands:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) =>') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) =>') &&
    app.includes('runResonanceKeyboardInputRouter(buildAppResonanceKeyboardCommandKeyDownRouterArgs({') &&
    app.includes('runResonanceKeyboardKeyUpRouter(buildAppResonanceKeyboardCommandKeyUpRouterArgs({'),
  appStillOwnsStableScheduler:
    stableSchedulerIndex >= 0 &&
    app.includes('window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs)') &&
    app.includes('window.clearTimeout(timerID)') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;') &&
    (app.includes('scheduleDrumStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('scheduleBassStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')) &&
    (app.includes('applyMyzelStep: (plan) => {') || app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({')),
  shapeAuditAndSourceProbeRemainAsContracts:
    shapeAudit.includes('APP_RESONANCE_ARROW_MOTION_RAF_SHAPE_AUDIT') &&
    sourceProbe.includes("probeKind: 'app-resonance-arrow-motion-raf-callsite-source-probe'"),
  monolithMapUpdated:
    monolithMap.includes("| 'arrow-motion-raf-hook-extracted'") &&
    (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") ||
      monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") ||
      monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") ||
      monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") ||
      monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") ||
      monolithMap.includes("status: 'psy-bass-cache-helper-probed'")) &&
    monolithMap.includes('useAppResonanceArrowMotionRaf') &&
    (monolithMap.includes('arrow-motion RAF hook extracted; keyboard and stable scheduler remain App-owned') ||
      monolithMap.includes('outer scheduler transport remains App-owned')),
  suiteIncludesGuard:
    suite.includes("script: 'xensonar:check-app-resonance-arrow-motion-raf-hook-extraction'") &&
    suite.includes('Arrow motion RAF hook extraction') &&
    suiteContract.includes("'xensonar:check-app-resonance-arrow-motion-raf-hook-extraction'"),
  hookSizeIsSmallBlockExtraction: hookLines >= 70 && hookLines <= 140,
};

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length) {
  console.error('app resonance arrow-motion RAF hook extraction check failed:');
  for (const [name] of failed) console.error(` - ${name}`);
  console.error(JSON.stringify({ appLines, hookLines, version: pkg.version }, null, 2));
  process.exit(1);
}

console.log('app resonance arrow-motion RAF hook extraction check passed', JSON.stringify({ appLines, hookLines, version: pkg.version }, null, 2));
