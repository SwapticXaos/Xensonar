import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const panel = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
const room = read('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const adapter = read('src/features/l3lab/materialIntake/adapters/target/rawMelodicPinkLaneTargetAdapter.ts');
const rawTarget = read('src/features/l3lab/materialIntake/adapters/target/rawXensonarTargetAdapter.ts');
const runtime = read('src/features/l3lab/canonicalForge/useMaterialIntakeRawMelodicHandoffRuntime.ts');
const gateway = read('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts');
const events = read('src/features/xensonar/runtime/xensonarEventChannels.ts');
const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');

const checks = [
  ['button label', panel.includes('Als pinke Spur nach Melodic Loop senden')],
  ['pink button tone', panel.includes('tone="pink"') && panel.includes("'raw-melodic-pink'")],
  ['room adapter wiring', room.includes('rawMelodicPinkLaneTargetAdapter={rawMelodicPinkLaneTargetAdapter}')],
  ['raw registration helper shared with Materialspur route', rawTarget.includes('export function registerRawSelectionAsMaterialEntry') && adapter.includes('registerRawSelectionAsMaterialEntry(payload)')],
  ['direct route uses generic raw intake contract', adapter.includes('MATERIAL_INTAKE_PENDING_RAW_MELODIC_SESSION_KEY') && adapter.includes("source: 'spectral-forge-raw-audio'")],
  ['direct route does not use carrier handoff', !adapter.includes('CarrierIntegral') && !adapter.includes('carrierIntegral') && !runtime.includes('CarrierIntegral') && !runtime.includes('carrierIntegral')],
  ['typed event channel', events.includes("materialIntakeRawMelodicImport: 'xensonar:material-intake-raw-melodic-import'")],
  ['switches to Melodic Loop', adapter.includes("dispatchXensonarEvent('openCanonicalMelodicLoop'")],
  ['handoff delegates same material entry to shared import policy', runtime.includes('args.onReadyToImport(entry, current.anchorHz)') && gateway.includes('requestImportLane({')],
  ['gateway mounts direct raw runtime', gateway.includes('useMaterialIntakeRawMelodicHandoffRuntime({')],
  ['pink material basis remains canonical pink', workflow.includes("export const MATERIAL_BASE_TRACK_COLOR = '#ec4899'")],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`PASS: material-intake raw audio -> Melodic Loop pink lane direct path (${checks.length}/${checks.length})`);
