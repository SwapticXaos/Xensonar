#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));
const requireFile = (path) => { if (!exists(path)) failures.push(`missing file: ${path}`); };
const requireContains = (path, needle) => {
  if (!exists(path)) { failures.push(`missing file for content check: ${path}`); return; }
  if (!read(path).includes(needle)) failures.push(`${path} does not contain required text: ${needle}`);
};
const requireNotContains = (path, needle) => {
  if (exists(path) && read(path).includes(needle)) failures.push(`${path} contains forbidden live-path text: ${needle}`);
};
const requireMissing = (path) => { if (exists(path)) failures.push(`${path} should be removed from live source`); };

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version ?? '').trim();
const expectedVersion = version;
const room = 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx';
const materialPanel = 'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx';
const oldLab = 'docs/legacy/spectralForge/CarrierDonorLab.legacy.tsx';
const artifactBuilder = 'src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts';
const doc = `docs/SPECTRALFORGE_LEGACY_EMBODIMENT_PRUNE_${expectedVersion}.md`;
const manifest = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;

if (version !== expectedVersion) failures.push(`package version ${version} != ${expectedVersion}`);
for (const file of [room, materialPanel, oldLab, artifactBuilder, doc, manifest]) requireFile(file);

requireContains(room, 'onEmbodyTimbre={handleEmbodyTimbreV2}');
requireContains(room, "const workspaceTitle = 'Werkbank + Verkörperungsraum'");
requireContains(room, "const modeDescription = 'Oben wird Gestalt komponiert, mittig Material gewählt, unten lebt die Verkörperung.'");
requireContains(room, 'previewAvailable={frontV2Ready}');
for (const token of [
  'import CarrierDonorLab',
  '<CarrierDonorLab',
  'legacyAnalysisMounted',
  "workspaceMode === 'analysis'",
  'setWorkspaceMode',
  'handleExtractTimbre',
  'handleApplyTimbre',
  'buildLegacyEmbodimentFieldFromPreviewModel',
  'buildCarrierScaffold',
  'allocateDonorOntoScaffold',
  'buildEmbodimentPreviewModel',
  'extractDonorMaterialModel',
  'buildDonorInstrumentModel',
  'commitCarrierDonorScratch',
  'buildBodyFromCarrierDonor',
  'commitEmbodimentToBody',
  'evaluateEmbodimentValidation',
  'setExtractedTimbreModel',
  'setDonorMaterialModel',
  'setEmbodimentPreview',
]) requireNotContains(room, token);

requireContains(materialPanel, 'onEmbodyTimbre ? (');
requireContains(oldLab, 'CarrierDonorLab');
requireNotContains(artifactBuilder, 'CarrierDonorLab');
requireNotContains(artifactBuilder, 'carrierDonorLab');
requireNotContains(artifactBuilder, 'requestCarrierSync');
requireNotContains(artifactBuilder, 'subscribeCarrierSync');
requireMissing('src/features/l3lab/spectralForge/carrierDonor');

requireContains(doc, expectedVersion);
requireContains(doc, 'legacy embodiment state and renderer files are removed from the live src tree');
requireContains(doc, 'Root Follow');
requireContains(doc, 'Wellenstarter-Arp');
requireContains(doc, 'Materialspur export');

if (exists(manifest)) {
  const data = JSON.parse(read(manifest));
  if (data.version !== expectedVersion) failures.push(`${manifest} version ${data.version} != ${expectedVersion}`);
  if (!data.validation?.includes('xensonar:check-spectralforge-legacy-embodiment-prune')) failures.push(`${manifest} validation misses xensonar:check-spectralforge-legacy-embodiment-prune`);
  if (data.runtimeSemantics?.legacyEmbodimentStateRemoved !== true) failures.push(`${manifest} does not record legacyEmbodimentStateRemoved=true`);
}

if (failures.length) {
  console.error('[xensonar-spectralforge-live-path-cleanup] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar-spectralforge-live-path-cleanup] ok');
console.log(JSON.stringify({ version, note: 'SpectralForge live path remains V2-only; old lab and legacy embodiment files are not compiled.' }, null, 2));
