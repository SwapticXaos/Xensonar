import type { ToolProfiles, ToolSettings, ToolType } from './storeTypes';

function createBaseToolSettings(): ToolSettings {
  return {
    brushSize: 6,
    intensity: 0.4,
    hardness: 0.3,
    numHarmonics: 5,
    harmonicDecay: 0.6,
    formantVowel: 'a',
    sprayDensity: 0.3,
    eraseMode: false,
    grainSize: 0.5,
    morphMode: 'push',
  };
}

export function createDefaultToolSettings(tool: ToolType): ToolSettings {
  const base = createBaseToolSettings();
  switch (tool) {
    case 'harmonicBrush':
      return { ...base, brushSize: 2, intensity: 0.55, hardness: 0.45, numHarmonics: 5, harmonicDecay: 0.58 };
    case 'noiseBrush':
      return { ...base, brushSize: 10, intensity: 0.28, hardness: 0.2, grainSize: 0.18 };
    case 'spray':
      return { ...base, brushSize: 18, intensity: 0.3, sprayDensity: 0.3, grainSize: 0.32 };
    case 'formant':
      return { ...base, brushSize: 12, intensity: 0.45, formantVowel: 'a' };
    case 'stamp':
      return { ...base, brushSize: 24, intensity: 0.5 };
    case 'morph':
      return { ...base, brushSize: 70, intensity: 0.55, hardness: 0.2, grainSize: 0.5, morphMode: 'push' };
    case 'hardBrush':
      return { ...base, brushSize: 5, intensity: 0.48, hardness: 1 };
    case 'line':
      return { ...base, brushSize: 4, intensity: 0.42, hardness: 0.55 };
    case 'smudge':
      return { ...base, brushSize: 18, intensity: 0.45, hardness: 0.38, grainSize: 0.5 };
    case 'dodgeBurn':
      return { ...base, brushSize: 14, intensity: 0.32, hardness: 0.45, grainSize: 0.5 };
    case 'blurSharpen':
      return { ...base, brushSize: 16, intensity: 0.35, hardness: 0.4, grainSize: 0.5 };
    case 'delaySmear':
      return { ...base, brushSize: 12, intensity: 0.36, hardness: 0.42, grainSize: 0.55 };
    case 'threshold':
      return { ...base, brushSize: 18, intensity: 0.35, hardness: 0.65, grainSize: 0.5 };
    case 'sourceTrace':
      return { ...base, brushSize: 26, intensity: 0.42, hardness: 0.5, grainSize: 0.52 };
    case 'brush':
    default:
      return base;
  }
}

export function createDefaultToolProfiles(): ToolProfiles {
  return {
    brush: createDefaultToolSettings('brush'),
    hardBrush: createDefaultToolSettings('hardBrush'),
    line: createDefaultToolSettings('line'),
    harmonicBrush: createDefaultToolSettings('harmonicBrush'),
    noiseBrush: createDefaultToolSettings('noiseBrush'),
    spray: createDefaultToolSettings('spray'),
    formant: createDefaultToolSettings('formant'),
    stamp: createDefaultToolSettings('stamp'),
    morph: createDefaultToolSettings('morph'),
    smudge: createDefaultToolSettings('smudge'),
    dodgeBurn: createDefaultToolSettings('dodgeBurn'),
    blurSharpen: createDefaultToolSettings('blurSharpen'),
    delaySmear: createDefaultToolSettings('delaySmear'),
    threshold: createDefaultToolSettings('threshold'),
    sourceTrace: createDefaultToolSettings('sourceTrace'),
  };
}

export function mergeToolSettings(tool: ToolType, incoming?: Partial<ToolSettings> | null): ToolSettings {
  const defaults = createDefaultToolSettings(tool);
  return { ...defaults, ...(incoming ?? {}) };
}

export function hydrateToolProfiles(incoming?: Partial<Record<ToolType, Partial<ToolSettings>>> | null): ToolProfiles {
  const defaults = createDefaultToolProfiles();
  return {
    brush: mergeToolSettings('brush', incoming?.brush ?? defaults.brush),
    hardBrush: mergeToolSettings('hardBrush', incoming?.hardBrush ?? defaults.hardBrush),
    line: mergeToolSettings('line', incoming?.line ?? defaults.line),
    harmonicBrush: mergeToolSettings('harmonicBrush', incoming?.harmonicBrush ?? defaults.harmonicBrush),
    noiseBrush: mergeToolSettings('noiseBrush', incoming?.noiseBrush ?? defaults.noiseBrush),
    spray: mergeToolSettings('spray', incoming?.spray ?? defaults.spray),
    formant: mergeToolSettings('formant', incoming?.formant ?? defaults.formant),
    stamp: mergeToolSettings('stamp', incoming?.stamp ?? defaults.stamp),
    morph: mergeToolSettings('morph', incoming?.morph ?? defaults.morph),
    smudge: mergeToolSettings('smudge', incoming?.smudge ?? defaults.smudge),
    dodgeBurn: mergeToolSettings('dodgeBurn', incoming?.dodgeBurn ?? defaults.dodgeBurn),
    blurSharpen: mergeToolSettings('blurSharpen', incoming?.blurSharpen ?? defaults.blurSharpen),
    delaySmear: mergeToolSettings('delaySmear', incoming?.delaySmear ?? defaults.delaySmear),
    threshold: mergeToolSettings('threshold', incoming?.threshold ?? defaults.threshold),
    sourceTrace: mergeToolSettings('sourceTrace', incoming?.sourceTrace ?? defaults.sourceTrace),
  };
}

export function cloneToolProfiles(toolProfiles: ToolProfiles): ToolProfiles {
  return hydrateToolProfiles(toolProfiles);
}
