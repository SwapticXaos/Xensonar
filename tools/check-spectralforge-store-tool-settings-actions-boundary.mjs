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
const toolProfilesPath = 'src/features/l3lab/spectralForge/state/storeToolProfiles.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeToolSettingsActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-tool-settings-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-tool-settings-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-tool-settings-parity.js');

for (const file of [storePath, toolProfilesPath, actionsPath, storeTypesPath, paritySource]) requireFile(file);

const store = read(storePath);
const toolProfiles = read(toolProfilesPath);
const actions = read(actionsPath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeToolSettingsActions'",
  '...createToolSettingsStoreActions(set)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'setActiveTool: (tool: ToolType) => void',
  'updateToolSettings: (settings: Partial<ToolSettings>) => void',
  'toggleEraseMode: () => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export type ToolSettingsHostState',
  'export type ToolSettingsStoreActions',
  'export function setActiveToolState',
  'export function updateActiveToolSettingsState',
  'export function toggleEraseModeState',
  'export function createToolSettingsStoreActions',
  'mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings })',
  '[state.activeTool]: nextToolSettings',
]) requireText('storeToolSettingsActions.ts', actions, marker);

for (const marker of [
  'createDefaultToolSettings',
  'createDefaultToolProfiles',
  'mergeToolSettings',
  'hydrateToolProfiles',
  'cloneToolProfiles',
]) requireText('storeToolProfiles.ts', toolProfiles, marker);

for (const marker of [
  'setActiveTool loads default stamp profile',
  'setActiveTool restores customized brush profile',
  'updateToolSettings merges patch onto active profile',
  'toggleEraseMode updates active profile',
  'store action updateToolSettings writes active profile',
  'checkedScenarios: checked.length',
]) requireText('tool-settings parity source', parity, marker);

for (const marker of [
  'setActiveTool: (tool) => set((state) => ({',
  'toolSettings: mergeToolSettings(tool, state.toolProfiles[tool])',
  'const nextToolSettings = mergeToolSettings(state.activeTool, { ...state.toolSettings, ...settings })',
  'eraseMode: !state.toolSettings.eraseMode',
  '[state.activeTool]: nextToolSettings',
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-tool-settings-actions-boundary] FAILED preflight');
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
    path.join(root, actionsPath),
    path.join(root, toolProfilesPath),
    path.join(root, storePath),
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
  console.error('[spectralforge-store-tool-settings-actions-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 9) {
    console.error('[spectralforge-store-tool-settings-actions-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    actionsPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Tool settings action boundary preserves active-tool switching, profile persistence, setting merge, and erase-mode toggle contracts.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-tool-settings-actions-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
