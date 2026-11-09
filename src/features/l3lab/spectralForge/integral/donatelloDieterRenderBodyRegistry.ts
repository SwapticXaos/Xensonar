import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import type { CarrierIntegralRenderSourceKind } from './carrierIntegralSendTargets';
import type { ActualizationRoute } from './virtualBodyActualizationTypes';

export const DONATELLO_DIETER_RENDER_BODY_REGISTRY_VERSION =
  'donatello-dieter-render-body-registry-6.9.0.17';

export type SpectralRenderBodyId = 'dieter-v2-rendered-material-body' | 'dieter-window-body' | 'donatello-formant-window-body';

export type SpectralRenderBodyPlayheadStartPolicy = 'after-rendered-audio-ready';

export type SpectralRenderBodyCachePolicy = {
  enabled: boolean;
  scope: 'material-body-preview';
  invalidatesOn: readonly string[];
};

export type SpectralRenderBodyDefinition = {
  id: SpectralRenderBodyId;
  machineId: CarrierIntegralMachineId;
  virtualRouteMachineId: ActualizationRoute;
  label: string;
  shortLabel: string;
  renderSource: CarrierIntegralRenderSourceKind;
  requiresAudibleRenderedBody: true;
  previewCachePolicy: SpectralRenderBodyCachePolicy;
  playheadStartPolicy: SpectralRenderBodyPlayheadStartPolicy;
  routingGuardrail: string;
  tonalContract: string;
};

export const DONATELLO_DIETER_RENDER_BODIES: readonly SpectralRenderBodyDefinition[] = [
  {
    id: 'dieter-v2-rendered-material-body',
    machineId: 'material-render-body',
    virtualRouteMachineId: 'dieter-v2',
    label: 'Dieter V2',
    shortLabel: 'Dieter V2',
    renderSource: 'root-follow-config-buffer',
    requiresAudibleRenderedBody: true,
    previewCachePolicy: {
      enabled: true,
      scope: 'material-body-preview',
      invalidatesOn: ['carrier-snapshot', 'synth-lab', 'target', 'bpm', 'pitch', 'volume'],
    },
    playheadStartPolicy: 'after-rendered-audio-ready',
    routingGuardrail:
      'Dieter V2 bleibt Materialkörper; kein stiller Alias.',
    tonalContract:
      'Neutral-Pigment/Embodiment-Fail-Open muss einen hörbaren, tonal verankerbaren Körper liefern; nicht bloß Rauschen.',
  },
  {
    id: 'dieter-window-body',
    machineId: 'dieter-window-body',
    virtualRouteMachineId: 'donatello',
    label: 'Dieter Fensterkörper',
    shortLabel: 'Dieter Fenster',
    renderSource: 'spectral-window-body-buffer',
    requiresAudibleRenderedBody: true,
    previewCachePolicy: {
      enabled: true,
      scope: 'material-body-preview',
      invalidatesOn: ['carrier-snapshot', 'spectral-window-plan', 'synth-lab', 'target', 'bpm', 'pitch', 'volume'],
    },
    playheadStartPolicy: 'after-rendered-audio-ready',
    routingGuardrail:
      'Dieter Fensterkörper bleibt ein kleiner SpectralWindow-Materialkörper; kein Pure-Dieter-Alias und kein Antonia/Bert/Cecilia-Note-Plan.',
    tonalContract:
      'Die Fensterkurven müssen hörbar bleiben, Loop-Kanten zirkulär glätten und Root-Follow-Tonalanziehung nur vorbereiten, nicht hart quantisieren.',
  },
  {
    id: 'donatello-formant-window-body',
    machineId: 'donatello-formant-window-body',
    virtualRouteMachineId: 'donatello',
    label: 'Donatello',
    shortLabel: 'Donatello',
    renderSource: 'donatello-formant-plan-buffer',
    requiresAudibleRenderedBody: true,
    previewCachePolicy: {
      enabled: true,
      scope: 'material-body-preview',
      invalidatesOn: ['carrier-snapshot', 'formant-plan', 'synth-lab', 'target', 'bpm', 'pitch', 'volume'],
    },
    playheadStartPolicy: 'after-rendered-audio-ready',
    routingGuardrail:
      'Donatello bleibt Formantkörper mit Root-Follow-Plananhang.',
    tonalContract:
      'Der Formantplan muss einen hörbaren tonalen Anker besitzen, damit spätere Synth-Timbre-Bearbeitung greifen kann.',
  },
] as const;

export function resolveDonatelloDieterRenderBody(
  machineId: CarrierIntegralMachineId,
): SpectralRenderBodyDefinition | null {
  return DONATELLO_DIETER_RENDER_BODIES.find((definition) => definition.machineId === machineId) ?? null;
}

export function isDonatelloDieterRenderBodyMachine(machineId: CarrierIntegralMachineId): boolean {
  return resolveDonatelloDieterRenderBody(machineId) !== null;
}

export function assertDonatelloDieterRenderBodyRegistryComplete() {
  const ids = new Set(DONATELLO_DIETER_RENDER_BODIES.map((body) => body.id));
  if (!ids.has('dieter-v2-rendered-material-body') || !ids.has('dieter-window-body') || !ids.has('donatello-formant-window-body')) {
    throw new Error('Donatello/Dieter render body registry is incomplete.');
  }
  for (const body of DONATELLO_DIETER_RENDER_BODIES) {
    if (body.playheadStartPolicy !== 'after-rendered-audio-ready') {
      throw new Error(`${body.label} must start playhead only after rendered audio is ready.`);
    }
    if (!body.previewCachePolicy.enabled) {
      throw new Error(`${body.label} must use the material-body preview cache.`);
    }
  }
}
