#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceHotkeyModeRoutingBoundary.ts';
const materialHotkeyPath = 'src/features/xensonar/material/materialLoopHotkeyRouting.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';

const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const materialHotkey = read(materialHotkeyPath);
const router = exists(routerPath) ? read(routerPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsHotkeyModeBoundary: router.includes('resonanceHotkeyModeRoutingBoundary')
    && router.includes('runResonanceHotkeyModeToggleBoundary')
    && router.includes('runResonanceLoopHotkeyModeRoutingBoundary')
    && router.includes('readResonanceHotkeyMode')
    && app.includes('runResonanceKeyboardInputRouter'),
  appNoLongerImportsMaterialHotkeyPrimitivesDirectly: !app.includes('handleMaterialLoopHotkeys, isMaterialLoopHotkeyModeToggleEvent')
    && !app.includes('isMaterialLoopHotkeyModeToggleEvent } from "./features/xensonar/material/materialLoopHotkeyRouting"'),
  appDelegatesModeToggleToBoundary: router.includes('const currentResonanceHotkeyMode = readResonanceHotkeyMode(params);')
    && router.includes('runResonanceHotkeyModeToggleBoundary({')
    && router.includes('updateNParams,')
    && router.includes('preventDefault,'),
  appDelegatesLoopHotkeysToBoundary: router.includes('runResonanceLoopHotkeyModeRoutingBoundary({')
    && router.includes('recentLoopHotkeyEntries,')
    && router.includes('recentRootFollowHotkeyEntries,')
    && router.includes('selectMaterialLoopDirect,')
    && router.includes('selectRootFollowLoopDirect,')
    && router.includes('browseRootFollowLoopWithUmlaut,'),
  appNoLongerOwnsMaterialRootHotkeyRoutingInline: !app.includes('const activeLoopHotkeyEntries = currentResonanceHotkeyMode === "root-follow"')
    && !app.includes('const didHandleMaterialLoopHotkey = handleMaterialLoopHotkeys({')
    && !app.includes('toggleLoopDirect: currentResonanceHotkeyMode === "root-follow"'),
  boundaryOwnsModeToggleSemantics: boundary.includes('isMaterialLoopHotkeyModeToggleEvent(event)')
    && boundary.includes("currentMode === 'root-follow' ? 'material' : 'root-follow'")
    && boundary.includes('updateNParams({ resonanceHotkeyMode: nextMode });')
    && boundary.includes('preventDefault();'),
  boundaryOwnsMaterialVsRootLoopDispatch: boundary.includes('const isRootFollowMode = currentMode === \'root-follow\';')
    && boundary.includes('recentLoopHotkeyEntries: isRootFollowMode ? recentRootFollowHotkeyEntries : recentLoopHotkeyEntries')
    && boundary.includes('selectRootFollowLoopDirect(entryId);')
    && boundary.includes("selectMaterialLoopDirect(entryId, 'hotkey');")
    && boundary.includes('toggleLoopDirect: isRootFollowMode ? toggleRootFollowLoopDirect : toggleMaterialLoopDirect')
    && boundary.includes('browseLoopWithUmlaut: isRootFollowMode ? browseRootFollowLoopWithUmlaut : browseMaterialLoopWithUmlaut'),
  boundaryReusesExistingMaterialLoopHotkeyContract: boundary.includes('handleMaterialLoopHotkeys({')
    && materialHotkey.includes('MATERIAL_LOOP_HOTKEY_KEYS')
    && materialHotkey.includes("if (hotkeyMode === 'particle-classic') return false;")
    && !boundary.includes('MATERIAL_LOOP_HOTKEY_KEYS'),
  keyboardMirrorOrderingStillAfterModeToggle: router.indexOf('runResonanceHotkeyModeToggleBoundary({') !== -1
    && router.indexOf('runResonanceAuxiliaryHotkeyRoutingBoundary({') !== -1
    && router.indexOf('runResonanceHotkeyModeToggleBoundary({') < router.indexOf('runResonanceAuxiliaryHotkeyRoutingBoundary({'),
  loopHotkeyRoutingStillInsideNonRepeatBlock: router.indexOf('if (!event.repeat) {') !== -1
    && router.indexOf('runResonanceLoopHotkeyModeRoutingBoundary({') !== -1
    && router.indexOf('if (!event.repeat) {') < router.indexOf('runResonanceLoopHotkeyModeRoutingBoundary({')
    && router.indexOf('runResonanceKeyboardPitchCommandAssemblyBoundary({') > router.indexOf('runResonanceLoopHotkeyModeRoutingBoundary({'),
  boundaryDoesNotTouchAudioOrWaveOrParticlePaths: !/AudioContext|OscillatorNode|GainNode|playWaveStartSound|commitResonanceCursorY|toggleNexusAgent|dispatchParticlePlayback|rootFollowInputTargetHzRef|requestAnimationFrame/.test(boundary),
  appLineCountDidNotGrowPastEnterWaveBoundary: appLines < 5725,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'resonance hotkey mode read/toggle contract',
    'material vs root-follow loop hotkey routing',
    'loop hotkey preventDefault handoff',
  ],
  explicitlyNotMoved: [
    'keyboard pitch lane commands',
    'Wellenstarter Enter and directed pulse gestures',
    'drum playlist hotkeys',
    'particle-system/church-mode hotkeys',
    'keyboard mirror toggle state',
    'audio-ready wrapper ownership',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
