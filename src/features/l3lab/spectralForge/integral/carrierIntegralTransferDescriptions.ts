import type {
  CarrierIntegralElasticityMode,
  CarrierIntegralTransferPlan,
} from "./carrierIntegralSendTargetContracts";

export function describeCarrierIntegralElasticity(
  mode: CarrierIntegralElasticityMode,
): string {
  switch (mode) {
    case "synthetic-time-elastic":
      return "synthetisch zeit-elastisch";
    case "raw-granular-elastic":
      return "Raw Audio granular zeit-elastisch";
    case "raw-tape-coupled":
      return "Raw Audio tonbandartig pitch-time-gekoppelt";
    case "fixed-rendered-audio":
      return "fix gerenderter Materialkörper";
    default:
      return "nicht anwendbar";
  }
}

export function describeCarrierIntegralTransferPlanSummary(
  plan: CarrierIntegralTransferPlan,
): string {
  return plan.summary;
}

export function describeCarrierIntegralTransferPlanGuardrail(
  plan: CarrierIntegralTransferPlan,
): string {
  return plan.guardrail;
}
