import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import { CARRIER_INTEGRAL_MACHINES, resolveCarrierIntegralMachine } from './carrierIntegralRegistry';
import { resolveCarrierIntegralRuntimeRootFollowRoute } from './carrierIntegralRuntimeRoutes';
import { resolveDonatelloDieterRenderBody } from './donatelloDieterRenderBodyRegistry';
import {
  resolveCarrierIntegralTransferPlan,
  type CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargets';
import type { CarrierIntegralRenderSourceKind } from './carrierIntegralSendTargetContracts';

export const CARRIER_LOOP_BODY_CONTRACT_VERSION =
  'carrier-loop-body-readiness-contract-3.2.91.6.9.156';

export type CarrierLoopBodyClass =
  | 'synthetic-root-follow-config-body'
  | 'raw-rendered-audio-body'
  | 'rendered-material-audio-body'
  | 'donatello-formant-material-body'
  | 'audio-paint-field-body'
  | 'unsupported-body';

export type CarrierLoopBodyReadinessStatus =
  | 'synthetic-wired'
  | 'rendered-body-wired'
  | 'formant-body-wired'
  | 'contract-only'
  | 'unsupported';

export type CarrierLoopBodyTargetContract = {
  targetId: CarrierIntegralTargetId;
  supported: boolean;
  bodyClass: CarrierLoopBodyClass;
  renderSource: CarrierIntegralRenderSourceKind | 'none';
  materialEntryKind: CarrierIntegralTransferPlan['materialEntryKind'] | 'none';
  rootFollowConfigKind: CarrierIntegralTransferPlan['rootFollowConfigKind'] | 'none';
  melodicHandoffKind: CarrierIntegralTransferPlan['melodicHandoffKind'] | 'none';
  rootFollowMembershipConfig: CarrierIntegralTransferPlan['rootFollowMembershipConfig'] | 'none';
  requiresAudibleRenderedBody: boolean;
  usesAudioPaintImportDetail: boolean;
  mustPreserveFormantPlan: boolean;
  mustPreserveRawMaterialIdentity: boolean;
  mustPreserveSyntheticPlanIdentity: boolean;
  sourceVersion: string | null;
  renderModePrefix: string | null;
  stableIdPrefix: string | null;
  workspaceOrigin: string | null;
};

export type CarrierLoopBodyReadinessContract = {
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  machineFamily: ReturnType<typeof resolveCarrierIntegralMachine>['family'];
  status: CarrierLoopBodyReadinessStatus;
  runtimeStatus: ReturnType<typeof resolveCarrierIntegralRuntimeRootFollowRoute>['status'];
  runtimeEmissionMode: string;
  shouldBuildSyntheticRootFollow: boolean;
  renderBodyId: string | null;
  renderBodyRouteMachineId: string | null;
  renderBodyCacheEnabled: boolean;
  playheadStartPolicy: 'after-rendered-audio-ready' | 'not-render-body';
  rootFollow: CarrierLoopBodyTargetContract;
  materialspur: CarrierLoopBodyTargetContract;
  melodicPink: CarrierLoopBodyTargetContract;
  loopTrackDirect: CarrierLoopBodyTargetContract;
  guardrails: string[];
};

function bodyClassForPlan(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  plan: CarrierIntegralTransferPlan | null;
}): CarrierLoopBodyClass {
  const { machineId, plan } = args;
  if (!plan) return 'unsupported-body';
  if (plan.renderSource === 'donatello-formant-plan-buffer' || plan.renderSource === 'spectral-window-body-buffer') return 'donatello-formant-material-body';
  if (plan.usesAudioPaintImportDetail || plan.materialEntryKind === 'audio-paint-field-clip') return 'audio-paint-field-body';
  if (machineId === 'raw-darkpsy-oscillator' || plan.materialEntryKind === 'raw-oscillator-material' || plan.materialEntryKind === 'carrier-granular-material') {
    return 'raw-rendered-audio-body';
  }
  if (plan.rootFollowConfigKind === 'artifact-config') return 'synthetic-root-follow-config-body';
  if (plan.renderSource === 'root-follow-config-buffer' || plan.materialEntryKind === 'carrier-rendered-material') return 'rendered-material-audio-body';
  return 'rendered-material-audio-body';
}

function targetContractFor(machineId: CarrierIntegralMachineId, targetId: CarrierIntegralTargetId): CarrierLoopBodyTargetContract {
  const plan = resolveCarrierIntegralTransferPlan({ machineId, targetId });
  const bodyClass = bodyClassForPlan({ machineId, targetId, plan });
  return {
    targetId,
    supported: Boolean(plan),
    bodyClass,
    renderSource: plan?.renderSource ?? 'none',
    materialEntryKind: plan?.materialEntryKind ?? 'none',
    rootFollowConfigKind: plan?.rootFollowConfigKind ?? 'none',
    melodicHandoffKind: plan?.melodicHandoffKind ?? 'none',
    rootFollowMembershipConfig: plan?.rootFollowMembershipConfig ?? 'none',
    requiresAudibleRenderedBody: Boolean(plan?.requiresAudibleRenderedBody),
    usesAudioPaintImportDetail: Boolean(plan?.usesAudioPaintImportDetail),
    mustPreserveFormantPlan: bodyClass === 'donatello-formant-material-body',
    mustPreserveRawMaterialIdentity: bodyClass === 'raw-rendered-audio-body',
    mustPreserveSyntheticPlanIdentity: bodyClass === 'synthetic-root-follow-config-body',
    sourceVersion: plan?.sourceVersion ?? null,
    renderModePrefix: plan?.renderModePrefix ?? null,
    stableIdPrefix: plan?.stableIdPrefix ?? null,
    workspaceOrigin: plan?.workspaceOrigin ?? null,
  };
}

function statusFor(args: {
  machineId: CarrierIntegralMachineId;
  shouldBuildSyntheticRootFollow: boolean;
  renderBodyId: string | null;
  rootFollow: CarrierLoopBodyTargetContract;
}): CarrierLoopBodyReadinessStatus {
  if (!args.rootFollow.supported) return 'unsupported';
  if (args.machineId === 'donor-timbre-embodiment') return 'contract-only';
  if (args.rootFollow.bodyClass === 'donatello-formant-material-body') return 'formant-body-wired';
  if (args.renderBodyId || args.rootFollow.bodyClass === 'rendered-material-audio-body' || args.rootFollow.bodyClass === 'raw-rendered-audio-body') {
    return 'rendered-body-wired';
  }
  if (args.shouldBuildSyntheticRootFollow || args.rootFollow.bodyClass === 'synthetic-root-follow-config-body') return 'synthetic-wired';
  return 'contract-only';
}

export function resolveCarrierLoopBodyReadinessContract(machineId: CarrierIntegralMachineId): CarrierLoopBodyReadinessContract {
  const machine = resolveCarrierIntegralMachine(machineId);
  const runtime = resolveCarrierIntegralRuntimeRootFollowRoute({
    machineId,
    bodySourceMode: machine.bodySourceModes[0],
    antiBurstStrategy: machine.antiBurstStrategy,
    rootFollowRoute: machine.rootFollowRoute,
    materialRoute: machine.materialRoute,
    paramsHash: 'carrier-loop-body-readiness',
  });
  const renderBody = resolveDonatelloDieterRenderBody(machineId);
  const rootFollow = targetContractFor(machineId, 'root-follow-export');
  const materialspur = targetContractFor(machineId, 'materialspur-export');
  const melodicPink = targetContractFor(machineId, 'melodic-pink-export');
  const loopTrackDirect = targetContractFor(machineId, 'loop-track-direct-export');
  const status = statusFor({
    machineId,
    shouldBuildSyntheticRootFollow: runtime.shouldBuildSyntheticRootFollow,
    renderBodyId: renderBody?.id ?? null,
    rootFollow,
  });
  return {
    machineId,
    machineLabel: machine.shortLabel,
    machineFamily: machine.family,
    status,
    runtimeStatus: runtime.status,
    runtimeEmissionMode: runtime.emissionMode,
    shouldBuildSyntheticRootFollow: runtime.shouldBuildSyntheticRootFollow,
    renderBodyId: renderBody?.id ?? null,
    renderBodyRouteMachineId: renderBody?.virtualRouteMachineId ?? null,
    renderBodyCacheEnabled: Boolean(renderBody?.previewCachePolicy.enabled),
    playheadStartPolicy: renderBody?.playheadStartPolicy ?? 'not-render-body',
    rootFollow,
    materialspur,
    melodicPink,
    loopTrackDirect,
    guardrails: [machine.guardrail, runtime.guardrail, renderBody?.routingGuardrail].filter((value): value is string => Boolean(value)),
  };
}

export function listCarrierLoopBodyReadinessContracts(): CarrierLoopBodyReadinessContract[] {
  return CARRIER_INTEGRAL_MACHINES.map((machine) => resolveCarrierLoopBodyReadinessContract(machine.id));
}

export function assertCarrierLoopBodyReadinessContracts(): void {
  const contracts = listCarrierLoopBodyReadinessContracts();
  const byId = new Map(contracts.map((contract) => [contract.machineId, contract]));
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  for (const contract of contracts) {
    require(contract.rootFollow.supported || contract.status === 'contract-only' || contract.status === 'unsupported', `${contract.machineId} must either expose root-follow or be explicitly contract-only/unsupported.`);
    if (contract.renderBodyId) {
      require(contract.renderBodyCacheEnabled, `${contract.machineId} render body must use the material-body preview cache.`);
      require(contract.playheadStartPolicy === 'after-rendered-audio-ready', `${contract.machineId} render body must start only after rendered audio is ready.`);
      require(contract.rootFollow.requiresAudibleRenderedBody, `${contract.machineId} root-follow render body must require audible material.`);
      require(contract.materialspur.requiresAudibleRenderedBody, `${contract.machineId} materialspur render body must require audible material.`);
    }
  }

  const pureDieter = byId.get('raw-darkpsy-oscillator');
  require(Boolean(pureDieter), 'Pure Dieter readiness contract missing.');
  require(pureDieter?.rootFollow.bodyClass === 'raw-rendered-audio-body', 'Pure Dieter root-follow must remain raw rendered audio, not synthetic artifact.');
  require(pureDieter?.melodicPink.bodyClass === 'raw-rendered-audio-body', 'Pure Dieter melodic pink contract must remain raw material even though UI hard-guard blocks direct send for now.');

  const dieterV2 = byId.get('material-render-body');
  require(Boolean(dieterV2), 'Dieter V2 readiness contract missing.');
  require(dieterV2?.renderBodyId === 'dieter-v2-rendered-material-body', 'Dieter V2 must stay bound to the Dieter V2 render body registry entry.');
  require(dieterV2?.rootFollow.bodyClass === 'rendered-material-audio-body', 'Dieter V2 root-follow must stay rendered material audio.');
  require(dieterV2?.shouldBuildSyntheticRootFollow === false, 'Dieter V2 must not build the synthetic A/B/C root-follow plan.');

  const donatello = byId.get('donatello-formant-window-body');
  require(Boolean(donatello), 'Donatello readiness contract missing.');
  require(donatello?.renderBodyId === 'donatello-formant-window-body', 'Donatello must stay bound to the Donatello render body registry entry.');
  require(donatello?.rootFollow.bodyClass === 'donatello-formant-material-body', 'Donatello root-follow must preserve the formant material body class.');
  require(donatello?.rootFollow.mustPreserveFormantPlan === true, 'Donatello root-follow must preserve the formant plan.');
  require(donatello?.rootFollow.rootFollowMembershipConfig === 'material-flowing', 'Donatello root-follow must remain material-flowing until a live formant renderer exists.');
  require(donatello?.shouldBuildSyntheticRootFollow === false, 'Donatello must not build the synthetic A/B/C root-follow plan.');

  const dieterWindow = byId.get('dieter-window-body');
  require(Boolean(dieterWindow), 'Dieter Fensterkörper readiness contract missing.');
  require(dieterWindow?.renderBodyId === 'dieter-window-body', 'Dieter Fensterkörper must stay bound to the spectral-window render body registry entry.');
  require(dieterWindow?.rootFollow.bodyClass === 'donatello-formant-material-body', 'Dieter Fensterkörper root-follow must preserve the formant/window material body class.');
  require(dieterWindow?.rootFollow.renderSource === 'spectral-window-body-buffer', 'Dieter Fensterkörper root-follow must render from spectral-window-body-buffer.');
  require(dieterWindow?.rootFollow.mustPreserveFormantPlan === true, 'Dieter Fensterkörper root-follow must preserve the window plan.');
  require(dieterWindow?.shouldBuildSyntheticRootFollow === false, 'Dieter Fensterkörper must not build the synthetic A/B/C root-follow plan.');

  for (const machineId of ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
    const contract = byId.get(machineId);
    require(Boolean(contract), `${machineId} readiness contract missing.`);
    require(contract?.rootFollow.bodyClass === 'synthetic-root-follow-config-body', `${machineId} root-follow must remain a synthetic artifact config body.`);
    require(contract?.shouldBuildSyntheticRootFollow === true, `${machineId} must continue to build synthetic root-follow plans.`);
  }
}
