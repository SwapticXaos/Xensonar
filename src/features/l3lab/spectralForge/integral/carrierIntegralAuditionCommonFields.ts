import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import type { CarrierIntegralAuditionValueSource } from './carrierIntegralAuditionContext';

export type CarrierIntegralAuditionCommonFields = {
  projectName: string;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  bodySourceMode: CarrierIntegralBodySourceMode;
  routeSummary: string;
  durationSec: number;
  previewDurationSec: number;
  valueSource: CarrierIntegralAuditionValueSource;
};

export function buildCarrierIntegralAuditionCommonFields(args: CarrierIntegralAuditionCommonFields): CarrierIntegralAuditionCommonFields {
  return {
    projectName: args.projectName,
    machineId: args.machineId,
    machineLabel: args.machineLabel,
    bodySourceMode: args.bodySourceMode,
    routeSummary: args.routeSummary,
    durationSec: args.durationSec,
    previewDurationSec: args.previewDurationSec,
    valueSource: args.valueSource,
  };
}
