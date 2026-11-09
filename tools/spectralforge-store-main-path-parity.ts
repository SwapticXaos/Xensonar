import { getForge3BodyField } from '../src/features/l3lab/forge3/bodyField';
import { SpectralData } from '../src/features/l3lab/spectralForge/audio/SpectralData';
import {
  createForge3MainPathStoreActions,
  type Forge3MainPathHostState,
} from '../src/features/l3lab/spectralForge/state/storeForge3MainPathActions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertAllAmplitudeCleared(spectralData: SpectralData, label: string) {
  for (const value of spectralData.data) {
    assert(value === 0, `${label}: amplitude layer was not cleared`);
  }
  for (const value of spectralData.grainData) {
    assert(value === 0.5, `${label}: grain layer was not reset to default`);
  }
}

type TestState = Forge3MainPathHostState & { pushUndoCount: number };

function createTestState(): TestState {
  const spectralData = new SpectralData(8, 4);
  spectralData.set(1, 2, 0.72);
  spectralData.set(6, 1, 0.45);
  spectralData.setGrain(1, 2, 0.91);
  getForge3BodyField().seedFromSpectralData(spectralData, null);
  assert(getForge3BodyField().captureSnapshot().initialized, 'precondition: body field should be initialized before main-path action');

  const state: TestState = {
    spectralData,
    pushUndoCount: 0,
    pushUndo: () => { state.pushUndoCount += 1; },
    sourceAsset: { fileName: 'parity-source.wav' } as any,
    sourceAssetContext: 'forge3_main',
    sourcePreviewMode: 'sourceWindow',
    lastCommitDomain: 'body_state',
    activeMediatedBody: { id: 'mediated-body-parity' } as any,
    renderVersion: 7,
    audioBufferDirty: false,
  };
  return state;
}

function bindActions(state: TestState) {
  const set = (partial: Partial<TestState> | ((current: TestState) => Partial<TestState>)) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, next);
  };
  const get = () => state;
  return createForge3MainPathStoreActions<TestState>(set, get);
}

function runClearCanvasScenario() {
  const state = createTestState();
  const activeMediatedBody = state.activeMediatedBody;
  const actions = bindActions(state);
  actions.clearCanvas();

  assert(state.pushUndoCount === 1, 'clearCanvas should push exactly one undo snapshot');
  assertAllAmplitudeCleared(state.spectralData, 'clearCanvas');
  assert(!getForge3BodyField().captureSnapshot().initialized, 'clearCanvas should clear the Forge3 body field');
  assert(state.sourceAsset?.fileName === 'parity-source.wav', 'clearCanvas should preserve sourceAsset');
  assert(state.sourceAssetContext === 'forge3_main', 'clearCanvas should preserve sourceAssetContext');
  assert(state.sourcePreviewMode === 'sourceWindow', 'clearCanvas should preserve sourcePreviewMode');
  assert(state.lastCommitDomain === 'body_state', 'clearCanvas should preserve lastCommitDomain');
  assert(state.activeMediatedBody === activeMediatedBody, 'clearCanvas should preserve activeMediatedBody');
  assert(state.renderVersion === 8, 'clearCanvas should increment renderVersion once');
  assert(state.audioBufferDirty === true, 'clearCanvas should mark the audio buffer dirty');
}

function runResetForgeMainPathScenario() {
  const state = createTestState();
  const actions = bindActions(state);
  actions.resetForgeMainPath();

  assert(state.pushUndoCount === 1, 'resetForgeMainPath should push exactly one undo snapshot');
  assertAllAmplitudeCleared(state.spectralData, 'resetForgeMainPath');
  assert(!getForge3BodyField().captureSnapshot().initialized, 'resetForgeMainPath should clear the Forge3 body field');
  assert(state.sourceAsset === null, 'resetForgeMainPath should clear sourceAsset');
  assert(state.sourceAssetContext === 'none', 'resetForgeMainPath should reset sourceAssetContext');
  assert(state.sourcePreviewMode === 'forge', 'resetForgeMainPath should reset sourcePreviewMode');
  assert(state.lastCommitDomain === 'none', 'resetForgeMainPath should reset lastCommitDomain');
  assert(state.activeMediatedBody === null, 'resetForgeMainPath should clear activeMediatedBody');
  assert(state.renderVersion === 8, 'resetForgeMainPath should increment renderVersion once');
  assert(state.audioBufferDirty === true, 'resetForgeMainPath should mark the audio buffer dirty');
}

runClearCanvasScenario();
runResetForgeMainPathScenario();

console.log(JSON.stringify({ ok: true, checkedScenarios: 2 }, null, 2));
