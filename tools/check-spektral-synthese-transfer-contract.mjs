#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = {
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
  capabilities: 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts',
  builders: 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts',
  rawHandoff: 'src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts',
  execution: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts',
  materialLibrary: 'src/features/l3lab/materialLibrary.ts',
  materialSchema: 'src/features/l3lab/materialSchema.ts',
  materialAdapter: 'src/features/l3lab/materialAdapter.ts',
  pinkBridge: 'src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts',
  loopPlan: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan.ts',
  executor: 'src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts',
  fixtures: 'src/features/l3lab/spectralForge/integral/carrierIntegralRoutingFixtures.ts',
};
const src = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const failures = [];
const must = (key, needle, message) => {
  if (!src[key].includes(needle)) failures.push(`${files[key]}: ${message} missing ${needle}`);
};

const spektralBlockStart = src.registry.indexOf("id: 'spektral-synthese-body'");
const spektralBlockEnd = src.registry.indexOf('\n  },', spektralBlockStart);
const spektralBlock = spektralBlockStart >= 0 ? src.registry.slice(spektralBlockStart, spektralBlockEnd) : '';
for (const target of [
  "'root-follow-export': true",
  "'materialspur-export': true",
  "'melodic-pink-export': true",
]) {
  if (!spektralBlock.includes(target)) failures.push(`SpektralSynthese registry targetSupport missing ${target}`);
}

must('capabilities', 'SpektralSynthese must expose Root-Follow export as rendered material/audio body', 'root-follow capability assertion');
must('capabilities', 'SpektralSynthese must expose Materialspur export through the shared rendered-audio transfer contract', 'material capability assertion');
must('capabilities', 'SpektralSynthese must expose Melodic Loop export as raw/granular material handoff', 'melodic capability assertion');

must('builders', "machineId === 'spektral-synthese-body'", 'send contract raw-like/special branch');
must('builders', 'SpektralSynthese geht als gerenderter Descriptor-/Akzent-Klangkörper in Root Follow', 'root-follow contract summary');
must('builders', 'Pinke Spur erhält SpektralSynthese als gerenderten Descriptor-/Akzent-Klangkörper', 'melodic contract summary');

must('rawHandoff', '"spektral-synthese-body"', 'shared raw melodic handoff id');
must('rawHandoff', 'spectralforge-spektral-synthese-raw-melodic-material-3.2.91.7.7.8', 'raw melodic source version');
must('rawHandoff', 'SpektralSynthese wird als der gehörte Descriptor-/Akzent-Klangkörper in die pinke Spur gereicht', 'raw melodic spec summary');

must('execution', 'renderCarrierIntegralSpektralSynthesePreviewBuffer', 'transfer execution renderer import/call');
must('execution', 'args.machineId === "spektral-synthese-body"', 'transfer execution spektral branch');
must('execution', 'renderSpektralSyntheseLastHeardRawMaterialArtifact', 'transfer execution identity helper');
must('execution', 'audioIdentityKey: rendered.summary.directEngineKey', 'spektral/HX transfer body carries direct renderer identity');
must('execution', "audioIdentitySource: 'spektral-synthese-summary'", 'spektral transfer body source marker');
must('execution', 'renderedBody.audioIdentityKey', 'registered material receives transfer audio identity');
must('executor', 'audioIdentityKey: renderedBody.audioIdentityKey', 'transfer result exposes audio identity key');
must('materialLibrary', 'audioIdentityKey?: string', 'material meta stores audio identity key');
must('materialSchema', 'audioIdentityKey?: string', 'material package renderInfo stores audio identity key');
must('materialAdapter', 'audioIdentityKey: meta.audioIdentityKey', 'material package export preserves audio identity key');
must('materialAdapter', 'audioIdentityKey: pkg.renderInfo?.audioIdentityKey', 'material package import restores audio identity key');
must('pinkBridge', 'renderAudioIdentityKey?: string', 'melodic pink handoff carries render audio identity');
must('loopPlan', 'renderAudioIdentityKey?: string', 'audio paint import detail type carries render identity');

must('fixtures', "id: 'spektral-synthese-to-melodic-raw-audio-material'", 'melodic fixture');
must('fixtures', "id: 'spektral-synthese-to-root-follow-material-flowing'", 'root follow fixture');
must('fixtures', "machineId: 'spektral-synthese-body'", 'fixtures machine id');

if (failures.length) {
  console.error('[spektral-synthese-transfer-contract] FAIL');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('[spektral-synthese-transfer-contract] PASS');
console.log('- SpektralSynthese now advertises export targets via registry/capability contracts.');
console.log('- Melodic handoff uses the shared raw/granular material path.');
console.log('- Root Follow/Materialspur render the SpektralSynthese buffer instead of falling back to HX config or Pure Dieter.');
