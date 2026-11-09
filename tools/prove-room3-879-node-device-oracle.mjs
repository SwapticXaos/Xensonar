#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEVICE_NAMES = ['sub', 'crush', 'resonator', 'vibe'];
const DEVICE_EXPECTATIONS = {
  sub: {
    label: 'Sub',
    sourceTokens: ['myzelSpatialSub', 'fieldVoidSub', 'colorSubMix', 'myzelSubOsc', 'myzelSubGain'],
    writeTargets: ['myzelSubOsc.frequency', 'myzelSubGain.gain', 'myzelLowpass.frequency', 'myzelConstellationFilter.frequency'],
    vectorAssertions: [
      ['fieldVoidSub', '>=', 0.32],
      ['subGain', 'delta>=', 0.025],
    ],
  },
  crush: {
    label: 'Crush',
    sourceTokens: ['myzelSpatialBitcrusher', 'myzelSpatialWavefolder', 'spatialDistortion', 'fieldWavefold', 'fieldDrivePressure', 'myzelDriveGain'],
    writeTargets: ['myzelDriveGain.gain', 'myzelColorPostGain.gain', 'myzelOvertoneOscs[].frequency', 'myzelConstellationFilter.Q'],
    vectorAssertions: [
      ['spatialDistortion', '>=', 0.72],
      ['drivePreGain', 'delta>=', 1.1],
      ['colorPostGain', 'delta<=', -0.025],
    ],
  },
  resonator: {
    label: 'Resonator',
    sourceTokens: ['myzelSpatialResonator', 'myzelSpatialFormant', 'myzelSpatialQ', 'fieldFormant', 'myzelFormantFilters', 'myzelConstellationFilter'],
    writeTargets: ['myzelLowpass.Q', 'myzelFormantFilters[].frequency', 'myzelFormantFilters[].Q', 'myzelFormantGains[].gain', 'myzelConstellationFilter.Q'],
    vectorAssertions: [
      ['fieldFormant', '>=', 0.58],
      ['formant0Q', 'delta>=', 4.5],
      ['constellationQ', 'delta>=', 4.0],
    ],
  },
  vibe: {
    label: 'Vibe',
    sourceTokens: ['myzelSpatialShimmer', 'myzelSpatialChorus', 'fieldSpaceBoost', 'fieldAirPressure', 'myzelAirSend', 'myzelAirDelay'],
    writeTargets: ['myzelAirSend.gain', 'myzelAirWetGain.gain', 'myzelAirFeedback.gain', 'myzelAirDelay.delayTime', 'myzelAirHighpass.frequency'],
    vectorAssertions: [
      ['fieldSpaceBoost', '>=', 0.45],
      ['airSend', 'delta>=', 0.18],
      ['airHighpass', 'delta>=', 420],
    ],
  },
};

const ORACLE_EXPECTED_WRITE_TARGETS = [
  'myzelCarrierOsc.frequency',
  'myzelSubOsc.frequency',
  'myzelCarrierGain.gain',
  'myzelSubGain.gain',
  'myzelBodyGain.gain',
  'myzelLowpass.frequency',
  'myzelLowpass.Q',
  'myzelFormantFilters[].frequency',
  'myzelFormantFilters[].Q',
  'myzelFormantGains[].gain',
  'myzelOvertoneOscs[].frequency',
  'myzelOvertoneOscs[].detune',
  'myzelOvertoneGains[].gain',
  'myzelDriveGain.gain',
  'myzelColorPostGain.gain',
  'myzelMasterGain.gain',
  'myzelAirSend.gain',
  'myzelAirWetGain.gain',
  'myzelAirFeedback.gain',
  'myzelAirDelay.delayTime',
  'myzelAirHighpass.frequency',
  'myzelConstellationFilter.frequency',
  'myzelConstellationFilter.Q',
  'myzelConstellationOscs[].frequency',
  'myzelConstellationOscs[].detune',
  'myzelConstellationGains[].gain',
];

function parseArgs(argv) {
  const args = { current: process.cwd(), ref: process.env.XENSONAR_879_REF ?? '', out: '', md: '', selfOnly: false, verbose: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--current') args.current = argv[++i] ?? args.current;
    else if (arg === '--ref') args.ref = argv[++i] ?? args.ref;
    else if (arg === '--out') args.out = argv[++i] ?? '';
    else if (arg === '--md') args.md = argv[++i] ?? '';
    else if (arg === '--self-only') args.selfOnly = true;
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/prove-room3-879-node-device-oracle.mjs --ref <8.79-source-root> [--current <source-root>] [--out report.json] [--md report.md]\n\nThe harness compares the 8.79 Room-III/Myzel node-device AudioGraph write targets against the current tree, and runs synthetic Sub/Crush/Resonator/Vibe vector assertions. It does not alter app runtime code.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  args.current = path.resolve(args.current);
  if (args.ref) args.ref = path.resolve(args.ref);
  if (args.out) args.out = path.resolve(args.out);
  if (args.md) args.md = path.resolve(args.md);
  return args;
}

function readIfExists(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function listFiles(root, exts = ['.ts', '.tsx']) {
  const result = [];
  const skip = new Set(['node_modules', 'dist', '.git']);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.includes(path.extname(entry.name))) result.push(full);
    }
  }
  if (fs.existsSync(root)) walk(root);
  return result;
}

function readSourceCorpus(root) {
  const src = path.join(root, 'src');
  const files = fs.existsSync(src) ? listFiles(src) : [];
  const corpus = new Map();
  for (const file of files) corpus.set(path.relative(root, file), readIfExists(file));
  return corpus;
}

function corpusText(corpus) {
  return [...corpus.values()].join('\n');
}

function extractRelevantCurrentText(root, corpus) {
  const candidates = [
    'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
    'src/features/xensonar/room3/room3AuraDroneToneCoupling.ts',
    'src/features/resonance/semanticInteractionDevice.ts',
    'src/features/resonance/topologicalResonanceMatrix.ts',
    'src/App.tsx',
  ];
  const pieces = [];
  for (const rel of candidates) {
    const text = readIfExists(path.join(root, rel));
    if (text) pieces.push(`\n/* ${rel} */\n${text}`);
  }
  if (pieces.length) return pieces.join('\n');
  return corpusText(corpus);
}

function extractRelevantRefText(root, corpus) {
  const app = readIfExists(path.join(root, 'src/App.tsx'));
  const pieces = [];
  if (app) {
    const markers = [
      'const spatialWavefolder = clamp(snapshot.myzelSpatialWavefolder',
      'refs.myzelConstellationGains.forEach((gain, idx) =>',
    ];
    const start = app.indexOf(markers[0]);
    const endStart = app.indexOf(markers[1], Math.max(0, start));
    const end = endStart > -1 ? app.indexOf('});', endStart) + 4 : -1;
    pieces.push(`\n/* src/App.tsx :: 8.79 continuous field-envelope RAF */\n${start > -1 && end > start ? app.slice(start, end) : app}`);
  }
  for (const rel of [
    'src/features/resonance/semanticInteractionDevice.ts',
    'src/features/resonance/topologicalResonanceMatrix.ts',
    'src/features/resonance/nodalSynthDeviceMatrix.ts',
    'src/features/resonance/nodalModulationMatrix.ts',
  ]) {
    const text = readIfExists(path.join(root, rel));
    if (text) pieces.push(`\n/* ${rel} */\n${text}`);
  }
  return pieces.join('\n') || corpusText(corpus);
}

function extractAudioWrites(text) {
  const lines = text.split(/\r?\n/);
  const writes = [];
  let forEach = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const forEachMatch = line.match(/refs\.([A-Za-z0-9_]+)\??\.forEach\s*\(\s*\(\s*([A-Za-z0-9_]+)/);
    if (forEachMatch) forEach = { collection: forEachMatch[1], variable: forEachMatch[2], depth: 0 };
    if (forEach) {
      forEach.depth += (line.match(/\{/g) || []).length;
      forEach.depth -= (line.match(/\}/g) || []).length;
    }

    const direct = line.match(/refs\.([A-Za-z0-9_]+)\??\.([A-Za-z0-9_]+)\??\.setTargetAtTime\s*\(/);
    if (direct) {
      writes.push({ line: i + 1, target: `${direct[1]}.${direct[2]}`, raw: line.trim() });
    }
    if (forEach) {
      const escaped = forEach.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nested = line.match(new RegExp(`${escaped}\\.([A-Za-z0-9_]+)\\??\\.setTargetAtTime\\s*\\(`));
      if (nested) {
        writes.push({ line: i + 1, target: `${forEach.collection}[].${nested[1]}`, raw: line.trim() });
      }
    }
    if (forEach && forEach.depth <= 0 && /\}\s*\)\s*;?/.test(line)) forEach = null;
  }
  const unique = [...new Map(writes.map((w) => [w.target, w])).values()].sort((a, b) => a.target.localeCompare(b.target));
  return unique;
}

function tokenPresence(text, tokens) {
  return Object.fromEntries(tokens.map((token) => [token, text.includes(token)]));
}

function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function foldFreqIntoRange(freq, min, max) {
  let value = Math.max(0.0001, freq);
  while (value < min) value *= 2;
  while (value > max) value /= 2;
  return clamp(value, min, max);
}

function baseSnapshot(overrides = {}) {
  return {
    constellationTension: 0.12,
    constellationFlux: 0.16,
    constellationBrightness: 0.5,
    constellationCentroidX: 0.5,
    constellationCentroidY: 0.5,
    myzelRelationTension: 0.14,
    myzelVoidPressure: 0.08,
    myzelLocalRoughness: 0.08,
    myzelLocalBody: 0.5,
    myzelLocalFormant: 0.5,
    myzelSpatialWavefolder: 0,
    myzelSpatialBitcrusher: 0,
    myzelSpatialFormant: 0,
    myzelSpatialShimmer: 0,
    myzelSpatialSub: 0,
    myzelSpatialResonator: 0,
    myzelSpatialGrainBlur: 0,
    myzelSpatialDrive: 0,
    myzelSpatialChorus: 0,
    myzelSpatialSpectralTilt: 0.5,
    myzelSpatialQ: 0.35,
    myzelClusterMass: 0.08,
    myzelGestaltAsymmetry: 0.08,
    myzelGestaltLinearity: 0.25,
    myzelPaletteGlassAir: 0.28,
    myzelPaletteMetalCluster: 0,
    myzelPaletteReedFormant: 0,
    myzelPaletteUnstableNoise: 0,
    myzelPaletteWarmChoir: 0.72,
    constellationRatios: [1.25, 1.5, 1.875],
    ...overrides,
  };
}

const FIXTURES = {
  neutral: baseSnapshot(),
  sub: baseSnapshot({ myzelSpatialSub: 1, myzelVoidPressure: 0.42, myzelClusterMass: 0.24 }),
  crush: baseSnapshot({ myzelSpatialBitcrusher: 1, myzelSpatialWavefolder: 1, myzelSpatialDrive: 1, myzelSpatialGrainBlur: 0.4, myzelLocalRoughness: 0.52, myzelPaletteMetalCluster: 0.52, myzelPaletteUnstableNoise: 0.46, myzelRelationTension: 0.48, constellationFlux: 0.38 }),
  resonator: baseSnapshot({ myzelSpatialResonator: 1, myzelSpatialFormant: 0.92, myzelSpatialQ: 1, myzelLocalFormant: 0.86, myzelGestaltLinearity: 0.78, myzelPaletteReedFormant: 0.72, myzelClusterMass: 0.3 }),
  vibe: baseSnapshot({ myzelSpatialShimmer: 1, myzelSpatialChorus: 1, myzelSpatialSpectralTilt: 1, myzelPaletteGlassAir: 1, myzelVoidPressure: 0.28, constellationFlux: 0.24 }),
};

function deriveVector(snapshot) {
  const baseHz = 110;
  const minFreq = 24;
  const maxFreq = 2400;
  const layerMod = { masterGain: 0.9, overtoneRatios: [1.25, 1.5, 1.875] };
  const colorMixer = { enabled: true, volume: 1, carrier: 1, sub: 1, formant: 1, overtone: 1, drive: 1, air: 1 };
  const interpreterMix = { constellationBlend: 0.78, driveAmount: 0.15, driveResponse: 0.7 };
  const myzelDriveEnabled = true;

  const tension = clamp(snapshot.constellationTension ?? 0, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const centroidX = clamp(snapshot.constellationCentroidX ?? 0.5, 0, 1);
  const centroidY = clamp(snapshot.constellationCentroidY ?? 0.5, 0, 1);
  const relationTension = clamp(snapshot.myzelRelationTension ?? 0, 0, 1);
  const voidPressure = clamp(snapshot.myzelVoidPressure ?? 0, 0, 1);
  const localRoughness = clamp(snapshot.myzelLocalRoughness ?? 0, 0, 1);
  const localBody = clamp(snapshot.myzelLocalBody ?? 0.5, 0, 1);
  const localFormant = clamp(snapshot.myzelLocalFormant ?? 0.5, 0, 1);
  const spatialWavefolder = clamp(snapshot.myzelSpatialWavefolder ?? 0, 0, 1);
  const spatialBitcrusher = clamp(snapshot.myzelSpatialBitcrusher ?? 0, 0, 1);
  const spatialFormant = clamp(snapshot.myzelSpatialFormant ?? 0, 0, 1);
  const spatialShimmer = clamp(snapshot.myzelSpatialShimmer ?? 0, 0, 1);
  const spatialSub = clamp(snapshot.myzelSpatialSub ?? 0, 0, 1);
  const spatialResonator = clamp(snapshot.myzelSpatialResonator ?? 0, 0, 1);
  const spatialGrain = clamp(snapshot.myzelSpatialGrainBlur ?? 0, 0, 1);
  const spatialDrive = clamp(snapshot.myzelSpatialDrive ?? 0, 0, 1);
  const spatialChorus = clamp(snapshot.myzelSpatialChorus ?? 0, 0, 1);
  const spatialTilt = clamp(snapshot.myzelSpatialSpectralTilt ?? 0.5, 0, 1);
  const spatialQ = clamp(snapshot.myzelSpatialQ ?? 0.35, 0, 1);
  const clusterMass = clamp(snapshot.myzelClusterMass ?? 0, 0, 1);
  const gestaltAsymmetry = clamp(snapshot.myzelGestaltAsymmetry ?? 0, 0, 1);
  const gestaltLinearity = clamp(snapshot.myzelGestaltLinearity ?? 0, 0, 1);
  const paletteGlassAir = clamp(snapshot.myzelPaletteGlassAir ?? 0.28, 0, 1);
  const paletteMetalCluster = clamp(snapshot.myzelPaletteMetalCluster ?? 0, 0, 1);
  const paletteReedFormant = clamp(snapshot.myzelPaletteReedFormant ?? 0, 0, 1);
  const paletteUnstableNoise = clamp(snapshot.myzelPaletteUnstableNoise ?? 0, 0, 1);
  const paletteWarmChoir = clamp(snapshot.myzelPaletteWarmChoir ?? 0.72, 0, 1);

  const colorVoiceVolume = clamp(colorMixer.volume, 0, 1.5);
  const colorCarrierMix = clamp(colorMixer.carrier, 0, 1);
  const colorSubMix = clamp(colorMixer.sub, 0, 1);
  const colorFormantMix = clamp(colorMixer.formant, 0, 1);
  const colorOvertoneMix = clamp(colorMixer.overtone, 0, 1);
  const colorDriveMix = clamp(colorMixer.drive, 0, 1);
  const colorAirMix = clamp(colorMixer.air, 0, 1);

  const tensionEnv = clamp(lerp(0, relationTension, 0.35), 0, 1);
  const voidEnv = clamp(lerp(0, voidPressure, 0.05), 0, 1);
  const releaseSplash = 0;
  const semanticObsession = 0;
  const semanticRawReality = 0;
  const semanticSymbiosis = 0;
  const semanticStarveDucking = 1;
  const topologicalRelationEnergy = spatialResonator * 0.35;
  const topologicalInterference = spatialResonator * 0.18;
  const topologicalSparkle = spatialResonator * 0.12;
  const modulationDriveLift = 0;
  const modulationFormantLift = 0;
  const modulationOvertoneLift = 0;
  const modulationAirLift = 0;
  const modulationColorLift = 1;
  const modulationMemoryLift = 0;

  const spatialDistortion = clamp(spatialWavefolder * 0.52 + spatialBitcrusher * 0.34 + spatialDrive * 0.44 + spatialGrain * 0.22 + paletteMetalCluster * 0.16 + paletteUnstableNoise * 0.14 + gestaltAsymmetry * 0.08 + tensionEnv * 0.1 + semanticObsession * 0.18 + semanticRawReality * 0.1 + topologicalInterference * 0.2 + modulationDriveLift * 0.24, 0, 1);
  const spatialAir = clamp(spatialShimmer * 0.52 + spatialChorus * 0.28 + Math.max(0, spatialTilt - 0.5) * 0.34 + paletteGlassAir * 0.12 + releaseSplash * 0.48, 0, 1);
  const fieldWavefold = clamp(spatialWavefolder * 0.76 + spatialDrive * 0.28 + paletteMetalCluster * 0.2 + tensionEnv * 0.16, 0, 1);
  const fieldFormant = clamp(spatialFormant * 0.72 + paletteReedFormant * 0.24 + gestaltLinearity * 0.18 + localFormant * 0.12 + semanticSymbiosis * 0.16 + topologicalRelationEnergy * 0.14 + modulationFormantLift * 0.18 - semanticObsession * 0.08, 0, 1);
  const fieldVoidSub = clamp((spatialSub * 0.58 + voidEnv * 0.42 + spatialResonator * 0.18 + clusterMass * 0.1 + semanticRawReality * 0.18 + topologicalRelationEnergy * 0.08 + modulationMemoryLift * 0.08) * (0.35 + colorSubMix * 0.85), 0, 1);
  const fieldRoughnessPressure = clamp(localRoughness * 0.44 + spatialDistortion * 0.38 + paletteUnstableNoise * 0.18 + semanticRawReality * 0.14 + semanticObsession * 0.14 + topologicalInterference * 0.16, 0, 1);
  const fieldDrivePressure = clamp(Math.pow(tensionEnv * 0.6 + fieldRoughnessPressure * 0.32 + semanticObsession * 0.18, 1.5), 0, 1);
  const driveCompensation = clamp(1 - fieldDrivePressure * 0.25 * (0.35 + colorDriveMix * 0.65), 0.72, 1);
  const fieldSpaceBoost = clamp(spatialAir * 0.34 + spatialShimmer * 0.28 + voidEnv * 0.24 + releaseSplash * 0.55 + topologicalSparkle * 0.12 + modulationAirLift * 0.42, 0, 1);
  const constellationBlend = clamp(interpreterMix.constellationBlend, 0, 1);
  const gateLift = 1;
  const ratios = (snapshot.constellationRatios?.length ? snapshot.constellationRatios : layerMod.overtoneRatios).slice(0, 3);
  const interpreterDrive = myzelDriveEnabled ? clamp(interpreterMix.driveAmount + (tension * 0.28 + flux * 0.42 + brightness * 0.08) * interpreterMix.driveResponse + spatialDistortion * 0.24 + fieldWavefold * 0.2 + paletteUnstableNoise * 0.08, 0, 1) : 0;
  const colorBodyPresence = clamp(0.18 + flux * 0.24 + tensionEnv * 0.18 + fieldVoidSub * 0.28 + paletteWarmChoir * 0.12, 0, 1);
  const colorCarrierGain = colorVoiceVolume * modulationColorLift * colorCarrierMix * clamp(0.018 + colorBodyPresence * 0.075 + fieldWavefold * 0.018, 0.0001, 0.16);
  const colorSubGain = colorVoiceVolume * modulationColorLift * colorSubMix * clamp(0.0001 + fieldVoidSub * 0.095 + voidEnv * 0.032, 0.0001, 0.16);
  const colorBodyGain = colorVoiceVolume * modulationColorLift * colorCarrierMix * clamp(0.02 + localBody * 0.05 + fieldVoidSub * 0.045 + clusterMass * 0.018, 0.0001, 0.18);
  const carrierFreq = baseHz * (0.985 + localFormant * 0.03 + fieldWavefold * 0.012);
  const lowpassFreq = clamp(baseHz * (5.5 + brightness * 8.5 + fieldFormant * 5.2 + spatialAir * 2.2 - fieldVoidSub * 2.4), 180, 6200);
  const lowpassQ = clamp(0.55 + fieldFormant * 3.8 + gestaltLinearity * 2.1 + tensionEnv * 1.4, 0.45, 8.5);
  const vowelBias = 0.76;
  const formant0Freq = clamp(baseHz * (2.2 + vowelBias * 2.7 + fieldFormant * 1 * 1.7 + paletteReedFormant * 1.8 - fieldVoidSub * 0.55), 240, 4200);
  const formant0Q = clamp(1.0 + fieldFormant * 8.0 + gestaltLinearity * 4.5 + tensionEnv * 2.2, 0.7, 18);
  const formant0Gain = colorVoiceVolume * colorFormantMix * (1 + modulationFormantLift) * semanticStarveDucking * clamp((0.002 + fieldFormant * 0.036 + paletteReedFormant * 0.018 + releaseSplash * 0.006) * 0.72, 0.0001, 0.09);
  const overtone0Detune = clusterMass * 9 + paletteMetalCluster * 11 + spatialDistortion * 5;
  const overtone0Freq = clamp(baseHz * (ratios[0] ?? 1.25) * Math.pow(2, overtone0Detune / 1200), minFreq * 0.75, maxFreq * 8);
  const overtone0Gain = colorVoiceVolume * colorOvertoneMix * (1 + modulationOvertoneLift) * semanticStarveDucking * clamp((0.0015 + clusterMass * 0.012 + flux * 0.01 + fieldSpaceBoost * 0.006 + paletteMetalCluster * 0.006 + semanticSymbiosis * 0.004) * 0.82, 0.0001, 0.045);
  const drivePreGain = myzelDriveEnabled ? clamp(1 + (fieldDrivePressure * 3.5 + fieldWavefold * 1.15 + semanticObsession * 0.85 + modulationDriveLift * 1.15) * (0.25 + colorDriveMix * 0.95) + interpreterDrive * 4.4 + constellationBlend * flux * 1.1, 1, 9.2) : 1;
  const masterGain = Math.max(0.0001, layerMod.masterGain * colorVoiceVolume * gateLift * (0.92 + constellationBlend * 0.14 + voidEnv * 0.08));
  const fieldAirPressure = clamp((fieldSpaceBoost * 0.48 + releaseSplash * 0.38 + spatialShimmer * 0.2 + voidEnv * 0.12 + modulationAirLift * 0.55) * colorAirMix, 0, 1);
  const airSend = fieldAirPressure * 0.5 * colorVoiceVolume;
  const airWetGain = Math.max(0.0001, layerMod.masterGain * colorVoiceVolume * gateLift * (0.32 + fieldAirPressure * 0.26));
  const airFeedback = clamp(0.35 + tensionEnv * 0.16 + spatialShimmer * 0.12 + paletteGlassAir * 0.04, 0.35, 0.72);
  const airDelay = clamp(0.28 + voidEnv * 0.24 + releaseSplash * 0.1, 0.18, 0.78);
  const airHighpass = clamp(1350 + spatialAir * 520 + releaseSplash * 280 - voidEnv * 170, 900, 2400);
  const constellationFreq = foldFreqIntoRange(baseHz * (1.42 + brightness * 1.74 + centroidY * 0.38 + fieldFormant * 0.92 + spatialAir * 0.42 + localBody * 0.12 - fieldVoidSub * 0.48 + releaseSplash * 0.74), 95 + fieldVoidSub * 70, 5200);
  const constellationQ = clamp(1.1 + (tension * 3.2 + flux * 1.8 + tensionEnv * 3.4 + fieldDrivePressure * 1.4 + fieldFormant * 2.8 * colorFormantMix + spatialResonator * 1.6 + spatialQ * 1.4 + paletteReedFormant * 2.1 * colorFormantMix + gestaltLinearity * 2.3) * (0.35 + constellationBlend * 0.65) - releaseSplash * 0.45, 0.7, 15.5);
  const constellationOsc0Detune = (centroidX - 0.5) * 10 + flux * 2.2 + localRoughness * 3.8 + spatialDistortion * 3.6 + paletteUnstableNoise * 2.8 + (localFormant - 0.5) * 1.2;
  const constellationOsc0Freq = clamp(baseHz * (ratios[0] ?? 1.25) * Math.pow(2, constellationOsc0Detune / 1200), minFreq * 0.75, maxFreq * 8);
  const constellationGain0 = Math.max(0.0001, (0.002 + tension * 0.008 + brightness * 0.004 + flux * 0.018 + tensionEnv * 0.016 + releaseSplash * 0.011 + fieldSpaceBoost * 0.006 + spatialDistortion * 0.009 + fieldVoidSub * 0.012 + paletteWarmChoir * 0.002) * gateLift * constellationBlend * colorOvertoneMix * driveCompensation);

  return {
    fieldVoidSub,
    spatialDistortion,
    fieldWavefold,
    fieldFormant,
    fieldDrivePressure,
    fieldSpaceBoost,
    fieldAirPressure,
    carrierFreq,
    subFreq: baseHz / 2,
    carrierGain: colorCarrierGain,
    subGain: colorSubGain,
    bodyGain: colorBodyGain,
    lowpassFreq,
    lowpassQ,
    formant0Freq,
    formant0Q,
    formant0Gain,
    overtone0Freq,
    overtone0Detune,
    overtone0Gain,
    drivePreGain,
    colorPostGain: driveCompensation,
    masterGain,
    airSend,
    airWetGain,
    airFeedback,
    airDelay,
    airHighpass,
    constellationFreq,
    constellationQ,
    constellationOsc0Freq,
    constellationOsc0Detune,
    constellationGain0,
  };
}

function deltaVector(a, b) {
  return Object.fromEntries(Object.keys(a).map((key) => [key, Number((a[key] - b[key]).toFixed(6))]));
}

function normalizedDistance(a, b) {
  const keys = ['fieldVoidSub', 'spatialDistortion', 'fieldFormant', 'fieldSpaceBoost', 'fieldAirPressure', 'fieldDrivePressure', 'subGain', 'drivePreGain', 'formant0Q', 'constellationQ', 'airSend', 'airDelay'];
  const scales = { drivePreGain: 9.2, formant0Q: 18, constellationQ: 15.5, subGain: 0.16, airDelay: 0.78 };
  let sum = 0;
  for (const key of keys) {
    const scale = scales[key] ?? 1;
    const d = ((a[key] ?? 0) - (b[key] ?? 0)) / scale;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function evalAssertion(value, op, threshold, neutralValue) {
  if (op === '>=') return value >= threshold;
  if (op === '<=') return value <= threshold;
  if (op === 'delta>=') return (value - neutralValue) >= threshold;
  if (op === 'delta<=') return (value - neutralValue) <= threshold;
  throw new Error(`Unknown assertion op ${op}`);
}

function createVectorProof() {
  const vectors = Object.fromEntries(Object.entries(FIXTURES).map(([name, snapshot]) => [name, deriveVector(snapshot)]));
  const neutral = vectors.neutral;
  const assertions = {};
  let ok = true;
  for (const device of DEVICE_NAMES) {
    assertions[device] = DEVICE_EXPECTATIONS[device].vectorAssertions.map(([metric, op, threshold]) => {
      const value = vectors[device][metric];
      const neutralValue = neutral[metric];
      const pass = evalAssertion(value, op, threshold, neutralValue);
      ok &&= pass;
      return { metric, op, threshold, value: Number(value.toFixed(6)), neutral: Number(neutralValue.toFixed(6)), delta: Number((value - neutralValue).toFixed(6)), pass };
    });
  }
  const pairwise = [];
  for (let i = 0; i < DEVICE_NAMES.length; i += 1) {
    for (let j = i + 1; j < DEVICE_NAMES.length; j += 1) {
      const a = DEVICE_NAMES[i];
      const b = DEVICE_NAMES[j];
      const distance = normalizedDistance(vectors[a], vectors[b]);
      const pass = distance >= 0.18;
      ok &&= pass;
      pairwise.push({ a, b, normalizedDistance: Number(distance.toFixed(6)), pass });
    }
  }
  return {
    ok,
    vectors: Object.fromEntries(Object.entries(vectors).map(([name, vector]) => [name, Object.fromEntries(Object.entries(vector).map(([k, v]) => [k, Number(v.toFixed(6))]))])),
    deltasFromNeutral: Object.fromEntries(DEVICE_NAMES.map((name) => [name, deltaVector(vectors[name], neutral)])),
    assertions,
    pairwise,
  };
}

function summarizeDeviceSource(text) {
  const summary = {};
  for (const device of DEVICE_NAMES) {
    const expected = DEVICE_EXPECTATIONS[device];
    const tokenMap = tokenPresence(text, expected.sourceTokens);
    const targetMap = tokenPresence(text, expected.writeTargets.map((target) => target.replace('[]', '')));
    summary[device] = {
      label: expected.label,
      requiredSourceTokens: tokenMap,
      requiredWriteFamilies: targetMap,
      pass: Object.values(tokenMap).every(Boolean),
    };
  }
  return summary;
}

function compareWrites(refWrites, currentWrites) {
  const refSet = new Set(refWrites.map((w) => w.target));
  const curSet = new Set(currentWrites.map((w) => w.target));
  const expectedMissingInRef = ORACLE_EXPECTED_WRITE_TARGETS.filter((target) => !refSet.has(target));
  const expectedMissingInCurrent = ORACLE_EXPECTED_WRITE_TARGETS.filter((target) => !curSet.has(target));
  const refOnly = [...refSet].filter((target) => !curSet.has(target)).sort();
  const currentOnly = [...curSet].filter((target) => !refSet.has(target)).sort();
  return {
    expectedTargets: ORACLE_EXPECTED_WRITE_TARGETS,
    expectedMissingInRef,
    expectedMissingInCurrent,
    refOnly,
    currentOnly,
    pass: expectedMissingInRef.length === 0 && expectedMissingInCurrent.length === 0,
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# Room III 8.79 Node Device Proof Harness`);
  lines.push('');
  lines.push(`Status: **${report.ok ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push(`Reference: \`${report.paths.ref || 'self-only'}\``);
  lines.push(`Current: \`${report.paths.current}\``);
  lines.push('');
  lines.push('## AudioGraph write-target parity');
  lines.push('');
  lines.push(`Expected write targets: ${report.writeParity.expectedTargets.length}`);
  lines.push(`Missing in 8.79 reference: ${report.writeParity.expectedMissingInRef.length ? report.writeParity.expectedMissingInRef.join(', ') : 'none'}`);
  lines.push(`Missing in current: ${report.writeParity.expectedMissingInCurrent.length ? report.writeParity.expectedMissingInCurrent.join(', ') : 'none'}`);
  lines.push('');
  lines.push('## Device vector assertions');
  lines.push('');
  lines.push('| Device | Assertion | Value | Neutral | Delta | Pass |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const device of DEVICE_NAMES) {
    for (const row of report.vectorProof.assertions[device]) {
      lines.push(`| ${device} | ${row.metric} ${row.op} ${row.threshold} | ${row.value} | ${row.neutral} | ${row.delta} | ${row.pass ? 'yes' : 'NO'} |`);
    }
  }
  lines.push('');
  lines.push('## Pairwise device-vector separation');
  lines.push('');
  lines.push('| Pair | Normalized distance | Pass |');
  lines.push('|---|---:|---|');
  for (const row of report.vectorProof.pairwise) {
    lines.push(`| ${row.a} ↔ ${row.b} | ${row.normalizedDistance} | ${row.pass ? 'yes' : 'NO'} |`);
  }
  lines.push('');
  lines.push('## Device source-token coverage');
  for (const device of DEVICE_NAMES) {
    const src = report.currentDeviceSource[device];
    const missing = Object.entries(src.requiredSourceTokens).filter(([, present]) => !present).map(([token]) => token);
    lines.push('');
    lines.push(`### ${src.label}`);
    lines.push(missing.length ? `Missing source tokens: ${missing.join(', ')}` : 'Required source tokens present.');
  }
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('This harness proves source-level AudioGraph write-target parity and synthetic parameter-vector separation. It does **not** claim final musical balance or spectral identity. A future browser/offline-audio probe can build on the JSON vector and write-target matrix produced here.');
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.current)) throw new Error(`Current root not found: ${args.current}`);
  if (!args.selfOnly && (!args.ref || !fs.existsSync(args.ref))) throw new Error(`8.79 reference root missing. Pass --ref <Xensonar_3.2.91.6.8.79..._source> or set XENSONAR_879_REF. Use --self-only only for vector-only smoke.`);

  const currentCorpus = readSourceCorpus(args.current);
  const currentText = extractRelevantCurrentText(args.current, currentCorpus);
  const currentWrites = extractAudioWrites(currentText);
  let refText = '';
  let refWrites = [];
  if (!args.selfOnly) {
    const refCorpus = readSourceCorpus(args.ref);
    refText = extractRelevantRefText(args.ref, refCorpus);
    refWrites = extractAudioWrites(refText);
  } else {
    refWrites = ORACLE_EXPECTED_WRITE_TARGETS.map((target, idx) => ({ target, line: idx + 1, raw: 'self-only oracle target' }));
  }

  const writeParity = compareWrites(refWrites, currentWrites);
  const vectorProof = createVectorProof();
  const currentDeviceSource = summarizeDeviceSource(currentText);
  const refDeviceSource = args.selfOnly ? {} : summarizeDeviceSource(refText);
  const deviceSourcePass = Object.values(currentDeviceSource).every((entry) => entry.pass);
  const ok = writeParity.pass && vectorProof.ok && deviceSourcePass;

  const report = {
    ok,
    generatedAt: new Date().toISOString(),
    paths: { current: args.current, ref: args.selfOnly ? '' : args.ref },
    harness: {
      kind: 'source-write-target-oracle + synthetic-device-vector-proof',
      devices: DEVICE_NAMES,
      note: 'No UI click or human listening required for this proof level.',
    },
    writeParity,
    currentWrites,
    refWrites,
    currentDeviceSource,
    refDeviceSource,
    vectorProof,
  };

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, `${json}\n`);
  }
  if (args.md) {
    fs.mkdirSync(path.dirname(args.md), { recursive: true });
    fs.writeFileSync(args.md, buildMarkdown(report));
  }
  console.log(json);
  if (!ok) process.exit(1);
}

main();
