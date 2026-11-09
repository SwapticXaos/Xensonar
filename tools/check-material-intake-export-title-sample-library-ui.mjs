import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][check-material-intake-export-title-sample-library-ui] FAIL: ${message}`);
    process.exit(1);
  }
}

const panel = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
const types = read('src/features/l3lab/materialIntake/types.ts');
const controller = read('src/features/l3lab/materialIntake/useMaterialIntakeController.ts');
const raw = read('src/features/l3lab/materialIntake/adapters/target/rawXensonarTargetAdapter.ts');
const root = read('src/features/l3lab/materialIntake/adapters/target/rawRootFollowTargetAdapter.ts');
const sampleIntake = read('src/features/l3lab/melodicSamples/melodicSampleIntake.ts');
const sampleLibrary = read('src/features/l3lab/canonicalForge/MelodicSampleLibraryPanel.tsx');
const inspector = read('src/features/l3lab/canonicalForge/SampleInspectorMenu.tsx');
const sampleStore = read('src/features/l3lab/canonicalForge/melodicSampleLibrary.ts');

assert(types.includes('exportTitle?: string | null'), 'CommittedLoopPayload muss exportTitle tragen.');
assert(panel.includes('Loop/Sample betiteln'), 'MaterialIntakePanel muss das echte Titel-Feld anzeigen.');
assert(panel.includes('effectiveLoopSampleTitle'), 'MaterialIntakePanel muss einen effektiven Titel für leere Eingaben berechnen.');
assert(panel.includes('sendRawToTarget(effectiveLoopSampleTitle)'), 'Materialspur-Rohsendung muss den Titel verwenden.');
assert(panel.includes('sendRawToAdapter(rawRootFollowTargetAdapter') && panel.includes('effectiveLoopSampleTitle'), 'Root-Follow-Sendung muss den Titel verwenden.');
assert(panel.includes('sendRawToAdapter(rawMelodicSampleTargetAdapter') && panel.includes('effectiveLoopSampleTitle'), 'Sample-Sendung muss den Titel verwenden.');
assert(!panel.includes('<span className="block uppercase tracking-[0.18em] text-neutral-500">Tempo</span>'), 'Altes editierbares Tempo-Feld darf nicht mehr im MaterialIntake stehen.');
assert(panel.includes('Ursprüngliches Tempo') && panel.includes('aus ${exportMeta.bars} Takt'), 'MaterialIntake muss Tempo nur berechnet anzeigen.');
assert(controller.includes('exportTitle?: string | null') && controller.includes('exportTitle: exportTitle?.trim() || null'), 'Controller muss exportTitle in Raw-Commit-Payload schreiben.');
assert(raw.includes('payload.exportTitle?.trim() || meta.name') && root.includes('payload.exportTitle?.trim() || meta.name'), 'Materialspur- und RootFollow-Adapter müssen exportTitle vor meta.name bevorzugen.');
assert(sampleIntake.includes('payload.exportTitle?.trim()') && !sampleIntake.includes('startLabel'), 'Sample-Intake darf nicht mehr ausschließlich automatische Zeitbereichsnamen bauen.');
assert(sampleLibrary.includes('sampleLibraryOpen') && sampleLibrary.includes('Ausklappen') && sampleLibrary.includes('Einklappen'), 'Sample-Datenbank muss einklappbar sein.');
assert(inspector.includes('onRenameSample') && inspector.includes('Umbenennen') && inspector.includes('min-w-[560px]'), 'Sample-Inspector muss Umbenennen anbieten und breiter sein.');
assert(sampleStore.includes('name?: string') && sampleStore.includes("Object.prototype.hasOwnProperty.call(updates, 'name')"), 'Sample-Meta-Update muss Name persistieren können.');

console.log('[xensonar][check-material-intake-export-title-sample-library-ui] PASS');
