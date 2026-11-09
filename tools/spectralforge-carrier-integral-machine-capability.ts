import {
  assertCarrierIntegralMachineCapabilities,
  CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID,
  CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION,
  isCarrierIntegralExperimentalReadingMachine,
  listCarrierIntegralMachineCapabilities,
  resolveCarrierIntegralMachineCapability,
} from '../src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

assertCarrierIntegralMachineCapabilities();
check('Capability version is 9.174 boundary', CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION.includes('3.2.91.6.9.174'));

const capabilities = listCarrierIntegralMachineCapabilities();
check('All registered machines expose capabilities', capabilities.length >= 8, capabilities.map((capability) => capability.machineId));
check('Capability machines are unique', new Set(capabilities.map((capability) => capability.machineId)).size === capabilities.length, capabilities.map((capability) => capability.machineId));

for (const machineId of ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  check(`${machineId} is experimental peer`, isCarrierIntegralExperimentalReadingMachine(machineId) === true, capability);
  check(`${machineId} shares peer group`, capability.experimentalPeerGroupId === CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID, capability);
  check(`${machineId} is synthetic config body`, capability.bodyKind === 'synthetic-root-follow-config-body', capability);
  check(`${machineId} does not require material body`, capability.requiresMaterialBody === false, capability);
  check(`${machineId} does not require formant plan`, capability.requiresFormantPlan === false, capability);
}

const antonia = resolveCarrierIntegralMachineCapability('branch-a-line-traffic');
check('Antonia has distinct future line adapter', antonia.adapterCapability === 'planned-distinct-line-adapter', antonia);
check('Antonia has future adapter preview capability', antonia.previewCapability === 'future-adapter-preview-candidate', antonia);

const bert = resolveCarrierIntegralMachineCapability('branch-b573-synth-window');
check('Bert has compatible future window adapter', bert.adapterCapability === 'planned-compatible-window-adapter', bert);
check('Bert has branch-b curve source kind', bert.curveSourceKind === 'branch-b573-synth-window-body-plan', bert);

const cecilia = resolveCarrierIntegralMachineCapability('branch-c-interval-body');
check('Cecilia is first implemented adapter', cecilia.adapterCapability === 'implemented-branch-c-carrier-loop-body-adapter', cecilia);
check('Cecilia uses branch-c curve source', cecilia.curveSourceKind === 'branch-c-interval-window-body-plan', cecilia);
check('Cecilia does not own CarrierLoopBody exclusively', cecilia.ownershipCapability === 'first-adapter-not-exclusive-owner', cecilia);
check('Cecilia preview is candidate not default UI concept', cecilia.previewCapability === 'cecilia-version-preview-candidate', cecilia);

const pure = resolveCarrierIntegralMachineCapability('raw-darkpsy-oscillator');
check('Pure Dieter is raw body family', pure.bodyKind === 'raw-material-body' && pure.adapterCapability === 'separate-body-family', pure);
check('Pure Dieter root-follow allowed', pure.supportsRootFollowSend === true, pure);
check('Pure Dieter material track allowed', pure.supportsMaterialTrackSend === true, pure);
check('Pure Dieter melodic direct raw material allowed', pure.supportsMelodicDirectSend === true, pure);

const dieter = resolveCarrierIntegralMachineCapability('material-render-body');
check('Dieter V2 is rendered material family', dieter.bodyKind === 'rendered-material-body' && dieter.adapterCapability === 'separate-body-family', dieter);
check('Dieter V2 requires material body', dieter.requiresMaterialBody === true, dieter);
check('Dieter V2 does not require formant plan', dieter.requiresFormantPlan === false, dieter);

const donatello = resolveCarrierIntegralMachineCapability('donatello-formant-window-body');
check('Donatello is formant family', donatello.bodyKind === 'formant-window-body' && donatello.adapterCapability === 'separate-body-family', donatello);
check('Donatello requires formant plan', donatello.requiresFormantPlan === true, donatello);
check('Donatello has formant curve source kind', donatello.curveSourceKind === 'donatello-formant-plan', donatello);

const donor = resolveCarrierIntegralMachineCapability('donor-timbre-embodiment');
check('Donor embodiment is contract-only', donor.contractOnly === true && donor.rendererReadiness === 'contract-only', donor);
check('Donor embodiment is not render ready', donor.renderReady === false, donor);
check('Donor embodiment requires donor atlas', donor.requiresDonorAtlas === true, donor);

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  version: CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION,
  machines: capabilities.map((capability) => ({
    machineId: capability.machineId,
    bodyKind: capability.bodyKind,
    adapterCapability: capability.adapterCapability,
    previewCapability: capability.previewCapability,
    rendererReadiness: capability.rendererReadiness,
  })),
}, null, 2));
