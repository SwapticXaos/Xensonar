#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const basis = read('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts');
const panel = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralVerwaltenPanelContracts.ts');
const selection = read('src/features/l3lab/spectralForge/integral/carrierIntegralSelection.ts');
const registry = read('src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts');
const machineUi = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts');
const menu = read('src/features/l3lab/spectralForge/integral/carrierIntegralMenuModel.ts');
const runtime = read('src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts');
const pitch = read('src/features/l3lab/spectralForge/integral/carrierIntegralPitchAxisContract.ts');
const archived = read('src/features/l3lab/spectralForge/integral/archive/carrierIntegralArchivedCoreModes.ts');

const activeListMatch = basis.match(/SPECTRAL_FORGE_BASIS_HEARING_MACHINE_IDS[\s\S]*?=\s*\[([\s\S]*?)\];/);
const activeIds = activeListMatch ? Array.from(activeListMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1]) : [];
const activeLabels = Array.from(basis.matchAll(/label:\s*'([^']+)'/g)).map((m) => m[1]);

expect(activeIds.length === 6, `expected 6 active basis hearing ids, got ${activeIds.length}: ${activeIds.join(', ')}`);
expect(activeIds.includes('branch-a-line-traffic'), 'Antonia must use branch-a-line-traffic as the active single Antonia surface.');
expect(!activeIds.includes('legacy-supernote-5.69'), '5.69 Legacy must not be an active basis-hearing id.');
expect(activeLabels.filter((label) => label === 'Antonia').length === 1, `expected exactly one Antonia label, got: ${activeLabels.join(', ')}`);
expect(!/Antonia Voll|Antonia Glatt/.test(basis + machineUi + runtime + registry), 'Active surfaces must not expose Antonia Voll/Glatt labels.');
expect(panel.includes("'branch-a-line-traffic'") && !panel.includes("'legacy-supernote-5.69'"), 'Root-follow audition surface must use Branch-A as Antonia and exclude 5.69 Legacy.');
expect(/const machineId:\s*CarrierIntegralMachineId\s*=\s*'branch-a-line-traffic'/.test(selection), 'Default Carrier Integral selection should be the singular Branch-A Antonia.');
expect(/filter\(\(machine\) => machine\.id !== 'legacy-supernote-5\.69'\)/.test(registry), 'Active machine list should filter 5.69 Legacy.');
expect(/id:\s*'branch-a-line-traffic'[\s\S]*?label:\s*'Antonia'/.test(registry), 'Registry should label Branch-A as Antonia.');
expect(/id:\s*'legacy-supernote-5\.69'[\s\S]*?label:\s*'5\.69 Legacy/.test(registry), 'Registry should keep 5.69 as legacy, not Antonia.');
expect(/abcPaletteMachineIds:\s*\['branch-a-line-traffic',\s*'branch-b573-synth-window',\s*'branch-c-interval-body'\]/.test(menu), 'A/B/C palette should be Branch-A Antonia/Bert/Cecilia.');
expect(/'branch-a-line-traffic':[\s\S]*?label:\s*'Antonia'/.test(runtime), 'Runtime route should expose Branch-A label Antonia.');
expect(/'legacy-supernote-5\.69':[\s\S]*?label:\s*'5\.69 Legacy'/.test(runtime), 'Runtime route should keep 5.69 as legacy label.');
expect(/rootRelativePolytraceModes:\s*\['branch-a-line-traffic',\s*'branch-b573-synth-window',\s*'branch-c-interval-body'\]/.test(pitch), 'Left pitch-axis contract should map Branch-A Antonia/Bert/Cecilia root-relative.');
expect(/CARRIER_INTEGRAL_ARCHIVED_CORE_MODE_IDS[\s\S]*?'legacy-supernote-5\.69'/.test(archived), '5.69 Legacy should be documented as archived core material.');
expect(/CARRIER_INTEGRAL_CORE_MODE_IDS[\s\S]*?'branch-a-line-traffic'/.test(archived), 'Branch-A should be documented as core Antonia material.');

if (failures.length) {
  console.error('[antonia-branch-a-single-surface-7775] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[antonia-branch-a-single-surface-7775] PASS: active Carrier hearing surface exposes exactly one Antonia, mapped to Branch-A; 5.69 remains legacy and Glatt/Voll labels stay absent.');
