import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import {
  carrierIntegralTargetToDestination as resolveCarrierIntegralTargetToDestination,
} from './carrierIntegralTransferDestinations';
import { describeCarrierIntegralElasticity as describeCarrierIntegralElasticityFromBoundary } from './carrierIntegralTransferDescriptions';
import type {
  CarrierIntegralDestinationSupport,
  CarrierIntegralElasticityMode,
  CarrierIntegralSendContract,
  CarrierIntegralSendDestination,
  CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargetContracts';
import { resolveCarrierIntegralTransferPlanLegacyFromBoundary } from './carrierIntegralTransferLegacyPlan';
import {
  listCarrierIntegralSendContractsFromDestinationSupport,
  resolveCarrierIntegralDestinationSupportFromContracts,
  resolveCarrierIntegralSendContractFromDestination,
} from './carrierIntegralSendContractResolver';
import { resolveCarrierIntegralTransferPolicyPlanFromContext } from './carrierIntegralTransferPolicyMatrix';
import type { CarrierIntegralTransferPolicyParityMismatch } from './carrierIntegralTransferPolicyMatrix';
import {
  assertCarrierIntegralTransferPlanParity,
  collectCarrierIntegralTransferPlanParityMismatches,
} from './carrierIntegralTransferPolicyParity';
export {
  CARRIER_INTEGRAL_AUDIO_PAINT_WORKSPACE_ORIGIN,
  CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN,
  CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
  RAW_CARRIER_MATERIAL_RENDER_PREFIX,
  RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN,
} from './carrierIntegralSendTargetContracts';
export type {
  CarrierIntegralDestinationSupport,
  CarrierIntegralElasticityMode,
  CarrierIntegralElasticityTradeoff,
  CarrierIntegralMaterialEntryKind,
  CarrierIntegralMelodicHandoffKind,
  CarrierIntegralRenderSourceKind,
  CarrierIntegralRootFollowConfigKind,
  CarrierIntegralSendContract,
  CarrierIntegralSendDestination,
  CarrierIntegralSignalKind,
  CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargetContracts';
export {
  CARRIER_INTEGRAL_TRANSFER_POLICY_SHADOW_VERSION,
  CARRIER_INTEGRAL_TRANSFER_POLICY_ACTIVATION_VERSION,
  CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS,
  classifyCarrierIntegralTransferPolicy,
  resolveCarrierIntegralTransferPolicyPlanFromContext,
} from './carrierIntegralTransferPolicyMatrix';
export type {
  CarrierIntegralTransferPolicyKind,
  CarrierIntegralTransferPolicyContext,
  CarrierIntegralTransferPolicyParityMismatch,
} from './carrierIntegralTransferPolicyMatrix';

export function carrierIntegralTargetToDestination(
  targetId: CarrierIntegralTargetId,
): CarrierIntegralSendDestination | null {
  return resolveCarrierIntegralTargetToDestination(targetId);
}

export function resolveCarrierIntegralSendContract(args: {
  machineId: CarrierIntegralMachineId;
  destination: CarrierIntegralSendDestination;
}): CarrierIntegralSendContract | null {
  return resolveCarrierIntegralSendContractFromDestination(args);
}

export function resolveCarrierIntegralDestinationSupport(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralDestinationSupport {
  return resolveCarrierIntegralDestinationSupportFromContracts(machineId);
}

export function listCarrierIntegralSendContracts(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralSendContract[] {
  return listCarrierIntegralSendContractsFromDestinationSupport(machineId);
}

export function resolveCarrierIntegralTransferPlanLegacy(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}): CarrierIntegralTransferPlan | null {
  return resolveCarrierIntegralTransferPlanLegacyFromBoundary(args);
}

export function resolveCarrierIntegralTransferPlanShadow(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}): CarrierIntegralTransferPlan | null {
  const destination = carrierIntegralTargetToDestination(args.targetId);
  if (!destination) return null;
  const contract = resolveCarrierIntegralSendContract({
    machineId: args.machineId,
    destination,
  });
  if (!contract) return null;
  return resolveCarrierIntegralTransferPolicyPlanFromContext({
    machineId: args.machineId,
    targetId: args.targetId,
    destination,
    contract,
  });
}

export function resolveCarrierIntegralTransferPlanPolicy(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}): CarrierIntegralTransferPlan | null {
  return resolveCarrierIntegralTransferPlanShadow(args);
}

export function resolveCarrierIntegralTransferPlan(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}): CarrierIntegralTransferPlan | null {
  return resolveCarrierIntegralTransferPlanPolicy(args);
}

export function collectCarrierIntegralTransferPolicyShadowParityMismatches(): CarrierIntegralTransferPolicyParityMismatch[] {
  return collectCarrierIntegralTransferPlanParityMismatches({
    legacyResolver: resolveCarrierIntegralTransferPlanLegacy,
    shadowResolver: resolveCarrierIntegralTransferPlanShadow,
  });
}

export function assertCarrierIntegralTransferPolicyShadowParity(): void {
  assertCarrierIntegralTransferPlanParity({
    mismatches: collectCarrierIntegralTransferPolicyShadowParityMismatches(),
    messagePrefix: "CarrierIntegralTransferPolicy shadow parity failed",
  });
}

export function collectCarrierIntegralTransferPolicyActivationMismatches(): CarrierIntegralTransferPolicyParityMismatch[] {
  return collectCarrierIntegralTransferPlanParityMismatches({
    legacyResolver: resolveCarrierIntegralTransferPlan,
    shadowResolver: resolveCarrierIntegralTransferPlanPolicy,
  });
}

export function assertCarrierIntegralTransferPolicyActivation(): void {
  assertCarrierIntegralTransferPolicyShadowParity();
  assertCarrierIntegralTransferPlanParity({
    mismatches: collectCarrierIntegralTransferPolicyActivationMismatches(),
    messagePrefix: "CarrierIntegralTransferPolicy activation failed",
  });
}

export function describeCarrierIntegralElasticity(
  mode: CarrierIntegralElasticityMode,
): string {
  return describeCarrierIntegralElasticityFromBoundary(mode);
}
