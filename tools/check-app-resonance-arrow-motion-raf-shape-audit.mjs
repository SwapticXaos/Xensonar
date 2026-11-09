#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/input/appResonanceArrowMotionRafShapeAudit.ts';
const arrowActionsPath = 'src/features/xensonar/input/resonanceKeyboardCommandActions.ts';
const hookPath = 'src/features/xensonar/input/useAppResonanceArrowMotionRaf.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const arrowActions = exists(arrowActionsPath) ? read(arrowActionsPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;

const auditForbiddenNeedles = [
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

const requiredEffectGateKeys = ['resonanceInputActive'];
const requiredDependencyKeys = ['resonanceInputActive', 'myzelEnabled', 'nParamsUI.bassRootMode'];
const requiredRuntimeReads = [
  'nexusParamsRef.current.cursorSpeed',
  'nexusParamsRef.current.lockCursorToGrid',
  'nexusArrowRef.current.left',
  'nexusArrowRef.current.right',
  'nexusArrowRef.current.up',
  'nexusArrowRef.current.down',
  'nexusRefs.current.cursorY',
];
const requiredMutationKeys = [
  'nexusRefs.current.cursorX',
  'nexusRefs.current.cursorY',
  'focusCursorLastInputRef.current',
];
const requiredActionKeys = ['clamp', 'commitResonanceCursorY'];
const requiredDoNotMove = [
  'resonance arrow-motion requestAnimationFrame ownership',
  'resonance arrow-motion cancelAnimationFrame cleanup ownership',
  'nexusArrowRef live key-state reads',
  'nexusParamsRef cursor speed and lock-to-grid reads',
  'nexusRefs cursorX/cursorY mutation path',
  'focusCursorLastInputRef arrow provenance write',
  'commitResonanceCursorY syncHud primeSource resonance contract',
  'Root-Follow cursor pitch truth that can be affected by commitResonanceCursorY',
  'stable rhythm lane scheduler and nexusRefs.current.nextAbsoluteStep ownership',
];

const appArrowEffectNeedles = [
  'if (!resonanceInputActive) return;',
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
  'nexusRefs.current.cursorX = clamp(nexusRefs.current.cursorX, 0, GAME_WIDTH);',
  'focusCursorLastInputRef.current = "arrow";',
  'commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });',
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
    auditPath,
    arrowActionsPath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast170: /^3\.2\.91\.6\.9\.(17[0-9]|1[8-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-arrow-motion-raf-shape-audit'] ===
    'node tools/check-app-resonance-arrow-motion-raf-shape-audit.mjs',
  auditDeclaresShapeOnly:
    audit.includes('APP_RESONANCE_ARROW_MOTION_RAF_SHAPE_AUDIT') &&
    audit.includes('AppResonanceArrowMotionRafShapeAudit') &&
    audit.includes('shapeAuditOnly: true') &&
    audit.includes('rafLoopStillInlineInApp: true') &&
    audit.includes('frameOwnershipStillAppEffect: true') &&
    audit.includes('runtimeOwned: false') &&
    audit.includes('audioOwned: false') &&
    audit.includes('schedulingOwned: false') &&
    audit.includes('cursorCommitOwned: false'),
  auditIsPureTypeAndConstLayer:
    audit.includes("import type { ResonanceArrowState }") &&
    audit.includes("from './resonanceKeyboardCommandActions'") &&
    auditForbiddenNeedles.every((needle) => !audit.includes(needle)),
  auditCoversEffectGateAndDeps:
    requiredEffectGateKeys.every((key) => audit.includes(`'${key}'`)) &&
    requiredDependencyKeys.every((key) => audit.includes(`'${key}'`)) &&
    audit.includes('satisfies readonly ArrowMotionEffectGateKey[]') &&
    audit.includes('satisfies readonly ArrowMotionEffectDependencyKey[]'),
  auditCoversFrameOwnership:
    audit.includes('app-useEffect-requestAnimationFrame-loop') &&
    audit.includes('app-useEffect-cancelAnimationFrame-cleanup') &&
    audit.includes('satisfies readonly ArrowMotionFrameOwnershipKey[]'),
  auditCoversRuntimeReadsAndMutations:
    requiredRuntimeReads.every((key) => audit.includes(`'${key}'`)) &&
    requiredMutationKeys.every((key) => audit.includes(`'${key}'`)) &&
    audit.includes('satisfies readonly ArrowMotionRuntimeReadKey[]') &&
    audit.includes('satisfies readonly ArrowMotionMutationKey[]'),
  auditCoversActionsAndShapes:
    requiredActionKeys.every((key) => audit.includes(`'${key}'`)) &&
    audit.includes('AppArrowMotionCommitCursorY') &&
    audit.includes('arrowStateShape: null as unknown as ResonanceArrowState') &&
    audit.includes('commitCursorYShape: null as unknown as AppArrowMotionCommitCursorY') &&
    arrowActions.includes('export type ResonanceArrowState'),
  auditExplicitlyDoesNotMoveSensitivePaths:
    requiredDoNotMove.every((needle) => audit.includes(needle)) &&
    audit.includes("nextSafeMove: 'arrow-motion-raf-callsite-source-probe-after-audit'"),
  noPrematureArrowRafExtractionFilesOrIntentionalHook:
    forbiddenExtractionFiles.every((rel) => !exists(rel)) ||
    (/^3\.2\.91\.6\.9\.(18[0-9]|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version) && exists(hookPath) && hook.includes('useAppResonanceArrowMotionRaf')),
  arrowMotionRafEffectStillCovered:
    (
      ((appArrowEffectNeedles.every((needle) => app.includes(needle)) &&
        app.includes('useEffect(() => {\n    if (!resonanceInputActive) return;')) ||
        (app.includes('const arrowMotionRafSource = appResonanceArrowMotionRafCallsiteSource;') &&
          app.includes('if (!arrowMotionRafSource.effectGate.resonanceInputActive) return;') &&
          app.includes('const { nexusParamsRef, nexusArrowRef, nexusRefs, focusCursorLastInputRef } = arrowMotionRafSource.runtimeRefs;') &&
          app.includes('nexusRefs.current.cursorX -= speed;') &&
          app.includes('nexusRefs.current.cursorX += speed;') &&
          app.includes('nexusRefs.current.cursorY -= speed;') &&
          app.includes('nexusRefs.current.cursorY += speed;') &&
          app.includes('arrowMotionRafSource.actions.commitCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });') &&
          app.includes('raf = requestAnimationFrame(tick);') &&
          app.includes('return () => cancelAnimationFrame(raf);'))) &&
        app.includes('const tick = () => {') &&
        app.includes('cursorXChanged') &&
        app.includes('cursorYChanged')
    ) ||
    (app.includes('useAppResonanceArrowMotionRaf({') &&
      hook.includes('export const runAppResonanceArrowMotionRafFrame') &&
      hook.includes('cursorXChanged') &&
      hook.includes('cursorYChanged') &&
      hook.includes('return () => cancelAnimationFrame(raf);')),
  appStillOwnsKeyboardAndStableLaneSensitivePaths:
    app.includes('const handleResonanceKeyDown = (event: KeyboardEvent) => {') &&
    app.includes('const handleResonanceKeyUp = (event: KeyboardEvent) => {') &&
    app.includes('runResonanceKeyboardInputRouter(') &&
    app.includes('runResonanceKeyboardKeyUpRouter(') &&
    app.includes('executeStableRhythmLaneStepPlan(') &&
    app.includes('nexusRefs.current.nextAbsoluteStep = nextStep'),
  monolithMapUpdated:
    (monolithMap.includes("status: 'arrow-motion-raf-shape-audited'") ||
      monolithMap.includes("status: 'arrow-motion-raf-callsite-source-probed'") ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-callsite-source-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-shape-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) ||
      (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-prestep-context-arg-builder-probed'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-action-port-arg-normalization-or-cache-mutation-seam-audited'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || ((monolithMap.includes("status: 'input-metronome-scaffolding-contracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'global-input-low-risk-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))) || (monolithMap.includes("status: 'arrow-motion-raf-hook-extracted'") || (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-mutation-seam-shape-audited'") || (monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'")))))) &&
    monolithMap.includes('APP_RESONANCE_ARROW_MOTION_RAF_SHAPE_AUDIT') &&
    (monolithMap.includes('arrow-motion RAF shape audit only; RAF loop stays inline') ||
      monolithMap.includes('arrow-motion RAF callsite source probe only; RAF loop stays inline') ||
      monolithMap.includes('stable rhythm lane scheduler shape audit') ||
      monolithMap.includes('stable rhythm lane scheduler callsite source probe only; scheduler loop stays inline') ||
      monolithMap.includes('arrow-motion RAF hook extracted; keyboard and stable scheduler remain App-owned')) &&
    (monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContextArgs') || monolithMap.includes('buildAppStableRhythmLaneSchedulerPrestepContext')),
  suiteAndContractIncludeGuard:
    suite.includes("script: 'xensonar:check-app-resonance-arrow-motion-raf-shape-audit'") &&
    suiteContract.includes("'xensonar:check-app-resonance-arrow-motion-raf-shape-audit'"),
  auditSizeRemainsProbeScale: auditLines >= 90 && auditLines <= 180,
  appDidNotGrowFromRuntimeExtraction: appLines <= 5625,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);

console.log(JSON.stringify({
  check: 'app-resonance-arrow-motion-raf-shape-audit',
  version: pkg.version,
  appLines,
  auditLines,
  checks,
}, null, 2));

if (failed.length) {
  console.error('\nFailed checks:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
