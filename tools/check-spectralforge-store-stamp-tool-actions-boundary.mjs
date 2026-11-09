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

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const stampActionsPath = 'src/features/l3lab/spectralForge/state/storeStampToolActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-stamp-tool-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-stamp-tool-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-stamp-tool-parity.js');

for (const file of [storePath, stampActionsPath, storeTypesPath, paritySource, 'src/features/l3lab/spectralForge/audio/SpectralData.ts']) requireFile(file);

const store = read(storePath);
const stampActions = read(stampActionsPath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeStampToolActions'",
  '...createStampToolStoreActions(set)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'stampPhase: StampPhase',
  'setStampData: (data: StampData | null) => void',
  'setStampSelStart: (pos: { x: number; y: number } | null) => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export type StampToolHostState',
  'export type StampToolStoreActions',
  'export const MIN_STAMP_SCALE = 0.1',
  'export const MAX_STAMP_SCALE = 8',
  'export function clampStampScale',
  'export function wrapStampRotation',
  'export function createStampDataState',
  'export function setStampScaleState',
  'export function adjustStampScaleState',
  'export function rotateStampState',
  'export function setStampRotationState',
  'export function resetStampTransformState',
  'export function createStampToolStoreActions',
]) requireText('storeStampToolActions.ts', stampActions, marker);

for (const marker of [
  'setStampData resets transform',
  'setStampScale clamps and preserves y fallback',
  'rotateStamp wraps by delta',
  'setStampRotation wraps absolute value',
  'toggleStampFlipX inverts x only',
  'setStampPhase updates phase only',
  'checkedScenarios: checked.length',
]) requireText('stamp-tool parity source', parity, marker);

for (const marker of [
  'Math.max(0.1, Math.min(8, scaleX))',
  'Math.max(0.1, Math.min(8, state.stampScaleX + dx))',
  'const twoPi = Math.PI * 2',
  'const wrapped = ((rotationRadians % twoPi) + twoPi) % twoPi',
  'toggleStampFlipX: () => set((state) => ({ stampFlipX: !state.stampFlipX }))',
  'toggleStampFlipY: () => set((state) => ({ stampFlipY: !state.stampFlipY }))',
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-stamp-tool-actions-boundary] FAILED preflight');
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
    baseUrl: root,
    paths: { '@/*': ['src/*'] },
    lib: ['ES2022', 'DOM'],
    strict: false,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, stampActionsPath),
    path.join(root, 'src/features/l3lab/spectralForge/audio/SpectralData.ts'),
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
  console.error('[spectralforge-store-stamp-tool-actions-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 15) {
    console.error('[spectralforge-store-stamp-tool-actions-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    stampActionsPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Stamp tool action boundary preserves the old scale clamp, rotation wrap, flip, phase, and selection contracts.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-stamp-tool-actions-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
