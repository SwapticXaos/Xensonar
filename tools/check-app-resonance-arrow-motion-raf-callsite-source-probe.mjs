#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const probePath = 'src/features/xensonar/input/appResonanceArrowMotionRafCallsiteSourceProbe.ts';
const shapeAuditPath = 'validation/contracts/xensonar/input/appResonanceArrowMotionRafShapeAudit.ts';
const hookPath = 'src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const probe = exists(probePath) ? read(probePath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const probeLines = probe.split(/\r?\n/).length;

const probeForbiddenNeedles = [
  'import React',
  'useEffect(',
  'useMemo(',
  'useCallback(',
  'useState(',
  'useRef(',
  'window.addEventListener',
  'window.removeEventListener',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'setTimeout(',
  'setInterval(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'ensureAudioReady(',
  'runEnterWaveHotkeyGesture(',
  'runResonanceKeyboardInputRouter(',
  'runResonanceKeyboardKeyUpRouter(',
  'executeStableRhythmLaneStepPlan(',
  'scheduleStableRhythmMetronomePulse(',
  'nexusRefs.current.nextAbsoluteStep =',
  '.current =',
];

const requiredProbeNeedles = [
  "probeKind: 'app-resonance-arrow-motion-raf-callsite-source-probe'",
  'callsiteOwnerStillApp: true',
  'rafLoopStillInlineInApp: true',
  'requestAnimationFrameOwnerStillApp: true',
  'cancelAnimationFrameOwnerStillApp: true',
  'cursorCommitOwnerStillApp: true',
  'runtimeOwned: false',
  'audioOwned: false',
  'schedulingOwned: false',
  'effectGate',
  'closureDependencies',
  'runtimeRefs',
  'frameBounds',
  'provenance',
  'actions',
  'nexusParamsRef: AppArrowMotionRafRef<AppArrowMotionCursorParams>',
  'nexusArrowRef: AppArrowMotionRafRef<ResonanceArrowState>',
  'nexusRefs: AppArrowMotionRafRef<TCursorRuntime>',
  'focusCursorLastInputRef: AppArrowMotionRafRef<TFocusInput>',
  'clampValue: (value: number, min: number, max: number) => number',
  'commitCursorY: AppArrowMotionCommitCursorY',
  'buildAppResonanceArrowMotionRafCallsiteSource',
];

const requiredAppBuilderNeedles = [
  'import { buildAppResonanceArrowMotionRafCompactCallsiteSource } from "./features/xensonar/input/appResonanceArrowMotionRafCallsiteSourceProbe";',
  'const appResonanceArrowMotionRafCallsiteSource = buildAppResonanceArrowMotionRafCompactCallsiteSource({',
  'resonanceInputActive,',
  'myzelEnabled,',
  'bassRootMode: nParamsUI.bassRootMode,',
  'nexusParamsRef,',
  'nexusArrowRef,',
  'nexusRefs,',
  'focusCursorLastInputRef,',
  'gameWidth: GAME_WIDTH,',
  'clampValue: clamp,',
  'commitCursorY: commitResonanceCursorY,',
];

const requiredAppEffectNeedles = [
  'const arrowMotionRafSource = appResonanceArrowMotionRafCallsiteSource;',
  'if (!arrowMotionRafSource.effectGate.resonanceInputActive) return;',
  'const { nexusParamsRef, nexusArrowRef, nexusRefs, focusCursorLastInputRef } = arrowMotionRafSource.runtimeRefs;',
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
  'nexusRefs.current.cursorX = arrowMotionRafSource.actions.clampValue(',
  'arrowMotionRafSource.frameBounds.gameWidth,',
  'focusCursorLastInputRef.current = arrowMotionRafSource.provenance.arrowInputSource;',
  'arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });',
  'raf = requestAnimationFrame(tick);',
  'return () => cancelAnimationFrame(raf);',
  '}, [resonanceInputActive, myzelEnabled, nParamsUI.bassRootMode]);',
];

const forbiddenExtractionFiles = [
  'src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts',
  'src/features/xensonar/input/appResonanceArrowMotionRafRuntime.ts',
  'src/features/xensonar/input/appResonanceArrowMotionRafBoundary.ts',
  'src/features/xensonar/input/useAppArrowMotionRafBoundary.ts',
];

const checks = {
  expectedFilesExist: [
    appPath,
    probePath,
    shapeAuditPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast171: /^3\.2\.91\.6\.9\.(17[1-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-arrow-motion-raf-callsite-source-probe'] ===
    'node tools/check-app-resonance-arrow-motion-raf-callsite-source-probe.mjs',
  probeDeclaresCallsiteSourceOnly:
    requiredProbeNeedles.every((needle) => probe.includes(needle)) &&
    probe.includes("import type { ResonanceArrowState }") &&
    probe.includes("from './resonanceKeyboardCommandActions'"),
  probeIsPureTypeAndBuilderLayer: probeForbiddenNeedles.every((needle) => !probe.includes(needle)),
  arrowMotionCallsiteSourceStillUsedByAppOrHook:
    requiredAppBuilderNeedles.every((needle) => app.includes(needle)) ||
    (app.includes('useAppResonanceArrowMotionRaf({') && hook.includes('buildAppResonanceArrowMotionRafCompactCallsiteSource(args)')),
  arrowMotionRafEffectReadsThroughSourceOrHook:
    requiredAppEffectNeedles.every((needle) => app.includes(needle)) ||
    (app.includes('useAppResonanceArrowMotionRaf({') && hook.includes('runAppResonanceArrowMotionRafFrame(arrowMotionRafSource);')),
  dependencyArrayStillRawAndExplicitOrHookEquivalent:
    (app.includes('}, [resonanceInputActive, myzelEnabled, nParamsUI.bassRootMode]);') &&
      !app.includes('}, [appResonanceArrowMotionRafCallsiteSource])')) ||
    hook.includes('}, [args.resonanceInputActive, args.myzelEnabled, args.bassRootMode]);'),
  appStillOwnsKeyboardAndStableLaneSensitivePaths:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) => {') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {') &&
    app.includes('runResonanceKeyboardInputRouter(') &&
    app.includes('runResonanceKeyboardKeyUpRouter(') &&
    app.includes('executeStableRhythmLaneStepPlan(') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep'),
  shapeAuditStillPresentAndNonRuntime:
    shapeAudit.includes('APP_RESONANCE_ARROW_MOTION_RAF_SHAPE_AUDIT') &&
    shapeAudit.includes('shapeAuditOnly: true') &&
    shapeAudit.includes('rafLoopStillInlineInApp: true'),
  noPrematureArrowRafExtractionFilesOrIntentionalHook:
    forbiddenExtractionFiles.every((rel) => !exists(rel)) ||
    (/^3\.2\.91\.6\.9\.(18[0-9]|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version) && exists(hookPath) && hook.includes('useAppResonanceArrowMotionRaf')),
  monolithMapUpdated:
    monolithMap.includes("| 'arrow-motion-raf-callsite-source-probed'") &&
    monolithMap.includes("| 'stable-rhythm-lane-scheduler-shape-audited'") &&
    (monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    (monolithMap.includes('buildAppResonanceArrowMotionRafCallsiteSource') || monolithMap.includes('buildAppResonanceArrowMotionRafCompactCallsiteSource')) &&
    (monolithMap.includes('arrow-motion RAF callsite source probe only; RAF loop stays inline') || monolithMap.includes('arrow-motion RAF hook extracted; keyboard and stable scheduler remain App-owned')) &&
    (monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') || monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext')),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-resonance-arrow-motion-raf-callsite-source-probe'") &&
    suiteContract.includes("'xensonar:check-app-resonance-arrow-motion-raf-callsite-source-probe'"),
  probeSizeRemainsProbeScale: probeLines >= 70 && probeLines <= 150,
  appDidNotGrowFromRuntimeExtraction: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-resonance-arrow-motion-raf-callsite-source-probe',
  version: pkg.version,
  appLines,
  probeLines,
  checks,
}, null, 2));

if (failed.length) {
  console.error('\nFailed checks:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
