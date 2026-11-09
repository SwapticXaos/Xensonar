import { useRef, useState } from "react";
import type { MetaPresetId } from "../domain/metaPresetTypes";

export function useMetaPresetRouletteState() {
  const [mandalaPresetColorOverrides, setMandalaPresetColorOverrides] = useState<Partial<Record<MetaPresetId, string>>>({});
  const [mandalaRandomizingPresetId, setMandalaRandomizingPresetId] = useState<MetaPresetId | null>(null);
  const [roulettePreviewPresetId, setRoulettePreviewPresetId] = useState<MetaPresetId | null>(null);
  const [rouletteIsSpinning, setRouletteIsSpinning] = useState(false);
  const mouseEntropyRef = useRef(0x9e3779b9);
  const lastMouseEntropyStampRef = useRef(0);
  const mandalaSpinTokenRef = useRef(0);
  const rouletteSpinTokenRef = useRef(0);

  return {
    mandalaPresetColorOverrides,
    setMandalaPresetColorOverrides,
    mandalaRandomizingPresetId,
    setMandalaRandomizingPresetId,
    roulettePreviewPresetId,
    setRoulettePreviewPresetId,
    rouletteIsSpinning,
    setRouletteIsSpinning,
    mouseEntropyRef,
    lastMouseEntropyStampRef,
    mandalaSpinTokenRef,
    rouletteSpinTokenRef,
  };
}
