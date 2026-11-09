import * as React from 'react';
import type { ToolType, ViewPort } from '../../state/store';
import { frequencyToScreenY } from './spectralCanvasVisuals';

type Forge3Lens = 'body' | 'source' | 'hear';
type StampPhase = 'idle' | 'selecting' | 'stamping';

type HoverInfo = {
  freq: number;
  time: number;
  note: string;
};

export function SpectralCanvasHoverInfo({
  hoverInfo,
  forge3Hover,
  eraseMode,
}: {
  hoverInfo: HoverInfo | null;
  forge3Hover: string | null;
  eraseMode: boolean;
}) {
  if (!hoverInfo) return null;
  return (
    <div className="absolute bottom-1 right-1 bg-black/70 text-xs text-gray-300 px-2 py-1 rounded font-mono pointer-events-none">
      {hoverInfo.note} ({hoverInfo.freq} Hz) | {hoverInfo.time.toFixed(3)}s
      {forge3Hover && <span className="ml-2 text-emerald-300">{forge3Hover}</span>}
      {eraseMode && <span className="ml-2 text-red-400">⊖ RADIEREN</span>}
    </div>
  );
}

export function SpectralCanvasStatusBadges({
  isPlaying,
  playheadPosition,
  variant,
  forge3Lens,
}: {
  isPlaying: boolean;
  playheadPosition: number;
  variant: 'legacy' | 'forge3';
  forge3Lens: Forge3Lens;
}) {
  return (
    <>
      {isPlaying && (
        <div className="absolute top-2 right-3 bg-black/65 text-[10px] text-emerald-300 px-2 py-1 rounded pointer-events-none font-mono">
          Scan {Math.max(0, Math.min(100, playheadPosition * 100)).toFixed(1)}%
        </div>
      )}
      {variant === 'forge3' && (
        <div className="absolute top-2 right-3 translate-y-6 bg-black/65 text-[10px] text-cyan-200 px-2 py-1 rounded pointer-events-none font-mono">
          Linse: {forge3Lens === 'body' ? 'Körper' : forge3Lens === 'source' ? 'Quelle' : 'Hören'}
        </div>
      )}
    </>
  );
}

export function StampPhaseIndicator({
  activeTool,
  stampPhase,
  stampScaleX,
  stampScaleY,
}: {
  activeTool: ToolType;
  stampPhase: StampPhase;
  stampScaleX: number;
  stampScaleY: number;
}) {
  if (activeTool !== 'stamp') return null;
  return (
    <div className="absolute top-2 left-14 bg-black/80 text-xs text-cyan-300 px-3 py-1.5 rounded pointer-events-none">
      {stampPhase === 'idle' && '📋 Ziehe ein Rechteck um den gewünschten Bereich'}
      {stampPhase === 'selecting' && '📋 Bereich auswählen... (loslassen zum Bestätigen)'}
      {stampPhase === 'stamping' && `📋 Klick = Stempeln | Scroll = Uniform Scale | Pfeiltasten = Stretch | X:${(stampScaleX * 100).toFixed(0)}% Y:${(stampScaleY * 100).toFixed(0)}%`}
    </div>
  );
}

export function SpectralFrequencyLabels({
  spectralHeight,
  viewPort,
  canvasHeight,
}: {
  spectralHeight: number;
  viewPort: Pick<ViewPort, 'offsetY' | 'zoomY'>;
  canvasHeight: number | undefined;
}) {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none flex flex-col justify-between py-1">
      {[20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20].map(f => {
        const dataY = frequencyToScreenY(f, spectralHeight);
        const sy = (dataY - viewPort.offsetY) * viewPort.zoomY;
        if (!canvasHeight || sy < 0 || sy > canvasHeight) return null;
        return (
          <div
            key={f}
            className="absolute text-[9px] text-gray-500 font-mono"
            style={{ top: sy, left: 2 }}
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </div>
        );
      })}
      <div className="absolute left-1 bottom-1 max-w-11 leading-[9px] text-[8px] text-gray-500 font-mono">Bild-Hz<br />A/B/C root-rel.</div>
    </div>
  );
}

export function SpectralNavigatorBar({
  overviewWrapRef,
  overviewCanvasRef,
  viewPort,
  onNavigatorMouseDown,
}: {
  overviewWrapRef: React.RefObject<HTMLDivElement | null>;
  overviewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewPort: Pick<ViewPort, 'zoomX'>;
  onNavigatorMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="z-10 border-t border-gray-800 bg-gray-950 px-3 py-2 shadow-[0_-10px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-1.5">
        <span className="text-cyan-300 font-semibold">Navigator</span>
        <span>Ziehen = verschieben</span>
        <span>Ränder ziehen = Zeit-Zoom</span>
        <span className="ml-auto font-mono text-gray-400">X {viewPort.zoomX.toFixed(1)}x</span>
      </div>
      <div
        ref={overviewWrapRef}
        className="relative h-14 rounded-md overflow-hidden border border-gray-800 bg-black cursor-ew-resize"
        onMouseDown={onNavigatorMouseDown}
      >
        <canvas
          ref={overviewCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
}
