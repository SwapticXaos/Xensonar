import type { SpectralData } from '../../audio/SpectralData';
import {
  consumeSpectralForgePreviewDirtyRegions,
  markSpectralForgePreviewDirtyCircle,
  markSpectralForgePreviewDirtyRegion,
} from '../../audio/spectralPreviewDirtyRegion';
import type { ToolType } from '../../state/storeTypes';

export type SpectralCanvasDirtyEdit = {
  x?: number;
  y?: number;
  radius?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  reason?: string;
};

export type SpectralCanvasEditCommitPorts = {
  invalidateAudioBuffer: () => void;
  setAudioBufferDirty: (dirty: boolean) => void;
  triggerRender: () => void;
};

export function commitSpectralCanvasAudioEdit(args: {
  spectralData: SpectralData;
  activeTool: ToolType;
  defaultBrushSize: number;
  dirty?: SpectralCanvasDirtyEdit;
  ports: SpectralCanvasEditCommitPorts;
}) {
  args.ports.invalidateAudioBuffer();
  args.ports.setAudioBufferDirty(true);

  const dirty = args.dirty;
  if (dirty) {
    const reason = dirty.reason ?? `spectral-forge-${args.activeTool}-edit`;
    if (typeof dirty.x === 'number' && typeof dirty.y === 'number') {
      markSpectralForgePreviewDirtyCircle({
        spectralData: args.spectralData,
        x: dirty.x,
        y: dirty.y,
        radius: Math.max(1, dirty.radius ?? args.defaultBrushSize ?? 1),
        reason,
      });
    } else if (
      typeof dirty.x0 === 'number' &&
      typeof dirty.x1 === 'number' &&
      typeof dirty.y0 === 'number' &&
      typeof dirty.y1 === 'number'
    ) {
      markSpectralForgePreviewDirtyRegion({
        spectralData: args.spectralData,
        x0: dirty.x0,
        x1: dirty.x1,
        y0: dirty.y0,
        y1: dirty.y1,
        reason,
      });
    }
  }

  // Structural seed for later partial rendering. Current render remains whole-buffer.
  void consumeSpectralForgePreviewDirtyRegions();
  args.ports.triggerRender();
}
