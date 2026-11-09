#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const htmlPath = path.resolve(root, args[0] || 'dist/index.html');
let installerArg = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--installer' && args[i + 1]) installerArg = args[++i];
}
const installerPath = path.resolve(
  root,
  installerArg || process.env.XENSONAR_NATIVE_AUDIO_DEB ||
    'tools/realtime-p0/native-p0/package/xensonar-native-audio_0.385.7_amd64.deb',
);
const protocolPath = path.join(root, 'tools/realtime-p0/native-p0/browser/p0_native_control_protocol.js');
const adapterPath = path.join(root, 'tools/realtime-p0/native-p0/browser/p0_native_control_adapter.js');
const marker = 'xensonar-variant2-native-audio-inline-v03857';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
function scriptSafe(text) {
  return text.replaceAll('</script', '<\\/script');
}
function needFile(p, label) {
  if (!fs.existsSync(p)) throw new Error(`${label} missing: ${p}`);
}

needFile(htmlPath, 'HTML');
needFile(installerPath, 'Native Audio installer');
needFile(protocolPath, 'Native protocol');
needFile(adapterPath, 'Native control adapter');

let html = fs.readFileSync(htmlPath, 'utf8');
if (html.includes(`<script id=\"${marker}\">`)) throw new Error(`Native Audio bootstrap block already present in ${htmlPath}`);
const moduleIndex = html.indexOf('<script type="module"');
if (moduleIndex < 0) throw new Error('Could not find main <script type="module"> insertion boundary');

const installer = fs.readFileSync(installerPath);
const protocol = scriptSafe(fs.readFileSync(protocolPath, 'utf8'));
const adapter = scriptSafe(fs.readFileSync(adapterPath, 'utf8'));
const installerB64 = installer.toString('base64');
const installerSha = sha256(installer);

const block = `\n<!-- ${marker} -->\n<script id="${marker}">\nwindow.__XENSONAR_NATIVE_AUDIO_SERVICE_VERSION__="0.385.7";\nwindow.__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_SHA256__="${installerSha}";\nwindow.__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__="${installerB64}";\n</script>\n<script id="xensonar-native-control-protocol-inline">${protocol}</script>\n<script id="xensonar-native-control-adapter-inline">${adapter}</script>\n`;
html = html.slice(0, moduleIndex) + block + html.slice(moduleIndex);
fs.writeFileSync(htmlPath, html);

const stat = fs.statSync(htmlPath);
console.log(JSON.stringify({
  ok: true,
  html: path.relative(root, htmlPath),
  htmlBytes: stat.size,
  installer: path.relative(root, installerPath),
  installerBytes: installer.length,
  installerSha256: installerSha,
  protocolBytes: Buffer.byteLength(protocol),
  adapterBytes: Buffer.byteLength(adapter),
  marker,
}, null, 2));
