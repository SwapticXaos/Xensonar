import { useEffect, useRef, useState } from "react";
import { OPEN_MATERIAL_LOOP_MANAGER_EVENT, OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT } from "./resonanceWorkspaceIntentEvents";
import { consumeCutUploadHandoffWindowScrollRestoreSuppressed } from "../domain/cutUploadHandoffWindowScroll";
import type { ResonanceMaterialLoopPanelProps } from "./materialLoopPanel/materialLoopPanelProps";
import {
  ROOT_FOLLOW_GRANULAR_PRESETS,
  normalizeRootFollowGranularSettings,
} from "../rootFollow/rootFollowGranularSettings";
import { RootFollowGranularManagerDialog } from "./materialLoopPanel/RootFollowGranularManagerDialog";
import { RootFollowAnchorControl } from "./materialLoopPanel/RootFollowAnchorControl";
import {
  LoopBankManagerDialog,
  EmptyLoopBankManagerDialog,
} from "./materialLoopPanel/LoopBankManagerDialog";
import { QuickLoopUploadControls } from "./materialLoopPanel/QuickLoopUploadControls";
import { HeaderVolumeControl } from "./materialLoopPanel/materialLoopPanelControls";
import {
  MaterialManagerDetails,
  RootFollowManagerDetails,
  RootFollowManagerTools,
} from "./materialLoopPanel/MaterialLoopManagerDetails";

export function ResonanceMaterialLoopPanel({
  materialLoopActive,
  materialLoopId,
  materialLoopSyncToBeat,
  materialLoopTimeMode,
  materialLoopVolume,
  rootFollowLoopActive,
  rootFollowLoopId,
  rootFollowLoopTimeMode,
  rootFollowLoopVolume,
  rootFollowLoopGranulationMode,
  rootFollowGranularSettings,
  rootFollowImpulsRasterEvery,
  rootFollowImpulsRasterCycleDiv,
  rootFollowImpulsRasterClockMode,
  rootFollowImpulsRasterPattern,
  rootFollowPreviewActive,
  resonanceHotkeyMode,
  quantizeBpm,
  exportedLoopMaterials,
  rootFollowLoopEntries,
  materialLoopUiStatus,
  rootFollowLoopUiStatus,
  managedLoopMaterial,
  managedLoopIndex,
  managedRootFollowLoopMaterial,
  managedRootFollowLoopIndex,
  managedLoopInRootFollowBank,
  materialLoopRenameDraft,
  materialLoopDragId,
  materialLoopDropId,
  rootFollowLoopRenameDraft,
  rootFollowLoopDragId,
  rootFollowLoopDropId,
  selectedLoopMaterial,
  selectedRootFollowLoop,
  effectiveLoopMyzelGroupLabel,
  selectedLoopRouteSummary,
  selectedLoopStabilizeBy,
  hotkeyLabels,
  referenceBpm,
  onMaterialLoopActiveChange,
  onOpenMaterialLoopManager,
  onMaterialLoopSyncToBeatChange,
  onMaterialLoopTimeModeChange,
  onMaterialLoopVolumeChange,
  onRootFollowLoopActiveChange,
  onOpenRootFollowLoopManager,
  onRootFollowLoopTimeModeChange,
  onRootFollowLoopVolumeChange,
  onRootFollowLoopGranulationModeChange,
  onRootFollowGranularSettingsChange,
  onRootFollowImpulsRasterEveryChange,
  onRootFollowImpulsRasterCycleDivChange,
  onRootFollowImpulsRasterClockModeChange,
  onRootFollowImpulsRasterPatternChange,
  onRootFollowPreviewToggle,
  onRootFollowPreviewStop,
  onRootFollowAuditionPitchHz,
  onResonanceHotkeyModeChange,
  onUploadMaterialLoopFile,
  onUploadRootFollowLoopFile,
  onAudioUploadAndCutFile,
  onCloseMaterialLoopManager,
  onActivateManagedMaterialLoop,
  onBrowseManagedMaterialLoop,
  onMaterialLoopRenameDraftChange,
  onSaveMaterialLoopRename,
  onShiftMaterialLoopOrder,
  onDeleteManagedMaterialLoop,
  onMaterialLoopDragStart,
  onMaterialLoopDragOver,
  onMaterialLoopDrop,
  onMaterialLoopDragEnd,
  onCloseRootFollowLoopManager,
  onActivateManagedRootFollowLoop,
  onBrowseManagedRootFollowLoop,
  onRootFollowLoopRenameDraftChange,
  onSaveRootFollowLoopRename,
  onShiftRootFollowLoopOrder,
  onDeleteManagedRootFollowLoop,
  onRootFollowLoopDragStart,
  onRootFollowLoopDragOver,
  onRootFollowLoopDrop,
  onRootFollowLoopDragEnd,
  onSendManagedMaterialLoopToRootFollow,
  onSetRootFollowLoopAnchor,
  onStampCurrentRootFollowLoopAnchor,
  formatMaterialLoopBars,
  getEffectiveMaterialLoopBars,
}: ResonanceMaterialLoopPanelProps) {
  const [granularManagerOpen, setGranularManagerOpen] = useState(false);
  const [emptyMaterialManagerOpen, setEmptyMaterialManagerOpen] =
    useState(false);
  const [emptyRootFollowManagerOpen, setEmptyRootFollowManagerOpen] =
    useState(false);
  const rootFollowGranularResolved = normalizeRootFollowGranularSettings(
    rootFollowGranularSettings,
    rootFollowLoopGranulationMode,
  );
  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const materialRenameInputRef = useRef<HTMLInputElement | null>(null);
  const rootFollowRenameInputRef = useRef<HTMLInputElement | null>(null);
  const wasAnyManagerOpenRef = useRef(false);
  const managerScrollRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const managerOpen = Boolean(
      managedLoopMaterial ||
      managedRootFollowLoopMaterial ||
      emptyMaterialManagerOpen ||
      emptyRootFollowManagerOpen ||
      granularManagerOpen,
    );
    if (managerOpen) {
      if (!wasAnyManagerOpenRef.current)
        managerScrollRef.current = { x: window.scrollX, y: window.scrollY };
      wasAnyManagerOpenRef.current = true;
      window.requestAnimationFrame(() => {
        if (managedRootFollowLoopMaterial) {
          rootFollowRenameInputRef.current?.focus();
          rootFollowRenameInputRef.current?.select();
        } else if (managedLoopMaterial) {
          materialRenameInputRef.current?.focus();
          materialRenameInputRef.current?.select();
        }
      });
      return;
    }
    if (!wasAnyManagerOpenRef.current) return;
    wasAnyManagerOpenRef.current = false;
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();
    window.requestAnimationFrame(() => {
      const skipRestore =
        consumeCutUploadHandoffWindowScrollRestoreSuppressed();
      const pos = managerScrollRef.current;
      if (!skipRestore && pos) window.scrollTo(pos.x, pos.y);
      managerScrollRef.current = null;
    });
  }, [
    emptyMaterialManagerOpen,
    emptyRootFollowManagerOpen,
    granularManagerOpen,
    managedLoopMaterial,
    managedRootFollowLoopMaterial,
  ]);

  useEffect(() => {
    const handleOpenMaterialLoopManager = () => {
      if (exportedLoopMaterials.length === 0) {
        setEmptyRootFollowManagerOpen(false);
        setEmptyMaterialManagerOpen(true);
        return;
      }
      setEmptyMaterialManagerOpen(false);
      onOpenMaterialLoopManager(
        materialLoopId || selectedLoopMaterial?.id || undefined,
      );
    };
    const handleOpenRootFollowLoopManager = () => {
      if (rootFollowLoopEntries.length === 0) {
        setEmptyMaterialManagerOpen(false);
        setEmptyRootFollowManagerOpen(true);
        return;
      }
      setEmptyRootFollowManagerOpen(false);
      onOpenRootFollowLoopManager(
        rootFollowLoopId || selectedRootFollowLoop?.id || undefined,
      );
    };
    window.addEventListener(
      OPEN_MATERIAL_LOOP_MANAGER_EVENT,
      handleOpenMaterialLoopManager,
    );
    window.addEventListener(
      OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT,
      handleOpenRootFollowLoopManager,
    );
    return () => {
      window.removeEventListener(
        OPEN_MATERIAL_LOOP_MANAGER_EVENT,
        handleOpenMaterialLoopManager,
      );
      window.removeEventListener(
        OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT,
        handleOpenRootFollowLoopManager,
      );
    };
  }, [
    exportedLoopMaterials.length,
    materialLoopId,
    onOpenMaterialLoopManager,
    onOpenRootFollowLoopManager,
    rootFollowLoopEntries.length,
    rootFollowLoopId,
    selectedLoopMaterial?.id,
    selectedRootFollowLoop?.id,
  ]);

  useEffect(() => {
    if (!emptyMaterialManagerOpen || exportedLoopMaterials.length === 0) return;
    setEmptyMaterialManagerOpen(false);
    onOpenMaterialLoopManager(exportedLoopMaterials[0]?.id);
  }, [
    emptyMaterialManagerOpen,
    exportedLoopMaterials,
    onOpenMaterialLoopManager,
  ]);

  useEffect(() => {
    if (!emptyRootFollowManagerOpen || rootFollowLoopEntries.length === 0)
      return;
    setEmptyRootFollowManagerOpen(false);
    onOpenRootFollowLoopManager(rootFollowLoopEntries[0]?.id);
  }, [
    emptyRootFollowManagerOpen,
    onOpenRootFollowLoopManager,
    rootFollowLoopEntries,
  ]);

  useEffect(() => {
    return () => {
      onRootFollowPreviewStop();
    };
  }, [onRootFollowPreviewStop]);

  const renderGranularManagerDialog = (sideBySideRight: boolean) => (
    <RootFollowGranularManagerDialog
      settings={rootFollowGranularResolved}
      analysisEntry={managedRootFollowLoopMaterial ?? selectedRootFollowLoop}
      sideBySideRight={sideBySideRight}
      onPreset={(mode) => {
        onRootFollowLoopGranulationModeChange(
          mode === "grainy" ? "grainy" : "flowing",
        );
        onRootFollowGranularSettingsChange(ROOT_FOLLOW_GRANULAR_PRESETS[mode]);
      }}
      onChange={(nextSettings) => {
        onRootFollowGranularSettingsChange(nextSettings);
        if (nextSettings.preset === "grainy")
          onRootFollowLoopGranulationModeChange("grainy");
        else if (
          nextSettings.preset === "flowing" ||
          nextSettings.preset === "smooth"
        )
          onRootFollowLoopGranulationModeChange("flowing");
      }}
      onAuditionPitchHz={onRootFollowAuditionPitchHz}
      rootFollowPreviewActive={rootFollowPreviewActive}
      onClose={() => setGranularManagerOpen(false)}
    />
  );

  const materialManagerDetails = (
    <MaterialManagerDetails
      materialLoopActive={materialLoopActive}
      materialLoopSyncToBeat={materialLoopSyncToBeat}
      materialLoopTimeMode={materialLoopTimeMode}
      resonanceHotkeyMode={resonanceHotkeyMode}
      selectedLoopMaterial={selectedLoopMaterial}
      effectiveLoopMyzelGroupLabel={effectiveLoopMyzelGroupLabel}
      materialLoopUiStatus={materialLoopUiStatus}
      quantizeBpm={quantizeBpm}
      referenceBpm={referenceBpm}
      formatMaterialLoopBars={formatMaterialLoopBars}
      getEffectiveMaterialLoopBars={getEffectiveMaterialLoopBars}
      onMaterialLoopActiveChange={onMaterialLoopActiveChange}
      onMaterialLoopSyncToBeatChange={onMaterialLoopSyncToBeatChange}
      onMaterialLoopTimeModeChange={onMaterialLoopTimeModeChange}
      onResonanceHotkeyModeChange={onResonanceHotkeyModeChange}
    />
  );

  const rootFollowManagerTools = (
    <RootFollowManagerTools
      rootFollowGranularSettings={rootFollowGranularResolved}
      resonanceHotkeyMode={resonanceHotkeyMode}
      onOpenGranularManager={() => setGranularManagerOpen(true)}
      onResonanceHotkeyModeChange={onResonanceHotkeyModeChange}
    />
  );

  const rootFollowManagerDetails = (
    <RootFollowManagerDetails
      rootFollowLoopActive={rootFollowLoopActive}
      rootFollowLoopTimeMode={rootFollowLoopTimeMode}
      rootFollowImpulsRasterEvery={rootFollowImpulsRasterEvery}
      rootFollowImpulsRasterCycleDiv={rootFollowImpulsRasterCycleDiv}
      rootFollowImpulsRasterClockMode={rootFollowImpulsRasterClockMode}
      rootFollowImpulsRasterPattern={rootFollowImpulsRasterPattern}
      rootFollowPreviewActive={rootFollowPreviewActive}
      selectedRootFollowLoop={selectedRootFollowLoop}
      managedRootFollowLoopMaterial={managedRootFollowLoopMaterial}
      rootFollowLoopUiStatus={rootFollowLoopUiStatus}
      rootFollowGranularSettings={rootFollowGranularResolved}
      quantizeBpm={quantizeBpm}
      referenceBpm={referenceBpm}
      formatMaterialLoopBars={formatMaterialLoopBars}
      getEffectiveMaterialLoopBars={getEffectiveMaterialLoopBars}
      onRootFollowLoopActiveChange={onRootFollowLoopActiveChange}
      onRootFollowLoopTimeModeChange={onRootFollowLoopTimeModeChange}
      onRootFollowImpulsRasterCycleDivChange={onRootFollowImpulsRasterCycleDivChange}
      onRootFollowImpulsRasterEveryChange={onRootFollowImpulsRasterEveryChange}
      onRootFollowImpulsRasterPatternChange={onRootFollowImpulsRasterPatternChange}
      onRootFollowImpulsRasterClockModeChange={onRootFollowImpulsRasterClockModeChange}
      onRootFollowPreviewToggle={onRootFollowPreviewToggle}
    />
  );

  const rootFollowAnchorLowerControls = (
    <RootFollowAnchorControl
      entry={managedRootFollowLoopMaterial ?? selectedRootFollowLoop}
      onSetAnchor={onSetRootFollowLoopAnchor}
      onStampCurrentAnchor={onStampCurrentRootFollowLoopAnchor}
    />
  );

  return (
    <div ref={panelRootRef} tabIndex={-1} className="contents">
      {granularManagerOpen &&
      !managedRootFollowLoopMaterial &&
      !emptyRootFollowManagerOpen
        ? renderGranularManagerDialog(false)
        : null}

      {emptyMaterialManagerOpen && !managedLoopMaterial ? (
        <EmptyLoopBankManagerDialog
          windowLabel="Materialspur-Fenster"
          windowIcon="📀"
          description="Hier kannst du die Materialspur-Bank auch vor dem ersten Loop öffnen."
          headerControl={
            <HeaderVolumeControl
              label="Materialspur Lautstärke"
              value={materialLoopVolume}
              onChange={onMaterialLoopVolumeChange}
              tone="fuchsia"
            />
          }
          detailControls={
            <div className="space-y-3">
              {materialManagerDetails}
              <QuickLoopUploadControls
                tone="material"
                onLoopUploadFile={onUploadMaterialLoopFile}
                onAudioUploadAndCutFile={onAudioUploadAndCutFile}
              />
            </div>
          }
          onClose={() => setEmptyMaterialManagerOpen(false)}
        />
      ) : null}

      {emptyRootFollowManagerOpen && !managedRootFollowLoopMaterial ? (
        <EmptyLoopBankManagerDialog
          windowLabel="Root Follow Loop-Fenster"
          windowIcon="🎼"
          description="Hier kannst du die Root-Follow-Bank auch vor dem ersten Loop öffnen."
          headerControl={
            <HeaderVolumeControl
              label="Root Follow Lautstärke"
              value={rootFollowLoopVolume}
              onChange={onRootFollowLoopVolumeChange}
              tone="violet"
            />
          }
          detailControls={
            <div className="space-y-3">
              {rootFollowManagerDetails}
              <QuickLoopUploadControls
                tone="root-follow"
                onLoopUploadFile={onUploadRootFollowLoopFile}
                onAudioUploadAndCutFile={onAudioUploadAndCutFile}
              />
              {rootFollowManagerTools}
            </div>
          }
          sideBySideLeft={granularManagerOpen}
          onClose={() => {
            onRootFollowPreviewStop();
            setEmptyRootFollowManagerOpen(false);
          }}
        />
      ) : null}

      {granularManagerOpen &&
      emptyRootFollowManagerOpen &&
      !managedRootFollowLoopMaterial
        ? renderGranularManagerDialog(true)
        : null}

      {managedLoopMaterial ? (
        <LoopBankManagerDialog
          windowLabel="Materialspur-Fenster"
          windowIcon="📀"
          managedEntry={managedLoopMaterial}
          managedIndex={managedLoopIndex}
          total={exportedLoopMaterials.length}
          entries={exportedLoopMaterials}
          hotkeyLabels={hotkeyLabels}
          renameDraft={materialLoopRenameDraft}
          dragId={materialLoopDragId}
          dropId={materialLoopDropId}
          auxiliaryText={`Route Summary: ${selectedLoopRouteSummary}${selectedLoopStabilizeBy ? ` · Stabilize By: ${selectedLoopStabilizeBy}` : ""}`}
          renameInputRef={materialRenameInputRef}
          headerControl={
            <HeaderVolumeControl
              label="Materialspur Lautstärke"
              value={materialLoopVolume}
              onChange={onMaterialLoopVolumeChange}
              tone="fuchsia"
            />
          }
          detailControls={materialManagerDetails}
          onClose={onCloseMaterialLoopManager}
          onActivateEntry={onActivateManagedMaterialLoop}
          onBrowse={onBrowseManagedMaterialLoop}
          onRenameDraftChange={onMaterialLoopRenameDraftChange}
          onSaveRename={onSaveMaterialLoopRename}
          onShiftOrder={onShiftMaterialLoopOrder}
          onSendToRootFollow={onSendManagedMaterialLoopToRootFollow}
          onLoopUploadFile={onUploadMaterialLoopFile}
          onAudioUploadAndCutFile={onAudioUploadAndCutFile}
          uploadTone="material"
          sendToRootFollowDisabled={managedLoopInRootFollowBank}
          sendToRootFollowLabel={
            managedLoopInRootFollowBank
              ? "Schon in Root Follow Loop"
              : "an Root Follow Loop senden"
          }
          onDeleteEntry={onDeleteManagedMaterialLoop}
          onDragStart={onMaterialLoopDragStart}
          onDragOver={onMaterialLoopDragOver}
          onDrop={onMaterialLoopDrop}
          onDragEnd={onMaterialLoopDragEnd}
        />
      ) : null}

      {managedRootFollowLoopMaterial ? (
        <LoopBankManagerDialog
          windowLabel="Root Follow Loop-Fenster"
          windowIcon="🎼"
          managedEntry={managedRootFollowLoopMaterial}
          managedIndex={managedRootFollowLoopIndex}
          total={rootFollowLoopEntries.length}
          entries={rootFollowLoopEntries}
          hotkeyLabels={hotkeyLabels}
          renameDraft={rootFollowLoopRenameDraft}
          dragId={rootFollowLoopDragId}
          dropId={rootFollowLoopDropId}
          auxiliaryText="Diese Reihenfolge gehört nur der Root-Follow-Bank. Live-Bindung, Lautstärke und Granular Manager liegen jetzt direkt in diesem Fenster."
          renameInputRef={rootFollowRenameInputRef}
          headerControl={
            <HeaderVolumeControl
              label="Root Follow Lautstärke"
              value={rootFollowLoopVolume}
              onChange={onRootFollowLoopVolumeChange}
              tone="violet"
            />
          }
          detailControls={rootFollowManagerDetails}
          afterImportControls={rootFollowManagerTools}
          editColumnLowerControls={rootFollowAnchorLowerControls}
          prioritizeDetailControls
          sideBySideLeft={granularManagerOpen}
          onClose={() => {
            onRootFollowPreviewStop();
            onCloseRootFollowLoopManager();
          }}
          onActivateEntry={onActivateManagedRootFollowLoop}
          onBrowse={onBrowseManagedRootFollowLoop}
          onRenameDraftChange={onRootFollowLoopRenameDraftChange}
          onSaveRename={onSaveRootFollowLoopRename}
          onShiftOrder={onShiftRootFollowLoopOrder}
          onDeleteEntry={onDeleteManagedRootFollowLoop}
          onLoopUploadFile={onUploadRootFollowLoopFile}
          onAudioUploadAndCutFile={onAudioUploadAndCutFile}
          uploadTone="root-follow"
          onDragStart={onRootFollowLoopDragStart}
          onDragOver={onRootFollowLoopDragOver}
          onDrop={onRootFollowLoopDrop}
          onDragEnd={onRootFollowLoopDragEnd}
        />
      ) : null}

      {granularManagerOpen && managedRootFollowLoopMaterial
        ? renderGranularManagerDialog(true)
        : null}
    </div>
  );
}
