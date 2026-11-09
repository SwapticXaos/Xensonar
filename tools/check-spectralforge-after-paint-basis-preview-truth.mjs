#!/usr/bin/env node
import fs from 'node:fs';

const fail = (msg) => {
  console.error(`[xensonar][after-paint-basis-preview-truth] FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`[xensonar][after-paint-basis-preview-truth] OK: ${msg}`);
const read = (p) => fs.readFileSync(p, 'utf8');
const has = (src, needle, label = needle) => {
  if (!src.includes(needle)) fail(`missing ${label}`);
};
const notHas = (src, needle, label = needle) => {
  if (src.includes(needle)) fail(`unexpected ${label}`);
};

const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const pkg = read('package.json');

has(pkg, '3.2.91-7.5.175', 'package version 7.5.175');
has(transport, 'prewarmSpectralForgeBasisHearingPreview', 'basis hearing render-only prewarm import/use');
has(transport, 'previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing"', 'after-paint eligibility includes basis-hearing');
has(transport, 'input.routeKind === "basis-hearing"', 'serial render runner branches for basis-hearing');
has(transport, 'Hörweise wird fertig vorgerechnet', 'basis-hearing uses render-status wording');
has(transport, 'Hörweise wird automatisch vorgerechnet', 'not-ready tooltip says hearing is auto-prepared');
has(transport, 'Plain pointermove\n        // must not postpone preview rendering forever', 'plain pointermove does not keep the preview grey forever');
notHas(transport, 'window.addEventListener("pointermove"', 'global pointermove activity gate removed');
notHas(transport, 'Hörweise geändert · Play bereitet sie vor', 'play-only fallback status removed');
notHas(transport, 'Basis-Hörweisen such as HarmonicXplore still render synchronously', 'old basis auto-render ban removed');

ok('after-paint preview render now starts for basis-hearing too; plain cursor movement no longer postpones the ready-state indefinitely.');
