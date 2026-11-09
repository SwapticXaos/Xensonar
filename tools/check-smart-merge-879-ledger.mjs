import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const ledgerDoc = path.join(root, 'docs/SMART_MERGE_8_79_FUNCTIONAL_LEDGER_3.2.91.6.9.0.1.md');
const ledgerTs = path.join(root, 'src/features/xensonar/performanceCrisis/performanceCrisisSmartMergeLedger.ts');

for (const file of [ledgerDoc, ledgerTs]) {
  if (!fs.existsSync(file)) failures.push(`missing ${path.relative(root, file)}`);
}

if (fs.existsSync(ledgerDoc)) {
  const text = fs.readFileSync(ledgerDoc, 'utf8');
  for (const needle of [
    'Package Station / import-export repair',
    'Materialspur / “So schneiden?”',
    'Donatello / Dieter / render-body work',
    'Myzel / Raum III synth direction',
    'Partikel / Wellenstarter / simulation extraction',
    'Burst-Diagnose and Browser↔App PaarTherapeut are no longer duplicated',
  ]) {
    if (!text.includes(needle)) failures.push(`ledger doc missing: ${needle}`);
  }
}

if (fs.existsSync(ledgerTs)) {
  const text = fs.readFileSync(ledgerTs, 'utf8');
  for (const id of [
    'package-station-import-export',
    'material-fragmentation-so-schneiden',
    'donatello-dieter-render-bodies',
    'myzel-synth-room3',
    'particle-wave-runtime-binding',
    'burst-diagnosis-browser-app-therapist',
  ]) {
    if (!text.includes(id)) failures.push(`ledger TS missing: ${id}`);
  }
}

if (failures.length) {
  console.error('[smart-merge-879-ledger] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[smart-merge-879-ledger] OK');
