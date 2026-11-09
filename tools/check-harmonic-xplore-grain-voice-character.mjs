#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enginePath = path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');
const engine = fs.readFileSync(enginePath, 'utf8');

const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const has = (needle) => engine.includes(needle);
const blockBetween = (startNeedle, endNeedle) => {
  const start = engine.indexOf(startNeedle);
  const end = start >= 0 ? engine.indexOf(endNeedle, start) : -1;
  return start >= 0 && end > start ? engine.slice(start, end) : '';
};

add('engine version preserves grain voice character lineage', has('grain-voice-character') || has('wide-interval-voice-seeding'));
add('gestalt summary exposes grainMean', /type\s+CarrierIntegralHarmonicXploreDirectGestaltSummary[\s\S]*grainMean:\s*number/.test(engine));
add('no-spectral fallback keeps neutral grainMean', /hasSpectralData:\s*false[\s\S]*grainMean:\s*0\.5/.test(engine));
add('gestalt accumulation samples getGrain with amplitude weighting', /grainWeightedSum\s*\+=\s*clamp\(spectralData!\.getGrain\(x,\s*y\),\s*0,\s*1\)\s*\*\s*val/.test(engine));
add('grainMean uses weighted grain sum and neutral fallback', /grainWeightTotal\s*>\s*1e-6\s*\?\s*clamp\(grainWeightedSum\s*\/\s*grainWeightTotal,\s*0,\s*1\)\s*:\s*0\.5/.test(engine));
add('gestalt key contains grainMean and grain marker', /grainMean[\s\S]*["']grain-v1["']/.test(blockBetween("'harmonic-xplore-direct/vector-momentum-carrier-gestalt'", '].join') || blockBetween('"harmonic-xplore-direct/vector-momentum-carrier-gestalt"', '].join')));
add('direct engine key contains carrierGestalt.grainMean and grain voice marker', /carrierGestalt\.grainMean[\s\S]*["']grain-voice-character-v1["']/.test(blockBetween('const directEngineKey', '].join')));
add('antiWhoopContract declares grain channel modulation', has('grainChannelModulatesVoiceSlewAndDetune: true'));
add('voice grain state exists with neutral initial value', has('const vGrain = new Float64Array(MAX_VOICES).fill(0.5)'));
add('peak grain state exists', has('const pGrain = new Float64Array(MAX_PEAKS)'));
add('peak detection stores rawGrain from the same spectral coordinate', /rawGrain\[rawPeakCount\]\s*=\s*clamp\(\s*args\.spectralData!\.getGrain\(currentX,\s*y\)\s*,\s*0\s*,\s*1\s*,?\s*\)/.test(engine));
add('selected peaks carry pGrain from rawGrain', /pGrain\[peakCount\]\s*=\s*rawGrain\[index\]!/.test(engine));

const sortBlock = blockBetween('// Bring the strongest ridges to the front without allocating temporary objects.', 'const selectRawPeak');
add('raw peak sort carries rawGrain together with rawLogHz/rawEn',
  sortBlock.includes('const tmpGrain = rawGrain[a]!')
  && sortBlock.includes('rawGrain[a] = rawGrain[b]!')
  && sortBlock.includes('rawGrain[b] = tmpGrain'),
  'without this, tone/energy and material grain can be paired to different peaks'
);
add('grain slew is computed in spectral-column domain, not once-per-sample domain',
  /const\s+spectralColumnUpdateRate\s*=\s*\(?\s*sampleRate\s*\*\s*Math\.max\(1,\s*specWidth\)\)?\s*\/\s*Math\.max\(1,\s*sampleCount\)/.test(engine)
  && has('const grainSlewCoef = slewCoef(80, spectralColumnUpdateRate)')
);
add('active voice grain slews toward matched peak grain', /vGrain\[bestVoice\]\s*\+=\s*\(pGrain\[bestPeak\]!\s*-\s*vGrain\[bestVoice\]!\)\s*\*\s*grainSlewCoef/.test(engine));
add('silent newly claimed voice snaps grain directly', /vGrain\[v\]\s*=\s*pGrain\[p\]!/.test(engine));
add('per-voice pitch slew is grain-dependent', /const\s+voiceSlewPitchMs\s*=\s*\(8\s*\+\s*grain\s*\*\s*44\)\s*\*\s*\(1\s*-\s*detailBoost\s*\*\s*0\.4\)/.test(engine));
add('partial detune spread is grain-dependent and fundamental-safe', /const\s+grainDetuneScale\s*=\s*\(1\s*-\s*grain\)\s*\*\s*10/.test(engine) && /const\s+grainDetune\s*=\s*\(o\s*%\s*2\s*===\s*0\s*\?\s*1\s*:\s*-1\)\s*\*\s*grainDetuneScale\s*\*\s*\(o\s*\/\s*Math\.max\(1,\s*oscCount\s*-\s*1\)\)/.test(engine));
add('legacy global slewPitch constant removed from render path', !/const\s+slewPitch\s*=/.test(engine));

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error('HarmonicXplore grain voice character guard FAILED');
  for (const c of failed) console.error(`- ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  process.exit(1);
}
console.log(`HarmonicXplore grain voice character guard OK (${checks.length}/${checks.length})`);
for (const c of checks) console.log(`✓ ${c.name}`);
