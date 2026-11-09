/**
 * App-level harmonic world and setlist handlers (vision §3 §5 §8).
 * Extracted from App.tsx so App stays a thin composer; single source of truth unchanged.
 * All scene/setlist/import/surprise/quantize-cycle handlers and scenePosition.
 */
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { ResonanceSceneId } from "../features/resonance/config/scenes";
import type { ResonanceState } from "../features/resonance/config/state";
import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import { exportHarmonicWorld } from "../domain/harmonicWorld";
import { WORLD_GALLERY, WORLD_JOURNEYS } from "../domain/worldGallery";
import {
  addToSetlist,
  removeFromSetlist,
  setlistGoNext,
  setlistGoPrev,
  getSetlistSlotExport,
  saveWorldSetlist,
  findSetlistIndexForExport,
  type WorldSetlist,
} from "../domain/worldSetlist";
import { getNextSceneInAnyGoal, getRandomSimilarScene } from "../features/harmonicWorldSpine";
import { RESONANCE_SCENES } from "../features/resonance/config/scenes";
import { getAdjacentScene, getScenePositionLabel } from "../features/resonance/config/sceneHelpers";
import {
  findQuantizeMacroPresetForParams,
  QUANTIZE_MACRO_PRESETS,
} from "../features/resonance/config/quantizePresets";
import { getQuantizeSlice, getGrooveSlice } from "../features/resonance/config/stateSlices";
import { createTonePlayer } from "../features/audio";
import type { LaunchContext } from "../features/runtime/launch";
import { launchRandomPracticeGoal, launchRandomTrainingFlow } from "../features/runtime/launch";
import type { EnsureAudio } from "../shared/audio/audioInit";
import type { Room } from "./roomRegistry";

export type PlayScheduledTone = ReturnType<typeof createTonePlayer>;

export type UseAppHarmonicWorldHandlersArgs = {
  setRoom: (room: Room) => void;
  initAudio: EnsureAudio;
  selectScene: (sceneId: ResonanceSceneId) => void;
  importWorld: (data: HarmonicWorldExport) => void;
  currentScene: { id: ResonanceSceneId; label?: string } | null;
  nexusParamsRef: MutableRefObject<ResonanceState>;
  updateNParams: (patch: Partial<ResonanceState>) => void;
  setlist: WorldSetlist;
  setSetlist: React.Dispatch<React.SetStateAction<WorldSetlist>>;
  showToast: (message: string, kind?: "success" | "error" | "info") => void;
  audioCtx: AudioContext | null;
  playScheduledTone: PlayScheduledTone;
  harmonicWorld: HarmonicWorld | null;
};

export function useAppHarmonicWorldHandlers({
  setRoom,
  initAudio,
  selectScene,
  importWorld,
  currentScene,
  nexusParamsRef,
  updateNParams,
  setlist,
  setSetlist,
  showToast,
  audioCtx,
  playScheduledTone,
  harmonicWorld,
}: UseAppHarmonicWorldHandlersArgs) {
  const handleSelectResonanceScene = useCallback(
    (sceneId: ResonanceSceneId) => {
      selectScene(sceneId);
      setRoom("RESONANCE");
    },
    [selectScene, setRoom],
  );

  const handleNextInGoal = useCallback(() => {
    const next = getNextSceneInAnyGoal(currentScene?.id ?? null);
    if (!next) return;
    void initAudio().then(() => {
      selectScene(next.nextScene.id);
      setRoom("RESONANCE");
    });
  }, [currentScene?.id, selectScene, initAudio, setRoom]);

  const handleNextScene = useCallback(() => {
    const scene = getAdjacentScene(RESONANCE_SCENES, currentScene?.id, "next");
    if (!scene) return;
    void initAudio().then(() => {
      selectScene(scene.id);
      setRoom("RESONANCE");
    });
  }, [currentScene?.id, selectScene, initAudio, setRoom]);

  const handlePrevScene = useCallback(() => {
    const scene = getAdjacentScene(RESONANCE_SCENES, currentScene?.id, "prev");
    if (!scene) return;
    void initAudio().then(() => {
      selectScene(scene.id);
      setRoom("RESONANCE");
    });
  }, [currentScene?.id, selectScene, initAudio, setRoom]);

  const handleSurpriseScene = useCallback(() => {
    if (RESONANCE_SCENES.length === 0) return;
    const index = Math.floor(Math.random() * RESONANCE_SCENES.length);
    const scene = RESONANCE_SCENES[index];
    if (!scene) return;
    void initAudio().then(() => {
      selectScene(scene.id);
      setRoom("RESONANCE");
    });
  }, [selectScene, initAudio, setRoom]);

  const handleSurpriseSimilarScene = useCallback(() => {
    const scene = getRandomSimilarScene(currentScene?.id ?? null);
    if (!scene) return;
    void initAudio().then(() => {
      selectScene(scene.id);
      setRoom("RESONANCE");
    });
  }, [currentScene?.id, selectScene, initAudio, setRoom]);

  const handleSceneJumpByIndex = useCallback(
    (oneBased: number) => {
      if (oneBased < 1 || oneBased > RESONANCE_SCENES.length) return;
      const scene = RESONANCE_SCENES[oneBased - 1];
      if (!scene) return;
      void initAudio().then(() => {
        selectScene(scene.id);
        setRoom("RESONANCE");
      });
    },
    [selectScene, initAudio, setRoom],
  );

  const handleImportWorld = useCallback(
    (data: HarmonicWorldExport) => {
      importWorld(data);
      setRoom("RESONANCE");
      setSetlist((prev) => {
        if (prev.slots.length === 0 && data.id) {
          const journey = WORLD_JOURNEYS.find((j) => j.worldIds[0] === data.id);
          if (journey) {
            const journeySlots: HarmonicWorldExport[] = [];
            for (const worldId of journey.worldIds) {
              const match = WORLD_GALLERY.find((world) => world.id === worldId);
              if (match) journeySlots.push(match);
              if (journeySlots.length >= 8) break;
            }
            if (journeySlots.length > 0) {
              const seeded = { slots: journeySlots, currentIndex: 0 } as WorldSetlist;
              saveWorldSetlist(seeded);
              return seeded;
            }
          }
        }
        const idx = findSetlistIndexForExport(prev, data);
        if (idx >= 0) {
          const next = { ...prev, currentIndex: idx };
          saveWorldSetlist(next);
          return next;
        }
        return prev;
      });
    },
    [importWorld, setRoom, setSetlist],
  );

  const handleImportWorldRef = useRef(handleImportWorld);
  useEffect(() => {
    handleImportWorldRef.current = handleImportWorld;
  }, [handleImportWorld]);

  const handleSetlistNext = useCallback(() => {
    const nextExport = getSetlistSlotExport(setlist, setlist.currentIndex + 1);
    if (nextExport) {
      importWorld(nextExport);
      setRoom("RESONANCE");
      setSetlist(setlistGoNext(setlist));
    }
  }, [setlist, importWorld, setRoom, setSetlist]);

  const handleSetlistPrev = useCallback(() => {
    const prevExport = getSetlistSlotExport(setlist, setlist.currentIndex - 1);
    if (prevExport) {
      importWorld(prevExport);
      setRoom("RESONANCE");
      setSetlist(setlistGoPrev(setlist));
    }
  }, [setlist, importWorld, setRoom, setSetlist]);

  const handleAddCurrentToSetlist = useCallback(
    (world: HarmonicWorld) => {
      if (setlist.slots.length >= 8) {
        showToast("Setlist full (max 8)", "error");
        return;
      }
      const data = exportHarmonicWorld(world);
      if (findSetlistIndexForExport(setlist, data) >= 0) {
        showToast("Already in setlist", "info");
        return;
      }
      const next = addToSetlist(setlist, data);
      setSetlist(next);
      saveWorldSetlist(next);
      showToast("Added to setlist", "success");
    },
    [setlist, setSetlist, showToast],
  );

  const handleRemoveFromSetlist = useCallback(
    (index: number) => {
      const next = removeFromSetlist(setlist, index);
      setSetlist(next);
      saveWorldSetlist(next);
      showToast("Removed from setlist", "success");
    },
    [setlist, setSetlist, showToast],
  );

  const handleSetlistSlotSelect = useCallback(
    (index: number) => {
      const exportData = getSetlistSlotExport(setlist, index);
      if (exportData) {
        importWorld(exportData);
        setRoom("RESONANCE");
        setSetlist((prev) => {
          const next = { ...prev, currentIndex: index };
          saveWorldSetlist(next);
          return next;
        });
      }
    },
    [setlist, importWorld, setRoom, setSetlist],
  );

  const handlePreviewWorldTone = useCallback(
    (world: HarmonicWorld) => {
      if (!audioCtx) {
        void initAudio().then((ctx) => {
          if (!ctx) return;
          const previewPlayer = createTonePlayer(() => ctx);
          previewPlayer(world.baseFreq, 0, 0.25, "sine", 0.14);
        });
        return;
      }
      playScheduledTone(world.baseFreq, 0, 0.25, "sine", 0.14);
    },
    [audioCtx, initAudio, playScheduledTone],
  );

  /** Preview signature interval: play short tone at baseFreq * ratio (vision §3 harmonic first-class). */
  const handlePreviewInterval = useCallback(
    (baseFreq: number, ratio: number) => {
      const freq = baseFreq * ratio;
      if (!Number.isFinite(freq) || freq <= 0) return;
      if (!audioCtx) {
        void initAudio().then((ctx) => {
          if (!ctx) return;
          const previewPlayer = createTonePlayer(() => ctx);
          previewPlayer(freq, 0, 0.22, "sine", 0.12);
        });
        return;
      }
      playScheduledTone(freq, 0, 0.22, "sine", 0.12);
    },
    [audioCtx, initAudio, playScheduledTone],
  );

  const cycleQuantizePreset = useCallback(
    (direction: "next" | "prev") => {
      const q = getQuantizeSlice(nexusParamsRef);
      const groove = getGrooveSlice(nexusParamsRef);
      const current = findQuantizeMacroPresetForParams({
        quantizeSubdivision: q.quantizeSubdivision,
        quantizeMicroTightness: groove.quantizeMicroTightness,
        harmonyCascadeSteps: groove.harmonyCascadeSteps,
      });
      const list = QUANTIZE_MACRO_PRESETS;
      const idx = current ? list.indexOf(current) : 0;
      const nextIdx =
        direction === "next"
          ? (idx + 1) % list.length
          : (idx - 1 + list.length) % list.length;
      const preset = list[nextIdx];
      updateNParams({
        quantizeSubdivision: preset.quantizeSubdivision,
        quantizeMicroTightness: preset.quantizeMicroTightness,
        harmonyCascadeSteps: preset.harmonyCascadeSteps,
      });
    },
    [nexusParamsRef, updateNParams],
  );

  const addCurrentToSetlistRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    addCurrentToSetlistRef.current = () => {
      if (harmonicWorld) handleAddCurrentToSetlist(harmonicWorld);
    };
  }, [harmonicWorld, handleAddCurrentToSetlist]);

  const scenePosition = getScenePositionLabel(RESONANCE_SCENES, currentScene?.id);

  return {
    handleSelectResonanceScene,
    handleNextInGoal,
    handleNextScene,
    handlePrevScene,
    handleSurpriseScene,
    handleSurpriseSimilarScene,
    handleSurpriseGoal: () => {
      const ctx: LaunchContext = {
        initAudio,
        setRoom,
        onSelectResonanceScene: handleSelectResonanceScene,
        onImportWorld: handleImportWorld,
      };
      void launchRandomPracticeGoal(ctx);
    },
    handleSurpriseFlow: () => {
      const ctx: LaunchContext = {
        initAudio,
        setRoom,
        onSelectResonanceScene: handleSelectResonanceScene,
        onImportWorld: handleImportWorld,
      };
      void launchRandomTrainingFlow(ctx);
    },
    handleSceneJumpByIndex,
    handleImportWorld,
    handleImportWorldRef,
    handleSetlistNext,
    handleSetlistPrev,
    handleAddCurrentToSetlist,
    handleRemoveFromSetlist,
    handleSetlistSlotSelect,
    handlePreviewWorldTone,
    handlePreviewInterval,
    cycleQuantizePreset,
    addCurrentToSetlistRef,
    scenePosition,
  };
}
