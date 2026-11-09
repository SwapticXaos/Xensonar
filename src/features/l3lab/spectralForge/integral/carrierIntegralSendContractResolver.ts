import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import { resolveCarrierIntegralMachine } from './carrierIntegralRegistry';
import {
  buildLoopTrackDirectContract,
  buildMaterialspurContract,
  buildMelodicPinkLaneContract,
  buildRootFollowLoopContract,
} from './carrierIntegralSendContractBuilders';
import { carrierIntegralDestinationToTarget } from './carrierIntegralTransferDestinations';
import type {
  CarrierIntegralDestinationSupport,
  CarrierIntegralSendContract,
  CarrierIntegralSendDestination,
} from './carrierIntegralSendTargetContracts';

export function resolveCarrierIntegralSendContractFromDestination(args: {
  machineId: CarrierIntegralMachineId;
  destination: CarrierIntegralSendDestination;
}): CarrierIntegralSendContract | null {
  const machine = resolveCarrierIntegralMachine(args.machineId);
  const targetId = carrierIntegralDestinationToTarget(args.destination);
  if (!targetId || !machine.targetSupport[targetId]) return null;

  if (args.destination === 'root-follow-loop') {
    return buildRootFollowLoopContract(machine.id, machine.rootFollowRoute);
  }
  if (args.destination === 'materialspur') {
    return buildMaterialspurContract(machine.id, machine.materialRoute);
  }
  if (args.destination === 'loop-track-direct') {
    return buildLoopTrackDirectContract(machine.materialRoute);
  }
  return buildMelodicPinkLaneContract(machine.id, machine.materialRoute);
}

export function resolveCarrierIntegralDestinationSupportFromContracts(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralDestinationSupport {
  return {
    machineId,
    materialspur: resolveCarrierIntegralSendContractFromDestination({
      machineId,
      destination: 'materialspur',
    }),
    rootFollowLoop: resolveCarrierIntegralSendContractFromDestination({
      machineId,
      destination: 'root-follow-loop',
    }),
    loopTrackDirect: resolveCarrierIntegralSendContractFromDestination({
      machineId,
      destination: 'loop-track-direct',
    }),
    melodicPinkLane: resolveCarrierIntegralSendContractFromDestination({
      machineId,
      destination: 'melodic-pink-lane',
    }),
  };
}

export function listCarrierIntegralSendContractsFromDestinationSupport(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralSendContract[] {
  return (
    [
      'materialspur',
      'root-follow-loop',
      'loop-track-direct',
      'melodic-pink-lane',
    ] as const
  )
    .map((destination) =>
      resolveCarrierIntegralSendContractFromDestination({ machineId, destination }),
    )
    .filter(
      (contract): contract is CarrierIntegralSendContract => contract !== null,
    );
}
