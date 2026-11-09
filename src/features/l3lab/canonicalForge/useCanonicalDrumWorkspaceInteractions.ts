import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { clamp01, type DrumComputerState, type DrumViewportState } from './loopDrumDomain';
import {
  hitDrumComputerCanvas,
  panDrumViewport,
  sanitizeDrumViewport,
  setDrumViewportEnd,
  setDrumViewportStart,
  zoomDrumViewport,
} from './viewportMath';
import type { DrumNavigatorDragState, DrumPointerState } from './canonicalDrumWorkspaceController';

export function useCanonicalDrumWorkspaceInteractions(args: {
  drumComputerRef: RefObject<HTMLCanvasElement | null>;
  drumViewportWrapperRef: RefObject<HTMLDivElement | null>;
  drumNavigatorRef: RefObject<HTMLDivElement | null>;
  drumPointerRef: MutableRefObject<DrumPointerState | null>;
  drumNavDragRef: MutableRefObject<DrumNavigatorDragState | null>;
  visibleDrumComputer: DrumComputerState;
  safeDrumViewport: DrumViewportState;
  setDrumMarkerDragIndex: (value: number | null) => void;
  applyDrumGridMarkerFromMouse: (event: MouseEvent, markerIndex: number) => void;
  applyDrumStepValue: (laneId: any, step: number, value: number) => void;
  setDrumViewport: Dispatch<SetStateAction<DrumViewportState>>;
}) {
  useEffect(() => {
    const handleMouseUp = () => {
      args.drumPointerRef.current = null;
      args.setDrumMarkerDragIndex(null);
    };
    const handleMouseMove = (event: MouseEvent) => {
      const active = args.drumPointerRef.current;
      if (!active) return;
      const canvas = args.drumComputerRef.current;
      if (!canvas) return;
      if (active.mode === 'marker') {
        if (!active.moved && Math.abs(event.clientX - active.startClientX) < 4) return;
        active.moved = true;
        args.applyDrumGridMarkerFromMouse(event, active.markerIndex);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) return;
      const synthetic = { clientX: event.clientX, clientY: event.clientY };
      const hit = hitDrumComputerCanvas(canvas, synthetic, args.visibleDrumComputer, args.safeDrumViewport);
      if (!hit || hit.kind !== 'step' || hit.laneId !== active.laneId || hit.step === active.lastStep) return;
      active.lastStep = hit.step;
      args.applyDrumStepValue(hit.laneId, hit.step, active.value);
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [args.drumComputerRef, args.drumPointerRef, args.visibleDrumComputer, args.safeDrumViewport, args.setDrumMarkerDragIndex, args.applyDrumGridMarkerFromMouse, args.applyDrumStepValue]);

  useEffect(() => {
    const node = args.drumViewportWrapperRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      const rect = node.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      event.preventDefault();
      const anchorRatio = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
      const globalAnchor = args.safeDrumViewport.startRatio + anchorRatio * (args.safeDrumViewport.endRatio - args.safeDrumViewport.startRatio);
      const isPan = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15;
      if (isPan) {
        const deltaPx = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        args.setDrumViewport((state) => {
          const safeState = sanitizeDrumViewport(state, args.visibleDrumComputer.stepCount);
          const span = safeState.endRatio - safeState.startRatio;
          return panDrumViewport(safeState, (deltaPx / Math.max(1, rect.width)) * span, args.visibleDrumComputer.stepCount);
        });
        return;
      }
      const factor = event.deltaY > 0 ? 1.12 : 0.9;
      args.setDrumViewport((state) => zoomDrumViewport(state, factor, globalAnchor, args.visibleDrumComputer.stepCount));
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel as EventListener);
  }, [args.drumViewportWrapperRef, args.safeDrumViewport, args.visibleDrumComputer.stepCount, args.setDrumViewport]);

  useEffect(() => {
    const handleMouseUp = () => {
      args.drumNavDragRef.current = null;
    };
    const handleMouseMove = (event: MouseEvent) => {
      const active = args.drumNavDragRef.current;
      const nav = args.drumNavigatorRef.current;
      if (!active || !nav) return;
      const rect = nav.getBoundingClientRect();
      const deltaRatio = (event.clientX - active.startClientX) / Math.max(1, rect.width);
      if (active.mode === 'pan') {
        args.setDrumViewport(panDrumViewport(active.startViewport, deltaRatio, args.visibleDrumComputer.stepCount));
      } else if (active.mode === 'start') {
        args.setDrumViewport(setDrumViewportStart(active.startViewport, active.startViewport.startRatio + deltaRatio, args.visibleDrumComputer.stepCount));
      } else if (active.mode === 'end') {
        args.setDrumViewport(setDrumViewportEnd(active.startViewport, active.startViewport.endRatio + deltaRatio, args.visibleDrumComputer.stepCount));
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [args.drumNavDragRef, args.drumNavigatorRef, args.visibleDrumComputer.stepCount, args.setDrumViewport]);
}
