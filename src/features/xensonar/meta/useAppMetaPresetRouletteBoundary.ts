import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { META_PRESETS } from "../domain/metaPresets";
import type { MetaPresetId } from "../domain/metaPresetTypes";
import { MANDALA_RANDOMIZER_COLORS } from "../rooms/resonanceUiConfig";
import { buildRandomMetaSessionOverride, createXorShift, mixMouseEntropySeed, readMetaEntropySeed } from "../rooms/metaPresetRandomizer";
import type { MetaPresetSessionOverrides } from "./useAppMetaPresetActionBoundary";

export type AppMetaPresetRouletteState = {
  readonly mandalaRandomizingPresetId: MetaPresetId | null;
  readonly setMandalaRandomizingPresetId: Dispatch<SetStateAction<MetaPresetId | null>>;
  readonly rouletteIsSpinning: boolean;
  readonly setRouletteIsSpinning: Dispatch<SetStateAction<boolean>>;
  readonly setRoulettePreviewPresetId: Dispatch<SetStateAction<MetaPresetId | null>>;
  readonly setMandalaPresetColorOverrides: Dispatch<SetStateAction<Partial<Record<MetaPresetId, string>>>>;
  readonly mouseEntropyRef: MutableRefObject<number>;
  readonly lastMouseEntropyStampRef: MutableRefObject<number>;
  readonly mandalaSpinTokenRef: MutableRefObject<number>;
  readonly rouletteSpinTokenRef: MutableRefObject<number>;
};

export type AppMetaPresetRouletteBoundaryArgs = {
  readonly metaPresetRouletteState: AppMetaPresetRouletteState;
  readonly audioCtxRef: MutableRefObject<AudioContext | null>;
  readonly setSessionMetaOverrides: Dispatch<SetStateAction<MetaPresetSessionOverrides>>;
  readonly applyMetaPreset: (presetId: MetaPresetId) => void;
};

export type AppMetaPresetRouletteBoundary = {
  readonly readEntropySeed: () => number;
  readonly randomizeMetaPresetForSession: (presetId: MetaPresetId) => void;
  readonly startMetaPresetRoulette: () => void;
  readonly metaPresetRouletteBoundaryExtractedFromAppTsx: true;
  readonly rouletteChoosesPresetButDoesNotApplyPresetSemantics: true;
  readonly noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true;
};

export function useAppMetaPresetRouletteBoundary(args: AppMetaPresetRouletteBoundaryArgs): AppMetaPresetRouletteBoundary {
  const { metaPresetRouletteState } = args;

  useEffect(() => {
    const handleMouseEntropy = (event: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(0, now - metaPresetRouletteState.lastMouseEntropyStampRef.current);
      metaPresetRouletteState.lastMouseEntropyStampRef.current = now;
      metaPresetRouletteState.mouseEntropyRef.current = mixMouseEntropySeed(
        metaPresetRouletteState.mouseEntropyRef.current,
        event.clientX,
        event.clientY,
        dt,
        now,
      );
    };
    window.addEventListener("mousemove", handleMouseEntropy, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseEntropy);
  }, [metaPresetRouletteState.lastMouseEntropyStampRef, metaPresetRouletteState.mouseEntropyRef]);

  const readEntropySeed = () => {
    const heapEntropy = typeof performance !== "undefined" && "memory" in performance
      ? Number((performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ?? 0)
      : 0;
    return readMetaEntropySeed(
      metaPresetRouletteState.mouseEntropyRef.current,
      performance.now(),
      args.audioCtxRef.current?.currentTime ?? 0,
      heapEntropy,
    );
  };

  const randomizeMetaPresetForSession = (presetId: MetaPresetId) => {
    if (metaPresetRouletteState.mandalaRandomizingPresetId || metaPresetRouletteState.rouletteIsSpinning) return;
    const token = ++metaPresetRouletteState.mandalaSpinTokenRef.current;
    metaPresetRouletteState.setMandalaRandomizingPresetId(presetId);
    const rand = createXorShift(readEntropySeed());
    let colorIndex = Math.floor(rand() * MANDALA_RANDOMIZER_COLORS.length);
    let stepsLeft = 14 + Math.floor(rand() * 18);
    const totalSteps = Math.max(stepsLeft, 1);

    const tick = () => {
      if (token !== metaPresetRouletteState.mandalaSpinTokenRef.current) return;
      metaPresetRouletteState.setMandalaPresetColorOverrides((prev) => ({
        ...prev,
        [presetId]: MANDALA_RANDOMIZER_COLORS[colorIndex % MANDALA_RANDOMIZER_COLORS.length],
      }));
      if (stepsLeft <= 0) {
        const override = buildRandomMetaSessionOverride(rand);
        args.setSessionMetaOverrides((prev) => ({ ...prev, [presetId]: override }));
        metaPresetRouletteState.setMandalaRandomizingPresetId(null);
        args.applyMetaPreset(presetId);
        return;
      }
      colorIndex = (colorIndex + 1) % MANDALA_RANDOMIZER_COLORS.length;
      stepsLeft -= 1;
      const progress = 1 - stepsLeft / totalSteps;
      const delay = 48 + progress * progress * 260 + rand() * 26;
      window.setTimeout(tick, delay);
    };

    tick();
  };

  const startMetaPresetRoulette = () => {
    if (metaPresetRouletteState.rouletteIsSpinning || metaPresetRouletteState.mandalaRandomizingPresetId || !META_PRESETS.length) return;
    const token = ++metaPresetRouletteState.rouletteSpinTokenRef.current;
    metaPresetRouletteState.setRouletteIsSpinning(true);
    let seed = readEntropySeed();
    if (!seed) seed = 0xa341316c;
    const nextRand = createXorShift(seed);
    const ids = META_PRESETS.map((preset) => preset.id);
    let currentIndex = Math.floor(nextRand() * ids.length);
    const targetIndex = Math.floor(nextRand() * ids.length);
    const extraRounds = 3 + Math.floor(nextRand() * 4);
    let stepsLeft = extraRounds * ids.length + ((targetIndex - currentIndex + ids.length) % ids.length);
    const totalSteps = Math.max(stepsLeft, 1);

    const spinTick = () => {
      if (token !== metaPresetRouletteState.rouletteSpinTokenRef.current) return;
      metaPresetRouletteState.setRoulettePreviewPresetId(ids[currentIndex]);
      if (stepsLeft <= 0) {
        const winner = ids[targetIndex];
        metaPresetRouletteState.setRoulettePreviewPresetId(winner);
        metaPresetRouletteState.setRouletteIsSpinning(false);
        args.applyMetaPreset(winner);
        window.setTimeout(() => {
          if (metaPresetRouletteState.rouletteSpinTokenRef.current === token) metaPresetRouletteState.setRoulettePreviewPresetId(null);
        }, 260);
        return;
      }
      currentIndex = (currentIndex + 1) % ids.length;
      stepsLeft -= 1;
      const progress = 1 - stepsLeft / totalSteps;
      const delay = 44 + progress * progress * 310 + nextRand() * 24;
      window.setTimeout(spinTick, delay);
    };

    spinTick();
  };

  return {
    readEntropySeed,
    randomizeMetaPresetForSession,
    startMetaPresetRoulette,
    metaPresetRouletteBoundaryExtractedFromAppTsx: true,
    rouletteChoosesPresetButDoesNotApplyPresetSemantics: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
  };
}
