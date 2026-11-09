import type { RootFollowBankEntryConfig } from '../../../xensonar/rootFollow/rootFollowTypes';
import type { DonatelloFormantRenderPlan } from './donatelloFormantTypes';

export const CARRIER_INTEGRAL_DONATELLO_FORMANT_BODY_MODEL_VERSION =
  'carrier-integral-donatello-formant-body-model-3.2.91.6.9.188';

export type CarrierIntegralDonatelloFormantBodyModel = {
  version: typeof CARRIER_INTEGRAL_DONATELLO_FORMANT_BODY_MODEL_VERSION;
  machineId: 'donatello-formant-window-body';
  bodyKind: 'formant-window-body';
  bodyFamily: 'donatello-formant-body';
  sourceKind: 'donatello-formant-plan';
  previewFamily: 'donatello-formant-plan-buffer';
  rootFollowFallback: 'material-flowing-formant-plan-attachment';
  requiresFormantPlan: true;
  requiresMaterialBody: true;
  renderReady: true;
  liveFormantRendererReady: false;
  rootReferenceHz: number;
  durationBeats: number;
  bandCount: number;
  curveResolution: number;
  automationCurveCount: number;
  textureEnergy: number;
  transientEnergy: number;
  rootFollowAttachment: {
    hasFormantPlan: boolean;
    sourceKind: RootFollowBankEntryConfig['sourceKind'];
    renderMode: RootFollowBankEntryConfig['renderMode'];
    bandCount: number;
    curveResolution: number;
  } | null;
};

export function buildCarrierIntegralDonatelloFormantBodyModel(args: {
  plan: DonatelloFormantRenderPlan;
  rootFollowAttachment?: CarrierIntegralDonatelloFormantBodyModel['rootFollowAttachment'];
}): CarrierIntegralDonatelloFormantBodyModel {
  return {
    version: CARRIER_INTEGRAL_DONATELLO_FORMANT_BODY_MODEL_VERSION,
    machineId: 'donatello-formant-window-body',
    bodyKind: 'formant-window-body',
    bodyFamily: 'donatello-formant-body',
    sourceKind: 'donatello-formant-plan',
    previewFamily: 'donatello-formant-plan-buffer',
    rootFollowFallback: 'material-flowing-formant-plan-attachment',
    requiresFormantPlan: true,
    requiresMaterialBody: true,
    renderReady: true,
    liveFormantRendererReady: false,
    rootReferenceHz: Math.max(1, args.plan.rootReferenceHz || 110),
    durationBeats: Math.max(0.125, args.plan.durationBeats || 4),
    bandCount: args.plan.bands.length,
    curveResolution: args.plan.curveResolution,
    automationCurveCount: args.plan.summary.estimatedAutomationCurves,
    textureEnergy: args.plan.summary.textureEnergy,
    transientEnergy: args.plan.summary.transientEnergy,
    rootFollowAttachment: args.rootFollowAttachment ?? null,
  };
}

export function describeCarrierIntegralDonatelloFormantBodyModel(
  model: CarrierIntegralDonatelloFormantBodyModel,
): string {
  return `${model.bandCount} Formantbänder, ${model.automationCurveCount} Kurven; Root Follow erhält Materialkörper plus Formantplan-Anhang (${model.rootFollowAttachment?.bandCount ?? model.bandCount} Bänder), aber noch keinen Live-Supernote-Renderer.`;
}

export function assertCarrierIntegralDonatelloFormantBodyModel(
  model: CarrierIntegralDonatelloFormantBodyModel,
): void {
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };
  require(model.machineId === 'donatello-formant-window-body', 'Donatello model must stay bound to Donatello machine.');
  require(model.bodyKind === 'formant-window-body', 'Donatello model must stay formant-window-body.');
  require(model.sourceKind === 'donatello-formant-plan', 'Donatello model must use a formant plan source.');
  require(model.requiresFormantPlan === true, 'Donatello model must require a formant plan.');
  require(model.liveFormantRendererReady === false, 'Donatello live formant renderer must not be claimed ready here.');
}
