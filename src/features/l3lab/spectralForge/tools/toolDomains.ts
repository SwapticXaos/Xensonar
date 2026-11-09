export type ToolEffectDomain =
  | 'workbench_only'
  | 'workbench_plus_body'
  | 'lab_only';

export const TOOL_EFFECT_DOMAIN: Record<string, ToolEffectDomain> = {
  brush: 'workbench_only',
  erase: 'workbench_only',
  hardBrush: 'workbench_plus_body',
  line: 'workbench_only',
  harmonicBrush: 'workbench_only',
  noiseBrush: 'workbench_only',
  spray: 'workbench_only',
  formant: 'workbench_only',
  stamp: 'workbench_plus_body',
  morph: 'workbench_plus_body',
  smudge: 'workbench_only',
  dodgeBurn: 'workbench_only',
  blurSharpen: 'workbench_only',
  delaySmear: 'workbench_only',
  threshold: 'workbench_only',
  sourceTrace: 'workbench_plus_body',
};

export function toolDomainLabel(domain: ToolEffectDomain): string {
  switch (domain) {
    case 'workbench_plus_body':
      return 'Werkbank + Quelle';
    case 'lab_only':
      return 'Labor';
    case 'workbench_only':
    default:
      return 'Werkbank';
  }
}
