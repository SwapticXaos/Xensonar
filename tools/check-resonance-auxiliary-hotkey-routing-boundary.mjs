#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/input/resonanceAuxiliaryHotkeyRoutingBoundary.ts';
const routerPath = 'src/features/xensonar/input/resonanceKeyboardInputRouter.ts';
const app = read(appPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const router = exists(routerPath) ? read(routerPath) : '';
const appLines = app.split(/\r?\n/).length;
const boundaryLines = boundary ? boundary.split(/\r?\n/).length : 0;

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appImportsAuxiliaryHotkeyBoundary: router.includes('resonanceAuxiliaryHotkeyRoutingBoundary')
    && router.includes('runResonanceAuxiliaryHotkeyRoutingBoundary')
    && router.includes('runResonanceNonRepeatAuxiliaryHotkeyBoundary')
    && app.includes('runResonanceKeyboardInputRouter'),
  appDelegatesMirrorWaveAndKeyboardWindowShift: router.includes('runResonanceAuxiliaryHotkeyRoutingBoundary({')
    && router.includes('toggleKeyboardMirror,')
    && router.includes('triggerDirectedPulse,')
    && router.includes('previewKeyboardWindowShift,')
    && app.includes('toggleKeyboardMirror: () => {'),
  appDelegatesNonRepeatDrumPlaylistAndAgentToggle: router.includes('runResonanceNonRepeatAuxiliaryHotkeyBoundary({')
    && router.includes('exportedDrumConfigs,')
    && router.includes('updateNParams,')
    && router.includes('toggleNexusAgent,')
    && router.includes('preventDefault,'),
  appNoLongerOwnsMirrorWaveWindowInline: !app.includes('shouldToggleKeyboardMirror(event)')
    && !app.includes('isResonanceWaveTriggerKey(key)')
    && !app.includes('getWaveDirectionForKey(key)')
    && !app.includes('isKeyboardWindowShiftCode(event.code)')
    && !app.includes('getKeyboardWindowShiftDirection(event.code)'),
  appNoLongerOwnsDrumPlaylistInline: !app.includes('resolveDrumPlaylistHotkeyDirection(event)')
    && !app.includes('resolveNextDrumPlaylistPatch({'),
  appNoLongerOwnsAgentToggleInline: !app.includes('AGENT_KEYS.indexOf(key)')
    && !app.includes("command: 'nexus-agent-toggle'")
    && !app.includes('toggleNexusAgent(agentIndex, { pingOnEnable: true })'),
  boundaryOwnsMirrorWaveWindowRouting: boundary.includes('shouldToggleKeyboardMirror(event)')
    && boundary.includes('toggleKeyboardMirror();')
    && boundary.includes('isResonanceWaveTriggerKey(key)')
    && boundary.includes('getWaveDirectionForKey(key)')
    && boundary.includes('triggerDirectedPulse(direction)')
    && boundary.includes('isKeyboardWindowShiftCode(event.code)')
    && boundary.includes('getKeyboardWindowShiftDirection(event.code)')
    && boundary.includes('previewKeyboardWindowShift(direction)'),
  boundaryOwnsDrumPlaylistRouting: boundary.includes('resolveDrumPlaylistHotkeyDirection(event)')
    && boundary.includes('resolveNextDrumPlaylistPatch({')
    && boundary.includes('drumPatterns: DRUM_PATTERNS,')
    && boundary.includes('exportedDrumConfigs,')
    && boundary.includes('updateNParams(nextDrumPatch);'),
  boundaryOwnsAgentToggleRouting: boundary.includes('AGENT_KEYS.indexOf(key)')
    && boundary.includes('params.agentEnabled.length')
    && boundary.includes("command: 'nexus-agent-toggle'")
    && boundary.includes('toggleNexusAgent(agentIndex, { pingOnEnable: true })'),
  boundaryDoesNotTouchPitchOrCoreAudioPaths: !/getKeyboardPitchIndexFromEvent|resolveResonanceKeyboardPitchCommand|commitResonanceCursorY|stepYToGrid|dispatchParticlePlayback|playNexusAgentTone|playWaveStartSound|runEnterWaveHotkeyGesture|selectMaterialLoopDirect|selectRootFollowLoopDirect|setGridMode|changeGridTuning/.test(boundary),
  appLineCountReducedBelowParticleSystemBoundary: appLines < 5690,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  movedScope: [
    'keyboard mirror toggle routing',
    'directed wave trigger key routing',
    'keyboard-window shift preview routing',
    'drum playlist previous/next hotkey routing',
    'nexus-agent toggle hotkey routing',
  ],
  explicitlyNotMoved: [
    'keyboard pitch lane',
    'lock-to-grid arrow stepping',
    'Enter Wellenstarter gesture',
    'material/root-follow loop hotkey routing',
    'particle-system and church-mode hotkey routing',
    'grid tuning and grid-mode hotkey routing',
    'Partikel playback or audio scheduling',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
