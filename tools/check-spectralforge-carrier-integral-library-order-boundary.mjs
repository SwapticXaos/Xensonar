#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const panelPath = 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx';
const orderPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryOrder.ts';
const dragPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryDrag.ts';
const paritySource = 'tools/spectralforge-carrier-integral-library-order-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-library-order-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-library-order-parity.js');

for (const file of [panelPath, orderPath, dragPath, paritySource]) requireFile(file);

const panel = read(panelPath);
const order = read(orderPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/carrierIntegralLibraryOrder',
  'sortCarrierIntegralLibraryEntries(libraryEntries, librarySortMode, manualLibraryOrder)',
  'createCarrierIntegralManualLibraryOrder(sortedLibraryEntries)',
  'resolveCarrierIntegralLibraryDropOrder({',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'export type CarrierIntegralLibraryOrderEntry',
  'export function sortCarrierIntegralLibraryEntries',
  'export function createCarrierIntegralManualLibraryOrder',
  'export function resolveCarrierIntegralLibraryDropOrder',
  'return b.updatedAt - a.updatedAt',
  'a.name.localeCompare(b.name, "de", { sensitivity: "base" })',
  'const insertAt = operation === "insert-after" ? targetIndex + 1 : targetIndex',
]) requireText('carrierIntegralLibraryOrder.ts', order, marker);

for (const marker of [
  'const next = [...libraryEntries];',
  'const order = new Map(manualLibraryOrder.map((id, index) => [id, index]))',
  'const withoutDrag = ids.filter((id) => id !== dragId);',
  'const targetOriginalIndex = ids.indexOf(entryId);',
  'next.splice(insertAt, 0, dragId);',
]) forbidText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'manual sort',
  'drop swap with implicit order',
  'drop insert before with missing drag appended',
  'checkedScenarios: checked.length',
]) requireText('library order parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-library-order-boundary] FAILED preflight');
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
    path.join(root, orderPath),
    path.join(root, dragPath),
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
  console.error('[spectralforge-carrier-integral-library-order-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 12) {
    console.error('[spectralforge-carrier-integral-library-order-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    orderPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral Verwalten library sort and drag/drop order are delegated to a pure helper with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-library-order-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
