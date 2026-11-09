#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transport = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const basisPreview = readFileSync('src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts', 'utf8');
const audition = readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts', 'utf8');
const routes = readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts', 'utf8');
const engine = readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts', 'utf8');

const failures = [];
const mustContain = (name, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${name}: missing ${needle}`);
};
const mustNotContain = (name, haystack, needle) => {
  if (haystack.includes(needle)) failures.push(`${name}: forbidden ${needle}`);
};

mustContain('TransportBar', transport, 'previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing"');
mustContain('TransportBar', transport, 'if (previewRenderRouteKind === "spectral" && renderVersion <= 0) return;');
mustContain('TransportBar', transport, 'const previewPrepared = !("warmed" in result) || result.warmed !== false;');
mustContain('TransportBar', transport, 'Play startet nicht als Renderauslöser');
mustContain('TransportBar', transport, 'Vorhören wartet auf automatische Vorbereitung');
mustContain('TransportBar', transport, 'window.addEventListener("pointerdown"');
mustContain('TransportBar', transport, 'window.addEventListener("wheel"');
mustNotContain('TransportBar', transport, 'window.addEventListener("pointermove", handlePointerMove');
mustNotContain('TransportBar', transport, 'setRenderProgress(0.035);\n      } else {\n        setRendering(false);\n        setRenderProgress(1);');
mustNotContain('TransportBar', transport, 'Hörweise wird beim Play vorbereitet');
mustContain('basis preview', basisPreview, 'onRenderProgress?: (progress: number) => void;');
mustContain('basis preview', basisPreview, 'onRenderProgress: request.onRenderProgress');
mustContain('audition', audition, 'prewarmCarrierIntegralDonatelloRoute');
mustContain('audition', audition, 'prewarmCarrierIntegralSpectralWindowBodyRoute');
mustContain('audition', audition, 'prewarmCarrierIntegralDieterV2Route');
mustContain('audition', audition, 'prewarmCarrierIntegralSyntheticRootFollowRoute');
mustNotContain('audition', audition, 'No render-only prewarm route for this hearing mode yet');
mustContain('routes', routes, 'audioEngine.renderToBuffer(\n        spectralData,\n        request.snapshot.synthMode,\n        request.snapshot.waveformMix,\n        request.onRenderProgress');
mustContain('routes', routes, 'cooperative: Boolean(request.onRenderProgress)');
mustContain('engine', engine, 'export async function renderCarrierIntegralHarmonicXploreDirectPreviewBuffer');
mustContain('engine', engine, 'await yieldIfNeeded(i);');

if (failures.length) {
  console.error('[preview-render-hybrid-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[preview-render-hybrid-contract] OK');
