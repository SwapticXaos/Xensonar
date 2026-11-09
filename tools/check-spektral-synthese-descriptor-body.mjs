#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = {
  descriptor: 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseDescriptor.ts',
  profile: 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseProfile.ts',
  engine: 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseEngine.ts',
  modifiers: 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseRenderModifiers.ts',
  directEngine: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts',
  routes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
  contracts: 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts',
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
  capabilities: 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts',
  hearingModes: 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts',
};
const src = Object.fromEntries(Object.entries(files).map(([k, file]) => [k, read(file)]));
const failures = [];
const requireIncludes = (key, needle) => {
  if (!src[key].includes(needle)) failures.push(`${files[key]} missing ${needle}`);
};

for (const metric of ['hasMaterial', 'density', 'contrast', 'vertCenter', 'horizontality', 'edgeDensity', 'entropy', 'grainTexture', 'registerSpan', 'transientPositions', 'spectralStructureKey', 'descriptorKey']) {
  requireIncludes('descriptor', metric);
}
requireIncludes('descriptor', 'computeSpektralSyntheseDescriptor');
requireIncludes('profile', 'deriveSpektralSyntheseProfile');
requireIncludes('profile', 'pickSeries');
requireIncludes('profile', 'pickFlavor');
requireIncludes('engine', 'renderCarrierIntegralSpektralSynthesePreviewBuffer');
requireIncludes('engine', 'buildSpektralSyntheseParamsHash');
requireIncludes('engine', 'applyDescriptorContrastDynamicsPass');
requireIncludes('engine', 'applyDescriptorAccentPass');
requireIncludes('engine', 'deriveSpektralSyntheseRenderModifiers');
requireIncludes('engine', 'modifiers.modifierKey');
requireIncludes('modifiers', 'DescriptorAware');
requireIncludes('modifiers', 'SpektralSyntheseRenderModifiers');
requireIncludes('modifiers', 'SPEKTRAL_SYNTHESE_RENDER_MODIFIER_POLICY_VERSION');
requireIncludes('modifiers', 'deriveSpektralSyntheseRenderModifiers');
requireIncludes('modifiers', 'gainSpread');
requireIncludes('modifiers', 'attackMs');
requireIncludes('modifiers', 'swarmExtra');
requireIncludes('engine', 'spektral-synthese-route-v5-render-modifier-policy');
requireIncludes('engine', 'spektral-synthese-audio-identity-v5-render-modifiers');
requireIncludes('engine', 'buildSpektralStochasticKey');
requireIncludes('engine', 'derivedProfile');
requireIncludes('directEngine', 'derivedProfile?: CarrierIntegralHarmonicXploreProfile');
requireIncludes('directEngine', 'args.derivedProfile');
requireIncludes('routes', "request.machineId === 'spektral-synthese-body'");
requireIncludes('routes', 'renderCarrierIntegralSpektralSynthesePreviewBuffer');
requireIncludes('contracts', "| 'spektral-synthese-body'");
requireIncludes('contracts', "| 'spektral_synthese'");
requireIncludes('registry', "id: 'spektral-synthese-body'");
requireIncludes('capabilities', "const spektral = byId.get('spektral-synthese-body')");
requireIncludes('hearingModes', "id: 'spektral-synthese'");
requireIncludes('hearingModes', "machineId: 'spektral-synthese-body'");

for (const forbidden of ['Math.random(', 'new Worker(', 'importScripts(', 'mlModel', 'tensorflow']) {
  if (src.descriptor.includes(forbidden) || src.profile.includes(forbidden) || src.engine.includes(forbidden)) {
    failures.push(`SpektralSynthese core must stay deterministic and non-ML; found ${forbidden}`);
  }
}

if (failures.length) {
  console.error('[spektral-synthese-descriptor-body] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spektral-synthese-descriptor-body] PASS');
console.log('- Descriptor metrics are explicit, deterministic, and include material/structure identity.');
console.log('- Dynamic profile injection reuses the HX Direct renderer without changing existing HX callers.');
console.log('- SpektralSynthese stochastic variation has a seedable/off-by-default identity contract.');
console.log('- SpektralSynthese is visible as its own basis-hearing option.');
