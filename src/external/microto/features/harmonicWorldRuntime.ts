import { useMemo, useState, useCallback } from "react";
import type { MutableRefObject } from "react";
import {
  getGlobalHarmonicContext,
  type GlobalHarmonicContext,
} from "./resonance/config/stateSlices";
import {
  RESONANCE_SCENES,
  type ResonanceScene,
  type ResonanceSceneId,
  buildResonanceScenePatch,
  findResonanceSceneForState,
} from "./resonance/config/scenes";
import {
  type HarmonicWorld,
  type HarmonicWorldExport,
  worldFromSlices,
} from "../domain/harmonicWorld";
import { buildResonancePatchFromWorldExport } from "./resonance/config/applyWorldExport";
import type { ResonanceState } from "./resonance/runtimeConfig";
import { recordWorldImport } from "../domain/worldHistory";

/** True when export.id matches a curated scene (so derived world will get scene mood). Exported for tests. */
export function exportMatchesScene(data: HarmonicWorldExport): boolean {
  if (data.id == null || data.id === "") return false;
  return RESONANCE_SCENES.some((s) => s.id === data.id);
}

type UseHarmonicWorldRuntimeArgs = {
  nexusParamsRef: MutableRefObject<ResonanceState>;
  /**
   * UI-facing resonance state snapshot or token.
   * Used only as a change signal for memoization; exact shape is owned by useResonanceStateAPI.
   */
  nParamsUI: unknown;
  updateNParams: (patch: Partial<ResonanceState>) => void;
};

type UseHarmonicWorldRuntimeResult = {
  globalHarmonicContext: GlobalHarmonicContext;
  currentScene: ResonanceScene | null;
  harmonicWorld: HarmonicWorld;
  selectScene: (sceneId: ResonanceSceneId) => void;
  importWorld: (data: HarmonicWorldExport) => void;
};

export function useHarmonicWorldRuntime({
  nexusParamsRef,
  nParamsUI,
  updateNParams,
}: UseHarmonicWorldRuntimeArgs): UseHarmonicWorldRuntimeResult {
  const [lastAppliedExportMood, setLastAppliedExportMood] = useState<string | null>(null);

  const globalHarmonicContext = useMemo(
    () => getGlobalHarmonicContext(nexusParamsRef),
    [nParamsUI, nexusParamsRef],
  );

  const currentScene = useMemo(
    () => findResonanceSceneForState(nexusParamsRef.current),
    [nParamsUI, nexusParamsRef],
  );

  const harmonicWorld = useMemo(() => {
    const base = worldFromSlices({ global: globalHarmonicContext, scene: currentScene ?? null });
    if (base.mood == null && lastAppliedExportMood != null) {
      return { ...base, mood: lastAppliedExportMood };
    }
    return base;
  }, [globalHarmonicContext, currentScene, lastAppliedExportMood]);

  const selectScene = useCallback(
    (sceneId: ResonanceSceneId) => {
      setLastAppliedExportMood(null);
      const scene = RESONANCE_SCENES.find((candidate) => candidate.id === sceneId);
      if (!scene) return;
      const patch = buildResonanceScenePatch(scene, nexusParamsRef.current);
      updateNParams(patch);
    },
    [nexusParamsRef, updateNParams],
  );

  const importWorld = useCallback(
    (data: HarmonicWorldExport) => {
      const patch = buildResonancePatchFromWorldExport(data, nexusParamsRef.current);
      updateNParams(patch);
      recordWorldImport(data);
      if (exportMatchesScene(data)) {
        setLastAppliedExportMood(null);
      } else {
        setLastAppliedExportMood(data.mood ?? null);
      }
    },
    [nexusParamsRef, updateNParams],
  );

  return {
    globalHarmonicContext,
    currentScene,
    harmonicWorld,
    selectScene,
    importWorld,
  };
}

