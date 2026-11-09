import {
  assertCarrierLoopBodyReadinessContracts,
  listCarrierLoopBodyReadinessContracts,
  resolveCarrierLoopBodyReadinessContract,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyContracts';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) {
    throw new Error(`${name}: ${JSON.stringify(detail)}`);
  }
}

assertCarrierLoopBodyReadinessContracts();
const contracts = listCarrierLoopBodyReadinessContracts();
check('covers all registered Carrier-Integral machines', contracts.length === 8, contracts.map((contract) => contract.machineId));

const byId = new Map(contracts.map((contract) => [contract.machineId, contract]));
const pureDieter = resolveCarrierLoopBodyReadinessContract('raw-darkpsy-oscillator');
check('Pure Dieter root-follow remains raw rendered body', pureDieter.rootFollow.bodyClass === 'raw-rendered-audio-body', pureDieter.rootFollow);
check('Pure Dieter melodic remains raw material contract', pureDieter.melodicPink.bodyClass === 'raw-rendered-audio-body', pureDieter.melodicPink);
check('Pure Dieter loop-track direct remains supported', pureDieter.loopTrackDirect.supported === true, pureDieter.loopTrackDirect);

const dieterV2 = resolveCarrierLoopBodyReadinessContract('material-render-body');
check('Dieter V2 keeps render-body registry id', dieterV2.renderBodyId === 'dieter-v2-rendered-material-body', dieterV2);
check('Dieter V2 root-follow is rendered material audio', dieterV2.rootFollow.bodyClass === 'rendered-material-audio-body', dieterV2.rootFollow);
check('Dieter V2 does not build synthetic root-follow', dieterV2.shouldBuildSyntheticRootFollow === false, dieterV2);
check('Dieter V2 starts after rendered audio ready', dieterV2.playheadStartPolicy === 'after-rendered-audio-ready', dieterV2);

const donatello = resolveCarrierLoopBodyReadinessContract('donatello-formant-window-body');
check('Donatello keeps render-body registry id', donatello.renderBodyId === 'donatello-formant-window-body', donatello);
check('Donatello root-follow is formant material body', donatello.rootFollow.bodyClass === 'donatello-formant-material-body', donatello.rootFollow);
check('Donatello root-follow preserves formant plan', donatello.rootFollow.mustPreserveFormantPlan === true, donatello.rootFollow);
check('Donatello root-follow remains material-flowing', donatello.rootFollow.rootFollowMembershipConfig === 'material-flowing', donatello.rootFollow);
check('Donatello does not build synthetic root-follow', donatello.shouldBuildSyntheticRootFollow === false, donatello);

for (const machineId of ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
  const contract = byId.get(machineId);
  check(`${machineId} contract present`, Boolean(contract), contract);
  check(`${machineId} stays synthetic root-follow config`, contract?.rootFollow.bodyClass === 'synthetic-root-follow-config-body', contract?.rootFollow);
  check(`${machineId} keeps synthetic root-follow builder`, contract?.shouldBuildSyntheticRootFollow === true, contract);
}

const donor = byId.get('donor-timbre-embodiment');
check('Donor embodiment remains explicitly contract-only', donor?.status === 'contract-only', donor);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  machineCount: contracts.length,
  statuses: contracts.reduce<Record<string, number>>((acc, contract) => {
    acc[contract.status] = (acc[contract.status] ?? 0) + 1;
    return acc;
  }, {}),
}, null, 2));
