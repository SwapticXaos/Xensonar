#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  preview: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts',
  request: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionRequest.ts',
  plan: 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts',
  rootFollow: 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts',
  uiModes: 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts',
  ui: 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts',
};

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function requireText(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label} missing: ${needle}`);
  }
}

const preview = read(files.preview);
const request = read(files.request);
const plan = read(files.plan);
const uiModes = read(files.uiModes);
const rootFollow = read(files.rootFollow);
const ui = read(files.ui);

requireText(preview, "| 'cecilia-spectral-weave'", 'preview reference kind');
// Cecilia's old curve-body loom is intentionally bypassed by the direct wavetable polytrace route.
requireText(request, "referenceKind: 'cecilia-spectral-weave'", 'legacy Cecilia reference kind remains for compatibility');
if (preview.includes('Math.random')) {
  throw new Error('Cecilia preview renderer must not use Math.random.');
}

requireText(plan, 'column.anchorCount >= 1', 'Cecilia lower inclusion threshold');
requireText(rootFollow, 'Cecilia-Klangfarbengewebe', 'Cecilia reason label');
if (!uiModes.includes('Klangfarbengewebe') && !uiModes.includes('Wave-Polytrace')) {
  throw new Error('basis hearing Cecilia summary missing Klangfarbengewebe/Wave-Polytrace');
}
if (!ui.includes('Bildkörper / Klangfarbengewebe') && !ui.includes('Wave / Polytrace')) {
  throw new Error('Cecilia UI label missing Klangfarbengewebe/Wave / Polytrace');
}

console.log('[check-cecilia-spectral-weave] OK');
