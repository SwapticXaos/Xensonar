#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  transport: 'src/features/l3lab/spectralForge/components/TransportBar.tsx',
  audition: 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts',
  storeTypes: 'src/features/l3lab/spectralForge/state/storeTypes.ts',
  storeInitial: 'src/features/l3lab/spectralForge/state/storeInitialState.ts',
  store: 'src/features/l3lab/spectralForge/state/store.ts',
  directPanel: 'src/features/l3lab/spectralForge/components/harmonizerPanel/DirectRendererReferencePanel.tsx',
  directModel: 'src/features/l3lab/spectralForge/components/harmonizerPanel/directRendererReferenceModel.ts',
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
  rawHandoff: 'src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts',
  transfer: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts',
  fixtures: 'src/features/l3lab/spectralForge/integral/carrierIntegralRoutingFixtures.ts',
};
const src = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const failures = [];
function must(key, needle, label = needle) {
  if (!src[key].includes(needle)) failures.push(`${files[key]} missing ${label}`);
}
function mustNot(key, needle, label = needle) {
  if (src[key].includes(needle)) failures.push(`${files[key]} must not contain ${label}`);
}

// Loop truth: store-backed, not local-only remount state.
must('transport', 'const previewLoopEnabled = !!materialExport.loopPreview', 'store-backed previewLoopEnabled');
must('transport', 'updateMaterialExport({ loopPreview:', 'TransportBar writes loopPreview to materialExport');
must('audition', 'loopPreview: !!materialExport.loopPreview', 'Basis-hearing request reads shared loopPreview');
must('audition', 'loopPreview: request.loopPreview', 'Basis-hearing bridge carries loopPreview');

// Progress truth: basis hearing and TransportBar share a bridge so Play button can reflect hearing-option prewarm.
for (const key of ['storeTypes', 'storeInitial', 'store']) must(key, 'basisHearingTransportBridge', `bridge state in ${key}`);
must('audition', 'setBasisHearingTransportBridge', 'audition writes bridge');
must('audition', "phase: 'preparing'", 'audition reports preparing phase');
must('audition', "phase: 'ready'", 'audition reports ready phase');
must('audition', "phase: 'playing'", 'audition reports playing phase');
must('transport', 'basisHearingBridgeFillActive', 'TransportBar uses bridge fill state');
must('transport', 'basisHearingBridgeFillPercent', 'TransportBar maps bridge progress to Playbutton fill');
must('transport', 'transportReadyGate.renderFillActive || basisHearingBridgeFillActive', 'Playbutton fill merges transport gate and bridge');

// SpektralSynthese transfer surface: new hearing modes must not be preview-only citizens.
must('registry', "id: 'spektral-synthese-body'", 'SpektralSynthese registry entry');
for (const target of ["'root-follow-export': true", "'materialspur-export': true", "'melodic-pink-export': true"]) {
  must('registry', target, `SpektralSynthese registry target ${target}`);
}
must('rawHandoff', 'spektral-synthese-body', 'SpektralSynthese raw melodic handoff');
must('transfer', 'renderCarrierIntegralSpektralSynthesePreviewBuffer', 'SpektralSynthese transfer renders own buffer');
must('transfer', 'renderSpektralSyntheseLastHeardRawMaterialBuffer', 'SpektralSynthese transfer helper');
must('fixtures', 'spektral-synthese-to-melodic-raw-audio-material', 'melodic transfer fixture');
must('fixtures', 'spektral-synthese-to-root-follow-material-flowing', 'root-follow transfer fixture');

// Direct Renderer reference must survive as a control body.
must('directPanel', 'Direkt-Renderer (Referenz)', 'Direct Renderer reference label');
must('directModel', 'Körnung direkt', 'Direct Renderer granular direct mode');
must('directModel', 'Ereignis direkt', 'Direct Renderer glyph/event direct mode');
mustNot('directPanel', 'Direkt-Renderer alt', 'legacy/alt Direct Renderer label');

if (failures.length) {
  console.error('[spectralforge-core-runtime-sanity-gate] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spectralforge-core-runtime-sanity-gate] PASS');
console.log('- Loop state is store-backed and shared between TransportBar and basis-hearing audition.');
console.log('- Basis-hearing prewarm progress bridges into the Playbutton fill path.');
console.log('- SpektralSynthese is not preview-only: transfer contracts and fixtures are present.');
console.log('- Direct Renderer remains available as reference path.');
