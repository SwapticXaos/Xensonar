import fs from 'node:fs';

const panelPath = 'src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts';
const executePhasesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts';
const panel = fs.readFileSync(panelPath, 'utf8');
const executor = fs.readFileSync('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'utf8');
const transactions = fs.readFileSync('src/features/l3lab/canonicalForge/melodicImportTransactions.ts', 'utf8');
const executePhases = fs.readFileSync(executePhasesPath, 'utf8');

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[carrier-pink-handoff-direct-apply] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function forbidText(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`[carrier-pink-handoff-direct-apply] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

requireText(executePhases, 'storeCarrierIntegralAudioPaintImportDetail(registeredMaterial.audioPaintImportDetail)', 'session/registry persistence before melodic pink handoff');
requireText(executePhases, 'dispatchXensonarEvent("carrierIntegralMelodicPinkExport", args.audioPaintImportDetail)', 'melodic pink event dispatch');
requireText(executePhases, 'dispatchXensonarEvent("openCanonicalMelodicLoop"', 'canonical melodic loop open dispatch');

const queueBlock = panel.match(/const queueCarrierPinkExportForImportDialog = React\.useCallback\([\s\S]*?\n\s*\}, \[[^\]]*\]\);/);
if (!queueBlock) {
  console.error('[carrier-pink-handoff-direct-apply] queueCarrierPinkExportForImportDialog block not found');
  process.exit(1);
}
const block = queueBlock[0];
requireText(block, 'setShowMaterialImportMenu(true)', 'carrier pink handoff opens shared import menu');
requireText(block, 'wähle Fretless-Feld, zerstreut, Raw Audio oder monoton', 'four-mode dialog message');
requireText(transactions, 'executeCarrierMelodicImport({', 'confirmation transaction delegates to shared executor');
requireText(transactions, 'requestImportLane', 'confirmation transaction applies the shared multi-import lane policy before execution');
requireText(executor, "availability.kind === 'structured-carrier'", 'confirmed non-raw mode applies structured field detail in executor');
requireText(executor, "resolveCarrierMelodicImportModeAvailability(entry, args.mode)", 'raw audio mode stays explicit through shared resolver in executor');
forbidText(block, 'Audio-Paint direkt eingesetzt', 'old automatic direct apply');
forbidText(block, 'onMutateLoopComposer((draft) =>', 'handoff must not mutate Melodic Loop before the user chooses a mode');
forbidText(block, 'setShowMaterialImportMenu(false)', 'handoff must not close the dialog automatically');

console.log('[carrier-pink-handoff-direct-apply] PASS: carrier pink handoff now opens the shared mode dialog instead of directly applying.');
