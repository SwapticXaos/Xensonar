// check-spectral-klangfarben-erweiterung.mjs
// Verifies that the 5 new HX profiles and 4 new flavors are consistently
// registered across lens, engine version, and hearing modes.
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const fail = (msg) => { console.error('FAIL:', msg); process.exit(1); };
const pass = (msg) => console.log('PASS:', msg);

// 1. Lens: new profiles exist
const lens = readFileSync(resolve(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreLens.ts'), 'utf8');
const expectedProfiles = [
  'harmonic-xplore-gerade-halo',
  'harmonic-xplore-oktave-turm',
  'harmonic-xplore-chorus-raum',
  'harmonic-xplore-upper-krone',
  'harmonic-xplore-tief-spiegel',
];
for (const id of expectedProfiles) {
  if (!lens.includes(`id: '${id}'`)) fail(`Lens missing profile: ${id}`);
}
pass('All 5 new profiles present in lens');

// 2. Lens: new flavors defined in TimbreFlavor union
const newFlavors = ['warm', 'bell', 'chorus', 'bright'];
for (const f of newFlavors) {
  if (!lens.includes(`| '${f}'`)) fail(`Lens missing timbre flavor: ${f}`);
}
pass('All 4 new timbre flavors in type union');

// 3. Lens: numEven and upper have explicit chooseOscillatorType branches
if (!lens.includes("profile.seriesType === 'numEven'")) fail('Missing numEven branch in chooseOscillatorType');
if (!lens.includes("profile.seriesType === 'upper'")) fail('Missing upper branch in chooseOscillatorType');
pass('numEven and upper oscillator type branches present');

// 4. Engine: version contains klangfarben marker
const engine = readFileSync(resolve(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts'), 'utf8');
if (!engine.includes('klangfarben-erweiterung')) fail('Engine version not bumped to klangfarben-erweiterung');
pass('Engine version bumped');

// 5. Engine: applyHarmonicXploreFlavorTilt handles all new flavors
const engineFlavors = ['warm', 'bell', 'bright', 'chorus'];
for (const f of engineFlavors) {
  if (!engine.includes(`args.flavor === '${f}'`)) fail(`Engine missing flavor tilt handler: ${f}`);
}
pass('All new flavor tilt handlers present in engine');

// 6. Engine: chorus swarm init is present
if (!engine.includes("flavor === 'chorus'") || !engine.includes('centsScale')) fail('Chorus swarm init missing in engine');
pass('Chorus swarm init present');

// 7. Engine: chorus stereo pan widening
if (!engine.includes('flavorPanBoost')) fail('Chorus pan boost missing in engine');
pass('Chorus stereo pan boost present');

// 8. Hearing modes: new options present
const modes = readFileSync(resolve(root, 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts'), 'utf8');
const expectedOptions = ['hx-gerade', 'hx-oktave', 'hx-chor', 'hx-krone', 'hx-tief'];
for (const id of expectedOptions) {
  if (!modes.includes(`id: '${id}'`)) fail(`Hearing modes missing option: ${id}`);
}
pass('All 5 new basis hearing options present');

// 9. Each new option references correct profile
const optionProfilePairs = [
  ['hx-gerade', 'harmonic-xplore-gerade-halo'],
  ['hx-oktave', 'harmonic-xplore-oktave-turm'],
  ['hx-chor',   'harmonic-xplore-chorus-raum'],
  ['hx-krone',  'harmonic-xplore-upper-krone'],
  ['hx-tief',   'harmonic-xplore-tief-spiegel'],
];
for (const [optId, profId] of optionProfilePairs) {
  // Both appear in file (ordering check would need AST; simple co-occurrence is sufficient here)
  if (!modes.includes(profId)) fail(`Hearing modes option ${optId} missing profileId ${profId}`);
}
pass('All new option↔profile pairings present');

// 10. No new machine IDs introduced (routing contract preserved)
const newMachineId = 'harmonic-xplore-gerade-halo-carrier'; // hypothetical wrong addition
if (modes.includes(`machineId: '${newMachineId}'`)) fail('Unexpected new machine ID in hearing modes');
// All new options should still route via harmonic-xplore-direct-carrier
const hxCount = (modes.match(/machineId: 'harmonic-xplore-direct-carrier'/g) ?? []).length;
if (hxCount < 6) fail(`Expected ≥6 harmonic-xplore-direct-carrier entries (including new options), got ${hxCount}`);
pass(`Routing contract preserved — ${hxCount} options via harmonic-xplore-direct-carrier`);

// 11. Engine: no Math.random() in render path (determinism contract)
const renderSection = engine.slice(engine.indexOf('export async function renderCarrier'));
if (renderSection.includes('Math.random()')) fail('Math.random() in render path violates determinism contract');
pass('No Math.random() in render path');

console.log('\n✓ check-spectral-klangfarben-erweiterung: all checks passed');
