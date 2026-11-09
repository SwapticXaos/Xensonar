#!/usr/bin/env node
import fs from 'node:fs';

const route = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts', 'utf8');
const preview = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts', 'utf8');
const modes = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts', 'utf8');

const require = (cond, msg) => {
  if (!cond) {
    console.error('[check-a] FAIL:', msg);
    process.exit(1);
  }
};

require(preview.includes("CarrierIntegralPolytraceTimbre") && preview.includes("const fm = timbre === 'fm'"), 'Antonia FM flavor branch must exist.');
require(preview.includes('buildColumnPeaks({ spectralData, x, baseHz, detailBoost, maxVoices })'), 'Polytrace must scan SpectralData columns directly.');
require(preview.includes('if (!descriptor.hasMaterial'), 'Antonia must return silence for visual silence.');
require(preview.includes('const wave = fm') && preview.includes('Math.sin(phase +'), 'Antonia must use an FM-style timbre branch, not Bert acid voice only.');
require(!/Math\.random\s*\(/.test(preview), 'Antonia/Bert preview module must not use unseeded Math.random.');
require(route.includes('String(request.machineId) === "branch-a-line-traffic"'), 'Antonia route must be intercepted explicitly.');
require(route.includes('a'), 'Antonia cache identity must include fm-polytrace token.');
require(route.includes("timbre: 'fm'"), 'Antonia route must request FM polytrace flavor.');
require(modes.includes("label: 'Antonia'") && modes.includes("machineId: 'branch-a-line-traffic'"), 'Branch-A FM polytrace must be the single visible Antonia.');
require(!route.includes('Moq') && !route.includes('GRIT') && !route.includes('TOUGH') && !route.includes('JUNK'), 'Live route must not import toolkit-only methodology terms.');

console.log('[check-a] OK');
