import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import { CARRIER_INTEGRAL_MACHINES } from './carrierIntegralRegistry';
import { DESTINATION_TO_TARGET, TARGET_TO_DESTINATION } from './carrierIntegralSendTargetContracts';
import type {
  CarrierIntegralSendDestination,
  CarrierIntegralTransferPlan,
} from './carrierIntegralSendTargetContracts';
import { CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS } from './carrierIntegralTransferPolicyMatrix';
import type { CarrierIntegralTransferPolicyParityMismatch } from './carrierIntegralTransferPolicyMatrix';

export type CarrierIntegralTransferPlanResolver = (args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
}) => CarrierIntegralTransferPlan | null;

export type CarrierIntegralTransferPolicyParityArgs = {
  legacyResolver: CarrierIntegralTransferPlanResolver;
  shadowResolver: CarrierIntegralTransferPlanResolver;
};

export function carrierIntegralParityTargetToDestination(
  targetId: CarrierIntegralTargetId,
): CarrierIntegralSendDestination | null {
  return TARGET_TO_DESTINATION[targetId] ?? null;
}

export function collectCarrierIntegralTransferPlanParityMismatches(
  args: CarrierIntegralTransferPolicyParityArgs,
): CarrierIntegralTransferPolicyParityMismatch[] {
  const mismatches: CarrierIntegralTransferPolicyParityMismatch[] = [];
  const targetIds = Array.from(new Set(Object.values(DESTINATION_TO_TARGET)));

  for (const machine of CARRIER_INTEGRAL_MACHINES) {
    for (const targetId of targetIds) {
      const destination = carrierIntegralParityTargetToDestination(targetId);
      if (!destination) continue;

      const legacyPlan = args.legacyResolver({
        machineId: machine.id,
        targetId,
      });
      const shadowPlan = args.shadowResolver({
        machineId: machine.id,
        targetId,
      });

      if (Boolean(legacyPlan) !== Boolean(shadowPlan)) {
        mismatches.push({
          machineId: machine.id,
          targetId,
          destination,
          field: 'plan-presence',
          legacyValue: legacyPlan === null ? null : 'plan',
          shadowValue: shadowPlan === null ? null : 'plan',
        });
        continue;
      }

      if (!legacyPlan || !shadowPlan) continue;

      for (const field of CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS) {
        if (legacyPlan[field] !== shadowPlan[field]) {
          mismatches.push({
            machineId: machine.id,
            targetId,
            destination,
            field,
            legacyValue: legacyPlan[field],
            shadowValue: shadowPlan[field],
          });
        }
      }
    }
  }

  return mismatches;
}

export function formatCarrierIntegralTransferPlanParityMismatchDetail(
  mismatches: CarrierIntegralTransferPolicyParityMismatch[],
  limit = 12,
): string {
  return mismatches
    .slice(0, limit)
    .map(
      (mismatch) =>
        `${mismatch.machineId}/${mismatch.targetId}/${mismatch.field}: ${String(mismatch.legacyValue)} !== ${String(mismatch.shadowValue)}`,
    )
    .join('; ');
}

export function assertCarrierIntegralTransferPlanParity(args: {
  mismatches: CarrierIntegralTransferPolicyParityMismatch[];
  messagePrefix: string;
}): void {
  if (args.mismatches.length === 0) return;
  const detail = formatCarrierIntegralTransferPlanParityMismatchDetail(
    args.mismatches,
  );
  throw new Error(
    `${args.messagePrefix} (${args.mismatches.length} mismatches): ${detail}`,
  );
}
