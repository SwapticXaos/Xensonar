import type { AudioSourceAsset } from '../../audio/AudioImporterTypes';
import type { SpectralData } from '../../audio/SpectralData';
import type { ToolSettings, ToolType } from '../../state/storeTypes';
import { TOOL_EFFECT_DOMAIN } from '../../tools/toolDomains';

export type SpectralCanvasForge3PaintField = {
  applySteinmetz: (
    spectralData: SpectralData,
    x: number,
    y: number,
    radius: number,
    intensity: number,
    eraseMode: boolean,
    grainSize: number,
  ) => void;
  applySourceTraceMetadata: (
    spectralData: SpectralData,
    sourceAsset: AudioSourceAsset,
    x: number,
    y: number,
    radius: number,
    intensity: number,
    hardness: number,
    eraseMode: boolean,
  ) => void;
};

export function applySpectralCanvasPaintStroke(args: {
  activeTool: ToolType;
  spectralData: SpectralData;
  settings: ToolSettings;
  forge3Mode: boolean;
  bodyLinkedMode: boolean;
  sourceAsset: AudioSourceAsset | null;
  forge3Field: SpectralCanvasForge3PaintField;
  syncForge3Region: (
    x: number,
    y: number,
    radius: number,
    mode?: 'reseed' | 'preserve',
  ) => void;
  x: number;
  y: number;
}) {
  // This contract remains documentation as well as a future dispatch seam:
  // ordinary tools touch the workbench; selected Forge-3 tools also mutate body/source metadata.
  const _toolEffectDomain = TOOL_EFFECT_DOMAIN[args.activeTool] ?? 'workbench_only';
  void _toolEffectDomain;

  const {
    brushSize,
    intensity,
    hardness,
    numHarmonics,
    harmonicDecay,
    sprayDensity,
    eraseMode,
    grainSize,
  } = args.settings;
  const { spectralData, x, y } = args;

  switch (args.activeTool) {
    case 'brush':
      spectralData.applyBrush(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'hardBrush':
      if (args.forge3Mode && args.bodyLinkedMode) {
        args.forge3Field.applySteinmetz(spectralData, x, y, brushSize, intensity, eraseMode, grainSize);
      } else {
        spectralData.applyBrush(x, y, brushSize, intensity, 1.0, eraseMode, grainSize);
      }
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'harmonicBrush':
      spectralData.applyHarmonicBrush(x, y, brushSize, intensity, hardness, numHarmonics, harmonicDecay, spectralData.height, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'noiseBrush':
      spectralData.applyNoiseBrush(x, y, brushSize, intensity, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'spray':
      spectralData.applySpray(x, y, brushSize, intensity, sprayDensity, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'smudge':
      spectralData.applySmudge(x, y, brushSize, intensity, 0, 0, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'dodgeBurn':
      spectralData.applyDodgeBurn(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'blurSharpen':
      spectralData.applyBlurSharpen(x, y, brushSize, intensity, hardness, eraseMode);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'delaySmear':
      spectralData.applyDelaySmear(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'threshold':
      spectralData.applyThresholdBrush(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    case 'sourceTrace': {
      const analysis = args.sourceAsset?.analysisCache;
      if (analysis) {
        spectralData.applySourceTrace(x, y, brushSize, intensity, hardness, analysis.data, analysis.width, analysis.height, analysis.transientEnvelope, eraseMode, grainSize);
        if (args.forge3Mode && args.bodyLinkedMode && args.sourceAsset) {
          args.forge3Field.applySourceTraceMetadata(spectralData, args.sourceAsset, x, y, brushSize, intensity, hardness, eraseMode);
        }
      }
      args.syncForge3Region(
        x,
        y,
        brushSize,
        args.forge3Mode && args.bodyLinkedMode && args.sourceAsset ? 'preserve' : 'reseed',
      );
      break;
    }
    case 'formant':
      spectralData.applyFormantStamp(x, y, args.settings.formantVowel, intensity, spectralData.height, brushSize, eraseMode, grainSize);
      args.syncForge3Region(x, y, brushSize);
      break;
    default:
      break;
  }
}
