'use strict';

// Run the production coordinator with simulated WebAudio routing/timer ports.
// The policy, timeline decisions and settings are the production functions.
const fs = require('fs'), assert = require('assert/strict'), {load: load} = require('./offline_runtime.cjs'), h = load(process.cwd()), source = h.run('dSe.toString()');

async function coordinate(muted, pattern) {
  const effects = [], timers = new Map, renders = [], refs = {
    cacheRef: {
      current: new Map([ [ 'fixture', {
        duration: 1
      } ] ])
    },
    gainRef: {
      current: null
    },
    tokenRef: {
      current: 0
    },
    timerRef: {
      current: null
    },
    activeNodesRef: {
      current: new Set
    },
    activeSynthVoicesRef: {
      current: new Set
    }
  };
  let serial = 0, compiled = 0, stops = 0;
  const param = {
    value: .2,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime() {}
  };
  const ctx = {
    state: 'running',
    currentTime: 2,
    createGain: () => ({
      gain: {
        ...param
      },
      connect() {}
    }),
    createBiquadFilter: () => ({
      frequency: {},
      Q: {},
      connect() {}
    })
  };
  const overrides = {
    P: {
      useRef: value => ({
        current: value
      }),
      useEffect: fn => effects.push(fn)
    },
    window: {
      setTimeout: (fn, delay) => {
        timers.set(++serial, {
          fn: fn,
          delay: delay
        });
        return serial;
      },
      clearTimeout: id => timers.delete(id)
    },
    __XenPan: {
      route: (_ctx, _kind, out) => out
    },
    __f442RFLRasterPolicy: (fields, m) => {
      compiled++;
      return h.run('__f442RFLRasterPolicy')(fields, m);
    },
    Fye: async args => {
      renders.push(args.impulseRasterWindow);
      return {
        nextSliceStart: args.nextSliceStart + .026,
        sessionAnchorHz: 220,
        delayMs: 20
      };
    },
    Eye: () => {},
    Sp: () => {
      stops++;
    },
    Ys: () => {},
    Fn: () => {},
    Db: () => {},
    j2: () => {},
    _ge: () => {},
    zge: () => {},
    __f49AllowRFLProbe: () => false,
    __f49SetRFLVolume: () => {}
  };
  const scope = new Proxy(overrides, {
    has: () => true,
    get: (target, key) => {
      if (key === Symbol.unscopables) return undefined;
      if (key in target) return target[key];
      return h.run(String(key));
    }
  });
  const coordinator = new Function('scope', 'with(scope){return (' + source + ')}')(scope);
  coordinator({
    audioCtx: ctx,
    nexusActive: true,
    rootFollowLoopActive: true,
    selectedRootFollowLoop: {
      id: 'fixture',
      rootHz: 220,
      bars: 1
    },
    selectedRootFollowLoopConfig: {
      sourceKind: 'material'
    },
    quantizeBpm: 120,
    rootFollowLoopTimeMode: 'normal',
    rootFollowLoopVolume: .2,
    rootFollowLoopGranulationMode: 'flowing',
    rootFollowGranularSettings: {},
    rootFollowImpulsRasterEvery: 4,
    rootFollowImpulsRasterCycleDiv: 4,
    rootFollowImpulsRasterClockMode: 'mute-pattern',
    rootFollowImpulsRasterPattern: pattern,
    rootFollowImpulsRasterMuted: muted,
    refs: refs,
    getRhythmBus: () => ({}),
    ensureMyzelPostFxRouter() {},
    getForgeSend: () => null,
    getCurrentRootHz: () => 220,
    playfieldCursorInside: true,
    rootFollowPolicy: {}
  });
  const cleanups = effects.map(fn => fn()).filter(fn => typeof fn === 'function');
  const flush = () => new Promise(r => setImmediate(r));
  await flush();
  for (let i = 0; i < 20 && timers.size; i++) {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id);
    ctx.currentTime += Math.max(.008, timer.delay / 1e3);
    timer.fn();
    await flush();
  }
  assert.equal(compiled, 1, 'one policy preparation per coordinator generation, rather than every tick');
  if (muted) {
    assert(renders.length > 10);
    assert(renders.every(w => w === null), 'continuous bypass cannot submit an impulse window');
  } else if (pattern.some(Boolean)) {
    assert(renders.length > 0);
    assert(renders.some(w => w !== null), 'authored impulse window is kept');
  } else assert.equal(renders.length, 0, 'an authored all-muted grid stays silent until bypassed');
  for (const cleanup of cleanups) cleanup();
  return {
    muted: muted,
    pattern: pattern,
    renders: renders.length,
    compiled: compiled,
    stops: stops
  };
}

(async () => {
  const rows = [];
  for (const pattern of [ [ 1, 0, 0, 0 ], [ 0, 0, 0, 0 ] ]) for (const muted of [ false, true ]) rows.push(await coordinate(muted, pattern));
  const fields = {
    every: 4,
    counterDiv: 4,
    cycleDiv: 4,
    clockMode: 'fragment-compress',
    pattern: [ 1, 0, 1, 0 ]
  }, before = structuredClone(fields), get = h.run('__f442RFLRasterPolicy'), normal = JSON.stringify(get(fields)), bypass = get(fields, true);
  assert(h.run('X0')(bypass));
  assert.equal(JSON.stringify(get(fields)), normal);
  assert.deepEqual(fields, before);
  assert.equal(get(fields, true), bypass, 'reuse the canonical continuous policy');
  fs.writeFileSync('results/ui-refinement/raster.json', JSON.stringify({
    rows: rows,
    patternPreserved: true,
    continuousPolicyReused: true
  }, null, 2) + '\n');
  console.log('PASS production RFL coordinator: normal/all-muted raster, continuous bypass, policy prepared once, cleanup and authored pattern preserved');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
