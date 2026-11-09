#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  lens: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreLens.ts',
  config: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreRenderConfig.ts',
  direct: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts',
  modes: 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts',
  panel: 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx',
  registry: 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts',
};

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const must = (file, needle, label = needle) => {
  if (!read(file).includes(needle)) failures.push(`${file} missing ${label}`);
};
const mustNot = (file, needle, label = needle) => {
  if (read(file).includes(needle)) failures.push(`${file} unexpectedly contains ${label}`);
};
const mustMatch = (file, pattern, label = pattern.toString()) => {
  if (!pattern.test(read(file))) failures.push(`${file} missing ${label}`);
};

must(files.lens, "| 'inharmonic';", 'inharmonic series type');
must(files.lens, 'CarrierIntegralHarmonicXploreTimbreFlavor', 'timbre flavor type');
for (const profileId of [
  'harmonic-xplore-resonator-body',
  'harmonic-xplore-scatter-body',
  'harmonic-xplore-metallic-inharmonic',
]) must(files.lens, profileId, `profile ${profileId}`);
must(files.lens, "profile.seriesType === 'numOdd'", 'numOdd oscillator mapping');
must(files.lens, "profile.seriesType === 'inharmonic'", 'inharmonic oscillator mapping');
must(files.config, "value === 'inharmonic'", 'render config normalizes inharmonic');

must(files.direct, 'seededSignedUnit', 'deterministic seeded swarm helper');
must(files.direct, 'formantEnergy', 'formant energy helper');
must(files.direct, 'applyHarmonicXploreFlavorTilt', 'flavor tilt helper');
must(files.direct, "profile.timbreFlavor ?? 'plain'", 'profile flavor read');
must(files.direct, 'vSwarmCents', 'deterministic voice swarm offsets');
must(files.direct, 'phaseOffsets', 'deterministic phase offsets');
must(files.direct, "'flat-hearing-flavor-tilt-v1'", 'direct engine key flavor marker');
mustNot(files.direct, 'Math.random()', 'non-deterministic render randomness');

must(files.modes, 'SPECTRAL_FORGE_BASIS_HEARING_OPTIONS', 'flat hearing option list');
for (const optionId of [
  'harmonic-xplore',
  'harmonic-xplore-resonator',
  'harmonic-xplore-scatter',
  'harmonic-xplore-metallic',
]) must(files.modes, `id: '${optionId}'`, `hearing option ${optionId}`);
mustNot(files.modes, '↳', 'visual hierarchy arrow');
mustNot(files.modes, 'SPECTRAL_FORGE_BASIS_HEARING_MODE_GROUPS', 'grouped hearing list');

must(files.panel, 'selectAndPreviewHearingOption', 'option-based preview selector');
must(files.panel, 'normalizeCarrierIntegralHarmonicXplorePatch', 'direct next-harmonic-xplore state calculation');
must(files.panel, 'harmonicXploreProfileId', 'profile-aware active state');
must(files.panel, 'data-spectral-forge-basis-hearing-profile', 'profile data hook for sanity tests');
must(files.panel, 'playSpectralForgeBasisHearingPreview', 'preview route still used');

must(files.registry, 'Resonator-/Scatter-/Metallisch-Profile ohne neue Maschinen-IDs', 'registry summary notes no new machines');
for (const forbiddenMachine of [
  "id: 'harmonic-xplore-resonator'",
  "id: 'harmonic-xplore-scatter'",
  "id: 'harmonic-xplore-metallic'",
]) mustNot(files.registry, forbiddenMachine, `new machine id ${forbiddenMachine}`);

if (failures.length) {
  console.error('[harmonic-xplore-flat-hearing-flavors] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[harmonic-xplore-flat-hearing-flavors] PASS');
console.log('- HarmonicXplorE gained deterministic Resonator/Scatter/Metallisch profile flavors.');
console.log('- The UI exposes them as flat hearing aliases without new machine ids.');
console.log('- Direct render remains deterministic: no Math.random() in the render path.');
