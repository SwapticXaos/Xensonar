import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const mainPath = path.join(root, 'electron-xensonar', 'main.mjs');
const launchPath = path.join(root, 'scripts', 'launch-xensonar-electron.mjs');

function fail(message) {
  console.error(`[xensonar:check-standalone-electron] ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const scripts = pkg.scripts || {};
for (const name of ['desktop:dev', 'desktop:dist', 'desktop:build', 'xensonar:check-standalone-electron']) {
  if (!scripts[name]) fail(`missing package script ${name}`);
}
if (!pkg.devDependencies?.electron) fail('missing devDependency electron');

const main = fs.readFileSync(mainPath, 'utf8');
const launch = fs.readFileSync(launchPath, 'utf8');
if (!main.includes('backgroundThrottling: false')) fail('Electron BrowserWindow must disable backgroundThrottling');
if (!main.includes("XENSONAR_BUILD_BODY: 'xensonar-only'")) fail('live-electron profile must default to xensonar-only build body');
if (!main.includes("XENSONAR_DIAGNOSTIC_SURFACES: '0'")) fail('live-electron profile must keep diagnostic surfaces off by default');
if (!main.includes('pathToFileURL')) fail('dist mode must load built index through a file URL');
if (!main.includes('will-download') || !main.includes('setSavePath') || !main.includes('showSaveDialogSync')) fail('standalone host must install native download bridge for Package Station exports');
if (!launch.includes('XENSONAR_ELECTRON_MODE')) fail('launcher must pass Electron mode into main process');

console.log(JSON.stringify({
  ok: true,
  scripts: ['desktop:dev', 'desktop:dist', 'desktop:build'],
  electron: pkg.devDependencies.electron,
  backgroundThrottling: false,
  defaultProfile: 'live-electron',
  defaultBuildBody: 'xensonar-only',
  nativeDownloadBridge: true,
}, null, 2));
