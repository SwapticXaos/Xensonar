import * as React from 'react';
/**
 * Preset save/load/import/export handlers for platformer composition.
 * Extracted from JumpRunSoundtrackRoom to reduce room LOC (vision §6 modular domains).
 */

import type { MutableRefObject } from "react";
import { createInitialState } from "./platformerState";
import type { Coin, ComposerObstacle, SimState } from "./platformerState";
import type { Platform } from "./platformerState";
import { summarizeComposerInfluence } from "./platformerHelpers";
import type { PlatformerAudioApi, MusicState } from "./platformerAudio";
import {
  buildPlatformerRouteProfileFromSelections,
  buildPlatformerRouteSelectionsFromEvents,
  formatPlatformerRouteChoice,
  formatPlatformerRouteMode,
} from "./platformerRouteProfile";
import { formatPlatformerSectionBias, type PlatformerSectionBias } from "./platformerSectionBias";
import {
  clearPlatformerCompositionPreset,
  exportPlatformerCompositionPresetLibrary,
  importPlatformerCompositionPresetLibrary,
  loadPlatformerCompositionPreset,
  loadPlatformerCompositionPresetById,
  removePlatformerCompositionPreset,
  saveNamedPlatformerCompositionPreset,
  type PlatformerCompositionPreset,
  type PlatformerCompositionPresetItem,
  type PlatformerPresetImportMode,
} from "./platformerPresetPersistence";
import type { PlatformerArrangementForm, PlatformerArrangementMode, PlatformerTuningMode } from "./platformerArrangement";
import type { PlatformerHudState } from "./platformerHudHelpers";

export type UsePlatformerPresetHandlersOpts = {
  simRef: MutableRefObject<SimState>;
  musicRef: MutableRefObject<MusicState>;
  apiRef: MutableRefObject<PlatformerAudioApi | null>;
  baseCoins: Coin[];
  baseComposerObstacles: ComposerObstacle[];
  platforms: Platform[];
  presetName: string;
  selectedPresetId: string;
  presetItems: PlatformerCompositionPresetItem[];
  libraryTransfer: string;
  tuningMode: PlatformerTuningMode;
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  evolutionDepth: number;
  tempoFollow: number;
  bpm: number;
  masterVolume: number;
  composerOn: boolean;
  setHud: React.Dispatch<React.SetStateAction<PlatformerHudState>>;
  setComposerPreview: (preview: unknown) => void;
  setRunning: (v: boolean) => void;
  setPresetName: (v: string) => void;
  setSelectedPresetId: (v: string) => void;
  setPresetItems: (v: PlatformerCompositionPresetItem[]) => void;
  setLibraryTransfer: (v: string) => void;
  setTuningMode: (v: PlatformerTuningMode) => void;
  setArrangementMode: (v: PlatformerArrangementMode) => void;
  setFormMode: (v: PlatformerArrangementForm) => void;
  setSectionBias: (v: PlatformerSectionBias) => void;
  setEvolutionDepth: (v: number) => void;
  setTempoFollow: (v: number) => void;
  setBpm: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setComposerOn: (v: boolean) => void;
};

export function usePlatformerPresetHandlers(opts: UsePlatformerPresetHandlersOpts) {
  const {
    simRef,
    musicRef,
    apiRef,
    baseCoins,
    baseComposerObstacles,
    platforms,
  presetName,
  selectedPresetId,
  presetItems,
  libraryTransfer,
    tuningMode,
    arrangementMode,
    formMode,
    sectionBias,
    evolutionDepth,
    tempoFollow,
    bpm,
    masterVolume,
    composerOn,
    setHud,
    setComposerPreview,
    setRunning,
    setPresetName,
    setSelectedPresetId,
    setPresetItems,
    setLibraryTransfer,
    setTuningMode,
    setArrangementMode,
    setFormMode,
    setSectionBias,
    setEvolutionDepth,
    setTempoFollow,
    setBpm,
  setMasterVolume,
  setComposerOn,
} = opts;

  const saveCompositionPreset = (overwrite = false) => {
    const m = musicRef.current;
    if (m.phrase.length === 0 && m.movementEvents.length === 0) {
      setHud((prev) => ({ ...prev, status: "Keine Komposition zum Speichern" }));
      return;
    }
    const payload = {
      version: 1 as const,
      savedAt: Date.now(),
      phrase: [...m.phrase],
      movementEvents: m.movementEvents.map((event) => ({ ...event })),
      tuningMode,
      arrangementMode,
      formMode,
      sectionBias,
      evolutionDepth,
      tempoFollow,
      bpm,
      masterVolume,
      composerOn,
    };
    const name = presetName.trim() || "Session Loop";
    const items = overwrite && selectedPresetId
      ? saveNamedPlatformerCompositionPreset(name, payload, selectedPresetId)
      : saveNamedPlatformerCompositionPreset(name, payload);
    setPresetItems(items);
    const activeId = overwrite && selectedPresetId ? selectedPresetId : (items[0]?.id ?? "");
    setSelectedPresetId(activeId);
    setPresetName(name);
    setHud((prev) => ({
      ...prev,
      status: overwrite
        ? `Komposition aktualisiert (${m.movementEvents.length} Events)`
        : `Komposition gespeichert (${m.movementEvents.length} Events)`,
    }));
  };

  const applyLoadedCompositionPreset = async (preset: PlatformerCompositionPreset) => {
    const api = apiRef.current;
    if (!api) return;
    await api.ensureAudio();

    setTuningMode(preset.tuningMode);
    setArrangementMode(preset.arrangementMode);
    setFormMode(preset.formMode);
    setSectionBias(preset.sectionBias);
    setEvolutionDepth(preset.evolutionDepth);
    setTempoFollow(preset.tempoFollow);
    setBpm(preset.bpm);
    setMasterVolume(preset.masterVolume);
    setComposerOn(preset.composerOn);

    const restored = createInitialState(baseCoins, baseComposerObstacles, platforms);
    restored.routeSelections = buildPlatformerRouteSelectionsFromEvents(preset.movementEvents);
    restored.win = true;
    restored.score = 200;
    restored.player.vx = 0;
    restored.player.vy = 0;
    restored.player.jumpQueued = false;
    simRef.current = restored;

    api.resetCompositionCapture();
    musicRef.current.phrase = [...preset.phrase];
    musicRef.current.movementEvents = preset.movementEvents.map((event) => ({ ...event }));
    musicRef.current.eventOrdinal = preset.movementEvents.reduce(
      (max, event) => Math.max(max, (event.ordinal ?? -1) + 1),
      0,
    );
    api.armCompletionLoop();
    setRunning(true);

    const influence = summarizeComposerInfluence(preset.movementEvents);
    const routeProfile = buildPlatformerRouteProfileFromSelections(restored.routeSelections);
    const preview = api.getComposerPreview(preset.bpm);
    setComposerPreview(preview);
    setHud((prev) => ({
      ...prev,
      events: preset.movementEvents.length,
      combo: preset.phrase.length,
      syncHits: influence.syncHits,
      phaseHits: influence.phaseHits,
      tuningHits: influence.tuningHits,
      forkHits: influence.forkHits,
      restHits: influence.restHits,
      phaseFocus: preview.ready ? preview.phaseFocus : influence.phaseFocus,
      tuningTilt: preview.ready ? preview.tuningTilt : influence.tuningTilt,
      forkBias: preview.ready ? preview.forkBias : influence.forkBias,
      restDensity: preview.ready ? preview.restDensity : 0,
      previewSlots: preview.ready ? preview.timeline.length : 0,
      routeOne: formatPlatformerRouteChoice(routeProfile.first),
      routeTwo: formatPlatformerRouteChoice(routeProfile.second),
      routeMode: formatPlatformerRouteMode(routeProfile.mode),
      routeBias: preview.ready ? preview.routeBias : routeProfile.branchBias,
      routeTravel: preview.ready ? preview.routeTravel : routeProfile.splitMotion,
      routeColor: preview.ready ? preview.routeColor : "--",
      routeGroove: preview.ready ? preview.routeGroove : "--",
      routeLeadVoice: preview.ready ? preview.routeLeadVoice : "--",
      sectionBias: formatPlatformerSectionBias(preview.ready ? preview.sectionBias : preset.sectionBias),
      form: preview.ready ? preview.formLabel : prev.form,
      targetTempo: preview.ready ? preview.targetBpm : prev.targetTempo,
      complexity: preview.ready ? preview.complexity : prev.complexity,
      tuning: preset.tuningMode,
      arrangement: preset.arrangementMode,
      formMode: preset.formMode,
      evolution: preset.evolutionDepth,
      tempoFollow: preset.tempoFollow,
      status: `Komposition geladen (${preset.movementEvents.length} Events)`,
    }));
  };

  const loadCompositionPreset = async (presetId?: string) => {
    const preset = presetId
      ? loadPlatformerCompositionPresetById(presetId)
      : (selectedPresetId
          ? loadPlatformerCompositionPresetById(selectedPresetId)
          : loadPlatformerCompositionPreset());
    if (!preset) {
      setHud((prev) => ({ ...prev, status: "Kein gespeicherter Loop gefunden" }));
      return;
    }
    await applyLoadedCompositionPreset(preset);
  };

  const deleteSelectedCompositionPreset = () => {
    if (!selectedPresetId) {
      setHud((prev) => ({ ...prev, status: "Kein Slot zum Loeschen ausgewaehlt" }));
      return;
    }
    const items = removePlatformerCompositionPreset(selectedPresetId);
    setPresetItems(items);
    const nextId = items[0]?.id ?? "";
    setSelectedPresetId(nextId);
    if (nextId) {
      const fallback = items.find((item) => item.id === nextId);
      if (fallback) setPresetName(fallback.name);
    }
    setHud((prev) => ({ ...prev, status: "Preset-Slot geloescht" }));
  };

  const clearCompositionPresetLibrary = () => {
    clearPlatformerCompositionPreset();
    setPresetItems([]);
    setSelectedPresetId("");
    setLibraryTransfer("");
    setHud((prev) => ({ ...prev, status: "Preset-Bibliothek geloescht" }));
  };

  const exportCompositionLibrary = () => {
    const raw = exportPlatformerCompositionPresetLibrary(true);
    setLibraryTransfer(raw);
    const count = presetItems.length;
    setHud((prev) => ({
      ...prev,
      status: count > 0
        ? `Preset-JSON exportiert (${count} Slots)`
        : "Preset-JSON exportiert (leer)",
    }));
  };

  const copyCompositionLibraryToClipboard = async () => {
    const raw = libraryTransfer.trim().length > 0
      ? libraryTransfer
      : exportPlatformerCompositionPresetLibrary(true);
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setLibraryTransfer(raw);
      setHud((prev) => ({ ...prev, status: "Clipboard nicht verfuegbar - JSON im Transfer-Feld" }));
      return;
    }
    try {
      await navigator.clipboard.writeText(raw);
      setLibraryTransfer(raw);
      setHud((prev) => ({ ...prev, status: "Preset-JSON in Clipboard kopiert" }));
    } catch {
      setLibraryTransfer(raw);
      setHud((prev) => ({ ...prev, status: "Clipboard-Fehler - JSON im Transfer-Feld" }));
    }
  };

  const importCompositionLibrary = (mode: PlatformerPresetImportMode) => {
    const result = importPlatformerCompositionPresetLibrary(libraryTransfer, mode);
    setPresetItems(result.items);
    const nextId = result.items[0]?.id ?? "";
    setSelectedPresetId(nextId);
    if (result.items[0]) {
      setPresetName(result.items[0].name);
    }

    if (result.imported === 0 && result.rejected === 0) {
      setHud((prev) => ({ ...prev, status: "Import enthaelt keine Presets" }));
      return;
    }

    const modeLabel = mode === "replace" ? "Replace" : "Merge";
    setHud((prev) => ({
      ...prev,
      status:
        `Import ${modeLabel}: +${result.imported} `
        + `rejected ${result.rejected}`
        + (result.trimmed > 0 ? ` (trimmed ${result.trimmed})` : ""),
    }));
  };

  return {
    saveCompositionPreset,
    loadCompositionPreset,
    deleteSelectedCompositionPreset,
    clearCompositionPresetLibrary,
    exportCompositionLibrary,
    copyCompositionLibraryToClipboard,
    importCompositionLibrary,
  };
}
