#!/usr/bin/env node
import fs from 'node:fs';

const fail = (msg) => {
  console.error(`[xensonar][cooperative-after-paint-preview-render] FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`[xensonar][cooperative-after-paint-preview-render] OK: ${msg}`);
const read = (p) => fs.readFileSync(p, 'utf8');
const has = (src, needle, label = needle) => {
  if (!src.includes(needle)) fail(`missing ${label}`);
};
const notHas = (src, needle, label = needle) => {
  if (src.includes(needle)) fail(`unexpected ${label}`);
};

const pkg = read('package.json');
const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const basis = read('src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts');
const session = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewSession.ts');
const context = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionContext.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const hx = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');

if (!/3\.2\.91-7\.5\.(175|176|177|178)/.test(pkg)) failures.push('missing package version 7.5.175+');
has(transport, 'previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing"', 'all renderable routes are eligible after paint');
has(transport, 'onRenderProgress: (progress: number) => setPrewarmProgress', 'basis-hearing after-paint progress is wired to button fill');
has(transport, 'onRenderProgress: (progress: number) => setRenderProgress', 'play render progress is wired to button fill');
notHas(transport, 'window.addEventListener("pointermove"', 'plain pointer movement does not postpone rendering forever');
notHas(transport, 'Hörweise geändert · Play bereitet sie vor', 'no play-only fallback wording');
has(basis, 'onRenderProgress?: (progress: number) => void;', 'basis preview request accepts progress');
has(session, 'onRenderProgress?: (progress: number) => void;', 'session request accepts progress');
has(context, 'onRenderProgress?: (progress: number) => void;', 'integral audition context accepts progress');
has(routes, 'request.onRenderProgress', 'route-level renderers receive progress');
has(hx, 'export async function renderCarrierIntegralHarmonicXploreDirectPreviewBuffer', 'HarmonicXplore renderer is cooperative-capable async');
has(hx, 'await yieldIfNeeded(i);', 'HarmonicXplore sample loop yields during cooperative render');
has(hx, 'args.onProgress?.(clamp(sampleIndex', 'HarmonicXplore progress reports real sample position');
has(routes, 'cooperative: Boolean(request.onRenderProgress)', 'cooperative mode is enabled only for progress-aware preview render');

ok('after-paint rendering is general, not HarmonicXplore-only; basis preview progress is wired and HarmonicXplore can yield while rendering.');
