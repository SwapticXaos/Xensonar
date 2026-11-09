import {
  CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS,
  CARRIER_INTEGRAL_TRANSFER_POLICY_ACTIVATION_VERSION,
  CARRIER_INTEGRAL_TRANSFER_POLICY_SHADOW_VERSION,
  classifyCarrierIntegralTransferPolicy,
  resolveCarrierIntegralTransferPolicyPlanFromContext,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyMatrix';
import {
  assertCarrierIntegralTransferPolicyActivation,
  carrierIntegralTargetToDestination,
  collectCarrierIntegralTransferPolicyShadowParityMismatches,
  resolveCarrierIntegralDestinationSupport,
  resolveCarrierIntegralSendContract,
  resolveCarrierIntegralTransferPlan,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets';
import type { CarrierIntegralMachineId, CarrierIntegralTargetId } from '../src/features/l3lab/spectralForge/integral/carrierIntegralContracts';

type Scenario = {
  label: string;
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  expectedPolicyKind: ReturnType<typeof classifyCarrierIntegralTransferPolicy>;
  expectedRenderSource?: string;
  expectedRootFollowConfigKind?: string;
  expectedMelodicHandoffKind?: string;
};

const scenarios: Scenario[] = [
  {
    label: 'Pure Dieter raw direct body remains raw material policy for Root Follow',
    machineId: 'raw-darkpsy-oscillator',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'raw-direct-body',
    expectedRenderSource: 'raw-spectral-buffer',
    expectedRootFollowConfigKind: 'material-flowing',
  },
  {
    label: 'Pure Dieter melodic direct remains raw material handoff in policy matrix, while send guard blocks it elsewhere',
    machineId: 'raw-darkpsy-oscillator',
    targetId: 'melodic-pink-export',
    expectedPolicyKind: 'raw-direct-body',
    expectedRenderSource: 'raw-spectral-buffer',
    expectedMelodicHandoffKind: 'raw-material',
  },
  {
    label: 'Dieter V2 remains rendered material policy',
    machineId: 'material-render-body',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'dieter-v2-material-body',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'material-flowing',
  },
  {
    label: 'Donatello remains formant policy',
    machineId: 'donatello-formant-window-body',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'donatello-formant-body',
    expectedRenderSource: 'donatello-formant-plan-buffer',
    expectedRootFollowConfigKind: 'material-flowing',
  },
  {
    label: 'Cecilia remains synthetic artifact policy',
    machineId: 'branch-c-interval-body',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'synthetic-artifact-body',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
  },
  {
    label: 'Bert remains synthetic artifact policy',
    machineId: 'branch-b573-synth-window',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'synthetic-artifact-body',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
  },
  {
    label: 'Antonia remains synthetic artifact policy',
    machineId: 'branch-a-line-traffic',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'synthetic-artifact-body',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
  },
  {
    label: 'Legacy Supernote keeps legacy direct body classification',
    machineId: 'legacy-supernote-5.69',
    targetId: 'root-follow-export',
    expectedPolicyKind: 'legacy-direct-body',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const parityMismatches = collectCarrierIntegralTransferPolicyShadowParityMismatches();
assert(parityMismatches.length === 0, `shadow parity mismatches: ${JSON.stringify(parityMismatches.slice(0, 4))}`);
assertCarrierIntegralTransferPolicyActivation();

for (const scenario of scenarios) {
  const destination = carrierIntegralTargetToDestination(scenario.targetId);
  assert(destination, `${scenario.label}: destination missing`);
  const contract = resolveCarrierIntegralSendContract({ machineId: scenario.machineId, destination });
  assert(contract, `${scenario.label}: send contract missing`);
  const policyKind = classifyCarrierIntegralTransferPolicy(scenario.machineId);
  assert(policyKind === scenario.expectedPolicyKind, `${scenario.label}: policy ${policyKind} !== ${scenario.expectedPolicyKind}`);
  const fromMatrix = resolveCarrierIntegralTransferPolicyPlanFromContext({
    machineId: scenario.machineId,
    targetId: scenario.targetId,
    destination,
    contract,
  });
  const activePlan = resolveCarrierIntegralTransferPlan({ machineId: scenario.machineId, targetId: scenario.targetId });
  assert(fromMatrix && activePlan, `${scenario.label}: missing matrix/active plan`);
  assert(fromMatrix.renderSource === activePlan.renderSource, `${scenario.label}: matrix renderSource drift`);
  assert(fromMatrix.rootFollowConfigKind === activePlan.rootFollowConfigKind, `${scenario.label}: matrix rootFollowConfigKind drift`);
  if (scenario.expectedRenderSource) assert(activePlan.renderSource === scenario.expectedRenderSource, `${scenario.label}: renderSource ${activePlan.renderSource}`);
  if (scenario.expectedRootFollowConfigKind) assert(activePlan.rootFollowConfigKind === scenario.expectedRootFollowConfigKind, `${scenario.label}: rootFollowConfigKind ${activePlan.rootFollowConfigKind}`);
  if (scenario.expectedMelodicHandoffKind) assert(activePlan.melodicHandoffKind === scenario.expectedMelodicHandoffKind, `${scenario.label}: melodicHandoffKind ${activePlan.melodicHandoffKind}`);
}

for (const machineId of scenarios.map((scenario) => scenario.machineId)) {
  const support = resolveCarrierIntegralDestinationSupport(machineId);
  assert(support.machineId === machineId, `${machineId}: destination support roundtrip failed`);
}

console.log(JSON.stringify({
  ok: true,
  shadowVersion: CARRIER_INTEGRAL_TRANSFER_POLICY_SHADOW_VERSION,
  activationVersion: CARRIER_INTEGRAL_TRANSFER_POLICY_ACTIVATION_VERSION,
  parityFields: CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS.length,
  checkedScenarios: scenarios.length,
  message: 'Carrier Integral transfer policy matrix is extracted from send targets and remains in parity with active transfer-plan resolution.',
}, null, 2));
