#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const flowPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryActionFlow.ts';
const panelPath = 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx';
const paritySource = 'tools/spectralforge-carrier-integral-library-action-flow-parity.ts';
const outRoot = '.xensonar-checks/carrier-integral-library-action-flow';
const tsconfigPath = `${outRoot}/tsconfig.json`;
const absOutDir = path.join(root, outRoot, 'dist');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-integral-library-action-flow-parity.js');

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const flow = read(flowPath);
const panel = read(panelPath);
const parity = read(paritySource);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

for (const file of [flowPath, panelPath, paritySource]) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

requireText('CarrierIntegralVerwaltenPanel imports library action flow boundary', panel, './carrierIntegralVerwalten/carrierIntegralLibraryActionFlow');
requireText('library action flow boundary', flow, 'resolveCarrierIntegralSaveSuccessFlow');
requireText('library action flow boundary', flow, 'resolveCarrierIntegralDeleteSuccessFlow');
requireText('library action flow boundary', flow, 'resolveCarrierIntegralSelectEntryFlow');
requireText('library action flow boundary', flow, 'resolveCarrierIntegralLoadEntrySuccessFlow');
requireText('library action flow boundary', flow, 'resolveCarrierIntegralApplyStoredValuesSuccessFlow');
requireText('library action flow boundary', flow, 'createCarrierIntegralLibraryActionErrorMessage');
requireText('library action flow boundary', flow, 'removeCarrierIntegralLibraryManualOrderId');

forbidText('CarrierIntegralVerwaltenPanel', panel, 'error instanceof Error\n          ? error.message\n          : "Bibliotheksaktion fehlgeschlagen"');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'setLibraryMessage("gesichert · " + meta.name)');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'setLibraryMessage("gelöscht · " + deletedName)');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'setLibraryMessage("aufgelegt · " + entry.name)');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'setLibraryMessage("geladen · " + entry.name)');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'setLibraryMessage("Werte übernommen · " + entry.name)');
forbidText('CarrierIntegralVerwaltenPanel', panel, 'ids.filter((id) => id !== selectedProjectId)');

for (const marker of [
  'checkedScenarios: checked.length',
  'save success selects new meta and message',
  'delete success uses selected project name',
  'select entry sets right override and clears audition error',
  'apply stored values success selects right override and message',
]) requireText('library action flow parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-library-action-flow-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

fs.rmSync(path.join(root, outRoot), { recursive: true, force: true });
fs.mkdirSync(path.join(root, outRoot), { recursive: true });
const tsconfig = {
  compilerOptions: {
    target: 'ES2022',
    module: 'CommonJS',
    moduleResolution: 'Node',
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, flowPath),
  ],
};
fs.writeFileSync(path.join(root, tsconfigPath), JSON.stringify(tsconfig, null, 2));
fs.mkdirSync(absOutDir, { recursive: true });
fs.writeFileSync(path.join(absOutDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));

try {
  execFileSync(process.execPath, [resolveTypeScriptCliPath(), '-p', tsconfigPath], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (error) {
  console.error('[spectralforge-carrier-integral-library-action-flow-boundary] FAILED compile');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exit(1);
}

try {
  const output = execFileSync(process.execPath, [generatedScenario], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);
  if (!parsed.ok || parsed.checkedScenarios !== 10) {
    console.error('[spectralforge-carrier-integral-library-action-flow-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    flowPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral Verwalten library action messages and selection flows are delegated to a pure helper with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-library-action-flow-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
