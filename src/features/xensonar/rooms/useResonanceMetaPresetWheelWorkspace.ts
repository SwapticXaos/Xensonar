import { useEffect, useMemo, useRef, useState } from 'react';

const WHEEL_ORDER_STORAGE_KEY = 'xensonar.gluecksrad.wheelOrder.v1';

const samePresetOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const normalizeWheelPresetOrder = (candidate: string[], availableIds: string[]) => {
  const available = new Set(availableIds);
  const cleaned = candidate.filter((id, index) => available.has(id) && candidate.indexOf(id) === index);
  const missing = availableIds.filter((id) => !cleaned.includes(id));
  return [...cleaned, ...missing];
};

const readPersistedWheelOrder = (availableIds: string[]) => {
  if (typeof window === 'undefined') return availableIds;
  try {
    const raw = window.localStorage.getItem(WHEEL_ORDER_STORAGE_KEY);
    if (!raw) return availableIds;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return availableIds;
    return normalizeWheelPresetOrder(parsed.filter((entry): entry is string => typeof entry === 'string'), availableIds);
  } catch {
    return availableIds;
  }
};

const writePersistedWheelOrder = (order: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WHEEL_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Persistence is optional; the manager remains session-usable without it.
  }
};

export function useResonanceMetaPresetWheelWorkspace<T extends { id: string }>(args: {
  metaPresets: T[];
  activeMetaPresetId: string | null;
}) {
  const { metaPresets, activeMetaPresetId } = args;
  // The parent may rebuild the preset objects while their IDs stay unchanged.
  // Keep the ID vector referentially stable so the persistence effect does not
  // become a render -> effect -> state -> render feedback loop.
  const candidateMetaPresetIds = metaPresets.map((preset) => preset.id);
  const metaPresetIdsRef = useRef<string[]>(candidateMetaPresetIds);
  if (!samePresetOrder(metaPresetIdsRef.current, candidateMetaPresetIds)) {
    metaPresetIdsRef.current = candidateMetaPresetIds;
  }
  const metaPresetIds = metaPresetIdsRef.current;
  const [wheelPresetOrder, setWheelPresetOrder] = useState<string[]>([]);
  const [selectedManagerPresetId, setSelectedManagerPresetId] = useState<string | null>(null);
  const [draggedManagerPresetId, setDraggedManagerPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (!metaPresetIds.length) return;
    setWheelPresetOrder((prev) => {
      const next = prev.length ? normalizeWheelPresetOrder(prev, metaPresetIds) : readPersistedWheelOrder(metaPresetIds);
      return samePresetOrder(prev, next) ? prev : next;
    });
  }, [metaPresetIds]);

  const normalizedWheelPresetOrder = useMemo(() => normalizeWheelPresetOrder(wheelPresetOrder, metaPresetIds), [wheelPresetOrder, metaPresetIds]);
  const wheelSlotIds = normalizedWheelPresetOrder.slice(0, 8);
  const orderedMetaPresets = useMemo(
    () => normalizedWheelPresetOrder.map((id) => metaPresets.find((preset) => preset.id === id)).filter((preset): preset is T => Boolean(preset)),
    [normalizedWheelPresetOrder, metaPresets],
  );
  const orderedWheelPresets = orderedMetaPresets.slice(0, 8);
  const selectedManagerPreset = metaPresets.find((preset) => preset.id === (selectedManagerPresetId ?? activeMetaPresetId ?? wheelSlotIds[0])) ?? orderedMetaPresets[0] ?? null;

  const persistWheelOrder = (nextOrder: string[]) => {
    const normalized = normalizeWheelPresetOrder(nextOrder, metaPresetIds);
    setWheelPresetOrder(normalized);
    writePersistedWheelOrder(normalized);
  };

  const moveManagerPreset = (presetId: string, direction: -1 | 1) => {
    const currentIndex = normalizedWheelPresetOrder.indexOf(presetId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= normalizedWheelPresetOrder.length) return;
    const next = [...normalizedWheelPresetOrder];
    const [moved] = next.splice(currentIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    persistWheelOrder(next);
  };

  const dropManagerPreset = (targetId: string) => {
    if (!draggedManagerPresetId || draggedManagerPresetId === targetId) return;
    const next = normalizedWheelPresetOrder.filter((id) => id !== draggedManagerPresetId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedManagerPresetId);
    persistWheelOrder(next);
    setDraggedManagerPresetId(null);
  };

  return {
    normalizedWheelPresetOrder,
    wheelSlotIds,
    orderedMetaPresets,
    orderedWheelPresets,
    selectedManagerPreset,
    setSelectedManagerPresetId,
    setDraggedManagerPresetId,
    persistWheelOrder,
    moveManagerPreset,
    dropManagerPreset,
    resetManagerWheelOrder: () => persistWheelOrder(metaPresetIds),
  };
}
