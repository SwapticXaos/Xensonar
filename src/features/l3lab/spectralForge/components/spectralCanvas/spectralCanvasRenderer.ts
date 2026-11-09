import type { SpectralData } from '../../audio/SpectralData';
import type { ViewPort } from '../../state/storeTypes';
import { grainToTint } from './spectralCanvasVisuals';

export type SpectralCanvasForge3RenderField = {
  width: number;
  height: number;
  sourceWeight: Float32Array;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
};

export function renderSpectralCanvasFrame(args: {
  canvas: HTMLCanvasElement;
  spectralData: SpectralData;
  viewPort: ViewPort;
  colorLut: Uint8Array;
  showGrain: boolean;
  variant: 'legacy' | 'forge3';
  forge3Lens: 'body' | 'source' | 'hear';
  forge3Field: SpectralCanvasForge3RenderField;
  activeVisibilityMask: Float32Array | null;
  traceVisibilityMask: Float32Array | null;
  showTraceLayer: boolean;
}) {
  const ctx = args.canvas.getContext('2d');
  if (!ctx) return;

  const cw = args.canvas.width;
  const ch = args.canvas.height;
  const imageData = ctx.createImageData(cw, ch);
  const pixels = imageData.data;
  const { offsetX, offsetY, zoomX, zoomY } = args.viewPort;
  const lut = args.colorLut;

  for (let sy = 0; sy < ch; sy++) {
    const dataY = Math.floor(sy / zoomY + offsetY);
    for (let sx = 0; sx < cw; sx++) {
      const dataX = Math.floor(sx / zoomX + offsetX);
      const amp = args.spectralData.get(dataX, dataY);

      const lutIdx = Math.round(amp * 255) * 3;
      const pIdx = (sy * cw + sx) * 4;

      let finalR: number;
      let finalG: number;
      let finalB: number;

      if (args.showGrain && amp > 0.01) {
        const grain = args.spectralData.getGrain(dataX, dataY);
        const [tr, tg, tb] = grainToTint(grain);
        const baseR = lut[lutIdx];
        const baseG = lut[lutIdx + 1];
        const baseB = lut[lutIdx + 2];
        const blend = 0.4;
        finalR = Math.round(baseR * (1 - blend) + tr * blend);
        finalG = Math.round(baseG * (1 - blend) + tg * blend);
        finalB = Math.round(baseB * (1 - blend) + tb * blend);
      } else {
        finalR = lut[lutIdx];
        finalG = lut[lutIdx + 1];
        finalB = lut[lutIdx + 2];
      }

      if (
        args.variant === 'forge3' &&
        args.forge3Lens !== 'hear' &&
        dataX >= 0 &&
        dataX < args.forge3Field.width &&
        dataY >= 0 &&
        dataY < args.forge3Field.height
      ) {
        const idx = dataY * args.forge3Field.width + dataX;
        const sourceWeight = args.forge3Field.sourceWeight[idx] ?? 0;
        const sourceTime = args.forge3Field.sourceTime[idx] ?? 0;
        const sourceBand = args.forge3Field.sourceBand[idx] ?? 0;
        const body = args.forge3Field.bodyBias[idx] ?? 0;
        const air = args.forge3Field.airBias[idx] ?? 0;
        const impact = args.forge3Field.impactBias[idx] ?? 0;
        const trace = args.forge3Field.traceBias[idx] ?? 0;
        const activeStrength = args.activeVisibilityMask?.[idx] ?? 0;
        const traceStrength = args.traceVisibilityMask?.[idx] ?? 0;
        let tintR = finalR;
        let tintG = finalG;
        let tintB = finalB;
        let tintBlend = 0;

        if (activeStrength > 0.003) {
          if (args.forge3Lens === 'body') {
            let cls = 'body';
            let clsStrength = body;
            if (air > clsStrength) { cls = 'air'; clsStrength = air; }
            if (impact > clsStrength) { cls = 'impact'; clsStrength = impact; }
            if (trace > clsStrength) { cls = 'trace'; clsStrength = trace; }
            if (cls === 'body') { tintR = 250; tintG = 170; tintB = 80; }
            else if (cls === 'air') { tintR = 80; tintG = 220; tintB = 245; }
            else if (cls === 'impact') { tintR = 240; tintG = 110; tintB = 200; }
            else { tintR = 120; tintG = 245; tintB = 150; }
            tintBlend = Math.min(0.72, 0.15 + clsStrength * 0.45 + sourceWeight * 0.12);
          } else if (args.forge3Lens === 'source') {
            tintR = Math.round(40 + sourceTime * 215);
            tintG = Math.round(50 + sourceWeight * 205);
            tintB = Math.round(40 + (1 - sourceBand) * 150 + trace * 65);
            tintBlend = Math.min(0.7, 0.16 + sourceWeight * 0.34 + trace * 0.2);
          }
          finalR = Math.round(finalR * (1 - tintBlend) + tintR * tintBlend);
          finalG = Math.round(finalG * (1 - tintBlend) + tintG * tintBlend);
          finalB = Math.round(finalB * (1 - tintBlend) + tintB * tintBlend);
        } else if (args.showTraceLayer && traceStrength > 0.02) {
          if (args.forge3Lens === 'body') {
            let cls = 'body';
            let clsStrength = body;
            if (air > clsStrength) { cls = 'air'; clsStrength = air; }
            if (impact > clsStrength) { cls = 'impact'; clsStrength = impact; }
            if (trace > clsStrength) { cls = 'trace'; clsStrength = trace; }
            if (cls === 'body') { tintR = 176; tintG = 118; tintB = 60; }
            else if (cls === 'air') { tintR = 70; tintG = 160; tintB = 186; }
            else if (cls === 'impact') { tintR = 176; tintG = 92; tintB = 150; }
            else { tintR = 88; tintG = 176; tintB = 108; }
          } else if (args.forge3Lens === 'source') {
            tintR = Math.round(28 + sourceTime * 90);
            tintG = Math.round(34 + sourceWeight * 95);
            tintB = Math.round(28 + (1 - sourceBand) * 80 + trace * 30);
          }
          const traceBlend = Math.min(0.28, 0.06 + traceStrength * 0.22);
          finalR = Math.round(finalR * (1 - traceBlend) + tintR * traceBlend);
          finalG = Math.round(finalG * (1 - traceBlend) + tintG * traceBlend);
          finalB = Math.round(finalB * (1 - traceBlend) + tintB * traceBlend);
        }
      }

      pixels[pIdx] = finalR;
      pixels[pIdx + 1] = finalG;
      pixels[pIdx + 2] = finalB;
      pixels[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
