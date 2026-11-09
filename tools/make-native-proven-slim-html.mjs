#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve(process.argv[2] || 'dist/index.html');
const output = path.resolve(process.argv[3] || 'dist/Xensonar_385_VARIANT2_NATIVE_PROVEN_SLIM.html');
let html = fs.readFileSync(input, 'utf8');
const marker = 'xensonar-variant2-native-audio-inline-v03857';
const re = new RegExp(`\\n?<!-- ${marker} -->\\n?<script id="${marker}">[\\s\\S]*?<\\/script>\\n?`);
if (!re.test(html)) throw new Error('Bootstrap installer block not found; refusing to create slim artifact.');
html = html.replace(re, '\n');
const moduleIndex = html.indexOf('<script type="module"');
if (moduleIndex < 0) throw new Error('main module boundary not found');
const slimMarker = '<script id="xensonar-native-proven-slim-marker">window.__XENSONAR_NATIVE_PROVEN_SLIM__=true;try{localStorage.setItem(\'xensonar-native-audio-enabled-v1\',\'1\')}catch(e){}</script>\n';
html = html.slice(0, moduleIndex) + slimMarker + html.slice(moduleIndex);
fs.writeFileSync(output, html);
const checks = {
  installerPayloadAbsent: !html.includes('__XENSONAR_NATIVE_INSTALLER_LINUX_X64_DEB_B64__='),
  slimMarkerPresent: html.includes('__XENSONAR_NATIVE_PROVEN_SLIM__=true'),
  serviceVersionPresent: html.includes('0.385.7'),
  diagnosticButtonPresent: html.includes('TEST BEENDEN · DIAGNOSE-ZIP SPEICHERN'),
  proofBoundaryPresent: html.includes('KOMPAKTE NATIVE-HTML SPEICHERN'),
  standaloneGamesPresent: html.includes('xensonar-embedded-standalone-payload'),
  commonJsFallbackAbsent: (html.match(/require\(/g) || []).length < 20,
  underFiveMiB: Buffer.byteLength(html) < 5 * 1024 * 1024,
};
const failed = Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(JSON.stringify({pass:failed.length===0,input,output,bytes:Buffer.byteLength(html),checks,failed},null,2));
if (failed.length) process.exit(1);
