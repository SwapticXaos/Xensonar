#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (cond, message) => {
  if (!cond) {
    console.error(`[bert-harmonic-polytrace-rebase] ${message}`);
    process.exit(1);
  }
};

const rendererPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const requestPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionRequest.ts';
const b573Path = 'src/features/l3lab/spectralForge/rootFollow/buildBranchB573SynthWindowBodyPlan.ts';
const rootPath = 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts';

requireText(fs.existsSync(rendererPath), 'Bert harmonic polytrace renderer is missing.');
const renderer = read(rendererPath);
const routes = read(routesPath);
const request = read(requestPath);
const b573 = read(b573Path);
const root = read(rootPath);

requireText(renderer.includes('CARRIER_INTEGRAL_BERT_HARMONIC_POLYTRACE_VERSION'), 'Renderer must expose a versioned identity.');
requireText(renderer.includes('buildColumnPeaks'), 'Renderer must scan SpectralData columns directly.');
requireText(renderer.includes('peakToRelativeLogHz'), 'Renderer must map visual height to pitch directly.');
requireText(renderer.includes('selected.length >= args.maxVoices'), 'Renderer must preserve multiple simultaneous peak voices up to a voice cap.');
requireText(renderer.includes('if (liveVoices === 0)') && renderer.includes('channelData[i] = 0'), 'Visual silence must render as silence.');
requireText(!renderer.includes('Math.random'), 'Renderer must not use unseeded Math.random.');
requireText(renderer.includes('seededSignedUnit'), 'Renderer should use deterministic seeded variation only.');
requireText(routes.includes('renderCarrierIntegralBertHarmonicPolytracePreviewBuffer'), 'Audition routes must call the direct Bert renderer.');
requireText(routes.includes('bert-harmonic-polytrace'), 'Audition cache key must identify Bert harmonic polytrace.');
requireText(!request.includes('BERT_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST'), 'Bert must not use the old carrier-loop-body candidate request path.');
requireText(!b573.includes('pitchLanes'), 'B_5.73 plan must be returned to the original pre-experiment window-plan shape.');
requireText(!root.includes('buildCarrierLoopBodyCurvesFromBranchB573'), 'RootFollow build must not compress Bert through the failed B573 curve adapter.');
requireText(!fs.existsSync('src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchB573.ts'), 'Failed B573 curve adapter should be removed.');
requireText(!renderer.includes('Moq') && !renderer.includes('GRIT') && !renderer.includes('TOUGH') && !renderer.includes('JUNK'), 'Toolkit-only vocabulary must stay out of Bert renderer.');

console.log('[bert-harmonic-polytrace-rebase] OK');
