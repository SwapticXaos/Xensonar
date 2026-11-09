const fs = require('fs');
const path = require('path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

const OLD_ROOT = '/mnt/data/xensonar_381_work/Xensonar_380_RFL_AUTHORITY_AUDIT_source';
const NEW_ROOT = '/mnt/data/xensonar_381_work/Xensonar_381_RFL_MATERIAL_RENDER_PLAN_source';

function makeLoader(root) {
  const cache = new Map();
  function resolveLocal(from, spec) {
    if (spec.startsWith('@/')) return path.join(root, 'src', spec.slice(2));
    if (spec.startsWith('.')) return path.resolve(path.dirname(from), spec);
    return null;
  }
  function findFile(base) {
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.json`, path.join(base, 'index.ts')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
  }
  function load(file) {
    file = findFile(file) || file;
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} };
    cache.set(file, module);
    const src = fs.readFileSync(file, 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const localRequire = (spec) => {
      if (spec.includes('audioPressureMap')) return { recordAudioPressureCount() {} };
      if (spec.endsWith('/localField') || spec === './localField') {
        return {
          ensureLocalFieldState: (v) => v,
          getLocalFieldTargetState: () => null,
          localFieldDynamicFadeGain: () => 1,
          localFieldPitchSemitoneOffset: () => 0,
          resolveLocalFieldCurve: () => ({ resolved: [0] }),
        };
      }
      const resolved = resolveLocal(file, spec);
      if (resolved) {
        const found = findFile(resolved);
        if (!found) throw new Error(`cannot resolve ${spec} from ${file}`);
        return load(found);
      }
      return require(spec);
    };
    new Function('require', 'module', 'exports', '__filename', '__dirname', out)(
      localRequire, module, module.exports, file, path.dirname(file),
    );
    return module.exports;
  }
  return { load };
}

function makeBuffer() {
  const sampleRate = 48000;
  const length = 96000;
  const channels = [new Float32Array(length), new Float32Array(length)];
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const transient = (i % 997) < 5 ? 0.18 * (5 - (i % 997)) / 5 : 0;
    channels[0][i] = Math.sin(t * Math.PI * 2 * 173.25) * 0.21 + Math.sin(t * Math.PI * 2 * 431) * 0.035 + transient;
    channels[1][i] = Math.sin(t * Math.PI * 2 * 181.75) * 0.19 - Math.sin(t * Math.PI * 2 * 397) * 0.03 - transient * 0.7;
  }
  return {
    sampleRate,
    length,
    duration: length / sampleRate,
    numberOfChannels: 2,
    getChannelData(ch) { return channels[ch]; },
  };
}

function runSchedule(mod, cfg) {
  const events = [];
  const ctx = {
    currentTime: cfg.currentTime,
    createBufferSource() {
      const rec = { kind: 'source', rate: null, start: null, stop: null };
      events.push(rec);
      return {
        buffer: null,
        playbackRate: { setValueAtTime(v, t) { rec.rate = [v, t]; } },
        connect() {},
        start(...args) { rec.start = args; },
        stop(...args) { rec.stop = args; },
      };
    },
    createGain() {
      const rec = { kind: 'gain', curve: null };
      events.push(rec);
      return {
        gain: { setValueCurveAtTime(curve, when, dur) { rec.curve = [Array.from(curve), when, dur]; } },
        connect() {},
      };
    },
  };
  mod.scheduleMaterialElasticSlice({
    ctx,
    destination: { connect() {} },
    buffer: makeBuffer(),
    noteStart: cfg.noteStart,
    noteEnd: cfg.noteEnd,
    nominalDur: cfg.nominalDur,
    safeOffsetSec: cfg.safeOffsetSec,
    sliceDurationSec: cfg.sliceDurationSec,
    playbackRate: cfg.playbackRate,
    quality: cfg.quality,
    tuning: cfg.tuning,
    minimumScheduleLeadSec: cfg.minimumScheduleLeadSec,
    pressureSource: 'root-follow-material-grain',
  });
  return events;
}

function normalize(events) {
  return events.map((e) => {
    if (e.kind === 'source') return { kind: e.kind, rate: e.rate, start: e.start, stop: e.stop };
    return { kind: e.kind, curveWhen: e.curve?.[1], curveDur: e.curve?.[2], curve: e.curve?.[0] };
  });
}

function deepClose(a, b, eps = 1e-12, trail = '') {
  if (typeof a === 'number' || typeof b === 'number') {
    if (!(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= eps)) {
      throw new Error(`numeric mismatch ${trail}: ${a} vs ${b}`);
    }
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) throw new Error(`array mismatch ${trail}`);
    for (let i = 0; i < a.length; i++) deepClose(a[i], b[i], eps, `${trail}[${i}]`);
    return;
  }
  if (a && typeof a === 'object' || b && typeof b === 'object') {
    if (!a || !b) throw new Error(`object null mismatch ${trail}`);
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join('|') !== kb.join('|')) throw new Error(`keys mismatch ${trail}: ${ka} vs ${kb}`);
    for (const k of ka) deepClose(a[k], b[k], eps, `${trail}.${k}`);
    return;
  }
  if (a !== b) throw new Error(`value mismatch ${trail}: ${a} vs ${b}`);
}

const oldMod = makeLoader(OLD_ROOT).load(path.join(OLD_ROOT, 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts'));
const newMod = makeLoader(NEW_ROOT).load(path.join(NEW_ROOT, 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts'));
const cases = [
  { currentTime: 1, noteStart: 1.04, noteEnd: 1.11, nominalDur: .07, safeOffsetSec: .22, sliceDurationSec: .08, playbackRate: 1, quality: 'base', minimumScheduleLeadSec: .006, tuning: { grainWindowScale: 1, grainSpacingScale: 1, jitterScale: 1, sourceDurationScale: 1, maxGrains: 18, microCutSafety: true, microCutSearchRadiusMs: 6, sourceStartGuardMs: 1.2, grainTimeDitherMs: 0.7, grainSourceDitherMs: 1.1 } },
  { currentTime: 2.1, noteStart: 2.13, noteEnd: 2.25, nominalDur: .12, safeOffsetSec: .68, sliceDurationSec: .14, playbackRate: 1.773, quality: 'fragment', minimumScheduleLeadSec: .006, tuning: { grainWindowScale: .82, grainSpacingScale: .74, jitterScale: 1.4, sourceDurationScale: 1.12, maxGrains: 30, microCutSafety: true, microCutSearchRadiusMs: 4, sourceStartGuardMs: 2.4, grainTimeDitherMs: 1.3, grainSourceDitherMs: 2.2 } },
  { currentTime: 3.0, noteStart: 3.002, noteEnd: 3.082, nominalDur: .08, safeOffsetSec: 1.18, sliceDurationSec: .09, playbackRate: .41, quality: 'base', minimumScheduleLeadSec: .018, tuning: { grainWindowScale: 1.15, grainSpacingScale: .9, jitterScale: .6, sourceDurationScale: .8, maxGrains: 10, microCutSafety: false, microCutSearchRadiusMs: 6, sourceStartGuardMs: 0, grainTimeDitherMs: 0, grainSourceDitherMs: 0 } },
];
let totalEvents = 0;
cases.forEach((cfg, i) => {
  const oldEvents = normalize(runSchedule(oldMod, cfg));
  const newEvents = normalize(runSchedule(newMod, cfg));
  deepClose(oldEvents, newEvents, 1e-12, `case${i}`);
  totalEvents += oldEvents.length;
});
console.log(JSON.stringify({ pass: true, cases: cases.length, comparedEvents: totalEvents, exactSchedulerParity: true }));
