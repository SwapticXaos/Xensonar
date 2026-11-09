#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const scenarioSource = 'tools/spectralforge-store-carrier-donor-scenarios.ts';
const outRoot = '.xensonar-checks/spectralforge-store-carrier-donor-scenarios';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-carrier-donor-scenarios.js');
const failures = [];

function requireFile(file) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}

function requireText(file, needle) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    failures.push(`missing ${file}`);
    return;
  }
  const text = fs.readFileSync(p, 'utf8');
  if (!text.includes(needle)) failures.push(`${file} missing ${needle}`);
}

for (const file of [
  scenarioSource,
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Types.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2FreshnessGraph.ts',
]) requireFile(file);

for (const marker of [
  'buildSyntheticReadyState',
  'addRawMaterialReadyState',
  'synthetic pigment ready path enables preview',
  'raw texture overlay ready path enables preview after allocation',
  'binding failure blocks preview',
  'material allocation failure blocks raw preview',
  'carrier dirty blocks preview',
  'donor dirty blocks preview',
  'transfer preset change blocks raw preview until allocation is rebuilt',
  'transfer macro change blocks raw preview until allocation is rebuilt',
]) requireText(scenarioSource, marker);

if (failures.length) {
  console.error('[spectralforge-store-carrier-donor-scenarios] FAILED preflight');
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
    lib: ['ES2022', 'DOM'],
    jsx: 'react-jsx',
    strict: false,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, scenarioSource),
    path.join(root, 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Types.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2FreshnessGraph.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/transfer/**/*.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/types/**/*.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/audio/AudioImporterTypes.ts'),
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
  console.error('[spectralforge-store-carrier-donor-scenarios] FAILED compile');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, generatedScenario))) {
  console.error(`[spectralforge-store-carrier-donor-scenarios] FAILED missing generated ${generatedScenario}`);
  process.exit(1);
}

try {
  const output = execFileSync(process.execPath, [generatedScenario], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);
  if (!parsed.ok || parsed.checkedScenarios < 20) {
    console.error('[spectralforge-store-carrier-donor-scenarios] FAILED insufficient scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    scenarioSource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier/Donor-V2 lifecycle scenarios exercise actual transition functions and eligibility gates.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-carrier-donor-scenarios] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
