import { useState } from "react";
import type { MetaPresetId } from "../domain/metaPresetTypes";
import { useMetaPresetRouletteState } from "../rooms/useMetaPresetRouletteState";
import type { MetaPresetSessionOverrides } from "./useAppMetaPresetActionBoundary";

/**
 * Keeps App.tsx from owning the meta-preset session/roulette shell directly.
 *
 * This boundary intentionally contains only React session state and the existing
 * roulette UI-state hook. It must not mutate audio graphs, Carrier hearing
 * registries, pitch mapping, package-station payloads, or preset application
 * semantics.
 */
export function useAppMetaPresetSessionBoundary() {
  const [activeOvertoneMixer, setActiveOvertoneMixer] = useState<"drone" | "waves">("drone");
  const [activeMetaPresetId, setActiveMetaPresetId] = useState<MetaPresetId | null>(null);
  const [sessionMetaOverrides, setSessionMetaOverrides] = useState<MetaPresetSessionOverrides>({});
  const metaPresetRouletteState = useMetaPresetRouletteState();

  return {
    activeOvertoneMixer,
    setActiveOvertoneMixer,
    activeMetaPresetId,
    setActiveMetaPresetId,
    sessionMetaOverrides,
    setSessionMetaOverrides,
    metaPresetRouletteState,
  };
}
