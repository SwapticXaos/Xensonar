import {
  createForge3MinorStoreActions,
  createInitialForge3MinorState,
  setLogScaleState,
  setRenderColorMapState,
  setShowGrainLayerState,
  setViewPortState,
  setWaveformMixState,
  triggerRenderState,
  type Forge3MinorState,
} from '../src/features/l3lab/spectralForge/state/storeForge3MinorActions';
import type { ColorMapName } from '../src/features/l3lab/spectralForge/utils/colorMap';
import type { SynthMode, ViewPort, WaveformMix } from '../src/features/l3lab/spectralForge/state/store';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(normalize(actual));
  const expectedJson = JSON.stringify(normalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
  }
}

function applyPatch<T extends Forge3MinorState>(state: T, patch: Partial<T>): T {
  return { ...state, ...patch };
}

function oldSetViewPortState<T extends Forge3MinorState>(state: T, vp: Partial<ViewPort>): Partial<T> {
  return { viewPort: { ...state.viewPort, ...vp } } as Partial<T>;
}

function oldSetWaveformMixState<T extends Forge3MinorState>(state: T, mix: Partial<WaveformMix>): Partial<T> {
  return {
    waveformMix: { ...state.waveformMix, ...mix },
    audioBufferDirty: true,
  } as Partial<T>;
}

function oldSetColorMapNameState<T extends Forge3MinorState>(state: T, name: ColorMapName): Partial<T> {
  return { colorMapName: name, renderVersion: state.renderVersion + 1 } as Partial<T>;
}

function oldSetShowGrainLayerState<T extends Forge3MinorState>(state: T, show: boolean): Partial<T> {
  return { showGrainLayer: show, renderVersion: state.renderVersion + 1 } as Partial<T>;
}

function oldSetLogScaleState<T extends Forge3MinorState>(state: T, log: boolean): Partial<T> {
  return { logScale: log, renderVersion: state.renderVersion + 1 } as Partial<T>;
}

function oldTriggerRenderState<T extends Forge3MinorState>(state: T): Partial<T> {
  return { renderVersion: state.renderVersion + 1 } as Partial<T>;
}

function makeMutatedState(): Forge3MinorState {
  return {
    ...createInitialForge3MinorState(),
    viewPort: { offsetX: 40, offsetY: -12, zoomX: 2.5, zoomY: 0.75 },
    isPlaying: true,
    playheadPosition: 0.37,
    showPlayheadMarker: true,
    synthMode: 'glyph',
    waveformMix: { sine: 0.2, sawtooth: 0.3, square: 0.4, triangle: 0.1 },
    colorMapName: 'hot',
    showGrainLayer: true,
    logScale: false,
    renderVersion: 9,
    lineStart: { x: 12, y: 34 },
    audioBufferDirty: false,
  };
}

const checked: string[] = [];

function checkPure(label: string, state: Forge3MinorState, actualPatch: Partial<Forge3MinorState>, expectedPatch: Partial<Forge3MinorState>): Forge3MinorState {
  checked.push(label);
  assertEqual(label, actualPatch, expectedPatch);
  return applyPatch(state, actualPatch);
}

let state = createInitialForge3MinorState();
checked.push('initial minor state matches previous inline defaults');
assertEqual('initial minor state matches previous inline defaults', state, {
  viewPort: { offsetX: 0, offsetY: 0, zoomX: 1, zoomY: 1 },
  isPlaying: false,
  playheadPosition: 0,
  showPlayheadMarker: false,
  synthMode: 'additive',
  waveformMix: { sine: 1, sawtooth: 0, square: 0, triangle: 0 },
  colorMapName: 'magma',
  showGrainLayer: false,
  logScale: true,
  renderVersion: 0,
  lineStart: null,
  audioBufferDirty: false,
});

state = checkPure('setViewPort partial merge keeps untouched viewport axes', state, setViewPortState(state, { offsetX: 17, zoomY: 1.75 }), oldSetViewPortState(state, { offsetX: 17, zoomY: 1.75 }));
state = checkPure('setWaveformMix partial merge marks audio buffer dirty', state, setWaveformMixState(state, { sawtooth: 0.4, square: 0.15 }), oldSetWaveformMixState(state, { sawtooth: 0.4, square: 0.15 }));
state = checkPure('setColorMapName increments renderVersion', state, setRenderColorMapState(state, 'ice'), oldSetColorMapNameState(state, 'ice'));
state = checkPure('setShowGrainLayer increments renderVersion', state, setShowGrainLayerState(state, true), oldSetShowGrainLayerState(state, true));
state = checkPure('setLogScale increments renderVersion', state, setLogScaleState(state, false), oldSetLogScaleState(state, false));
state = checkPure('triggerRender increments renderVersion only', state, triggerRenderState(state), oldTriggerRenderState(state));

const directState = makeMutatedState();
const directChecks: Array<[string, Partial<Forge3MinorState>, Partial<Forge3MinorState>]> = [
  ['setColorMapName can set plasma and increments from existing render version', setRenderColorMapState(directState, 'rainbow'), oldSetColorMapNameState(directState, 'rainbow')],
  ['setShowGrainLayer false still increments renderVersion', setShowGrainLayerState(directState, false), oldSetShowGrainLayerState(directState, false)],
  ['setLogScale true still increments renderVersion', setLogScaleState(directState, true), oldSetLogScaleState(directState, true)],
  ['triggerRender from mutated state increments once', triggerRenderState(directState), oldTriggerRenderState(directState)],
];
for (const [label, actual, expected] of directChecks) {
  checked.push(label);
  assertEqual(label, actual, expected);
}

let storeState = makeMutatedState();
const actions = createForge3MinorStoreActions<Forge3MinorState>((partial) => {
  const patch = typeof partial === 'function' ? partial(storeState) : partial;
  storeState = { ...storeState, ...patch };
});

actions.setIsPlaying(false);
checked.push('store action setIsPlaying only changes isPlaying');
assertEqual('store action setIsPlaying only changes isPlaying', storeState.isPlaying, false);

actions.setPlayheadPosition(0.61);
checked.push('store action setPlayheadPosition only changes playheadPosition');
assertEqual('store action setPlayheadPosition only changes playheadPosition', storeState.playheadPosition, 0.61);

actions.setShowPlayheadMarker(false);
checked.push('store action setShowPlayheadMarker only changes marker flag');
assertEqual('store action setShowPlayheadMarker only changes marker flag', storeState.showPlayheadMarker, false);

actions.setSynthMode('granular' as SynthMode);
checked.push('store action setSynthMode only changes synthMode');
assertEqual('store action setSynthMode only changes synthMode', storeState.synthMode, 'granular');

actions.setLineStart({ x: 90, y: 10 });
checked.push('store action setLineStart stores point');
assertEqual('store action setLineStart stores point', storeState.lineStart, { x: 90, y: 10 });

actions.setLineStart(null);
checked.push('store action setLineStart accepts null');
assertEqual('store action setLineStart accepts null', storeState.lineStart, null);

actions.setAudioBufferDirty(true);
checked.push('store action setAudioBufferDirty sets dirty flag');
assertEqual('store action setAudioBufferDirty sets dirty flag', storeState.audioBufferDirty, true);

actions.setViewPort({ offsetY: 22 });
checked.push('store action setViewPort matches old inline merge');
assertEqual('store action setViewPort matches old inline merge', storeState.viewPort, { offsetX: 40, offsetY: 22, zoomX: 2.5, zoomY: 0.75 });

actions.setWaveformMix({ sine: 0.9 });
checked.push('store action setWaveformMix matches old inline dirty behavior');
assertEqual('store action setWaveformMix matches old inline dirty behavior', { waveformMix: storeState.waveformMix, audioBufferDirty: storeState.audioBufferDirty }, { waveformMix: { sine: 0.9, sawtooth: 0.3, square: 0.4, triangle: 0.1 }, audioBufferDirty: true });

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length, checked }, null, 2));
