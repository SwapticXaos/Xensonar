import { useEffect, useMemo, useRef, useState } from 'react';
import type { DrumPattern } from '../../xensonar/domain/instrumentData';
import { stepIndexToGlobalRatio } from '../../xensonar/drumGrid';
import { buildVisibleDrumPatternMatrix } from '../../xensonar/drumPatternMachine';
import {
  createCanonicalDrumWorkspaceController,
  type DrumNavigatorDragState,
  type DrumPointerState,
} from './canonicalDrumWorkspaceController';
import {
  drumPatternMatrixToState,
  type DrumComputerState,
  type DrumViewportState,
  type DrumVoiceId,
  type GrooveMachineConfig,
} from './loopDrumDomain';
import { useCanonicalDrumWorkspaceInteractions } from './useCanonicalDrumWorkspaceInteractions';
import { hitDrumComputerCanvas, sanitizeDrumViewport } from './viewportMath';

type CanonicalDrumWorkspaceRuntimeArgs = {
  initialDrumComputer: DrumComputerState;
  initialDrumViewport: DrumViewportState;
  initialGrooveMachine: GrooveMachineConfig;
  materialExportName: string;
  setStatus: (value: string) => void;
};

export function useCanonicalDrumWorkspaceRuntime({
  initialDrumComputer,
  initialDrumViewport,
  initialGrooveMachine,
  materialExportName,
  setStatus,
}: CanonicalDrumWorkspaceRuntimeArgs) {
  const [grooveMachine, setGrooveMachine] = useState<GrooveMachineConfig>(() => initialGrooveMachine);
  const [drumComputer, setDrumComputer] = useState<DrumComputerState>(() => initialDrumComputer);
  const [drumViewport, setDrumViewport] = useState<DrumViewportState>(() => initialDrumViewport);
  const [selectedDrumLaneId, setSelectedDrumLaneId] = useState<DrumVoiceId>('kick');
  const [drumMarkerDragIndex, setDrumMarkerDragIndex] = useState<number | null>(null);

  const drumComputerRef = useRef<HTMLCanvasElement>(null);
  const drumViewportWrapperRef = useRef<HTMLDivElement>(null);
  const drumNavigatorRef = useRef<HTMLDivElement>(null);
  const drumPointerRef = useRef<DrumPointerState | null>(null);
  const drumNavDragRef = useRef<DrumNavigatorDragState | null>(null);

  const visibleDrumComputer = useMemo(
    () => (drumComputer.useCustom
      ? drumComputer
      : drumPatternMatrixToState(
        grooveMachine.drumPattern,
        buildVisibleDrumPatternMatrix({
          pattern: grooveMachine.drumPattern as DrumPattern,
          bars: grooveMachine.barsInterpretation,
          segmentsPerBar: drumComputer.segmentsPerBar,
          segmentMarkers: drumComputer.segmentMarkers,
        }),
        false,
      )),
    [drumComputer, grooveMachine.drumPattern, grooveMachine.barsInterpretation],
  );

  const safeDrumViewport = useMemo(
    () => sanitizeDrumViewport(drumViewport, visibleDrumComputer.stepCount),
    [drumViewport, visibleDrumComputer.stepCount],
  );

  const drumNavigatorHitRatios = useMemo(() => {
    const ratios: number[] = [];
    visibleDrumComputer.laneOrder.forEach((laneId) => {
      (visibleDrumComputer.laneSteps[laneId] ?? []).forEach((value, index) => {
        if (value <= 0) return;
        ratios.push(stepIndexToGlobalRatio(
          index,
          visibleDrumComputer.bars,
          visibleDrumComputer.segmentsPerBar,
          visibleDrumComputer.segmentMarkers,
          'center',
        ));
      });
    });
    return ratios.slice(0, 512);
  }, [visibleDrumComputer]);

  useEffect(() => {
    setDrumViewport((state) => {
      const next = sanitizeDrumViewport(state, visibleDrumComputer.stepCount);
      return Math.abs(next.startRatio - state.startRatio) < 1e-6
        && Math.abs(next.endRatio - state.endRatio) < 1e-6
        ? state
        : next;
    });
  }, [visibleDrumComputer.stepCount]);

  const actions = createCanonicalDrumWorkspaceController({
    drumComputerRef,
    drumPointerRef,
    drumNavDragRef,
    visibleDrumComputer,
    safeDrumViewport,
    grooveMachine,
    drumComputer,
    materialExportName,
    setDrumComputer,
    setDrumViewport,
    setGrooveMachine,
    setStatus,
    setDrumMarkerDragIndex,
    setSelectedDrumLaneId,
    hitDrumComputerCanvas,
  } as any);

  useCanonicalDrumWorkspaceInteractions({
    drumComputerRef,
    drumViewportWrapperRef,
    drumNavigatorRef,
    drumPointerRef,
    drumNavDragRef,
    visibleDrumComputer,
    safeDrumViewport,
    setDrumMarkerDragIndex,
    applyDrumGridMarkerFromMouse: actions.applyDrumGridMarkerFromMouse,
    applyDrumStepValue: actions.applyDrumStepValue,
    setDrumViewport,
  });

  return {
    grooveMachine,
    setGrooveMachine,
    drumComputer,
    setDrumComputer,
    drumViewport,
    setDrumViewport,
    selectedDrumLaneId,
    setSelectedDrumLaneId,
    drumMarkerDragIndex,
    visibleDrumComputer,
    safeDrumViewport,
    drumNavigatorHitRatios,
    drumCanvasWidth: 1180,
    refs: {
      drumComputerRef,
      drumViewportWrapperRef,
      drumNavigatorRef,
    },
    actions,
  };
}
