#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceParticleSystemHotkeyBoundary.ts';
const instrumentDataPath = 'src/features/xensonar/domain/instrumentData.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const instrumentData = read(instrumentDataPath);
const router = exists(routerPath) ? read(routerPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;
const repeatBlockIndex = router.indexOf('if (!event.repeat) {');
const particleBoundaryIndex = router.indexOf('runResonanceParticleSystemHotkeyBoundary({');
const loopHotkeyIndex = router.indexOf('runResonanceLoopHotkeyModeRoutingBoundary({');

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsParticleSystemHotkeyBoundary: router.includes('resonanceParticleSystemHotkeyBoundary')
    && router.includes('runResonanceParticleSystemHotkeyBoundary')
    && app.includes('runResonanceKeyboardInputRouter'),
  appDelegatesParticleSystemHotkeysToBoundary: router.includes('runResonanceParticleSystemHotkeyBoundary({')
    && router.includes('params,')
    && router.includes('setChurchMode,')
    && router.includes('cycleParticleSystem,')
    && router.includes('preventDefault,'),
  appNoLongerOwnsChurchModeCycleInline: !app.includes('if (k === "m" || k === "n")')
    && !app.includes('const particleModes = getModesForSystem(nexusParamsRef.current.particleSystem);')
    && !app.includes('const currentMode = nexusParamsRef.current.churchMode;')
    && !app.includes('particleModes[nextIndex].value'),
  appNoLongerOwnsParticleSystemCycleInline: !app.includes('if (k === "-" || k === "_")')
    && !app.includes('cycleParticleSystem(k === "_" ? -1 : 1);'),
  appNoLongerImportsGetModesForSystemDirectly: !app.includes('  getModesForSystem,\n'),
  boundaryOwnsChurchModeCycleHotkeys: boundary.includes("key === 'm' || key === 'n'")
    && boundary.includes('resolveNextChurchModeForParticleSystem')
    && boundary.includes('getModesForSystem(particleSystem)')
    && boundary.includes('setChurchMode(nextMode);'),
  boundaryOwnsParticleSystemCycleHotkeys: boundary.includes("key === '-' || key === '_'")
    && boundary.includes("cycleParticleSystem(key === '_' ? -1 : 1);")
    && boundary.includes('preventDefault();')
    && boundary.includes('return true;'),
  boundaryUsesExistingDomainTypesAndModeProvider: boundary.includes("from '../domain/instrumentData'")
    && boundary.includes('type ChurchMode')
    && boundary.includes('type ParticleSystem')
    && instrumentData.includes('export const getModesForSystem'),
  particleBoundaryStillInsideNonRepeatBlock: repeatBlockIndex !== -1
    && particleBoundaryIndex !== -1
    && repeatBlockIndex < particleBoundaryIndex,
  particleBoundaryStillBeforeLoopHotkeyRouting: particleBoundaryIndex !== -1
    && loopHotkeyIndex !== -1
    && particleBoundaryIndex < loopHotkeyIndex,
  boundaryDoesNotTouchPitchCursorWaveDrumOrLoopPaths: !/commitResonanceCursorY|stepYToGrid|snapYToGrid|getKeyboardPitchIndexFromEvent|playWaveStartSound|triggerDirectedPulse|runEnterWaveHotkeyGesture|resolveDrumPlaylistHotkeyDirection|resolveNextDrumPlaylistPatch|selectMaterialLoopDirect|selectRootFollowLoopDirect|rootFollowInputTargetHzRef|dispatchParticlePlayback|playNexusAgentTone/.test(boundary),
  appLineCountDidNotGrowPastGridBoundary: appLines < 5701,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'm/n church-mode cycling for the active particle system',
    '-/_ particle-system cycling',
  ],
  explicitlyNotMoved: [
    'particle sound or playback logic',
    'keyboard pitch lane commands',
    'cursor commit and lock-to-grid arrow stepping',
    'Wellenstarter Enter and directed pulse gestures',
    'drum playlist hotkeys',
    'material/root-follow loop hotkey routing',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
