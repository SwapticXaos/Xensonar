#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
function readArg(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx < 0) return fallback;
  return args[idx + 1] ?? fallback;
}
const repoRoot = path.resolve(readArg('--repo', process.cwd()));
const writeReport = args.includes('--write-report');

const rel = {
  spectralData: 'src/features/l3lab/spectralForge/audio/SpectralData.ts',
  visuals: 'src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasVisuals.ts',
  hud: 'src/features/l3lab/spectralForge/components/spectralCanvas/SpectralCanvasHud.tsx',
  coordinate: 'src/features/l3lab/spectralForge/carrierV2/carrierCoordinateSystem.ts',
  pitchContract: 'src/features/l3lab/spectralForge/integral/carrierIntegralPitchAxisContract.ts',
  auditionRoutes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
  polytrace: 'src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts',
  hx: 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts',
  basisModes: 'src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts',
};

function readFile(relative) {
  const file = path.join(repoRoot, relative);
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${relative} under ${repoRoot}`);
  return fs.readFileSync(file, 'utf8');
}

function expect(condition, message, failures) {
  if (!condition) failures.push(message);
}

function analyzeRepo() {
  const failures = [];
  const files = Object.fromEntries(Object.entries(rel).map(([key, relative]) => [key, readFile(relative)]));

  expect(/const\s+MIN_FREQ\s*=\s*20\s*;/.test(files.spectralData), 'SpectralData.ts must define MIN_FREQ = 20.', failures);
  expect(/const\s+MAX_FREQ\s*=\s*20000\s*;/.test(files.spectralData), 'SpectralData.ts must define MAX_FREQ = 20000.', failures);
  expect(/Math\.log\(freq\s*\/\s*20\)\s*\/\s*Math\.log\(20000\s*\/\s*20\)/.test(files.visuals), 'spectralCanvasVisuals.ts must keep the visible 20..20000 log image axis.', failures);
  expect(/return\s+yToFrequency\(bin,\s*height\)/.test(files.coordinate), 'carrierBinToHz must delegate to yToFrequency.', failures);
  expect(/return\s+frequencyToY\(hz,\s*height\)/.test(files.coordinate), 'carrierHzToBin must delegate to frequencyToY.', failures);

  expect(/kind:\s*'spectralforge-mode-specific-pitch-axis'/.test(files.pitchContract), 'Pitch contract must declare mode-specific pitch truth.', failures);
  expect(/primaryPitchTruth:\s*'mode-specific-visible-or-root-relative'/.test(files.pitchContract), 'Pitch contract must not claim visible-hz-axis as universal truth.', failures);
  expect(/visibleAxisModes:\s*\['harmonic-xplore-direct-carrier',\s*'spektral-synthese-body'\]/.test(files.pitchContract), 'HX/SpektralSynthese must remain visible-axis modes.', failures);
  expect(/rootRelativePolytraceModes:\s*\['branch-a-line-traffic',\s*'branch-b573-synth-window',\s*'branch-c-interval-body'\]/.test(files.pitchContract), 'Antonia/Bert/Cecilia polytrace modes must be root-relative.', failures);
  expect(/carrierIntegralRootRelativePolytraceLogHzFromY/.test(files.pitchContract), 'Root-relative polytrace helper missing.', failures);

  const expectedModes = [
    'raw-darkpsy-oscillator',
    'harmonic-xplore-direct-carrier',
    'spektral-synthese-body',
    'branch-a-line-traffic',
    'branch-b573-synth-window',
    'branch-c-interval-body',
  ];
  for (const id of expectedModes) expect(files.basisModes.includes(`'${id}'`), `Basis hearing mode missing ${id}.`, failures);
  const basisListMatch = files.basisModes.match(/SPECTRAL_FORGE_BASIS_HEARING_MACHINE_IDS[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (basisListMatch) {
    const ids = Array.from(basisListMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
    expect(ids.length === 6, `Expected exactly 6 active hearing machines with one Antonia; found ${ids.length}.`, failures);
    expect(!ids.includes('legacy-supernote-5.69'), '5.69 Legacy route must not be an active hearing machine.', failures);
  } else {
    failures.push('Could not locate SPECTRAL_FORGE_BASIS_HEARING_MACHINE_IDS list.');
  }

  expect(/return\s+carrierIntegralRootRelativePolytraceLogHzFromY\(y,\s*specHeight,\s*anchorRootHz\)/.test(files.polytrace), 'Antonia/Bert/Cecilia polytrace must use root-relative pitch helper.', failures);
  expect(!/return\s+carrierIntegralDisplayLogHzFromY\(y,\s*specHeight\)/.test(files.polytrace), 'Antonia/Bert/Cecilia polytrace must not use visible-axis helper directly.', failures);
  expect(/return\s+carrierIntegralDisplayLogHzFromY\(y,\s*specHeight\)/.test(files.hx), 'HX/SpektralSynthese should still use display-axis helper.', failures);
  expect(/baseHz:\s*resolveSyntheticPolytracePreviewBaseHz\(rootFollowBuild\.summary\.baseHz\)/.test(files.auditionRoutes), 'Antonia/Bert/Cecilia audition route must use Root-Follow baseHz.', failures);
  expect(/Bild-Hz[\s\S]*A\/B\/C root-rel\./.test(files.hud), 'Left pitch axis HUD must disclose image-Hz vs Antonia/Bert/Cecilia root-relative semantics.', failures);

  return {
    probe: 'pitch-axis-truth-probe-7744-mode-specific-restore',
    status: failures.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    repoRoot,
    contract: {
      visibleImageAxis: { minHz: 20, maxHz: 20000, scale: 'log', appliesTo: ['image coordinates', 'HarmonicXplorE', 'SpektralSynthese'] },
      rootRelativePolytraceAxis: { appliesTo: ['Antonia', 'Bert', 'Cecilia'], bendOctaves: 3, anchor: 'Root-Follow baseHz' },
      activeVarianceReference: 'Antonia / branch-a-line-traffic is the single active Antonia hearing mode',
    },
    failures,
  };
}

const report = analyzeRepo();
if (writeReport) {
  const outDir = path.join(repoRoot, 'tools/out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'pitch-axis-truth-probe-7745.json'), JSON.stringify(report, null, 2) + '\n');
}

if (report.failures.length) {
  console.error('[pitch-axis-truth-probe-7744] FAIL');
  for (const failure of report.failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[pitch-axis-truth-probe-7744] PASS: pitch truth is mode-specific; HX/SpektralSynthese keep visible Hz axis, Antonia/Bert/Cecilia polytrace restore Root-Follow-relative lower pitch, one Branch-A Antonia is active.');
