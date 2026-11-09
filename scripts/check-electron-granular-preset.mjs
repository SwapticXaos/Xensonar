import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function fail(message) {
  console.error(`[xensonar:check-electron-granular-preset] ${message}`);
  process.exit(1);
}
const settingsPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const loopPath = path.join(root, 'src/features/xensonar/material/loopLaneUiState.ts');
const dialogPath = path.join(root, 'src/features/xensonar/rooms/materialLoopPanel/RootFollowGranularManagerDialog.tsx');
const settings = fs.readFileSync(settingsPath, 'utf8');
const loop = fs.readFileSync(loopPath, 'utf8');
const dialog = fs.readFileSync(dialogPath, 'utf8');
const requiredSettings = [
  'ROOT_FOLLOW_GRANULAR_ELECTRON_FRAGMENT_PRESET',
  "windowMs: 120",
  "stepMs: 8",
  "leadMs: 131",
  "startLeadMs: 8",
  "qualityMode: 'fragment'",
  "microDensity: 1.85",
  "sourceSpread: 1.53",
  "jitter: 0.61",
  "maxGrainsPerWindow: 35",
  'isXensonarElectronRuntime',
  'createRootFollowGranularStartupSettings',
];
for (const token of requiredSettings) if (!settings.includes(token)) fail(`settings missing ${token}`);
if (!loop.includes('createRootFollowGranularStartupSettings')) fail('loop lane defaults must use startup granular settings');
if (!dialog.includes('Electron-Fragment setzen')) fail('granular manager must expose Electron-Fragment preset button');
if (!dialog.includes('cloneRootFollowElectronFragmentPreset')) fail('dialog must call explicit electron fragment preset');
console.log(JSON.stringify({
  ok: true,
  electronFragmentPreset: {
    windowMs: 120,
    stepMs: 8,
    leadMs: 131,
    startLeadMs: 8,
    microDensity: 1.85,
    sourceSpread: 1.53,
    jitter: 0.61,
    maxGrainsPerWindow: 35,
    qualityMode: 'fragment'
  }
}, null, 2));
