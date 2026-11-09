import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const electronMain = path.join(root, 'electron-xensonar', 'main.mjs');
const electronBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

if (!fs.existsSync(electronBin)) {
  console.error('Electron is not installed in the Xensonar project. Run `npm install` in the xensonar folder first.');
  process.exit(1);
}

const mode = process.argv[2] || 'dev';
const env = { ...process.env, XENSONAR_ELECTRON_MODE: mode };
const child = spawn(electronBin, [electronMain], { cwd: root, stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
