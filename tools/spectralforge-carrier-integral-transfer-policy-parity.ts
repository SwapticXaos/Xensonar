import {
  assertCarrierIntegralTransferPlanParity,
  collectCarrierIntegralTransferPlanParityMismatches,
  formatCarrierIntegralTransferPlanParityMismatchDetail,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyParity';
import {
  assertCarrierIntegralTransferPolicyActivation,
  assertCarrierIntegralTransferPolicyShadowParity,
  collectCarrierIntegralTransferPolicyActivationMismatches,
  collectCarrierIntegralTransferPolicyShadowParityMismatches,
  resolveCarrierIntegralTransferPlan,
  resolveCarrierIntegralTransferPlanLegacy,
  resolveCarrierIntegralTransferPlanPolicy,
  resolveCarrierIntegralTransferPlanShadow,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const genericShadow = collectCarrierIntegralTransferPlanParityMismatches({
  legacyResolver: resolveCarrierIntegralTransferPlanLegacy,
  shadowResolver: resolveCarrierIntegralTransferPlanShadow,
});
const facadeShadow = collectCarrierIntegralTransferPolicyShadowParityMismatches();
assert(
  JSON.stringify(genericShadow) === JSON.stringify(facadeShadow),
  'generic shadow parity helper drifted from send-target facade',
);

const genericActivation = collectCarrierIntegralTransferPlanParityMismatches({
  legacyResolver: resolveCarrierIntegralTransferPlan,
  shadowResolver: resolveCarrierIntegralTransferPlanPolicy,
});
const facadeActivation = collectCarrierIntegralTransferPolicyActivationMismatches();
assert(
  JSON.stringify(genericActivation) === JSON.stringify(facadeActivation),
  'generic activation parity helper drifted from send-target facade',
);

assert(genericShadow.length === 0, `shadow mismatches: ${formatCarrierIntegralTransferPlanParityMismatchDetail(genericShadow)}`);
assert(genericActivation.length === 0, `activation mismatches: ${formatCarrierIntegralTransferPlanParityMismatchDetail(genericActivation)}`);
assertCarrierIntegralTransferPlanParity({
  mismatches: genericShadow,
  messagePrefix: 'generic parity helper assertion failed',
});
assertCarrierIntegralTransferPolicyShadowParity();
assertCarrierIntegralTransferPolicyActivation();

console.log(JSON.stringify({
  ok: true,
  shadowMismatchCount: genericShadow.length,
  activationMismatchCount: genericActivation.length,
  message: 'Carrier Integral transfer policy parity helpers are separated from send-target orchestration and remain equivalent to the public facade.',
}, null, 2));
