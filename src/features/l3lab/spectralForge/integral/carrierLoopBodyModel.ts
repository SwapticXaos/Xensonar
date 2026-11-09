import type {
  CarrierIntegralMachineFamily,
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import { CARRIER_INTEGRAL_MACHINES, resolveCarrierIntegralMachine } from './carrierIntegralRegistry';
import {
  resolveCarrierIntegralMachineCapability,
  type CarrierIntegralMachineCapability,
} from './carrierIntegralMachineCapabilities';
import {
  resolveCarrierLoopBodyReadinessContract,
  type CarrierLoopBodyReadinessContract,
} from './carrierLoopBodyContracts';
import { resolveDonatelloDieterRenderBody } from './donatelloDieterRenderBodyRegistry';
import {
  carrierIntegralTargetToDestination,
  resolveCarrierIntegralTransferPlan,
  type CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargets';
import type { CarrierIntegralRenderSourceKind } from './carrierIntegralSendTargetContracts';

export const CARRIER_LOOP_BODY_MODEL_VERSION =
  'carrier-loop-body-model-boundary-3.2.91.6.9.158';

export type CarrierLoopBodyKind =
  | 'legacy-synthetic-root-follow-config-body'
  | 'raw-material-body'
  | 'rendered-material-body'
  | 'synthetic-root-follow-config-body'
  | 'formant-window-body'
  | 'donor-timbre-contract-only-body'
  | 'unsupported-body';

export type CarrierLoopBodySourceKind =
  | 'legacy-direct-carrier'
  | 'raw-oscillator-carrier'
  | 'synthetic-root-follow-config'
  | 'rendered-material-source'
  | 'formant-window-plan'
  | 'donor-timbre-contract-only'
  | 'unsupported-source';

export type CarrierLoopBodyTargetKind =
  | 'root-follow'
  | 'material-track'
  | 'melodic-direct'
  | 'loop-track-direct';

export type CarrierLoopBodyRenderStrategy =
  | 'legacy-root-follow-config'
  | 'raw-rendered-audio-material'
  | 'synthetic-root-follow-config'
  | 'rendered-audio-material'
  | 'formant-plan-material-buffer'
  | 'donor-timbre-contract-only'
  | 'unsupported';

export type CarrierLoopBodyPreviewBody =
  | 'raw-spectral-buffer'
  | 'root-follow-config-buffer'
  | 'donatello-formant-plan-buffer'
  | 'spectral-window-body-buffer'
  | 'contract-only-preview'
  | 'none';

export type CarrierLoopBodyHandoffKind =
  | 'root-follow-material-flowing'
  | 'root-follow-artifact-config'
  | 'material-track-rendered-wav'
  | 'melodic-raw-material'
  | 'melodic-audio-paint-field'
  | 'blocked'
  | 'none';

export type CarrierLoopBodyTargetModel = {
  machineId: CarrierIntegralMachineId;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  targetKind: CarrierLoopBodyTargetKind;
  targetId: CarrierIntegralTargetId;
  supportedByTransferContract: boolean;
  allowedByBodyModel: boolean;
  renderStrategy: CarrierLoopBodyRenderStrategy;
  renderSource: CarrierIntegralRenderSourceKind | 'none';
  requiresMaterialBody: boolean;
  requiresFormantPlan: boolean;
  requiresDonorAtlas: boolean;
  requiresNeutralPigment: boolean;
  preferredPreviewBody: CarrierLoopBodyPreviewBody;
  fallbackBody: CarrierLoopBodyPreviewBody;
  handoff: CarrierLoopBodyHandoffKind;
  cacheIdentity: string;
  stableIdentity: string;
  blockReason: string | null;
  summary: string;
  guardrail: string;
};

export type CarrierLoopBodyTargetMap = Record<CarrierLoopBodyTargetKind, CarrierLoopBodyTargetModel>;

export type CarrierLoopBodyModel = {
  version: typeof CARRIER_LOOP_BODY_MODEL_VERSION;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  machineFamily: CarrierIntegralMachineFamily;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  renderStrategy: CarrierLoopBodyRenderStrategy;
  requiresMaterialBody: boolean;
  requiresFormantPlan: boolean;
  requiresDonorAtlas: boolean;
  requiresNeutralPigment: boolean;
  renderReady: boolean;
  contractOnly: boolean;
  allowsRootFollowSend: boolean;
  allowsMaterialTrackSend: boolean;
  allowsMelodicDirectSend: boolean;
  preferredPreviewBody: CarrierLoopBodyPreviewBody;
  fallbackBody: CarrierLoopBodyPreviewBody;
  cacheIdentity: string;
  stableIdentity: string;
  targets: CarrierLoopBodyTargetMap;
  readinessStatus: CarrierLoopBodyReadinessContract['status'];
  runtimeStatus: CarrierLoopBodyReadinessContract['runtimeStatus'];
  guardrails: string[];
};

const TARGETS: readonly { kind: CarrierLoopBodyTargetKind; id: CarrierIntegralTargetId }[] = [
  { kind: 'root-follow', id: 'root-follow-export' },
  { kind: 'material-track', id: 'materialspur-export' },
  { kind: 'melodic-direct', id: 'melodic-pink-export' },
  { kind: 'loop-track-direct', id: 'loop-track-direct-export' },
] as const;

function previewBodyForPlan(
  bodyKind: CarrierLoopBodyKind,
  plan: CarrierIntegralTransferPlan | null,
): CarrierLoopBodyPreviewBody {
  if (bodyKind === 'donor-timbre-contract-only-body') return 'contract-only-preview';
  if (!plan) return bodyKind === 'raw-material-body' ? 'raw-spectral-buffer' : 'none';
  return plan.renderSource;
}

function handoffForTarget(args: {
  targetKind: CarrierLoopBodyTargetKind;
  plan: CarrierIntegralTransferPlan | null;
  blocked: boolean;
}): CarrierLoopBodyHandoffKind {
  if (args.blocked) return 'blocked';
  if (!args.plan) return 'none';
  if (args.targetKind === 'root-follow') {
    return args.plan.rootFollowMembershipConfig === 'artifact-config'
      ? 'root-follow-artifact-config'
      : args.plan.rootFollowMembershipConfig === 'material-flowing'
        ? 'root-follow-material-flowing'
        : 'none';
  }
  if (args.targetKind === 'material-track') return 'material-track-rendered-wav';
  if (args.targetKind === 'melodic-direct') {
    return args.plan.melodicHandoffKind === 'raw-material'
      ? 'melodic-raw-material'
      : args.plan.melodicHandoffKind === 'audio-paint-field'
        ? 'melodic-audio-paint-field'
        : 'none';
  }
  return 'none';
}

function stableIdentity(args: {
  machineId: CarrierIntegralMachineId;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  targetKind?: CarrierLoopBodyTargetKind;
  renderStrategy: CarrierLoopBodyRenderStrategy;
}): string {
  return [
    args.machineId,
    args.bodyKind,
    args.sourceKind,
    args.targetKind ?? 'machine',
    args.renderStrategy,
  ].join(':');
}

function targetModelFor(args: {
  machineId: CarrierIntegralMachineId;
  capability: CarrierIntegralMachineCapability;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  renderStrategy: CarrierLoopBodyRenderStrategy;
  targetKind: CarrierLoopBodyTargetKind;
  targetId: CarrierIntegralTargetId;
}): CarrierLoopBodyTargetModel {
  const destination = carrierIntegralTargetToDestination(args.targetId);
  const plan = resolveCarrierIntegralTransferPlan({ machineId: args.machineId, targetId: args.targetId });
  const blocked = false;
  const renderBody = resolveDonatelloDieterRenderBody(args.machineId);
  const supportedByTransferContract = Boolean(plan && destination);
  const allowedByBodyModel = supportedByTransferContract && !blocked;
  const requiresFormantPlan = args.capability.requiresFormantPlan;
  const requiresMaterialBody = args.capability.requiresMaterialBody;
  const requiresDonorAtlas = args.capability.requiresDonorAtlas;
  const requiresNeutralPigment = args.capability.requiresNeutralPigment;
  const preferredPreviewBody = previewBodyForPlan(args.bodyKind, plan);
  const fallbackBody = args.capability.fallbackPreviewBody;
  return {
    machineId: args.machineId,
    bodyKind: args.bodyKind,
    sourceKind: args.sourceKind,
    targetKind: args.targetKind,
    targetId: args.targetId,
    supportedByTransferContract,
    allowedByBodyModel,
    renderStrategy: args.renderStrategy,
    renderSource: plan?.renderSource ?? 'none',
    requiresMaterialBody,
    requiresFormantPlan,
    requiresDonorAtlas,
    requiresNeutralPigment,
    preferredPreviewBody,
    fallbackBody,
    handoff: handoffForTarget({ targetKind: args.targetKind, plan, blocked }),
    cacheIdentity: `${stableIdentity({
      machineId: args.machineId,
      bodyKind: args.bodyKind,
      sourceKind: args.sourceKind,
      targetKind: args.targetKind,
      renderStrategy: args.renderStrategy,
    })}:${plan?.stableIdPrefix ?? 'no-transfer-plan'}`,
    stableIdentity: stableIdentity({
      machineId: args.machineId,
      bodyKind: args.bodyKind,
      sourceKind: args.sourceKind,
      targetKind: args.targetKind,
      renderStrategy: args.renderStrategy,
    }),
    blockReason: supportedByTransferContract ? null : 'unsupported-transfer-target',
    summary: plan?.summary ?? 'Kein CarrierLoopBody-Zielvertrag für diese Maschine/Ziel-Kombination.',
    guardrail:
      plan?.guardrail ??
      renderBody?.routingGuardrail ??
      'Unsupported CarrierLoopBody target remains inert.',
  };
}

function buildTargetMap(args: {
  machineId: CarrierIntegralMachineId;
  capability: CarrierIntegralMachineCapability;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  renderStrategy: CarrierLoopBodyRenderStrategy;
}): CarrierLoopBodyTargetMap {
  return Object.fromEntries(
    TARGETS.map((target) => [
      target.kind,
      targetModelFor({
        machineId: args.machineId,
        capability: args.capability,
        bodyKind: args.bodyKind,
        sourceKind: args.sourceKind,
        renderStrategy: args.renderStrategy,
        targetKind: target.kind,
        targetId: target.id,
      }),
    ]),
  ) as CarrierLoopBodyTargetMap;
}

export function resolveCarrierLoopBodyModel(machineId: CarrierIntegralMachineId): CarrierLoopBodyModel {
  const machine = resolveCarrierIntegralMachine(machineId);
  const readiness = resolveCarrierLoopBodyReadinessContract(machineId);
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  const bodyKind = capability.bodyKind;
  const sourceKind = capability.sourceKind;
  const renderStrategy = capability.renderStrategy;
  const targets = buildTargetMap({ machineId, capability, bodyKind, sourceKind, renderStrategy });
  const renderBody = resolveDonatelloDieterRenderBody(machineId);
  const requiresFormantPlan = capability.requiresFormantPlan;
  const requiresMaterialBody = capability.requiresMaterialBody;
  const requiresDonorAtlas = capability.requiresDonorAtlas;
  const requiresNeutralPigment = capability.requiresNeutralPigment;
  const preferredPreviewBody = targets['root-follow'].preferredPreviewBody !== 'none'
    ? targets['root-follow'].preferredPreviewBody
    : capability.fallbackPreviewBody;
  const fallbackBody = capability.fallbackPreviewBody;
  return {
    version: CARRIER_LOOP_BODY_MODEL_VERSION,
    machineId,
    machineLabel: machine.shortLabel,
    machineFamily: machine.family,
    bodyKind,
    sourceKind,
    renderStrategy,
    requiresMaterialBody,
    requiresFormantPlan,
    requiresDonorAtlas,
    requiresNeutralPigment,
    renderReady: capability.renderReady,
    contractOnly: capability.contractOnly || readiness.status === 'contract-only',
    allowsRootFollowSend: targets['root-follow'].allowedByBodyModel,
    allowsMaterialTrackSend: targets['material-track'].allowedByBodyModel,
    allowsMelodicDirectSend: targets['melodic-direct'].allowedByBodyModel,
    preferredPreviewBody,
    fallbackBody,
    cacheIdentity: stableIdentity({ machineId, bodyKind, sourceKind, renderStrategy }),
    stableIdentity: stableIdentity({ machineId, bodyKind, sourceKind, renderStrategy }),
    targets,
    readinessStatus: readiness.status,
    runtimeStatus: readiness.runtimeStatus,
    guardrails: [
      machine.guardrail,
      readiness.guardrails.join(' | '),
      renderBody?.routingGuardrail,
    ].filter((value): value is string => Boolean(value)),
  };
}

export function listCarrierLoopBodyModels(): CarrierLoopBodyModel[] {
  return CARRIER_INTEGRAL_MACHINES.map((machine) => resolveCarrierLoopBodyModel(machine.id));
}

export function assertCarrierLoopBodyModels(): void {
  const models = listCarrierLoopBodyModels();
  const byId = new Map(models.map((model) => [model.machineId, model]));
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  for (const model of models) {
    require(model.stableIdentity === model.cacheIdentity, `${model.machineId} machine cache identity must be deterministic.`);
    for (const target of Object.values(model.targets)) {
      require(target.stableIdentity.includes(model.machineId), `${model.machineId}/${target.targetKind} target identity must include machine id.`);
      require(target.stableIdentity.includes(model.bodyKind), `${model.machineId}/${target.targetKind} target identity must include body kind.`);
      require(target.stableIdentity.includes(target.targetKind), `${model.machineId}/${target.targetKind} target identity must include target kind.`);
      if (target.requiresFormantPlan) {
        require(target.bodyKind === 'formant-window-body', `${model.machineId}/${target.targetKind} formant requirement must only appear on formant bodies.`);
      }
      if (target.allowedByBodyModel) {
        require(target.supportedByTransferContract, `${model.machineId}/${target.targetKind} cannot be model-allowed without transfer support.`);
      }
    }
  }

  const pureDieter = byId.get('raw-darkpsy-oscillator');
  require(Boolean(pureDieter), 'Pure Dieter CarrierLoopBody model missing.');
  require(pureDieter?.bodyKind === 'raw-material-body', 'Pure Dieter must remain raw-material-body.');
  require(pureDieter?.renderStrategy === 'raw-rendered-audio-material', 'Pure Dieter must render as raw material, not synth config.');
  require(pureDieter?.allowsRootFollowSend === true, 'Pure Dieter root-follow send must remain allowed.');
  require(pureDieter?.allowsMaterialTrackSend === true, 'Pure Dieter material track send must remain allowed.');
  require(pureDieter?.allowsMelodicDirectSend === true, 'Pure Dieter melodic direct send must be allowed as raw material.');
  require(pureDieter?.targets['melodic-direct'].handoff === 'melodic-raw-material', 'Pure Dieter melodic target must expose raw material handoff.');

  const dieterV2 = byId.get('material-render-body');
  require(Boolean(dieterV2), 'Dieter V2 CarrierLoopBody model missing.');
  require(dieterV2?.bodyKind === 'rendered-material-body', 'Dieter V2 must remain rendered-material-body.');
  require(dieterV2?.requiresMaterialBody === true, 'Dieter V2 must require material body readiness.');
  require(dieterV2?.requiresFormantPlan === false, 'Dieter V2 must not require a formant plan.');
  require(dieterV2?.renderStrategy === 'rendered-audio-material', 'Dieter V2 must not become a synthetic config body.');

  const donatello = byId.get('donatello-formant-window-body');
  require(Boolean(donatello), 'Donatello CarrierLoopBody model missing.');
  require(donatello?.bodyKind === 'formant-window-body', 'Donatello must remain formant-window-body.');
  require(donatello?.requiresFormantPlan === true, 'Donatello must require its formant plan.');
  require(donatello?.requiresMaterialBody === true, 'Donatello must remain material-buffer backed until live formant renderer exists.');
  require(donatello?.targets['root-follow'].handoff === 'root-follow-material-flowing', 'Donatello root-follow must remain material-flowing for now.');
  require(donatello?.renderStrategy === 'formant-plan-material-buffer', 'Donatello must not alias Dieter V2 or A/B/C render strategy.');

  const dieterWindow = byId.get('dieter-window-body');
  require(Boolean(dieterWindow), 'Dieter Fensterkörper CarrierLoopBody model missing.');
  require(dieterWindow?.bodyKind === 'formant-window-body', 'Dieter Fensterkörper must stay a formant-window body class.');
  require(dieterWindow?.requiresFormantPlan === true, 'Dieter Fensterkörper must preserve its window plan.');
  require(dieterWindow?.requiresMaterialBody === true, 'Dieter Fensterkörper must be material-buffer backed.');
  require(dieterWindow?.targets['root-follow'].renderSource === 'spectral-window-body-buffer', 'Dieter Fensterkörper root-follow must render the spectral-window buffer.');
  require(dieterWindow?.targets['root-follow'].handoff === 'root-follow-material-flowing', 'Dieter Fensterkörper root-follow must remain material-flowing for now.');
  require(dieterWindow?.renderStrategy === 'formant-plan-material-buffer', 'Dieter Fensterkörper must not alias Dieter V2 or A/B/C render strategy.');

  for (const machineId of ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
    const model = byId.get(machineId);
    require(Boolean(model), `${machineId} CarrierLoopBody model missing.`);
    require(model?.bodyKind === 'synthetic-root-follow-config-body', `${machineId} must remain synthetic-root-follow-config-body.`);
    require(model?.requiresMaterialBody === false, `${machineId} must not require a material body.`);
    require(model?.requiresFormantPlan === false, `${machineId} must not require a formant plan.`);
    require(model?.targets['root-follow'].handoff === 'root-follow-artifact-config', `${machineId} root-follow must remain artifact-config handoff.`);
  }

  const donor = byId.get('donor-timbre-embodiment');
  require(Boolean(donor), 'Donor-Timbre CarrierLoopBody model missing.');
  require(donor?.contractOnly === true, 'Donor-Timbre embodiment must remain contract-only.');
  require(donor?.renderReady === false, 'Donor-Timbre embodiment must not claim render readiness.');
  require(donor?.requiresDonorAtlas === true, 'Donor-Timbre embodiment must require donor atlas readiness before renderer claims.');
}
