#!/usr/bin/env node
import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) {
  if (!condition) {
    console.error(`[spectralforge-scroll-layer-contract] FAIL: ${message}`);
    process.exitCode = 1;
  }
}
function includes(file, needle, label = needle) {
  const content = read(file);
  expect(content.includes(needle), `${file} should include ${label}`);
}

const entryScrollFile = 'src/features/l3lab/materialIntake/entryScroll.ts';
const forgeFile = 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx';
const cssFile = 'src/index.css';
const inputPolicyFile = 'src/features/xensonar/rooms/resonanceInputPolicy.ts';

const entryScroll = read(entryScrollFile);
const forge = read(forgeFile);
const css = read(cssFile);
const inputPolicy = read(inputPolicyFile);

includes(entryScrollFile, 'XensonarScrollLayerDiagnosticState', 'typed scroll-layer diagnostic state');
includes(entryScrollFile, '__xensonarScrollLayerDiag', 'internal scroll-layer diagnostic window handle');
includes(entryScrollFile, 'collectSpectralForgeScrollLayerDiagnostics', 'central scroll-layer diagnostic collector');
includes(entryScrollFile, "phase: 'scroll-layer-snapshot'", 'timeline event for scroll-layer snapshots');
includes(entryScrollFile, 'documentCanScroll', 'document scrollability metric');
includes(entryScrollFile, 'bodySpectralForgeActive', 'body-level forge scroll policy marker metric');
includes(entryScrollFile, 'SCROLL_LAYER_CANDIDATE_SELECTOR', 'candidate enumeration selector');
includes(forgeFile, 'data-xensonar-scroll-island="spectralforge-page"', 'page-level spectralforge scroll island marker');
includes(forgeFile, 'data-wheel-allow-scroll="true"', 'page-level wheel allowance on the forge section');
includes(inputPolicyFile, '[data-xensonar-scroll-island]', 'scroll island allowed by wheel policy');
includes(inputPolicyFile, '[data-spectralforge-scroll-root="true"]', 'legacy spectral root support stays recognized by wheel policy');

expect(!forge.includes('document.body.setAttribute'), 'forge should no longer force a body-level spectralforge scroll marker');
expect(!forge.includes('data-spectralforge-scroll-root="true"'), 'forge should no longer create an inner spectral scroll root in the workbench column');
expect(!forge.includes("maxHeight: 'calc(100vh - 2rem)'"), 'forge workbench column should no longer clamp to a viewport-height inner scroller');
expect(!forge.includes('overflow-y-auto'), 'forge workbench column should no longer create a mid-page overflow-y-auto scroller');
expect(!css.includes('body[data-xensonar-spectralforge-active="true"]'), 'css should no longer suppress outer document scroll during forge view');
expect(!css.includes('overflow-y: hidden'), 'css should not hide outer document vertical scroll for forge view');
expect(!css.includes(`html, body {
  overflow-x: hidden;
  overflow-y: hidden;`), 'global body/html overflow-y must not be hidden');

if (process.exitCode) process.exit(process.exitCode);
console.log('[spectralforge-scroll-layer-contract] ok');
