import type {
  RootFollowBankEntryConfig,
  RootFollowCarrierTimbreSnapshot,
  RootFollowFormantBandPlan,
  RootFollowFormantWindowPlan,
} from '../../../xensonar/rootFollow/rootFollowTypes';
import type { DonatelloFormantBandPlan, DonatelloFormantRenderPlan } from './donatelloFormantTypes';

function cloneCurve(curve: number[] | undefined | null): number[] {
  return Array.isArray(curve) ? curve.map((value) => Number.isFinite(value) ? Number(value) : 0) : [];
}

function toRootFollowFormantBand(band: DonatelloFormantBandPlan): RootFollowFormantBandPlan {
  return {
    id: band.id,
    role: band.role,
    centerRatioCurve: cloneCurve(band.centerRatioCurve),
    bandwidthRatioCurve: cloneCurve(band.bandwidthRatioCurve),
    gainCurve: cloneCurve(band.gainCurve),
    confidenceCurve: band.confidenceCurve ? cloneCurve(band.confidenceCurve) : undefined,
    roughnessCurve: band.roughnessCurve ? cloneCurve(band.roughnessCurve) : undefined,
  };
}

export function buildRootFollowFormantWindowPlanFromDonatello(plan: DonatelloFormantRenderPlan): RootFollowFormantWindowPlan {
  return {
    schemaVersion: 'root-follow-formant-window-plan-v1',
    sourceMachineId: plan.machineId,
    sourceSchemaVersion: plan.schemaVersion,
    curveResolution: plan.curveResolution,
    maxBands: plan.maxBands,
    rootReferenceHz: plan.rootReferenceHz,
    durationBeats: plan.durationBeats,
    bands: plan.bands.map(toRootFollowFormantBand),
    roughnessCurve: cloneCurve(plan.roughnessCurve),
    transientDustCurve: cloneCurve(plan.transientDustCurve),
    residualEnergyCurve: cloneCurve(plan.residualEnergyCurve),
    summary: { ...plan.summary },
  };
}

export function buildDonatelloMaterialRootFollowEntryConfig(args: {
  plan: DonatelloFormantRenderPlan;
  timbre?: RootFollowCarrierTimbreSnapshot | null;
}): RootFollowBankEntryConfig {
  return {
    sourceKind: 'material',
    renderMode: 'flowing',
    anchorGridStep: null,
    synthPattern: null,
    synthPatch: args.timbre ? {
      compositionPresetId: args.plan.machineId === 'dieter-window-body'
        ? 'spectralforge-dieter-window-body-material-proxy'
        : 'spectralforge-donatello-formant-material-proxy',
      baseHz: Math.max(1, args.plan.rootReferenceHz || 110),
      tuning: 'formant-ratio',
      repetitionModel: args.plan.machineId === 'dieter-window-body'
        ? 'root-follow-spectral-window-body-proxy'
        : 'root-follow-formant-plan-proxy',
      trackPatches: [],
      carrierIntegralTimbre: args.timbre,
    } : null,
    formantWindowPlan: buildRootFollowFormantWindowPlanFromDonatello(args.plan),
  };
}

export function summarizeDonatelloRootFollowPlanAttachment(config: RootFollowBankEntryConfig): {
  hasFormantPlan: boolean;
  bandCount: number;
  curveResolution: number;
  sourceKind: RootFollowBankEntryConfig['sourceKind'];
  renderMode: RootFollowBankEntryConfig['renderMode'];
} {
  return {
    hasFormantPlan: Boolean(config.formantWindowPlan),
    bandCount: config.formantWindowPlan?.bands.length ?? 0,
    curveResolution: config.formantWindowPlan?.curveResolution ?? 0,
    sourceKind: config.sourceKind,
    renderMode: config.renderMode,
  };
}
