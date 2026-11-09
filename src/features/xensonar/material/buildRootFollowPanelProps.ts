import type { ComponentProps, DragEvent as ReactDragEvent } from 'react';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { ResonanceMaterialLoopPanel } from '../rooms/ResonanceMaterialLoopPanel';
import type { PlaylistDropOperation } from './playlistDropOperation';
import type { RootFollowLoopLaneUiState } from './loopLaneUiState';

type ResonanceMaterialLoopPanelProps = ComponentProps<typeof ResonanceMaterialLoopPanel>;
type ResonanceHotkeyMode = 'material' | 'root-follow' | 'particle-classic';

type RootFollowPanelUiState = {
  rootFollowLoopActive: RootFollowLoopLaneUiState['active'];
  rootFollowLoopId: RootFollowLoopLaneUiState['id'];
  rootFollowLoopTimeMode: RootFollowLoopLaneUiState['timeMode'];
  rootFollowLoopVolume: RootFollowLoopLaneUiState['volume'];
  rootFollowLoopGranulationMode: RootFollowLoopLaneUiState['granulationMode'];
  rootFollowGranularSettings: RootFollowLoopLaneUiState['granularSettings'];
  rootFollowImpulsRasterEvery: RootFollowLoopLaneUiState['impulsRasterEvery'];
  rootFollowImpulsRasterCycleDiv: RootFollowLoopLaneUiState['impulsRasterCycleDiv'];
  rootFollowImpulsRasterClockMode: RootFollowLoopLaneUiState['impulsRasterClockMode'];
  rootFollowImpulsRasterPattern: RootFollowLoopLaneUiState['impulsRasterPattern'];
  resonanceHotkeyMode: ResonanceHotkeyMode;
};

type RootFollowPanelUiPatch = Partial<RootFollowPanelUiState>;

type RootFollowPanelControllerBindings = {
  rootFollowLoopEntries: MaterialEntry[];
  recentRootFollowHotkeyEntries: MaterialEntry[];
  selectedRootFollowLoop: MaterialEntry | null;
  managedRootFollowLoopMaterial: MaterialEntry | null;
  managedRootFollowLoopIndex: number;
  rootFollowLoopUiStatus: string;
  rootFollowPreviewActive: boolean;
  toggleRootFollowPreview: () => void;
  stopRootFollowPreview: () => void;
  setRootFollowAuditionPitchHz: (hz: number) => void;
  rootFollowLoopRenameDraft: string;
  rootFollowLoopDragId: string;
  rootFollowLoopDropId: string;
  closeRootFollowLoopManager: () => void;
  openRootFollowLoopManager: (entryId?: string) => void;
  activateManagedRootFollowLoop: (entryId: string) => void;
  saveRootFollowLoopRename: () => void;
  browseManagedRootFollowLoop: (direction: -1 | 1) => void;
  shiftRootFollowLoopOrder: (direction: -1 | 1) => void;
  deleteManagedRootFollowLoop: (entryId: string) => void;
  handleRootFollowLoopDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  handleRootFollowLoopDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation) => void;
  handleRootFollowLoopDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => void;
  handleRootFollowLoopDragEnd: () => void;
  sendManagedMaterialLoopToRootFollow: (entryId: string) => void;
  uploadRootFollowLoopFile: (file: File, bars: number) => Promise<void>;
  setRootFollowLoopAnchor: (entryId: string, rootHz: number | null) => void;
  stampCurrentRootFollowLoopAnchor: (entryId: string) => void;
  setRootFollowLoopRenameDraft: (value: string) => void;
};

export type RootFollowPanelProps = Pick<
  ResonanceMaterialLoopPanelProps,
  | 'rootFollowLoopActive'
  | 'rootFollowLoopId'
  | 'rootFollowLoopTimeMode'
  | 'rootFollowLoopVolume'
  | 'rootFollowLoopGranulationMode'
  | 'rootFollowGranularSettings'
  | 'rootFollowImpulsRasterEvery'
  | 'rootFollowImpulsRasterCycleDiv'
  | 'rootFollowImpulsRasterClockMode'
  | 'rootFollowImpulsRasterPattern'
  | 'resonanceHotkeyMode'
  | 'rootFollowLoopEntries'
  | 'recentRootFollowHotkeyEntries'
  | 'rootFollowLoopUiStatus'
  | 'rootFollowPreviewActive'
  | 'managedRootFollowLoopMaterial'
  | 'managedRootFollowLoopIndex'
  | 'rootFollowLoopRenameDraft'
  | 'rootFollowLoopDragId'
  | 'rootFollowLoopDropId'
  | 'selectedRootFollowLoop'
  | 'onRootFollowLoopActiveChange'
  | 'onOpenRootFollowLoopManager'
  | 'onRootFollowLoopIdChange'
  | 'onRootFollowLoopTimeModeChange'
  | 'onRootFollowLoopVolumeChange'
  | 'onRootFollowLoopGranulationModeChange'
  | 'onRootFollowGranularSettingsChange'
  | 'onRootFollowImpulsRasterEveryChange'
  | 'onRootFollowImpulsRasterCycleDivChange'
  | 'onRootFollowImpulsRasterClockModeChange'
  | 'onRootFollowImpulsRasterPatternChange'
  | 'onRootFollowPreviewToggle'
  | 'onRootFollowPreviewStop'
  | 'onRootFollowAuditionPitchHz'
  | 'onResonanceHotkeyModeChange'
  | 'onCloseRootFollowLoopManager'
  | 'onActivateManagedRootFollowLoop'
  | 'onBrowseManagedRootFollowLoop'
  | 'onRootFollowLoopRenameDraftChange'
  | 'onSaveRootFollowLoopRename'
  | 'onShiftRootFollowLoopOrder'
  | 'onDeleteManagedRootFollowLoop'
  | 'onRootFollowLoopDragStart'
  | 'onRootFollowLoopDragOver'
  | 'onRootFollowLoopDrop'
  | 'onRootFollowLoopDragEnd'
  | 'onSendManagedMaterialLoopToRootFollow'
  | 'onSetRootFollowLoopAnchor'
  | 'onStampCurrentRootFollowLoopAnchor'
>;

export function buildRootFollowPanelProps(args: {
  nParamsUI: RootFollowPanelUiState;
  controller: RootFollowPanelControllerBindings;
  updateNParams: (patch: RootFollowPanelUiPatch) => void;
}): RootFollowPanelProps {
  return {
    rootFollowLoopActive: args.nParamsUI.rootFollowLoopActive,
    rootFollowLoopId: args.nParamsUI.rootFollowLoopId,
    rootFollowLoopTimeMode: args.nParamsUI.rootFollowLoopTimeMode,
    rootFollowLoopVolume: args.nParamsUI.rootFollowLoopVolume,
    rootFollowLoopGranulationMode: args.nParamsUI.rootFollowLoopGranulationMode,
    rootFollowGranularSettings: args.nParamsUI.rootFollowGranularSettings,
    rootFollowImpulsRasterEvery: args.nParamsUI.rootFollowImpulsRasterEvery,
    rootFollowImpulsRasterCycleDiv: args.nParamsUI.rootFollowImpulsRasterCycleDiv,
    rootFollowImpulsRasterClockMode: args.nParamsUI.rootFollowImpulsRasterClockMode,
    rootFollowImpulsRasterPattern: args.nParamsUI.rootFollowImpulsRasterPattern,
    resonanceHotkeyMode: args.nParamsUI.resonanceHotkeyMode,
    rootFollowLoopEntries: args.controller.rootFollowLoopEntries,
    recentRootFollowHotkeyEntries: args.controller.recentRootFollowHotkeyEntries,
    rootFollowLoopUiStatus: args.controller.rootFollowLoopUiStatus,
    rootFollowPreviewActive: args.controller.rootFollowPreviewActive,
    managedRootFollowLoopMaterial: args.controller.managedRootFollowLoopMaterial,
    managedRootFollowLoopIndex: args.controller.managedRootFollowLoopIndex,
    rootFollowLoopRenameDraft: args.controller.rootFollowLoopRenameDraft,
    rootFollowLoopDragId: args.controller.rootFollowLoopDragId,
    rootFollowLoopDropId: args.controller.rootFollowLoopDropId,
    selectedRootFollowLoop: args.controller.selectedRootFollowLoop,
    onRootFollowLoopActiveChange: (value) => args.updateNParams({ rootFollowLoopActive: value }),
    onOpenRootFollowLoopManager: args.controller.openRootFollowLoopManager,
    onRootFollowLoopIdChange: (value) => args.updateNParams({ rootFollowLoopId: value }),
    onRootFollowLoopTimeModeChange: (value) => args.updateNParams({ rootFollowLoopTimeMode: value }),
    onRootFollowLoopVolumeChange: (value) => args.updateNParams({ rootFollowLoopVolume: value }),
    onRootFollowLoopGranulationModeChange: (value) => args.updateNParams({ rootFollowLoopGranulationMode: value }),
    onRootFollowGranularSettingsChange: (value) => args.updateNParams({ rootFollowGranularSettings: value }),
    onRootFollowImpulsRasterEveryChange: (value) => args.updateNParams({ rootFollowImpulsRasterEvery: value }),
    onRootFollowImpulsRasterCycleDivChange: (value) => args.updateNParams({ rootFollowImpulsRasterCycleDiv: value }),
    onRootFollowImpulsRasterClockModeChange: (value) => args.updateNParams({ rootFollowImpulsRasterClockMode: value }),
    onRootFollowImpulsRasterPatternChange: (value) => args.updateNParams({ rootFollowImpulsRasterPattern: value }),
    onRootFollowPreviewToggle: args.controller.toggleRootFollowPreview,
    onRootFollowPreviewStop: args.controller.stopRootFollowPreview,
    onRootFollowAuditionPitchHz: args.controller.setRootFollowAuditionPitchHz,
    onResonanceHotkeyModeChange: (value) => args.updateNParams({ resonanceHotkeyMode: value }),
    onCloseRootFollowLoopManager: args.controller.closeRootFollowLoopManager,
    onActivateManagedRootFollowLoop: args.controller.activateManagedRootFollowLoop,
    onBrowseManagedRootFollowLoop: args.controller.browseManagedRootFollowLoop,
    onRootFollowLoopRenameDraftChange: args.controller.setRootFollowLoopRenameDraft,
    onSaveRootFollowLoopRename: args.controller.saveRootFollowLoopRename,
    onShiftRootFollowLoopOrder: args.controller.shiftRootFollowLoopOrder,
    onDeleteManagedRootFollowLoop: args.controller.deleteManagedRootFollowLoop,
    onRootFollowLoopDragStart: args.controller.handleRootFollowLoopDragStart,
    onRootFollowLoopDragOver: args.controller.handleRootFollowLoopDragOver,
    onRootFollowLoopDrop: args.controller.handleRootFollowLoopDrop,
    onRootFollowLoopDragEnd: args.controller.handleRootFollowLoopDragEnd,
    onSendManagedMaterialLoopToRootFollow: args.controller.sendManagedMaterialLoopToRootFollow,
    onSetRootFollowLoopAnchor: args.controller.setRootFollowLoopAnchor,
    onStampCurrentRootFollowLoopAnchor: args.controller.stampCurrentRootFollowLoopAnchor,
  };
}
