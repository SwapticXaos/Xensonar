import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const scheduledPath = 'src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts';
const gradientPath = 'src/features/xensonar/audio/waveStarterGradientToneGraph.ts';
const gradientPlaybackPath = 'src/features/xensonar/audio/waveStarterGradientTonePlayback.ts';
const transientPath = 'src/features/resonance/transientRuntime.ts';
const noisePath = 'src/features/xensonar/audio/particleNoiseAccentPlaybackBoundary.ts';
const samplePath = 'src/features/soundLibrary/particleSamplePlayback.ts';
const particlePlanPath = 'src/features/xensonar/audio/particleSynthTonePlan.ts';
const waveManifestPath = 'src/features/xensonar/audio/waveStarterSynthPresetManifest.json';

const scheduled = read(scheduledPath);
const gradient = read(gradientPath);
const gradientPlayback = read(gradientPlaybackPath);
const transient = read(transientPath);
const noise = read(noisePath);
const sample = read(samplePath);
const particlePlan = read(particlePlanPath);
const waveManifest = JSON.parse(read(waveManifestPath));

const indexOrder = (text, parts, label) => {
  let last = -1;
  const positions = {};
  for (const part of parts) {
    const idx = text.indexOf(part);
    assert(idx >= 0, `${label}: missing ${part}`);
    assert(idx > last, `${label}: wrong order around ${part}`);
    positions[part] = idx;
    last = idx;
  }
  return positions;
};

indexOrder(scheduled, [
  'ticket = deps.transientRuntime.admitVoice',
  'const osc = own(deps.ctx.createOscillator())',
  'osc.start(safeStart)',
], 'scheduled-tone');
indexOrder(gradientPlayback, [
  'ticket = args.transientRuntime.admitVoice',
  'const gradientGraph = createWaveStarterGradientToneGraph',
  'osc.start(now)',
], 'gradient-tone');
indexOrder(noise, [
  'const lease = request.acquireVoice?.()',
  'source = own(runtime.ctx.createBufferSource())',
  'source.start(startAt)',
], 'particle-noise');
indexOrder(sample, [
  'const lease = args.acquireVoice?.()',
  'source = own(ctx.createBufferSource())',
  'source.start(now',
], 'particle-sample');

const countCreates = (text) => (text.match(/ctx\.create(?:Oscillator|Gain|BiquadFilter|WaveShaper|BufferSource|StereoPanner)\(\)/g) ?? []).length;
const gradientNodeCount = countCreates(gradient);
assert(gradientNodeCount === 18, `Expected 18 gradient nodes, saw ${gradientNodeCount}`);
const scheduledLegacySection = scheduled.slice(scheduled.indexOf('function playLegacyScheduledToneWithLifecycle'), scheduled.indexOf('export function playScheduledToneWithLifecycle'));
const scheduledNodeCount = countCreates(scheduledLegacySection.replaceAll('deps.ctx.', 'ctx.'));
assert(scheduledNodeCount === 3, `Expected 3 legacy scheduled tone nodes, saw ${scheduledNodeCount}`);
const noiseNodeCount = (noise.match(/runtime\.ctx\.create(?:BufferSource|BiquadFilter|WaveShaper|Gain)\(\)/g) ?? []).length;
assert(noiseNodeCount === 5, `Expected 5 noise nodes, saw ${noiseNodeCount}`);
const sampleNodeCount = (sample.match(/ctx\.create(?:BufferSource|BiquadFilter|StereoPanner|Gain)\(\)/g) ?? []).length;
assert(sampleNodeCount === 5, `Expected 5 sample nodes, saw ${sampleNodeCount}`);

const wavePresets = {};
let waveMaxDelaySec = 0;
let waveMaxDelayedPartials = 0;
for (const [preset, tones] of Object.entries(waveManifest.presets)) {
  const delayed = tones.filter((t) => Number(t.delay) > 0);
  const maxDelaySec = tones.reduce((m, t) => Math.max(m, Number(t.delay) || 0), 0);
  waveMaxDelaySec = Math.max(waveMaxDelaySec, maxDelaySec);
  waveMaxDelayedPartials = Math.max(waveMaxDelayedPartials, delayed.length);
  wavePresets[preset] = {
    partials: tones.length,
    delayedPartials: delayed.length,
    maxDelayMs: Math.round(maxDelaySec * 1000),
    prestartNodesScheduledTonePath: delayed.length * scheduledNodeCount,
    prestartNodesGradientPath: delayed.length * gradientNodeCount,
  };
}

const particleOffsets = [...particlePlan.matchAll(/offset\s*\+\s*(0\.\d+)/g)].map((m) => Number(m[1]));
const particleMaxInternalDelaySec = Math.max(0, ...particleOffsets);

const getNum = (re, text, label) => {
  const m = text.match(re); assert(m, `Missing ${label}`); return Number(m[1]);
};
const hardLimit = getNum(/hardLimit = options\.hardLimit \?\? (\d+)/, transient, 'hardLimit');
const softLimit = getNum(/softLimit = options\.softLimit \?\? (\d+)/, transient, 'softLimit');
const waveLimit = getNum(/wave:\s*(\d+)/, transient, 'wave limit');
const particleLimit = getNum(/particle:\s*(\d+)/, transient, 'particle limit');

const directDriveCurveGenerationsPerGradientPartial = (gradient.match(/makeDriveCurve\(/g) ?? []).length;
const cachedDriveCurveRequestsPerGradientPartial = (gradient.match(/getWaveStarterDriveCurve\(/g) ?? []).length;
assert(directDriveCurveGenerationsPerGradientPartial === 0, `Expected no direct drive-curve generation in gradient graph, saw ${directDriveCurveGenerationsPerGradientPartial}`);
assert(cachedDriveCurveRequestsPerGradientPartial === 2, `Expected 2 cached drive-curve requests per gradient partial, saw ${cachedDriveCurveRequestsPerGradientPartial}`);

const result = {
  schema: 'xensonar.browser-resource-decomposition.v1',
  source: 'Xensonar 387 optimized source',
  verifiedOrdering: {
    scheduledTone: 'ticket -> 3-node graph -> future osc.start',
    waveGradientTone: 'ticket -> 18-node graph -> future osc.start',
    particleNoiseAccent: 'ticket/lease -> 5-node graph -> future source.start',
    particleSample: 'ticket/lease -> 5-node graph -> scheduled source.start after async load',
  },
  transientPool: { softLimit, hardLimit, perSource: { wave: waveLimit, particle: particleLimit } },
  nodeCostPerAdmittedVoice: {
    scheduledToneClassic: scheduledNodeCount,
    waveGradientClassic: gradientNodeCount,
    particleNoiseAccent: noiseNodeCount,
    particleSample: sampleNodeCount,
  },
  wave: {
    maxInternalDelayMs: Math.round(waveMaxDelaySec * 1000),
    maxDelayedPartialsPerPreset: waveMaxDelayedPartials,
    directDriveCurveGenerationsPerGradientPartial,
    cachedDriveCurveRequestsPerGradientPartial,
    driveCurveSamplesPerCall: 1024,
    presets: wavePresets,
  },
  particle: {
    maxAdditionalInternalToneDelayMs: Math.round(particleMaxInternalDelaySec * 1000),
    note: 'Quantized request.when-currentTime is additional and not bounded by particleSynthTonePlan.ts.',
  },
  conclusion: [
    'logical transient tickets are not equivalent to WebAudio graph cost',
    'future scheduled components allocate graph resources before audible onset',
    'gradient-enabled WaveStarter can cost 18 WebAudio nodes for one logical voice',
  ],
};

console.log(JSON.stringify(result, null, 2));
