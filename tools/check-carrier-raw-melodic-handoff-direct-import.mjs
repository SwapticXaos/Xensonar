import fs from 'node:fs';

const panelPath = 'src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts';
const actionsPath = 'src/features/l3lab/canonicalForge/materialBaseActions.ts';
const panel = fs.readFileSync(panelPath, 'utf8');
const handoff = fs.readFileSync('src/features/l3lab/canonicalForge/useCarrierMelodicImportHandoffRuntime.ts', 'utf8');
const executor = fs.readFileSync('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'utf8');
const transactions = fs.readFileSync('src/features/l3lab/canonicalForge/melodicImportTransactions.ts', 'utf8');
const actions = fs.readFileSync(actionsPath, 'utf8');

function mustContain(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[carrier-raw-melodic-handoff-direct-import] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNotContain(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`[carrier-raw-melodic-handoff-direct-import] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

mustContain(panel, 'pendingRawCarrierMaterialHandoff', 'pending raw material handoff state');
mustContain(panel, 'queueRawCarrierMaterialForDirectImport', 'raw material menu queue callback');
mustContain(handoff, "listenXensonarEvent('carrierIntegralRawMaterialMelodicExport'", 'raw melodic event listener');
mustContain(handoff, "window.sessionStorage.getItem(pendingKey)", 'pending raw session read');
mustContain(panel, "setCarrierPinkVariant('grained')", 'raw event preselects Raw Audio mode');
mustContain(panel, 'setShowMaterialImportMenu(true)', 'raw event opens shared import dialog');
mustContain(transactions, 'executeCarrierMelodicImport({', 'confirmed import delegates to shared executor transaction');
mustContain(executor, 'await args.onImportMaterialToMelodicLoop(entry.id, args.anchorHz, args.lanePlacement)', 'confirmed raw material import into melodic loop');
mustContain(panel, 'window.sessionStorage.removeItem(CARRIER_INTEGRAL_PENDING_RAW_MATERIAL_MELODIC_SESSION_KEY)', 'pending raw handoff cleared by shared cleanup after confirmed import');
mustContain(panel, 'Raw-Audio-Carrier gewählt · bestätige Raw Audio', 'manual raw confirmation status');
mustNotContain(panel, 'rawCarrierAutoImportInFlightRef', 'old raw auto-import in-flight guard');
mustNotContain(panel, 'Rohmaterial wird direkt als pinke Materialbasis eingesetzt', 'old direct raw import status');

mustContain(actions, "materialPitchMode: rawCarrierMaterial ? 'source-granular' : 'grid-elastic'", 'raw carrier material remains source-granular');
mustContain(actions, 'applyMaterialBaseImportToDraft(draft', 'raw material still uses material base draft import');
mustNotContain(actions, 'Audio-Paint nutzt den Pinkspur-Pfad, nicht den Raw-Audio-Import.', 'audio-paint bodies are allowed in explicit Raw Audio mode');

console.log('[carrier-raw-melodic-handoff-direct-import] PASS: raw handoff now queues the shared import menu and imports only after confirmation.');
