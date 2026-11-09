import type { ComponentProps, MutableRefObject, MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { ResonanceStagePanel } from './ResonanceStagePanel';
import { reportXensonarPromiseFailure } from '../diagnostics/runtimeIssueReporter';
import type { SharedFieldController } from '../family/refactor/sharedFieldController';

function getCanvasPoint(event: ReactMouseEvent<HTMLCanvasElement>, gameWidth: number, gameHeight: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = gameWidth / rect.width;
  const scaleY = gameHeight / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

type VisibleGridLine = {
  freq: number;
  stepIndex?: number;
};

type BuildResonanceStagePanelPropsArgs = {
  nexusActive: boolean;
  resonanceInputIndicator: boolean;
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  gameWidth: number;
  gameHeight: number;
  installationSharedFieldActive: boolean;
  installationSharedFieldController: SharedFieldController | null;
  ensureAudioReady: () => Promise<AudioContext>;
  prewarmAudioRuntime: (ctx: AudioContext) => Promise<void> | void;
  resetResonanceTransientState: () => void;
  setNexusActive: (value: boolean) => void;
  updateNParams: (patch: Record<string, unknown>) => void;
  nexusParamsRef: MutableRefObject<{ echoOn: boolean; manualGridStepOffsets: number[] }>;
  audioCtx: AudioContext | null;
  updateFocusCursor: (x: number, y: number, source?: 'mouse' | 'keyboard' | 'arrow' | 'grid' | 'auto') => void;
  activeGridDragStepRef: MutableRefObject<number | null>;
  activeGridDragStartYRef: MutableRefObject<number | null>;
  activeGridDragBaseOffsetRef: MutableRefObject<number>;
  activeGridDragMovedRef: MutableRefObject<boolean>;
  getVisibleGridLines: () => VisibleGridLine[];
  yFromFreq: (freq: number) => number;
  setManualGridStepOffset: (stepIndex: number, offset: number) => void;
  nexusRefs: MutableRefObject<{ cursorX: number; cursorY: number; nextAbsoluteStep: number | null }>;
  commitResonanceCursorY: (rawY: number, options?: { primeSource?: 'resonance' | 'topology' | 'wave' | 'toggle' | 'auto'; syncHud?: boolean; previewWave?: boolean; refreshKeyboardWindow?: boolean }) => void;
  toggleManualGridStepMute: (stepIndex: number) => void;
  spawnNexusRipple: () => void;
  setPlayfieldCursorInside: (inside: boolean) => void;
};

export function buildResonanceStagePanelProps(args: BuildResonanceStagePanelPropsArgs): ComponentProps<typeof ResonanceStagePanel> {
  return {
    nexusActive: args.nexusActive,
    resonanceInputIndicator: args.resonanceInputIndicator,
    nexusCanvasRef: args.nexusCanvasRef,
    gameWidth: args.gameWidth,
    gameHeight: args.gameHeight,
    installationSharedFieldActive: args.installationSharedFieldActive,
    installationSharedFieldController: args.installationSharedFieldController,
    onTogglePower: async () => {
      if (!args.nexusActive) {
        const ctx = await args.ensureAudioReady();
        args.resetResonanceTransientState();
        await args.prewarmAudioRuntime(ctx);
        args.setNexusActive(true);
        return;
      }
      args.resetResonanceTransientState();
      args.setNexusActive(false);
    },
    onCanvasContextMenu: (event) => {
      event.preventDefault();
      args.updateNParams({ echoOn: !args.nexusParamsRef.current.echoOn });
    },
    onCanvasMouseMove: (event) => {
      args.setPlayfieldCursorInside(true);
      if (args.audioCtx && args.audioCtx.state !== 'running') {
        void args.audioCtx.resume();
      }
      const { x: rawX, y: rawY } = getCanvasPoint(event, args.gameWidth, args.gameHeight);
      args.updateFocusCursor(rawX, rawY, 'mouse');

      if (args.activeGridDragStepRef.current !== null && args.activeGridDragStartYRef.current !== null) {
        args.activeGridDragMovedRef.current = true;
        const deltaY = rawY - args.activeGridDragStartYRef.current;
        const offsetDelta = -deltaY / 25;
        args.setManualGridStepOffset(
          args.activeGridDragStepRef.current,
          args.activeGridDragBaseOffsetRef.current + offsetDelta,
        );
        return;
      }

      args.nexusRefs.current.cursorX = rawX;
      args.commitResonanceCursorY(rawY, { primeSource: 'resonance' });
    },
    onCanvasMouseDown: (event) => {
      args.setPlayfieldCursorInside(true);
      if (event.button !== 0) return;
      event.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur();
      const { x: clickX, y: clickY } = getCanvasPoint(event, args.gameWidth, args.gameHeight);
      args.updateFocusCursor(clickX, clickY, 'mouse');

      if (clickX < 30) {
        const clickedLine = args.getVisibleGridLines().find((line) => Math.abs(args.yFromFreq(line.freq) - clickY) < 12);
        if (clickedLine?.stepIndex !== undefined) {
          args.activeGridDragStepRef.current = clickedLine.stepIndex;
          args.activeGridDragStartYRef.current = clickY;
          args.activeGridDragBaseOffsetRef.current = args.nexusParamsRef.current.manualGridStepOffsets[clickedLine.stepIndex] ?? 0;
          args.activeGridDragMovedRef.current = false;
          return;
        }
      }

      void args.ensureAudioReady()
        .then(() => {
          args.spawnNexusRipple();
        })
        .catch((error) => reportXensonarPromiseFailure('audio', 'stage-canvas-ripple-audio-ready', error));
    },
    onCanvasMouseUp: () => {
      if (args.activeGridDragStepRef.current !== null) {
        if (!args.activeGridDragMovedRef.current) {
          args.toggleManualGridStepMute(args.activeGridDragStepRef.current);
        }
        args.activeGridDragStepRef.current = null;
      }
    },
    onCanvasMouseLeave: () => {
      args.setPlayfieldCursorInside(false);
      args.activeGridDragStepRef.current = null;
    },
  };
}
