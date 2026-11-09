import { useEffect, useMemo, useRef, useState } from 'react';
import type { CustomGridTuningId, GridTuning, RasterPeriodFamily } from '../../domain/instrumentData';
import {
  JI_EXACT_EPSILON,
  JI_TRACKED_MATCH_EPSILON,
  JI_WORKBENCH_INTERVALS,
  PERIOD_BOTTOM,
  PERIOD_TOP,
  WORKBENCH_HEIGHT,
  clamp,
  classifyDraft,
  countTrackedJiIntervals,
  createDraftName,
  createEqualStepCents,
  findTrackedJiLabelForMarker,
  roundTenth,
  seedEditorFromTuning,
  type GridTuningEditorState,
} from './gridTuningEditorDomain';

export type GridTuningJiMenuState = 'idle' | 'exact' | 'shifted';

export function useGridTuningEditorSession(args: {
  open: boolean;
  currentTuning: GridTuning;
  onMessage: (message: string) => void;
}) {
  const { open, currentTuning, onMessage } = args;
  const [editor, setEditor] = useState<GridTuningEditorState>(() => seedEditorFromTuning(currentTuning));
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(1);
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState<number | null>(null);
  const [centInput, setCentInput] = useState('');
  const [jiMenuOpen, setJiMenuOpen] = useState(false);
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const draft = seedEditorFromTuning(currentTuning);
    const nextSelectedIndex = Math.min(1, Math.max(1, draft.stepCents.length - 1));
    setEditor(draft);
    setSelectedMarkerIndex(nextSelectedIndex);
    setCentInput(draft.stepCents[nextSelectedIndex]?.toFixed(1) ?? '0.0');
    setJiMenuOpen(false);
  }, [open, currentTuning]);

  useEffect(() => {
    if (!editor.nameTouched) {
      setEditor((previous) => ({
        ...previous,
        name: createDraftName(previous.periodFamily, previous.periodCents, previous.stepCents, previous.jiTrackedCents),
      }));
    }
  }, [editor.periodFamily, editor.periodCents, editor.stepCents, editor.jiTrackedCents, editor.nameTouched]);

  useEffect(() => {
    setSelectedMarkerIndex((previous) => clamp(previous, 1, Math.max(1, editor.stepCents.length - 1)));
  }, [editor.stepCents.length]);

  useEffect(() => {
    const selectedCents = editor.stepCents[selectedMarkerIndex] ?? editor.stepCents[1] ?? 0;
    setCentInput(roundTenth(selectedCents).toFixed(1));
  }, [selectedMarkerIndex, editor.stepCents]);

  useEffect(() => {
    if (draggingMarkerIndex === null) return;
    const handlePointerMove = (event: PointerEvent) => {
      const element = workbenchRef.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const usableHeight = Math.max(1, bounds.height - PERIOD_TOP - PERIOD_BOTTOM);
      const localY = clamp(event.clientY - bounds.top, PERIOD_TOP, bounds.height - PERIOD_BOTTOM);
      const normalized = 1 - (localY - PERIOD_TOP) / usableHeight;
      const desired = roundTenth(normalized * editor.periodCents);
      setEditor((previous) => {
        const next = [...previous.stepCents];
        const prevFloor = draggingMarkerIndex <= 0 ? 0 : next[draggingMarkerIndex - 1] + 1;
        const nextCeiling = draggingMarkerIndex >= next.length - 1 ? previous.periodCents - 1 : next[draggingMarkerIndex + 1] - 1;
        const nextValue = roundTenth(clamp(desired, prevFloor, nextCeiling));
        const jiLabel = findTrackedJiLabelForMarker(previous.stepCents, previous.jiTrackedCents, draggingMarkerIndex);
        next[draggingMarkerIndex] = nextValue;
        return {
          ...previous,
          stepCents: next,
          jiTrackedCents: jiLabel ? { ...previous.jiTrackedCents, [jiLabel]: nextValue } : previous.jiTrackedCents,
        };
      });
      setSelectedMarkerIndex(draggingMarkerIndex);
    };
    const handlePointerUp = () => setDraggingMarkerIndex(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMarkerIndex, editor.periodCents]);

  const draftClassification = useMemo(
    () => classifyDraft(editor.periodFamily, editor.periodCents, editor.stepCents),
    [editor.periodFamily, editor.periodCents, editor.stepCents],
  );

  const workbenchMarkers = useMemo(() => {
    const usableHeight = WORKBENCH_HEIGHT - PERIOD_TOP - PERIOD_BOTTOM;
    return editor.stepCents.map((cents, index) => {
      const y = PERIOD_TOP + (1 - cents / Math.max(1, editor.periodCents)) * usableHeight;
      return { id: `draft-${index}`, index, y, cents };
    });
  }, [editor.periodCents, editor.stepCents]);

  const jiMenuStates = useMemo(() => Object.fromEntries(
    JI_WORKBENCH_INTERVALS.map((node) => {
      const trackedCents = editor.jiTrackedCents[node.label];
      const state: GridTuningJiMenuState = typeof trackedCents !== 'number'
        ? 'idle'
        : Math.abs(trackedCents - node.cents) <= JI_EXACT_EPSILON
          ? 'exact'
          : 'shifted';
      return [node.label, state];
    }),
  ) as Record<string, GridTuningJiMenuState>, [editor.jiTrackedCents]);

  const rebuildEqualDraft = (periodFamily: RasterPeriodFamily, steps: number, periodCents: number, keepName = false) => {
    const safeSteps = clamp(Math.round(steps), 2, 64);
    const safePeriodCents = roundTenth(clamp(periodCents, 400, 4000));
    const nextStepCents = createEqualStepCents(safeSteps, safePeriodCents);
    setEditor((previous) => ({
      periodFamily,
      steps: safeSteps,
      periodCents: safePeriodCents,
      stepCents: nextStepCents,
      name: keepName && previous.nameTouched ? previous.name : createDraftName(periodFamily, safePeriodCents, nextStepCents),
      nameTouched: keepName ? previous.nameTouched : false,
      editingCustomId: keepName ? previous.editingCustomId : null,
      jiTrackedCents: {},
    }));
    setSelectedMarkerIndex(Math.min(1, safeSteps - 1));
  };

  const updateSelectedMarker = (nextValue: number) => {
    if (selectedMarkerIndex <= 0) return;
    setEditor((previous) => {
      const next = [...previous.stepCents];
      const lower = selectedMarkerIndex <= 0 ? 0 : next[selectedMarkerIndex - 1] + 1;
      const upper = selectedMarkerIndex >= next.length - 1 ? previous.periodCents - 1 : next[selectedMarkerIndex + 1] - 1;
      const resolved = roundTenth(clamp(nextValue, lower, upper));
      const jiLabel = findTrackedJiLabelForMarker(previous.stepCents, previous.jiTrackedCents, selectedMarkerIndex);
      next[selectedMarkerIndex] = resolved;
      return {
        ...previous,
        stepCents: next,
        jiTrackedCents: jiLabel ? { ...previous.jiTrackedCents, [jiLabel]: resolved } : previous.jiTrackedCents,
      };
    });
  };

  const toggleJiInterval = (label: string, cents: number) => {
    setEditor((previous) => {
      const trackedCents = previous.jiTrackedCents[label];
      const nextTracked = { ...previous.jiTrackedCents };
      if (typeof trackedCents === 'number') {
        const removeIndex = previous.stepCents.findIndex((entry, index) => index > 0 && Math.abs(entry - trackedCents) <= JI_TRACKED_MATCH_EPSILON);
        if (removeIndex > 0) {
          const nextStepCents = previous.stepCents.filter((_, index) => index !== removeIndex);
          delete nextTracked[label];
          const nextSelected = clamp(selectedMarkerIndex > removeIndex ? selectedMarkerIndex - 1 : selectedMarkerIndex, 1, Math.max(1, nextStepCents.length - 1));
          setSelectedMarkerIndex(nextSelected);
          onMessage(`${label} aus dem aktuellen Raster entfernt.`);
          return {
            ...previous,
            steps: nextStepCents.length,
            stepCents: nextStepCents,
            jiTrackedCents: nextTracked,
          };
        }
      }
      const roundedCents = roundTenth(clamp(cents, 1, previous.periodCents - 1));
      const existingIndex = previous.stepCents.findIndex((entry, index) => index > 0 && Math.abs(entry - roundedCents) <= JI_EXACT_EPSILON);
      if (existingIndex > 0) {
        nextTracked[label] = previous.stepCents[existingIndex] ?? roundedCents;
        setSelectedMarkerIndex(existingIndex);
        onMessage(`${label} ist bereits im aktuellen Raster vorhanden.`);
        return { ...previous, jiTrackedCents: nextTracked };
      }
      const nextStepCents = [...previous.stepCents, roundedCents].sort((a, b) => a - b);
      const insertedIndex = nextStepCents.findIndex((entry) => Math.abs(entry - roundedCents) <= JI_EXACT_EPSILON);
      nextTracked[label] = roundedCents;
      setSelectedMarkerIndex(Math.max(1, insertedIndex));
      onMessage(`${label} in das aktuelle Raster übernommen.`);
      return {
        ...previous,
        steps: nextStepCents.length,
        stepCents: nextStepCents,
        jiTrackedCents: nextTracked,
      };
    });
  };

  const markSaved = (savedId: CustomGridTuningId, label: string) => {
    setEditor((previous) => ({ ...previous, editingCustomId: savedId, name: label, nameTouched: true }));
  };

  const loadTuning = (tuning: GridTuning) => {
    const draft = seedEditorFromTuning(tuning);
    setEditor(draft);
    setSelectedMarkerIndex(1);
    setJiMenuOpen(false);
  };

  return {
    editor,
    setEditor,
    selectedMarkerIndex,
    setSelectedMarkerIndex,
    centInput,
    setCentInput,
    jiMenuOpen,
    setJiMenuOpen,
    workbenchRef,
    draftClassification,
    workbenchMarkers,
    jiMenuStates,
    trackedJiCount: countTrackedJiIntervals(editor.jiTrackedCents),
    rebuildEqualDraft,
    updateSelectedMarker,
    toggleJiInterval,
    beginMarkerDrag: setDraggingMarkerIndex,
    markSaved,
    loadTuning,
  };
}
