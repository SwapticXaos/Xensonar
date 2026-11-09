#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const loopLane = read('src/features/xensonar/material/loopLaneUiState.ts');
const panelProps = read('src/features/xensonar/material/buildRootFollowPanelProps.ts');
const app = read('src/App.tsx');
const loopDialog = read('src/features/xensonar/rooms/materialLoopPanel/LoopBankManagerDialog.tsx');
const materialBridge = read('src/features/xensonar/material/useResonanceMaterialLoopBridge.ts');
const scheduler = read('src/features/xensonar/material/useRootFollowLoopPlayback.ts');
const rendererTypes = read('src/features/xensonar/rootFollow/rootFollowRendererTypes.ts');
const materialRenderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const impulseRuntime = read('src/features/xensonar/rootFollow/rootFollowMaterialImpulseRasterRuntime.ts');
const session = read('src/features/xensonar/rootFollow/rootFollowSession.ts');
const policy = read('src/features/xensonar/rootFollow/rootFollowImpulseRasterPolicy.ts');
const sharedPatternModel = read('src/features/xensonar/rhythmSegmentPattern.ts');
const sharedPatternGrid = read('src/features/xensonar/rooms/SegmentPatternGrid.tsx');
const droneEditor = read('src/features/xensonar/rooms/DroneRhythmEditorSlot.tsx');
const holdEditor = read('src/features/xensonar/rooms/WaveStarterHoldPatternEditorSlot.tsx');
const storage = read('src/features/xensonar/rootFollow/rootFollowLoopUiStorage.ts');
const executor = read('src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts');
const transferPhases = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts');
const verwalten = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const carrierMachineEditor = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralMachineEditorSection.tsx');

const rootClusterIndex = panel.indexOf('const rootFollowManagerDetails = (');
const rootCluster = panel.slice(rootClusterIndex);
const taktIndex = rootCluster.indexOf('label="Takt-Interpretation"');
const rasterIndex = rootCluster.indexOf('<RootFollowImpulseRasterControls');
const markerIndex = panel.indexOf('data-xensonar-root-follow-impulsraster-near-takt-interpretation="true"');
const segmentMarkerIndex = panel.indexOf('data-xensonar-root-follow-impulsraster-segment-pattern="true"');
const anchorIndex = rootCluster.indexOf('<RootFollowAnchorControl');
assert(rootClusterIndex >= 0, 'Root-Follow manager detail cluster not found.');
assert(taktIndex >= 0, 'Root-Follow Takt-Interpretation control not found.');
assert(rasterIndex > taktIndex, 'Impulsraster UI is not placed after Root-Follow Takt-Interpretation.');
assert(markerIndex >= 0, 'Impulsraster UI has no placement marker attribute.');
assert(segmentMarkerIndex >= 0, 'Impulsraster UI has no segment-pattern marker attribute.');
assert(anchorIndex > rasterIndex, 'Impulsraster UI is not in the Root-Follow policy cluster before anchor/control body.');
assert(!rootCluster.includes('lg:grid-cols-[minmax(0,1fr)_auto]'), 'Root-Follow time/pattern controls still use the cramped side-by-side layout.');
assert(!panel.includes('aria-label="Root Follow Impulsraster jeden Slot"'), 'Old Jeden-n numeric UI is still present.');
assert(panel.includes('aria-label="Root Follow Impulsraster Basis-Takt Beat durch"'), 'Basis-Takt/Beat subdivision UI missing.');
assert(panel.includes('aria-label="Root Follow Impulsraster Root-Follow-Takt Verhältnis"'), 'Root-Follow takt-ratio UI missing.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-beat-ratio="true"'), 'Impulsraster UI has no beat-ratio marker attribute.');
assert(panel.includes('<span>Beat durch</span>') && panel.includes('<span>Root-Follow</span>') && panel.includes('data-xensonar-root-follow-impulsraster-ratio-row="true"'), 'Impulsraster UI does not expose the compact beat-to-root-follow ratio row.');
assert(!panel.includes('Zyklus-Raster plus versetztes Gegenfenster'), 'Old Gegenfenster explanation is still present in the visible Root-Follow UI.');
assert(!panel.includes('<span>Gegenfenster</span>'), 'Old Gegenfenster input label is still present in the visible Root-Follow UI.');
assert(!panel.includes('<span>Zyklus durch</span>'), 'Old Zyklus-durch input label is still present in the visible Root-Follow UI.');
assert(panel.includes('<SegmentPatternGrid') && panel.includes('label="Root Follow Taktmuster"'), 'Root-Follow Impulsraster does not use the shared segment-pattern grid for the Root-Follow takt pattern.');
assert(panel.includes("['fragment-compress', 'Stauchend'") && panel.includes('Figur verdichtet in jeden Slot'), 'Impulsraster UI does not expose the fragment-compress toggle mode.');
assert(panel.includes("['mute-pattern', 'Mute-Pattern'") && panel.includes('Figur läuft voll, Slots maskieren'), 'Impulsraster UI does not expose the mute-pattern toggle mode.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-clock-mode-select="true"') && panel.includes('data-xensonar-root-follow-impulsraster-clock-mode-toggle="true"'), 'Impulsraster clock-mode toggle has no explicit accessibility/contract marker.');
assert(panel.includes('data-xensonar-root-follow-lesart-no-overlap="true"'), 'Impulsraster Lesart row has no no-overlap layout marker.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-clock-mode-toggle-group="true"') && panel.includes('data-xensonar-root-follow-lesart-no-overlap="true"'), 'Lesart toggle group is not laid out as its own no-overlap row.');
assert(panel.includes('data-xensonar-root-follow-preview-button="true"'), 'Root-Follow preview button is missing from the Root-Follow manager surface.');
assert(rootCluster.indexOf('data-xensonar-root-follow-preview-button="true"') >= 0 && rootCluster.indexOf('data-xensonar-root-follow-preview-button="true"') < taktIndex, 'Root-Follow preview button is not placed at the top of the Root-Follow control window.');
assert(panel.includes('{rootFollowPreviewActive ? "Stopp" : "Vorhören"}'), 'Root-Follow preview button does not toggle Vorhören/Stopp.');
assert(app.includes('rootFollowPreviewActive') && app.includes('playfieldCursorInside: rootFollowPreviewActive || rootFollowPlayfieldInside'), 'Root-Follow preview does not bypass the covered-playfield gate while the window is open.');
assert(loopDialog.includes('data-xensonar-loop-manager-clicks-do-not-trigger-wavestarter="true"') && loopDialog.includes('onPointerDownCapture={(event) => event.stopPropagation()}'), 'Loop-manager window clicks are not explicitly isolated from Wellenstarter pointer starts.');
assert(!panel.includes('verriegelt'), 'Visible Impulsraster UI still uses the misleading verriegelt wording.');
assert(panel.includes('Figur im ganzen Root-Follow-Takt'), 'Mute-pattern UI does not explain the whole Root-Follow takt semantics.');
assert(panel.includes('onRootFollowImpulsRasterPatternChange'), 'Impulsraster UI does not propagate segment-pattern changes.');
assert(!verwalten.includes('Impulsraster'), 'Impulsraster leaked into Carrier-Integral/Send-button side UI.');

for (const needle of [
  'normalizeSegmentPatternSteps',
  'isSegmentPatternStepActive',
  'formatSegmentPatternCompact',
]) {
  assert(sharedPatternModel.includes(needle), `Shared segment-pattern model missing ${needle}.`);
}
assert(sharedPatternGrid.includes('data-xensonar-shared-segment-pattern-grid="true"'), 'Shared segment-pattern grid has no explicit contract marker.');
assert(sharedPatternGrid.includes('const buttonHeight =') && sharedPatternGrid.includes("'h-8'") && sharedPatternGrid.includes("'h-7'"), 'Shared segment-pattern grid does not adapt button height to segment count.');
assert(droneEditor.includes('<SegmentPatternGrid') && droneEditor.includes('label="Drone Rhythmus"'), 'Drone rhythm editor is not using the shared segment-pattern grid.');
assert(holdEditor.includes('<SegmentPatternGrid') && holdEditor.includes('label={laneLabel}'), 'Hold pattern editor is not using the shared segment-pattern grid.');

for (const needle of [
  'impulsRasterEvery',
  'impulsRasterCycleDiv',
  'impulsRasterClockMode',
  'impulsRasterPattern',
  'rootFollowImpulsRasterCycleDiv',
  'rootFollowImpulsRasterClockMode',
  'rootFollowImpulsRasterPattern',
  'rootFollowLoopLaneToNexusPatch',
]) {
  assert(loopLane.includes(needle), `Loop-lane state missing ${needle}.`);
}
for (const needle of [
  'onRootFollowImpulsRasterEveryChange',
  'onRootFollowImpulsRasterCycleDivChange',
  'onRootFollowImpulsRasterClockModeChange',
  'onRootFollowImpulsRasterPatternChange',
  'updateNParams({ rootFollowImpulsRasterEvery: value })',
  'updateNParams({ rootFollowImpulsRasterCycleDiv: value })',
  'updateNParams({ rootFollowImpulsRasterClockMode: value })',
  'updateNParams({ rootFollowImpulsRasterPattern: value })',
]) {
  assert(panelProps.includes(needle), `Panel props propagation missing ${needle}.`);
}
for (const needle of [
  'rootFollowPreviewActive',
  'onRootFollowPreviewToggle',
  'onRootFollowPreviewStop',
  'toggleRootFollowPreview',
  'stopRootFollowPreview',
]) {
  assert(panelProps.includes(needle) || panel.includes(needle), `Preview propagation missing ${needle}.`);
}
for (const needle of [
  'rootFollowPreviewSnapshotRef',
  "drumPattern: 'four_on_floor'",
  'startedFallbackBeat',
  'rootFollowLoopActive: true',
  "resonanceHotkeyMode: 'root-follow'",
  'stopRootFollowPreview',
]) {
  assert(materialBridge.includes(needle), `Root-Follow preview bridge missing ${needle}.`);
}
assert(!panel.includes('className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'), 'Lesart still uses the cramped 5.64 overlap-prone grid layout.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-expand-toggle="true"'), 'Impulsraster compact bypass/expand toggle missing.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-pip-preview="true"'), 'Impulsraster pip-dot preview missing.');
assert(panel.includes('data-xensonar-root-follow-impulsraster-presets="compact-flex"') && panel.includes('Sync') && panel.includes('Stumm'), 'Impulsraster compact preset row missing Sync/Stumm controls.');
assert(storage.includes('rootFollowImpulsRasterPattern') && storage.includes('normalizeRootFollowImpulseRasterPattern'), 'Root-Follow local storage does not persist/normalize segment pattern.');

for (const needle of [
  'getEffectiveMaterialLoopCycleDurationSec',
  'normalizeRootFollowImpulseRasterPolicy',
  'isRootFollowImpulseRasterBypass',
  'resolveRootFollowImpulseRasterSlotDecision',
  'buildRootFollowImpulseRasterRenderWindow',
  'impulseRasterRenderWindow',
  'globalSlotCounter',
  'impulse-raster-slot-muted',
  'timeline-derived-slot-fragment-compression',
  'timeline-derived-root-follow-window-mute-pattern',
  'rootFollowImpulsRasterClockMode',
  'rootFollowImpulsRasterPattern',
  'counterDiv',
  'beatBasisDiv',
  'rootFollowTaktRatioDiv',
  'counterIndex',
  'cycleSlotIndex',
  'patternIndex',
  'rootFollowWindowStartSec',
  'rootFollowWindowDurSec',
  'mutePatternWindow',
]) {
  assert(scheduler.includes(needle), `Scheduler does not read/use ${needle}.`);
}
assert(session.includes('globalSlotCounter: number') && session.includes('globalSlotCounter: 0'), 'Root-Follow session has no global slot counter.');
assert(!/slotIndex\s*%\s*\w+/.test(scheduler), 'Scheduler contains zero-based-looking slotIndex modulo logic.');
assert(!scheduler.includes('sessionStateRef.current.globalSlotCounter + 1'), 'Scheduler still increments a tick-local global slot counter.');
assert(!scheduler.includes('Math.max(renderResult.nextSliceStart, impulseSlotStart + impulseSlotDurSec)'), 'Audible slots still force nextSliceStart to the far slot boundary.');
assert(rendererTypes.includes('impulseRasterWindow?: RootFollowImpulseRasterRenderWindow | null'), 'Material renderer args do not expose an impulse-raster render window.');
assert(scheduler.includes('impulseRasterWindow: impulseRasterRenderWindow'), 'Scheduler does not pass the audible impulse slot window into the material renderer.');
assert(materialRenderer.includes('const baseDesiredLoopDur = Math.max(0.25, barDur * interpretedBars)'), 'Material renderer does not preserve the full interpreted base cycle.');
assert(impulseRuntime.includes('fragment-compressed-into-active-segment'), 'Impulse-raster runtime does not distinguish compressed fragment mode.');
assert(impulseRuntime.includes('desiredLoopDur'), 'Impulse-raster runtime does not compute an impulse-aware desiredLoopDur.');
assert(impulseRuntime.includes('whole-root-follow-window-muted-by-segments'), 'Impulse-raster runtime does not distinguish whole-window mute-pattern mode.');
assert(impulseRuntime.includes('impulseRasterWindow.slotDurationSec'), 'Impulse-raster runtime does not use slot duration as compressed fragment duration.');
assert(impulseRuntime.includes('materialTransportAnchor'), 'Impulse-raster runtime does not compute an impulse-aware transport anchor.');
assert(impulseRuntime.includes('impulseRasterWindow.rootFollowWindowStartSec'), 'Impulse-raster runtime does not anchor mute-pattern to the full Root-Follow window.');
assert(impulseRuntime.includes('impulseRasterWindow.slotStartSec'), 'Impulse-raster runtime does not anchor compressed fragments at slotStartSec.');
assert(impulseRuntime.includes('materialRenderHorizonEnd'), 'Impulse-raster runtime does not cap rendering at the active impulse slot boundary.');
assert(materialRenderer.includes('clockMode: impulseRasterWindow.clockMode'), 'Material renderer traffic does not expose impulse-raster clock mode.');
assert(impulseRuntime.includes('whole-root-follow-window-muted-by-segments'), 'Impulse-raster runtime does not expose the sharpened mute-pattern interpretation.');
assert(materialRenderer.includes('rootFollowWindowDurSec'), 'Material renderer traffic does not expose Root-Follow window duration.');
assert(materialRenderer.includes('sourceCycleDurSec: baseDesiredLoopDur'), 'Material renderer traffic does not expose source-cycle duration for impulse compression forensics.');
assert(materialRenderer.includes('renderFragmentDurSec: desiredLoopDur'), 'Material renderer traffic does not expose compressed fragment duration for impulse compression forensics.');
assert(policy.includes('RootFollowImpulseRasterClockMode') && policy.includes('"fragment-compress"') && policy.includes('"mute-pattern"'), 'Impulse raster policy does not model both clock modes.');
assert(policy.includes('clockMode: "fragment-compress"'), 'Default impulse raster mode is not explicit.');
assert(policy.includes('counterDiv: 1'), 'Default impulse raster root-follow ratio is not explicit.');
assert(policy.includes('rootFollowWindowDurationSec'), 'Policy does not expose Root-Follow window duration.');
assert(policy.includes('rootFollowWindowStartSec'), 'Policy does not expose Root-Follow window start.');
assert(policy.includes('UI label: "Basis-Takt (Beat) durch"'), 'Policy does not document the public Beat subdivision label.');
assert(policy.includes('UI label:\n   * "definiert Root-Follow-Takt im Verhältnis"'), 'Policy does not document the public Root-Follow takt ratio label.');
assert(policy.includes('formatRootFollowImpulseRasterBeatRatioSummary'), 'Policy has no beat-ratio summary helper.');
assert(policy.includes('pattern: [1]'), 'Default impulse raster pattern is not explicit 1-segment pass-through.');
assert(policy.includes('isRootFollowImpulseRasterBypass'), '1/1 bypass helper missing.');
assert(policy.includes('resolveRootFollowImpulseRasterSlotDecision'), 'Timeline-derived impulse slot decision helper missing.');
assert(policy.includes('globalSlot = elapsedSlotCount + 1'), 'Slot decision is not 1-based timeline-derived.');
assert(policy.includes('(globalSlot - 1) % safeCounterDiv'), 'Counter-window lookup is not 1-based/global-slot aligned.');
assert(policy.includes('isSegmentPatternStepActive') && policy.includes('policy.counterDiv') && policy.includes('args.globalSlot'), 'Counter-window audibility is not delegated to shared segment-pattern model.');
assert(policy.includes('previewRootFollowImpulseRasterCycleGroups'), 'Cycle-group preview helper missing for visible polyrhythmic drift.');

assert(policy.includes('isRootFollowImpulseRasterAllMuted'), 'Policy is missing all-muted detector.');
assert(scheduler.includes('impulse-raster-all-muted-idle'), 'Scheduler is missing the all-muted idle guard.');
assert(scheduler.includes('stopRootFollowPlaybackNodesBoundary(refs)') && scheduler.includes('resetRootFollowSessionState(sessionStateRef.current)'), 'All-muted guard does not stop nodes/reset scheduler state.');
assert(panel.includes('resizeSegmentPatternPreservingMutedTail'), 'Impulsraster UI does not preserve explicit pattern slots during Sync/resize.');
assert(materialRenderer.includes('const delayFloorMs = impulseRasterWindow ? 8 : 16'), 'Root-Follow material renderer does not scope the 8ms scheduler floor to active impulse windows.');


const normalize = (steps, segments) => Array.from({ length: segments }, (_, index) => steps?.[index] === 0 ? 0 : 1);
const patternPreview = (steps, cycleDiv, counterDiv, cycles = 3) => {
  const pattern = normalize(steps, counterDiv);
  return Array.from({ length: cycleDiv * cycles }, (_, index) => pattern[index % counterDiv] ? 'X' : '.').join(' ');
};
const allOnHalf = patternPreview([1], 2, 1, 3);
assert(allOnHalf === 'X X X X X X', `1/2 all-on counter-window should remain continuously audible by slot, got: ${allOnHalf}`);
const staticFive = patternPreview([1, 0, 1, 0, 0], 5, 5, 2);
assert(staticFive === 'X . X . . X . X . .', `5-segment locked counter-window regression: ${staticFive}`);
const polyrhythmThreeAgainstFour = patternPreview([0, 0, 1], 4, 3, 4);
assert(polyrhythmThreeAgainstFour === '. . X . . X . . X . . X . . X .', `3-over-4 counter-window should drift across the 4-slot cycle, got: ${polyrhythmThreeAgainstFour}`);
const groupedPolyrhythm = polyrhythmThreeAgainstFour.split(' ').reduce((groups, value, index) => {
  const groupIndex = Math.floor(index / 4);
  groups[groupIndex] = `${groups[groupIndex] ?? ''}${value}`;
  return groups;
}, []).join(' | ');
assert(groupedPolyrhythm === '..X. | .X.. | X..X | ..X.', `3-over-4 grouped preview should visibly shift, got: ${groupedPolyrhythm}`);
const decideSlot = ({ candidateStartSec, transportAnchorSec = 0, cycleDurationSec = 8, pattern = [1], cycleDiv = 4, counterDiv = pattern.length }) => {
  const slotDurationSec = cycleDurationSec / cycleDiv;
  const elapsedSlotCount = Math.max(0, Math.floor((candidateStartSec - transportAnchorSec + 1e-6) / slotDurationSec));
  const globalSlot = elapsedSlotCount + 1;
  const cycleSlotIndex = (globalSlot - 1) % cycleDiv;
  const counterIndex = (globalSlot - 1) % counterDiv;
  return {
    globalSlot,
    cycleSlotIndex,
    counterIndex,
    patternIndex: counterIndex,
    slotDurationSec,
    slotStartSec: transportAnchorSec + elapsedSlotCount * slotDurationSec,
    slotEndSec: transportAnchorSec + (elapsedSlotCount + 1) * slotDurationSec,
    audible: normalize(pattern, counterDiv)[counterIndex] !== 0,
  };
};
const shiftedTimeline = [0, 2, 4, 6, 8, 10, 12, 14].map((candidateStartSec) => decideSlot({ candidateStartSec, cycleDurationSec: 8, pattern: [0, 0, 1], cycleDiv: 4, counterDiv: 3 }).audible ? 'X' : '.').join(' ');
assert(shiftedTimeline === '. . X . . X . .', `timeline gate should follow counter-window, not fixed cycle pattern, got: ${shiftedTimeline}`);

const renderClockGeometry = ({ mode, baseCycleSec, cycleDiv, counterDiv = 1, slotStartSec = 0, transportAnchorSec = 0 }) => {
  const slotDurationSec = baseCycleSec / cycleDiv;
  const elapsedSlotCount = Math.max(0, Math.floor((slotStartSec - transportAnchorSec + 1e-6) / slotDurationSec));
  const rootFollowWindowDurationSec = slotDurationSec * counterDiv;
  const rootFollowWindowStartSec = transportAnchorSec + Math.floor(elapsedSlotCount / counterDiv) * rootFollowWindowDurationSec;
  const desiredLoopDur = mode === 'fragment-compress' ? slotDurationSec : rootFollowWindowDurationSec;
  return {
    slotDurationSec,
    rootFollowWindowDurationSec,
    rootFollowWindowStartSec,
    desiredLoopDur,
    materialTransportAnchor: mode === 'fragment-compress' ? slotStartSec : rootFollowWindowStartSec,
    materialRenderHorizonEnd: slotStartSec + slotDurationSec,
    speedFactor: baseCycleSec / desiredLoopDur,
  };
};
const compressGeometry = renderClockGeometry({ mode: 'fragment-compress', baseCycleSec: 10, cycleDiv: 2, counterDiv: 1, slotStartSec: 5, transportAnchorSec: 0 });
assert(compressGeometry.desiredLoopDur === 5 && compressGeometry.materialTransportAnchor === 5 && compressGeometry.speedFactor === 2, `compressed 1/2 geometry wrong: ${JSON.stringify(compressGeometry)}`);
const muteGeometry = renderClockGeometry({ mode: 'mute-pattern', baseCycleSec: 12, cycleDiv: 4, counterDiv: 3, slotStartSec: 3, transportAnchorSec: 0 });
assert(muteGeometry.desiredLoopDur === 9 && muteGeometry.rootFollowWindowDurationSec === 9 && muteGeometry.materialTransportAnchor === 0 && muteGeometry.speedFactor === 12 / 9 && muteGeometry.materialRenderHorizonEnd === 6, `mute-pattern 3-over-4 geometry should place the figure over the whole Root-Follow window and only mute subsegments, got: ${JSON.stringify(muteGeometry)}`);
const congruentGeometry = renderClockGeometry({ mode: 'mute-pattern', baseCycleSec: 10, cycleDiv: 1, counterDiv: 1, slotStartSec: 0, transportAnchorSec: 0 });
assert(congruentGeometry.desiredLoopDur === 10 && congruentGeometry.speedFactor === 1, `1/1 mute-pattern should be congruent with the uncompressed body, got: ${JSON.stringify(congruentGeometry)}`);

assert(transferPhases.includes('renderCarrierIntegralHarmonicXploreDirectPreviewBuffer'), 'HarmonicXplorE direct buffer renderer is not used by transfer execution phases.');
assert(transferPhases.includes('args.machineId === "harmonic-xplore-direct-carrier"'), 'HarmonicXplorE direct machine branch missing in transfer execution phases.');
assert(transferPhases.includes('? buildFallbackMaterialFlowingRootFollowConfig()'), 'material-flowing Root-Follow membership does not force material config.');
assert(!transferPhases.includes('? (args.rootFollowConfig ?? buildFallbackMaterialFlowingRootFollowConfig())'), 'material-flowing still accepts synthetic rootFollowConfig fallback path.');
assert(carrierMachineEditor.includes('data-xensonar-carrier-integral-synth-lab-inline-audition="true"'), 'Synth-Labor inline Vorhören button missing.');
assert(!verwalten.includes('if (event.currentTarget === event.target) onClose();'), 'Carrier-Integral modal still closes by backdrop click.');
assert(!/event\.key === "Escape"[\s\S]{0,90}onClose\(\)/.test(verwalten), 'Carrier-Integral modal still closes by Escape.');

console.log('[xensonar] Root-Follow Impulsraster beat-ratio policy sanity: green');
console.log('[xensonar] 3-over-4 grouped preview:', groupedPolyrhythm);
