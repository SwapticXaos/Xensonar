#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const htmlPath = path.resolve(root, process.argv[2] || 'dist/index.html');
const installerPath = path.resolve(root, process.env.XENSONAR_NATIVE_AUDIO_DEB || 'tools/realtime-p0/native-p0/package/xensonar-native-audio_0.385.7_amd64.deb');
const html = fs.readFileSync(htmlPath, 'utf8');
const installer = fs.readFileSync(installerPath);
const sha = crypto.createHash('sha256').update(installer).digest('hex');
const b64 = installer.toString('base64');

const checks = [
  ['real Vite output has no CommonJS container signature', (html.match(/require\(/g) || []).length < 20],
  ['Variant-2 inline marker', html.includes('xensonar-variant2-native-audio-inline-v03857')],
  ['service version 0.385.7', html.includes('__XENSONAR_NATIVE_AUDIO_SERVICE_VERSION__="0.385.7"')],
  ['installer payload byte-exact base64', html.includes(`__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__="${b64}"`)],
  ['installer SHA embedded', html.includes(`__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_SHA256__="${sha}"`)],
  ['protocol inline before app', html.indexOf('xensonar-native-control-protocol-inline') >= 0 && html.indexOf('xensonar-native-control-protocol-inline') < html.indexOf('<script type="module"')],
  ['adapter inline before app', html.indexOf('xensonar-native-control-adapter-inline') >= 0 && html.indexOf('xensonar-native-control-adapter-inline') < html.indexOf('<script type="module"')],
  ['Native control global present', html.includes('global.XensonarNativeControl = XensonarNativeControl')],
  ['explicit diagnostic button', html.includes('TEST BEENDEN · DIAGNOSE-ZIP SPEICHERN')],
  ['old floating pilot button absent', !html.includes('End Material Pilot')],
  ['Native activation label present', html.includes('Native Audio aktivieren')],
  ['Tailwind border utility', html.includes('.border{') || html.includes('.border\\{') || /\.border\{border-style:/.test(html)],
  ['Tailwind rounded utility family', html.includes('.rounded{') || html.includes('.rounded-')],
  ['Tailwind shadow utility family', html.includes('.shadow')],
  ['one root element', (html.match(/id="root"/g) || []).length === 1],
  ['full standalone payload', html.includes('xensonar-embedded-standalone-payload')],
  ['native proof UI present', html.includes('Native Audio bewiesen') && html.includes('KOMPAKTE NATIVE-HTML SPEICHERN')],
  ['slim offline-backend UX present', html.includes('Native Backend erneut prüfen') && html.includes('Bootstrap-HTML verwenden')],
  ['product size under 6 MiB', fs.statSync(htmlPath).size < 6 * 1024 * 1024],
];
const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
console.log(JSON.stringify({pass: failed.length === 0, checksPassed: checks.length - failed.length, checksTotal: checks.length, bytes: fs.statSync(htmlPath).size, installerSha256: sha, failed, checks: checks.map(([name,pass])=>({name,pass}))}, null, 2));
if (failed.length) process.exit(1);
