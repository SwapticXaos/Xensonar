import {
  handleMaterialLoopHotkeys,
  isMaterialLoopHotkeyModeToggleEvent,
} from '../material/materialLoopHotkeyRouting';

type RecentLoopHotkeyEntry = {
  id: string;
};

export type ResonanceHotkeyMode = 'material' | 'root-follow' | 'particle-classic' | undefined;

type ResonanceHotkeyModeHost = {
  resonanceHotkeyMode?: ResonanceHotkeyMode;
};

export function readResonanceHotkeyMode(params: ResonanceHotkeyModeHost): ResonanceHotkeyMode {
  return params.resonanceHotkeyMode;
}

type RunResonanceHotkeyModeToggleBoundaryArgs = {
  event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>;
  currentMode: ResonanceHotkeyMode;
  updateNParams: (patch: { resonanceHotkeyMode: Exclude<ResonanceHotkeyMode, undefined | 'particle-classic'> }) => void;
  preventDefault: () => void;
};

export function runResonanceHotkeyModeToggleBoundary(args: RunResonanceHotkeyModeToggleBoundaryArgs) {
  const { event, currentMode, updateNParams, preventDefault } = args;
  if (!isMaterialLoopHotkeyModeToggleEvent(event)) return false;
  const nextMode = currentMode === 'root-follow' ? 'material' : 'root-follow';
  updateNParams({ resonanceHotkeyMode: nextMode });
  preventDefault();
  return true;
}

type RunResonanceLoopHotkeyModeRoutingBoundaryArgs = {
  key: string;
  currentMode: ResonanceHotkeyMode;
  recentLoopHotkeyEntries: readonly RecentLoopHotkeyEntry[];
  recentRootFollowHotkeyEntries: readonly RecentLoopHotkeyEntry[];
  selectMaterialLoopDirect: (entryId: string, source: 'hotkey') => void;
  selectRootFollowLoopDirect: (entryId: string) => void;
  toggleMaterialLoopDirect: () => void;
  toggleRootFollowLoopDirect: () => void;
  browseMaterialLoopWithUmlaut: (key: 'ö' | 'ä') => void;
  browseRootFollowLoopWithUmlaut: (key: 'ö' | 'ä') => void;
  preventDefault: () => void;
};

export function runResonanceLoopHotkeyModeRoutingBoundary(
  args: RunResonanceLoopHotkeyModeRoutingBoundaryArgs,
) {
  const {
    key,
    currentMode,
    recentLoopHotkeyEntries,
    recentRootFollowHotkeyEntries,
    selectMaterialLoopDirect,
    selectRootFollowLoopDirect,
    toggleMaterialLoopDirect,
    toggleRootFollowLoopDirect,
    browseMaterialLoopWithUmlaut,
    browseRootFollowLoopWithUmlaut,
    preventDefault,
  } = args;

  const isRootFollowMode = currentMode === 'root-follow';
  const didHandleLoopHotkey = handleMaterialLoopHotkeys({
    key,
    hotkeyMode: currentMode,
    recentLoopHotkeyEntries: isRootFollowMode ? recentRootFollowHotkeyEntries : recentLoopHotkeyEntries,
    selectLoopDirect: (entryId) => {
      if (isRootFollowMode) {
        selectRootFollowLoopDirect(entryId);
        return;
      }
      selectMaterialLoopDirect(entryId, 'hotkey');
    },
    toggleLoopDirect: isRootFollowMode ? toggleRootFollowLoopDirect : toggleMaterialLoopDirect,
    browseLoopWithUmlaut: isRootFollowMode ? browseRootFollowLoopWithUmlaut : browseMaterialLoopWithUmlaut,
  });

  if (!didHandleLoopHotkey) return false;
  preventDefault();
  return true;
}
