import type { Forge3EditTarget, ToolSettings, ToolType } from '../../state/store';
import { TOOL_EFFECT_DOMAIN, type ToolEffectDomain } from '../../tools/toolDomains';

export type ToolLabelContext = Pick<ToolSettings, 'eraseMode'>;

export type ToolDisplayDomainContext = {
  activeTool: ToolType;
  forge3EditTarget: Forge3EditTarget;
};

export type ToolHelpContext = Pick<ToolSettings, 'eraseMode'> & {
  activeTool: ToolType;
};

export type MorphModeOption = {
  id: ToolSettings['morphMode'];
  label: string;
};

const BRUSH_HARDNESS_TOOLS = new Set<ToolType>([
  'brush',
  'harmonicBrush',
  'line',
  'noiseBrush',
  'smudge',
  'dodgeBurn',
  'blurSharpen',
  'delaySmear',
  'threshold',
  'sourceTrace',
]);

export const MORPH_MODE_OPTIONS: MorphModeOption[] = [
  { id: 'push', label: 'Verziehen' },
  { id: 'bloat', label: 'Woelben' },
  { id: 'pinch', label: 'Schrumpfen' },
  { id: 'twirlCW', label: 'Kreisel ↻' },
  { id: 'twirlCCW', label: 'Kreisel ↺' },
];

export function resolveToolLabel(activeTool: ToolType, context: ToolLabelContext): string {
  const toolLabel: Record<ToolType, string> = {
    brush: '🖌️ Soft Brush',
    hardBrush: '✏️ Hard Brush',
    line: '📐 Linien-Tool',
    harmonicBrush: '🎵 Harmonic Brush',
    noiseBrush: '🌊 Noise Brush',
    spray: '💨 Spray',
    formant: '🗣️ Formant',
    stamp: '📋 Stempel',
    morph: '🌀 Verformen',
    smudge: '🫟 Wischfinger',
    dodgeBurn: context.eraseMode ? '🌘 Abdunkeln' : '☀️ Nachbelichten',
    blurSharpen: context.eraseMode ? '🪞 Schärfen' : '🪞 Weichzeichnen',
    delaySmear: '⟿ Delay Smear',
    threshold: context.eraseMode ? '🚪 Threshold öffnen' : '🚪 Threshold gate',
    sourceTrace: '🧬 Quellspur / Source Trace',
  };
  return toolLabel[activeTool] ?? activeTool;
}

export function shouldShowBrushHardness(activeTool: ToolType): boolean {
  return BRUSH_HARDNESS_TOOLS.has(activeTool);
}

export function resolveDisplayToolDomain(context: ToolDisplayDomainContext): ToolEffectDomain {
  const toolDomain = TOOL_EFFECT_DOMAIN[context.activeTool] ?? 'workbench_only';
  return toolDomain === 'workbench_plus_body' && context.forge3EditTarget === 'workbench'
    ? 'workbench_only'
    : toolDomain;
}

export function resolveToolDomain(activeTool: ToolType): ToolEffectDomain {
  return TOOL_EFFECT_DOMAIN[activeTool] ?? 'workbench_only';
}

export function resolveGrainLabel(grainSize: number): string {
  if (grainSize < 0.2) return 'Noisy';
  if (grainSize < 0.4) return 'Gritty';
  if (grainSize < 0.6) return 'Neutral';
  if (grainSize < 0.8) return 'Smooth';
  return 'Tonal';
}

export function resolveSpecialToolHelp(context: ToolHelpContext): string | null {
  switch (context.activeTool) {
    case 'smudge':
      return 'Intensität = Schub, Härte = Kantenhalt';
    case 'dodgeBurn':
      return context.eraseMode
        ? 'Erase = Abdunkeln · Intensität = Druck'
        : 'Normal = Nachbelichten · Intensität = Druck';
    case 'blurSharpen':
      return context.eraseMode
        ? 'Erase = Schärfen · Härte = Detailschutz'
        : 'Normal = Blur · Härte = Detailschutz';
    case 'delaySmear':
      return 'Intensität = Repeat-Level, Härte = Spurtreue';
    case 'threshold':
      return context.eraseMode
        ? 'Erase = Material unterhalb des Gates wieder anheben'
        : 'Normal = leises Material lokal wegschneiden';
    case 'sourceTrace':
      return context.eraseMode
        ? 'Erase = Spur der Quelle lokal aus dem Bild herausdünnen'
        : 'Originales Audiospektrum als hochaufgelöste Spur in die Fläche ziehen';
    default:
      return null;
  }
}
