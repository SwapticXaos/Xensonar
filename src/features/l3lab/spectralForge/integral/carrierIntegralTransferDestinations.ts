import type {
  CarrierIntegralTargetId,
} from "./carrierIntegralContracts";
import {
  DESTINATION_TO_TARGET,
  TARGET_TO_DESTINATION,
} from "./carrierIntegralSendTargetContracts";
import type {
  CarrierIntegralSendDestination,
} from "./carrierIntegralSendTargetContracts";

export const CARRIER_INTEGRAL_SEND_DESTINATIONS = [
  "materialspur",
  "root-follow-loop",
  "loop-track-direct",
  "melodic-pink-lane",
] as const satisfies readonly CarrierIntegralSendDestination[];

export function carrierIntegralTargetToDestination(
  targetId: CarrierIntegralTargetId,
): CarrierIntegralSendDestination | null {
  return TARGET_TO_DESTINATION[targetId] ?? null;
}

export function carrierIntegralDestinationToTarget(
  destination: CarrierIntegralSendDestination,
): CarrierIntegralTargetId | null {
  return DESTINATION_TO_TARGET[destination] ?? null;
}

export function listCarrierIntegralSendDestinations(): readonly CarrierIntegralSendDestination[] {
  return CARRIER_INTEGRAL_SEND_DESTINATIONS;
}

export function listCarrierIntegralTransferTargetIds(): CarrierIntegralTargetId[] {
  return Array.from(new Set(Object.values(DESTINATION_TO_TARGET)));
}
