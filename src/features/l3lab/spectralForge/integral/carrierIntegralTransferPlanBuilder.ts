import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import type {
  CarrierIntegralSendContract,
  CarrierIntegralSendDestination,
  CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargetContracts';

export type CarrierIntegralTransferPlanBuildContext = {
  machine: { id: CarrierIntegralMachineId };
  targetId: CarrierIntegralTargetId;
  destination: CarrierIntegralSendDestination;
  contract: CarrierIntegralSendContract;
};

export type CarrierIntegralTransferPlanBody = Omit<
  CarrierIntegralTransferPlan,
  'machineId' | 'targetId' | 'destination' | 'contract'
>;

export function buildCarrierIntegralTransferPlan(
  context: CarrierIntegralTransferPlanBuildContext,
  body: CarrierIntegralTransferPlanBody,
): CarrierIntegralTransferPlan {
  return {
    machineId: context.machine.id,
    targetId: context.targetId,
    destination: context.destination,
    contract: context.contract,
    ...body,
  };
}
