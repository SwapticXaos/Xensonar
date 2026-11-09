import type { ToolProfiles, ToolSettings, ToolType } from './storeTypes';
import { mergeToolSettings } from './storeToolProfiles';

export type ToolSettingsHostState = {
  activeTool: ToolType;
  toolProfiles: ToolProfiles;
  toolSettings: ToolSettings;
};

type StoreSet<T extends ToolSettingsHostState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;

export type ToolSettingsStoreActions = {
  setActiveTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  toggleEraseMode: () => void;
};

export function setActiveToolState<T extends ToolSettingsHostState>(state: T, tool: ToolType): Partial<T> {
  return {
    activeTool: tool,
    toolSettings: mergeToolSettings(tool, state.toolProfiles[tool]),
  } as Partial<T>;
}

export function updateActiveToolSettingsState<T extends ToolSettingsHostState>(state: T, settings: Partial<ToolSettings>): Partial<T> {
  const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings });
  return {
    toolSettings: nextToolSettings,
    toolProfiles: {
      ...state.toolProfiles,
      [state.activeTool]: nextToolSettings,
    },
  } as Partial<T>;
}

export function toggleEraseModeState<T extends ToolSettingsHostState>(state: T): Partial<T> {
  return updateActiveToolSettingsState(state, { eraseMode: !state.toolSettings.eraseMode });
}

export function createToolSettingsStoreActions<T extends ToolSettingsHostState>(set: StoreSet<T>): ToolSettingsStoreActions {
  return {
    setActiveTool: (tool) => set((state) => setActiveToolState(state, tool)),
    updateToolSettings: (settings) => set((state) => updateActiveToolSettingsState(state, settings)),
    toggleEraseMode: () => set((state) => toggleEraseModeState(state)),
  };
}
