import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const problems = [];
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) problems.push(`${label} missing: ${needle}`);
};
const forbidText = (haystack, needle, label) => {
  if (haystack.includes(needle)) problems.push(`${label} must not include: ${needle}`);
};

const registry = read('src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts');
const capabilities = read('src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts');
const contracts = read('src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts');
const rawHandoff = read('src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts');
const policy = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyMatrix.ts');
const legacy = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferLegacyPlan.ts');
const execute = read('src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts');
const executePhases = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts');
const panel = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const signalSection = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx');
const fixtures = read('src/features/l3lab/spectralForge/integral/carrierIntegralRoutingFixtures.ts');

for (const machineId of ['raw-darkpsy-oscillator', 'harmonic-xplore-direct-carrier', 'spektral-synthese-body', 'strange-attractor-schwarmkoerper']) {
  const blockStart = registry.indexOf(`id: '${machineId}'`);
  const blockEnd = registry.indexOf('\n  },', blockStart);
  const block = blockStart >= 0 ? registry.slice(blockStart, blockEnd) : '';
  requireText(block, "'melodic-pink-export': true", `${machineId} registry targetSupport`);
  requireText(rawHandoff, machineId, `${machineId} raw melodic shared spec`);
}

requireText(capabilities, 'Pure Dieter melodic direct send must be allowed as raw-audio material handoff.', 'Pure Dieter capability assertion');
requireText(capabilities, 'HarmonicXplorE Direct melodic send must remain allowed as raw-audio material handoff.', 'HarmonicXplorE capability assertion');
requireText(contracts, "machineId === 'raw-darkpsy-oscillator'", 'melodic contract rawLike');
requireText(contracts, "machineId === 'harmonic-xplore-direct-carrier'", 'melodic contract rawLike');
requireText(contracts, "machineId === 'spektral-synthese-body'", 'melodic contract rawLike SpektralSynthese');
requireText(contracts, 'Pinke Spur erhält HarmonicXplorE als gerenderten Raw-Audio-Materialkörper', 'melodic contract HX summary');

requireText(rawHandoff, 'CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_VERSION', 'shared handoff version');
requireText(rawHandoff, 'spectralforge-pure-dieter-raw-melodic-material-3.2.91.7.5.77', 'Pure Dieter source version');
requireText(rawHandoff, 'spectralforge-harmonic-xplore-raw-melodic-material-3.2.91.7.5.150', 'HarmonicXplorE source version');
requireText(rawHandoff, 'spectralforge-spektral-synthese-raw-melodic-material-3.2.91.7.7.8', 'SpektralSynthese source version');
requireText(rawHandoff, 'spectralforge-strange-attractor-raw-melodic-material-3.2.91.7.5.150', 'Strange Attractor source version');
requireText(rawHandoff, 'buildCarrierIntegralRawMelodicMaterialHandoffPlan', 'shared builder');
requireText(rawHandoff, 'uiPanelSummary', 'shared UI panel summary contract');
requireText(rawHandoff, 'uiButtonLabel', 'shared UI button label contract');
requireText(rawHandoff, 'melodicHandoffKind: "raw-material"', 'shared raw handoff kind');
requireText(rawHandoff, 'usesAudioPaintImportDetail: true', 'shared raw handoff keeps audio-paint detail for four-mode import menu');

requireText(policy, 'buildCarrierIntegralRawMelodicMaterialHandoffPlan', 'policy matrix');
forbidText(policy, 'materialEntryKind: harmonicXplore ? "carrier-granular-material" : "raw-oscillator-material"', 'policy matrix duplicated raw/HX body choice');
requireText(legacy, 'resolveCarrierIntegralTransferPolicyPlanFromContext', 'legacy policy adapter');
requireText(legacy, 'CARRIER_INTEGRAL_TRANSFER_LEGACY_PLAN_ADAPTER_VERSION', 'legacy policy adapter version');
forbidText(legacy, 'buildCarrierIntegralRawMelodicMaterialHandoffPlan', 'legacy policy adapter duplicated raw melodic builder');
forbidText(legacy, 'buildCarrierIntegralTransferPlan', 'legacy policy adapter duplicated plan builder');
forbidText(legacy, 'materialEntryKind: harmonicXplore ? "carrier-granular-material" : "raw-oscillator-material"', 'legacy policy adapter duplicated raw/HX body choice');

requireText(execute, 'renderCarrierIntegralTransferBody', 'execute transfer render phase');
requireText(execute, 'dispatchCarrierIntegralTransferSideEffects', 'execute transfer dispatch phase');
requireText(executePhases, 'args.machineId === "harmonic-xplore-direct-carrier"', 'execute phase must keep HX direct buffer branch');
requireText(executePhases, 'args.machineId === "spektral-synthese-body"', 'execute phase must keep SpektralSynthese direct buffer branch');
requireText(executePhases, 'renderCarrierIntegralSpektralSynthesePreviewBuffer', 'execute phase must render SpektralSynthese buffer for any target');
requireText(executePhases, 'renderCarrierIntegralHarmonicXploreDirectPreviewBuffer', 'execute phase must render HX direct buffer for any target');
requireText(executePhases, 'dispatchXensonarEvent("carrierIntegralRawMaterialMelodicExport"', 'execute phase raw material melodic event');
requireText(executePhases, 'PENDING_RAW_CARRIER_TO_MELODIC_KEY', 'execute phase pending raw handoff storage');
forbidText(executePhases, 'args.machineId === "harmonic-xplore-direct-carrier" && args.targetId === "melodic-pink-export" && dispatchXensonarEvent(\'carrierIntegralMelodicPinkExport\'', 'execute phase must not audio-paint HX melodic handoff');

requireText(panel, '<CarrierIntegralSignalSendSection', 'panel signal send section boundary');
requireText(panel, 'data-xensonar-carrier-integral-signal-path="true"', 'panel signal path anchor');
requireText(signalSection, 'Melodic Loop öffnet den gemeinsamen Importdialog', 'signal section shared raw melodic summary text');
requireText(signalSection, 'Fretless-Feld, zerstreut, Raw Audio oder monoton', 'signal section four-mode detail text');
requireText(signalSection, 'data-xensonar-carrier-integral-signal-send-section="true"', 'signal section boundary marker');
requireText(signalSection, 'data-xensonar-carrier-integral-raw-melodic-material-panel="true"', 'signal section shared raw material marker');
requireText(signalSection, 'data-xensonar-carrier-integral-raw-melodic-material-machine', 'signal section shared raw material machine marker');
requireText(signalSection, 'data-xensonar-carrier-integral-raw-melodic-material={viewModel.rawMaterialDataFlag}', 'button shared raw material marker');
forbidText(panel, 'selectedMachine === "harmonic-xplore-direct-carrier"\n                          ? "HarmonicXplorE als gerenderten Raw-Audio-Materialkörper übernehmen"', 'panel duplicated HX/Pure copy branch');
forbidText(panel, 'selectedMachine === "raw-darkpsy-oscillator"\n                            ? "Pure Dieter als gerenderten Raw-Audio-Materialkörper übernehmen"', 'panel duplicated Pure copy branch');
forbidText(panel, 'direktes Melodic-Loop-Senden ist gesperrt', 'panel old Pure block text');

requireText(fixtures, "id: 'harmonic-xplore-to-melodic-raw-audio-material'", 'routing fixture');
requireText(fixtures, "machineId: 'harmonic-xplore-direct-carrier'", 'routing fixture');
requireText(fixtures, "expectedMaterialEntryKind: 'carrier-granular-material'", 'routing fixture');
requireText(fixtures, "expectedRenderSource: 'raw-spectral-buffer'", 'routing fixture');
requireText(fixtures, "expectedMelodicHandoffKind: 'raw-material'", 'routing fixture');
requireText(fixtures, 'kein Audio-Paint-Feldclip', 'routing fixture');

if (problems.length) {
  console.error('[raw-melodic-material-handoff] FAIL');
  for (const problem of problems) console.error('- ' + problem);
  process.exit(1);
}
console.log('[raw-melodic-material-handoff] PASS');
