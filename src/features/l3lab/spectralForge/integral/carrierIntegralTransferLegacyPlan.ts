import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from "./carrierIntegralContracts";
import type { CarrierIntegralTransferPlan } from "./carrierIntegralSendTargetContracts";
import { resolveCarrierIntegralSendContractFromDestination } from "./carrierIntegralSendContractResolver";
import { carrierIntegralTargetToDestination } from "./carrierIntegralTransferDestinations";
import { resolveCarrierIntegralTransferPolicyPlanFromContext } from "./carrierIntegralTransferPolicyMatrix";

export const CARRIER_INTEGRAL_TRANSFER_LEGACY_PLAN_ADAPTER_VERSION =
  "carrier-integral-transfer-legacy-plan-policy-adapter-3.2.91.7.5.78";

export function resolveCarrierIntegralTransferPlanLegacyFromBoundary(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}): CarrierIntegralTransferPlan | null {
  const destination = carrierIntegralTargetToDestination(args.targetId);
  if (!destination) return null;

  const contract = resolveCarrierIntegralSendContractFromDestination({
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
