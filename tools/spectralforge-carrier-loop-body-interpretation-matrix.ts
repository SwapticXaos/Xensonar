import {
  assertCarrierLoopBodyInterpretationMatrix,
  CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID,
  CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION,
  isCarrierLoopBodyExperimentalPeerMachine,
  listCarrierLoopBodyInterpretationMatrix,
  resolveCarrierLoopBodyInterpretationEntry,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyInterpretationMatrix';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

assertCarrierLoopBodyInterpretationMatrix();
const matrix = listCarrierLoopBodyInterpretationMatrix();
const byId = new Map(matrix.map((entry) => [entry.machineId, entry]));

const antonia = resolveCarrierLoopBodyInterpretationEntry('branch-a-line-traffic');
const bert = resolveCarrierLoopBodyInterpretationEntry('branch-b573-synth-window');
const cecilia = resolveCarrierLoopBodyInterpretationEntry('branch-c-interval-body');

check('Matrix exposes all machine entries', matrix.length >= 8, matrix.map((entry) => entry.machineId));
check('Version is stable', cecilia.version === CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION, cecilia);
check('Antonia is peer', antonia.peerGroupId === CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID && antonia.peerStatus === 'equal-experimental-peer', antonia);
check('Bert is peer', bert.peerGroupId === CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID && bert.peerStatus === 'equal-experimental-peer', bert);
check('Cecilia is peer', cecilia.peerGroupId === CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID && cecilia.peerStatus === 'equal-experimental-peer', cecilia);
check('Antonia experimental helper returns true', isCarrierLoopBodyExperimentalPeerMachine('branch-a-line-traffic') === true);
check('Dieter V2 experimental helper returns false', isCarrierLoopBodyExperimentalPeerMachine('material-render-body') === false);
check('Cecilia is first implemented adapter without UI hierarchy claim', cecilia.adapterStatus === 'implemented' && cecilia.ownershipClaim === 'first-adapter-not-exclusive-owner', cecilia);
check('Cecilia preview is direct version path', cecilia.previewRequestFlag === 'cecilia-default-version-path' && cecilia.previewSupport === 'cecilia-version-preview-candidate', cecilia);
check('Antonia does not inherit Branch C hook', antonia.previewRequestFlag === null && antonia.adapterStatus === 'planned-distinct-line-adapter', antonia);
check('Bert does not inherit Branch C hook', bert.previewRequestFlag === null && bert.adapterStatus === 'planned-compatible-window-adapter', bert);
check('Only Cecilia is implemented adapter', matrix.filter((entry) => entry.adapterStatus === 'implemented').map((entry) => entry.machineId).join(',') === 'branch-c-interval-body');
check('Donatello remains separate formant body family', byId.get('donatello-formant-window-body')?.interpretationLayer === 'formant-body-reading' && byId.get('donatello-formant-window-body')?.adapterStatus === 'separate-body-family', byId.get('donatello-formant-window-body'));
check('Dieter V2 remains separate rendered material family', byId.get('material-render-body')?.interpretationLayer === 'rendered-material-body-reading' && byId.get('material-render-body')?.adapterStatus === 'separate-body-family', byId.get('material-render-body'));
check('Pure Dieter remains separate raw material family', byId.get('raw-darkpsy-oscillator')?.interpretationLayer === 'raw-material-body-reading' && byId.get('raw-darkpsy-oscillator')?.adapterStatus === 'separate-body-family', byId.get('raw-darkpsy-oscillator'));
check('Donor embodiment remains contract only', byId.get('donor-timbre-embodiment')?.adapterStatus === 'contract-only' && byId.get('donor-timbre-embodiment')?.previewSupport === 'none', byId.get('donor-timbre-embodiment'));

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  version: CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION,
  peerGroup: CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID,
}, null, 2));
