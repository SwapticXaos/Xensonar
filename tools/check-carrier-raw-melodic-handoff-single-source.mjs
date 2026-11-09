import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const forbidRegex = (source, regex, message) => {
  if (regex.test(source)) failures.push(message);
};

const rawHandoff = read('src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts');
const pkg = JSON.parse(read('package.json'));

requireText(
  rawHandoff,
  'CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_IDS',
  'raw melodic handoff machines must be declared in an exported id list.',
);
requireText(
  rawHandoff,
  'as const satisfies readonly CarrierIntegralMachineId[]',
  'raw melodic handoff id list must be type-checked against CarrierIntegralMachineId.',
);
requireText(
  rawHandoff,
  'RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_ID_SET.has(machineId)',
  'raw melodic handoff predicate must use the shared id set.',
);
requireText(
  rawHandoff,
  'Record<\n  CarrierIntegralRawMelodicMaterialHandoffMachineId,\n  CarrierIntegralRawMelodicMaterialHandoffSpec\n>',
  'raw melodic handoff specs must be keyed by the shared handoff id union.',
);
forbidRegex(
  rawHandoff,
  /machineId\s*===\s*"raw-darkpsy-oscillator"\s*\|\|[\s\S]*?machineId\s*===\s*"harmonic-xplore-direct-carrier"\s*\|\|[\s\S]*?machineId\s*===\s*"strange-attractor-schwarmkoerper"/,
  'raw melodic handoff predicate must not duplicate the machine set as a manual OR-chain.',
);

for (const machineId of [
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'spektral-synthese-body',
  'strange-attractor-schwarmkoerper',
]) {
  requireText(rawHandoff, `"${machineId}"`, `${machineId} must remain in the shared id list/spec table.`);
  requireText(rawHandoff, `${machineId}": {`, `${machineId} must have a raw melodic handoff spec.`);
}

if (!/^3\.2\.91-7\.(?:5\.15[1-9]|7\.[89]|[8-9]\.\d+)$/.test(pkg.version)) {
  failures.push(`package version must preserve or advance the 7.5.151 raw melodic handoff line, got ${pkg.version}`);
}
if (pkg.scripts?.['xensonar:check-carrier-raw-melodic-handoff-single-source'] !== 'node tools/check-carrier-raw-melodic-handoff-single-source.mjs') {
  failures.push('package script missing for raw melodic handoff single-source guard.');
}

if (failures.length > 0) {
  console.error('[carrier-raw-melodic-handoff-single-source] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[carrier-raw-melodic-handoff-single-source] OK');
