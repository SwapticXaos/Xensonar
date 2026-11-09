#!/usr/bin/env node
import fs from 'node:fs';

const route = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts', 'utf8');
const preview = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts', 'utf8');
const modes = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts', 'utf8');
const ui = fs.readFileSync('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts', 'utf8');

const require = (cond, msg) => { if (!cond) { console.error('[check-c-wt] FAIL:', msg); process.exit(1); } };

require(preview.includes("'wavetable'"), 'Polytrace module must expose a wavetable timbre branch for Cecilia.');
require(preview.includes('digitalTable') && preview.includes('safeTriangleFromPhase'), 'Cecilia wavetable path must synthesize a distinct digital/wavetable color, not reuse Cecilia loom body.');
require(preview.includes('buildColumnPeaks({ spectralData, x, baseHz, detailBoost, maxVoices })'), 'Cecilia wavetable path must retain direct SpectralData column scanning for carrier truth.');
require(preview.includes('if (!descriptor.hasMaterial'), 'Cecilia wavetable path must render visual silence as silence.');
require(!/Math\.random\s*\(/.test(preview), 'Polytrace module must remain free of unseeded Math.random.');
require(route.includes('getOrRenderCeciliaWavePreview'), 'Cecilia must use the direct wavetable polytrace route, not only the old curve-body loom.');
require(route.includes("String(request.machineId) === \"branch-c-interval-body\""), 'Cecilia route must be intercepted explicitly.');
require(route.includes("timbre: 'wavetable'"), 'Cecilia route must request wavetable polytrace timbre.');
require(route.includes('cecilia-wavetable-polytrace'), 'Cecilia cache key must identify the new wavetable polytrace path.');
require(modes.includes('Wave-Polytrace') && ui.includes('Wave / Polytrace'), 'Cecilia UI summary must describe the new wave/polytrace role without methodology jargon.');
require(!route.includes('Moq') && !route.includes('GRIT') && !route.includes('TOUGH') && !route.includes('JUNK'), 'Live route must not import toolkit-only methodology terms.');

console.log('[check-c-wt] OK');
