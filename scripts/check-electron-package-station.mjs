import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function fail(message) {
  console.error(`[xensonar:check-electron-package-station] ${message}`);
  process.exit(1);
}
const mainPath = path.join(root, 'electron-xensonar', 'main.mjs');
const docPath = path.join(root, 'ELECTRON_PAKETSTATION_STATUS.md');
const main = fs.readFileSync(mainPath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');
for (const token of ['will-download', 'showSaveDialogSync', 'setSavePath', 'Xensonar Paket speichern']) {
  if (!main.includes(token)) fail(`standalone electron host missing ${token}`);
}
for (const token of ['Paketstation', 'will-download', 'DownloadItem.setSavePath', 'noch nicht zu einem vollständigen']) {
  if (!doc.includes(token)) fail(`status doc missing ${token}`);
}
console.log(JSON.stringify({ ok: true, packageStationElectronStatus: 'native-download-hook-present; full IPC package adapter pending' }, null, 2));
