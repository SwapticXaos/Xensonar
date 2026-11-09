import type { Dispatch, MutableRefObject, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from 'react';
import { applyDrumMarkerRatioToState, applyDrumStepValueToState } from './drumMachineState';
import {
  applyDrumBarsChangeAction,
  applyDrumSegmentsChangeAction,
  applyPresetDrumPatternAction,
  clearDrumComputerAction,
  exportDrumComputerToXensonarAction,
  randomizeDrumComputerAction,
  resetDrumComputerToPresetAction,
} from './drumMachineActions';
import { cycleDrumCellValue, type DrumComputerState, type DrumViewportState, type DrumVoiceId } from './loopDrumDomain';
import { drumCanvasXToGlobalRatio, getDrumCanvasGeometry } from './viewportMath';
import { sanitizeDrumSegmentMarkers } from '../../xensonar/drumGrid';

export type DrumPointerState =
  | { mode: 'paint'; laneId: DrumVoiceId; value: number; lastStep: number | null }
  | { mode: 'marker'; markerIndex: number; startClientX: number; moved: boolean };

export type DrumNavigatorDragState = {
  mode: 'pan' | 'start' | 'end';
  startClientX: number;
  startViewport: DrumViewportState;
};

export function createCanonicalDrumWorkspaceController(args: {
  drumComputerRef: RefObject<HTMLCanvasElement | null>;
  drumPointerRef: MutableRefObject<DrumPointerState | null>;
  drumNavDragRef: MutableRefObject<DrumNavigatorDragState | null>;
  visibleDrumComputer: DrumComputerState;
  safeDrumViewport: DrumViewportState;
  grooveMachine: {
    barsInterpretation: number;
    drumPattern: string;
    drumKit: string;
    drumLaneKitOverrides: Record<string, string | undefined>;
    drumLaneSettings: Record<string, { level?: number; decay?: number; pan?: number; chokeGroup?: number }>;
  };
  drumComputer: DrumComputerState;
  materialExportName: string;
  setDrumComputer: Dispatch<SetStateAction<DrumComputerState>>;
  setDrumViewport: Dispatch<SetStateAction<DrumViewportState>>;
  setGrooveMachine: Dispatch<SetStateAction<any>>;
  setStatus: (value: string) => void;
  setDrumMarkerDragIndex: (value: number | null) => void;
  setSelectedDrumLaneId: (value: DrumVoiceId) => void;
  hitDrumComputerCanvas: (canvas: HTMLCanvasElement, event: { clientX: number; clientY: number } | ReactMouseEvent<HTMLCanvasElement>, visibleState: DrumComputerState, viewport: DrumViewportState) =>
    | { kind: 'marker'; markerIndex: number }
    | { kind: 'step'; laneId: DrumVoiceId; step: number }
    | null;
}) {
  const applyDrumGridMarkerFromMouse = (nativeEvent: MouseEvent | ReactMouseEvent<HTMLCanvasElement>, markerIndex: number) => {
    const canvas = args.drumComputerRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const geometry = getDrumCanvasGeometry(canvas, args.visibleDrumComputer, args.safeDrumViewport);
    const scaledX = (nativeEvent.clientX - rect.left) * (geometry.width / Math.max(1, rect.width));
    const globalRatio = drumCanvasXToGlobalRatio(geometry, Math.max(geometry.labelW, Math.min(geometry.width, scaledX)));
    const barFloat = globalRatio * Math.max(1, args.visibleDrumComputer.bars);
    const localRatio = barFloat - Math.floor(barFloat);
    args.setDrumComputer((state) => {
      const activeState = state.useCustom ? state : args.visibleDrumComputer;
      const markers = sanitizeDrumSegmentMarkers(activeState.segmentMarkers, activeState.segmentsPerBar);
      if (Math.abs((markers[markerIndex] ?? 0) - localRatio) < 0.0004) return state;
      return applyDrumMarkerRatioToState(state, args.visibleDrumComputer, args.grooveMachine.drumPattern, markerIndex, localRatio);
    });
  };

  const applyDrumStepValue = (laneId: DrumVoiceId, step: number, value: number) => {
    args.setDrumComputer((state) => applyDrumStepValueToState(state, args.visibleDrumComputer, args.grooveMachine.drumPattern, laneId, step, value));
  };

  const showPresetDrumPattern = (pattern: string) => {
    applyPresetDrumPatternAction({
      pattern,
      barsInterpretation: args.grooveMachine.barsInterpretation,
      setGrooveMachine: args.setGrooveMachine,
      setDrumComputer: args.setDrumComputer,
    });
  };

  const handleDrumBarsChange = (bars: number) => {
    applyDrumBarsChangeAction({
      bars,
      fallbackBars: args.grooveMachine.barsInterpretation,
      drumPattern: args.grooveMachine.drumPattern,
      setGrooveMachine: args.setGrooveMachine,
      setDrumComputer: args.setDrumComputer,
    });
  };

  const handleDrumSegmentsChange = (segmentsPerBar: number) => {
    applyDrumSegmentsChangeAction({
      segmentsPerBar,
      fallbackSegmentsPerBar: args.drumComputer.segmentsPerBar,
      visibleDrumComputer: args.visibleDrumComputer,
      drumPattern: args.grooveMachine.drumPattern,
      barsInterpretation: args.grooveMachine.barsInterpretation,
      setDrumComputer: args.setDrumComputer,
      setDrumViewport: args.setDrumViewport,
    });
  };

  const resetDrumComputerToPreset = () => {
    args.drumPointerRef.current = null;
    args.setDrumMarkerDragIndex(null);
    resetDrumComputerToPresetAction({
      drumPattern: args.grooveMachine.drumPattern,
      barsInterpretation: args.grooveMachine.barsInterpretation,
      segmentsPerBar: args.drumComputer.segmentsPerBar,
      setDrumComputer: args.setDrumComputer,
      setStatus: args.setStatus,
    });
  };

  const startDrumNavigatorDrag = (mode: 'pan' | 'start' | 'end', clientX: number) => {
    args.drumNavDragRef.current = { mode, startClientX: clientX, startViewport: args.safeDrumViewport };
  };

  const randomizeDrumComputer = () => {
    randomizeDrumComputerAction({
      visibleDrumComputer: args.visibleDrumComputer,
      drumPattern: args.grooveMachine.drumPattern,
      barsInterpretation: args.grooveMachine.barsInterpretation,
      setDrumComputer: args.setDrumComputer,
      setStatus: args.setStatus,
    });
  };

  const clearDrumComputer = () => {
    clearDrumComputerAction({
      drumPattern: args.grooveMachine.drumPattern,
      barsInterpretation: args.grooveMachine.barsInterpretation,
      setDrumComputer: args.setDrumComputer,
      setStatus: args.setStatus,
    });
  };

  const exportDrumComputerToXensonar = async () => {
    await exportDrumComputerToXensonarAction({
      visibleDrumComputer: args.visibleDrumComputer,
      drumPattern: args.grooveMachine.drumPattern,
      drumKit: args.grooveMachine.drumKit,
      materialName: args.materialExportName,
      drumLaneKitOverrides: args.grooveMachine.drumLaneKitOverrides,
      drumLaneSettings: args.grooveMachine.drumLaneSettings as any,
      setStatus: args.setStatus,
    });
  };

  const handleDrumComputerDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = args.drumComputerRef.current;
    if (!canvas) return;
    const hit = args.hitDrumComputerCanvas(canvas, event, args.visibleDrumComputer, args.safeDrumViewport);
    if (!hit) return;
    event.preventDefault();
    if (hit.kind === 'marker') {
      args.drumPointerRef.current = { mode: 'marker', markerIndex: hit.markerIndex, startClientX: event.clientX, moved: false };
      args.setDrumMarkerDragIndex(hit.markerIndex);
      return;
    }
    args.setSelectedDrumLaneId(hit.laneId);
    const currentValue = args.visibleDrumComputer.laneSteps[hit.laneId]?.[hit.step] ?? 0;
    const nextValue = cycleDrumCellValue(currentValue);
    args.drumPointerRef.current = { mode: 'paint', laneId: hit.laneId, value: nextValue, lastStep: hit.step };
    applyDrumStepValue(hit.laneId, hit.step, nextValue);
  };

  return {
    applyDrumGridMarkerFromMouse,
    applyDrumStepValue,
    showPresetDrumPattern,
    handleDrumBarsChange,
    handleDrumSegmentsChange,
    resetDrumComputerToPreset,
    startDrumNavigatorDrag,
    randomizeDrumComputer,
    clearDrumComputer,
    exportDrumComputerToXensonar,
    handleDrumComputerDown,
  };
}
