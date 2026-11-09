import {
  createToolSettingsStoreActions,
  setActiveToolState,
  toggleEraseModeState,
  updateActiveToolSettingsState,
} from '../src/features/l3lab/spectralForge/state/storeToolSettingsActions';
import {
  createDefaultToolProfiles,
  createDefaultToolSettings,
  mergeToolSettings,
} from '../src/features/l3lab/spectralForge/state/storeToolProfiles';
import type { ToolProfiles, ToolSettings, ToolType } from '../src/features/l3lab/spectralForge/state/store';

type ToolSettingsState = {
  activeTool: ToolType;
  toolProfiles: ToolProfiles;
  toolSettings: ToolSettings;
};

const baseState = (): ToolSettingsState => ({
  activeTool: 'brush',
  toolProfiles: createDefaultToolProfiles(),
  toolSettings: createDefaultToolSettings('brush'),
});

function oldSetActiveToolState(state: ToolSettingsState, tool: ToolType): Partial<ToolSettingsState> {
  return {
    activeTool: tool,
    toolSettings: mergeToolSettings(tool, state.toolProfiles[tool]),
  };
}

function oldUpdateToolSettingsState(state: ToolSettingsState, settings: Partial<ToolSettings>): Partial<ToolSettingsState> {
  const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings });
  return {
    toolSettings: nextToolSettings,
    toolProfiles: {
      ...state.toolProfiles,
      [state.activeTool]: nextToolSettings,
    },
  };
}

function oldToggleEraseModeState(state: ToolSettingsState): Partial<ToolSettingsState> {
  const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, eraseMode: !state.toolSettings.eraseMode });
  return {
    toolSettings: nextToolSettings,
    toolProfiles: {
      ...state.toolProfiles,
      [state.activeTool]: nextToolSettings,
    },
  };
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  if (typeof value === 'number') return Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12));
  return value;
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(normalize(actual));
  const expectedJson = JSON.stringify(normalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
  }
}

function applyPatch(state: ToolSettingsState, patch: Partial<ToolSettingsState>): ToolSettingsState {
  return { ...state, ...patch };
}

function runStoreActionScenario(
  label: string,
  prepare: (state: ToolSettingsState) => ToolSettingsState,
  run: (actions: ReturnType<typeof createToolSettingsStoreActions<ToolSettingsState>>) => void,
  expected: ToolSettingsState,
): void {
  let state = prepare(baseState());
  const set = (partial: Partial<ToolSettingsState> | ((state: ToolSettingsState) => Partial<ToolSettingsState>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = applyPatch(state, patch);
  };
  const actions = createToolSettingsStoreActions<ToolSettingsState>(set);
  run(actions);
  assertEqual(label, state, expected);
}

const checked: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  assertEqual(label, actual, expected);
  checked.push(label);
}

const brushState = baseState();
const customizedBrush = applyPatch(brushState, oldUpdateToolSettingsState(brushState, {
  brushSize: 17,
  intensity: 0.91,
  hardness: 0.77,
}));
const customizedStamp = applyPatch(customizedBrush, oldSetActiveToolState(customizedBrush, 'stamp'));
const customizedStampUpdated = applyPatch(customizedStamp, oldUpdateToolSettingsState(customizedStamp, {
  brushSize: 31,
  intensity: 0.22,
  eraseMode: true,
}));

check('setActiveTool loads default stamp profile', setActiveToolState(baseState(), 'stamp'), oldSetActiveToolState(baseState(), 'stamp'));
check('setActiveTool restores customized brush profile', setActiveToolState(customizedStampUpdated, 'brush'), oldSetActiveToolState(customizedStampUpdated, 'brush'));
check('updateToolSettings merges patch onto active profile', updateActiveToolSettingsState(baseState(), { brushSize: 12, intensity: 0.2 }), oldUpdateToolSettingsState(baseState(), { brushSize: 12, intensity: 0.2 }));
check('updateToolSettings keeps default fallback fields', updateActiveToolSettingsState(baseState(), { morphMode: 'bloat' }), oldUpdateToolSettingsState(baseState(), { morphMode: 'bloat' }));
check('toggleEraseMode updates active profile', toggleEraseModeState(baseState()), oldToggleEraseModeState(baseState()));
check('toggleEraseMode toggles back from true', toggleEraseModeState(customizedStampUpdated), oldToggleEraseModeState(customizedStampUpdated));

runStoreActionScenario(
  'store action setActiveTool matches old inline update',
  (state) => customizedStampUpdated,
  (actions) => actions.setActiveTool('brush'),
  applyPatch(customizedStampUpdated, oldSetActiveToolState(customizedStampUpdated, 'brush')),
);
checked.push('store action setActiveTool matches old inline update');

runStoreActionScenario(
  'store action updateToolSettings writes active profile',
  (state) => state,
  (actions) => actions.updateToolSettings({ grainSize: 0.11, hardness: 0.88 }),
  applyPatch(baseState(), oldUpdateToolSettingsState(baseState(), { grainSize: 0.11, hardness: 0.88 })),
);
checked.push('store action updateToolSettings writes active profile');

runStoreActionScenario(
  'store action toggleEraseMode matches old inline update',
  (state) => state,
  (actions) => actions.toggleEraseMode(),
  applyPatch(baseState(), oldToggleEraseModeState(baseState())),
);
checked.push('store action toggleEraseMode matches old inline update');

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length, checked }, null, 2));
