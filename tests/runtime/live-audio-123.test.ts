import assert from "node:assert/strict";
import { playScheduledToneWithLifecycle as play } from "../../src/features/xensonar/audio/scheduledTonePlaybackBoundary";
import {
  makeXensonarEngineDriveCurve as curve,
  setEntrophonSurfaceSoundConfig as configure,
} from "../../src/core/audio/xensonarMicrotonalSoundEngine";
import { createTransientRuntime } from "../../src/features/resonance/transientRuntime";
import { createControlScheduler } from "../../src/features/resonance/controlScheduler";
let perfNow = 1000;
Object.defineProperty(globalThis, "performance", { value: { now: () => perfNow }, configurable: true });
class Param {
  value = 1;
  events: any[] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.events.push([v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    return this.setValueAtTime(v, t);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    return this.setValueAtTime(v, t);
  }
  setTargetAtTime(v: number, t: number) {
    return this.setValueAtTime(v, t);
  }
  cancelScheduledValues() {}
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  delayTime = new Param();
  disconnected = false;
  started = false;
  starts: number[] = [];
  targets: any[] = [];
  stops: number[] = [];
  onended: null | (() => void) = null;
  constructor(
    public kind: string,
    public failStart = false,
  ) {}
  connect(target: any) {
    this.targets.push(target);
  }
  disconnect() {
    this.disconnected = true;
  }
  start(at = 0) {
    this.starts.push(at);
    if (this.failStart) throw Error("injected start");
    assert.equal(this.started, false);
    this.started = true;
  }
  stop(t = 0) {
    this.stops.push(t);
  }
}
class Context {
  currentTime = 10;
  state = "running";
  nodes: Node[] = [];
  failKind = "";
  failStart = false;
  make(k: string) {
    if (k === this.failKind) throw Error("injected allocation");
    const n = new Node(k, this.failStart);
    this.nodes.push(n);
    return n;
  }
  createOscillator() {
    return this.make("osc");
  }
  createGain() {
    return this.make("gain");
  }
  createBiquadFilter() {
    return this.make("filter");
  }
  createWaveShaper() {
    return this.make("drive");
  }
  createDelay() {
    return this.make("delay");
  }
}
function setup(load = 0) {
  const ctx = new Context();
  let released = 0;
  const active = { current: [] as any[] };
  const deps: any = {
    ctx,
    activeScheduledTonesRef: active,
    heldLong: false,
    getMainOutput: () => ({}),
    transientRuntime: {
      admitVoice: () => ({ plan: { load, envelopeScale: 1, gainScale: 1 } }),
      pickTargets: (x: any) => x,
      releaseVoice: () => released++,
    },
    recordCount: () => {},
    recordAdaptiveAction: () => {},
  };
  return { ctx, active, deps, released: () => released };
}
const req: any = {
  freq: 440,
  offset: 0,
  dur: 0.3,
  type: "sine",
  volume: 0.1,
  options: { source: "wave", plan: {}, prominence: 1 },
};
configure("wave", {
  enabled: true,
  engineAmount: 1,
  unison: 6,
  detune: 20,
  delayAmount: 0.5,
  colorAmount: 1,
  pitchBend: 0,
});
const results: string[] = [];
function test(name: string, fn: () => void) {
  fn();
  results.push(name);
}
test("unloaded voice preserves full 6 + 3 oscillator body", () => {
  const d = setup();
  assert.equal(play(d.deps, req), true);
  assert.equal(d.ctx.nodes.filter((n) => n.kind === "osc").length, 9);
});
test("independent contexts do not inherit chord pressure", () => {
  const d = setup();
  play(d.deps, req);
  assert.equal(d.ctx.nodes.filter((n) => n.kind === "osc").length, 9);
});
test("pressure keeps exact pitch centre and symmetric partial unison", () => {
  for (const load of [0.2, 0.35, 0.7]) {
    const d = setup(load);
    play(d.deps, req);
    const f = d.ctx.nodes
      .filter((n) => n.kind === "osc")
      .slice(0, load >= 0.5 ? 1 : load >= 0.32 ? 2 : 3)
      .map((n) => n.frequency.events[0][0]);
    assert.ok(Math.abs(Math.exp(f.reduce((s, v) => s + Math.log(v), 0) / f.length) - 440) < 1e-8, JSON.stringify(f));
  }
});
test("early primary end stops every oscillator, disconnects every node, releases once", () => {
  const d = setup();
  play(d.deps, req);
  const end = d.active.current[0].osc.onended;
  end();
  end();
  assert.equal(d.active.current.length, 0);
  assert.equal(d.released(), 1);
  assert.ok(d.ctx.nodes.every((n) => n.disconnected));
  assert.ok(d.ctx.nodes.filter((n) => n.kind === "osc").every((n) => n.stops.at(-1) === 0));
});
test("hard-cap rejection creates no orphan oscillator", () => {
  const d = setup(1);
  for (let i = 0; i < 68; i++) assert.equal(play(d.deps, req), true);
  const before = d.ctx.nodes.length;
  assert.equal(play(d.deps, req), false);
  assert.equal(d.ctx.nodes.length, before);
  for (const t of [...d.active.current]) t.osc.onended();
  perfNow += 100;
  assert.equal(play(d.deps, req), true);
});
test("stale and malformed events allocate no nodes", () => {
  for (const patch of [{ offset: -1 }, { freq: NaN }, { dur: 0 }, { volume: Infinity }, { offset: NaN }]) {
    const d = setup();
    assert.equal(play(d.deps, { ...req, ...patch }), false);
    assert.equal(d.ctx.nodes.length, 0);
  }
});
test("partial construction and failed starts roll back graph and admission", () => {
  for (const phase of ["drive", "start"]) {
    const d = setup();
    d.ctx.failKind = phase;
    d.ctx.failStart = phase === "start";
    assert.throws(() => play(d.deps, req), /injected/);
    assert.equal(d.released(), 1);
    assert.equal(d.active.current.length, 0);
    assert.ok(d.ctx.nodes.every((n) => n.disconnected));
  }
});
test("silent color nodes are omitted without raising normalization gain", () => {
  configure("wave", { colorAmount: 0 });
  const d = setup();
  play(d.deps, req);
  assert.equal(d.ctx.nodes.filter((n) => n.kind === "osc").length, 6);
  assert.equal(
    d.ctx.nodes.filter((n) => n.kind === "gain").filter((n) => Math.abs(n.gain.value - 1 / (9 * 0.7)) < 1e-12).length,
    1,
  );
  configure("wave", { colorAmount: 1 });
});
test("all base oscillators share one normalized gain while colors retain their levels", () => {
  const d = setup();
  play(d.deps, req);
  const oscs = d.ctx.nodes.filter((n) => n.kind === "osc");
  assert.equal(oscs.length, 9);
  const base = oscs[0].targets[0];
  for (const osc of oscs.slice(0, 6)) assert.equal(osc.targets[0], base);
  assert.equal(base.gain.value, 1 / (9 * 0.7));
  for (const osc of oscs.slice(6)) assert.notEqual(osc.targets[0], base);
  assert.equal(d.ctx.nodes.filter((n) => n.kind === "gain").length, 9);
});
test("bend timeline starts at actual oscillator onset even on a late hit", () => {
  configure("wave", { pitchBend: 12, pitchBendTime: 0.002 });
  const d = setup();
  play(d.deps, { ...req, offset: -0.001 });
  for (const osc of d.ctx.nodes.filter((n) => n.kind === "osc")) {
    assert.equal(osc.frequency.events[0][1], osc.starts[0]);
    assert.equal(osc.frequency.events[1][1], osc.starts[0] + 0.002);
  }
  configure("wave", { pitchBend: 0 });
});
test("legacy construction and start failures also release owned resources", () => {
  for (const phase of ["filter", "start"]) {
    const d = setup();
    d.ctx.failKind = phase;
    d.ctx.failStart = phase === "start";
    assert.throws(() => play(d.deps, { ...req, options: { source: "particle", plan: {} } }), /injected/);
    assert.equal(d.released(), 1);
    assert.equal(d.active.current.length, 0);
    assert.ok(d.ctx.nodes.every((n) => n.disconnected));
  }
});
test("failed Entrophon starts do not leave recent chord pressure", () => {
  const d = setup();
  d.ctx.failStart = true;
  assert.throws(() => play(d.deps, req));
  d.ctx.failStart = false;
  d.ctx.nodes = [];
  play(d.deps, req);
  assert.equal(d.ctx.nodes.filter((n) => n.kind === "osc").length, 9);
});
test("invalid imported numeric config falls back to finite preset values", () => {
  const cfg = configure("wave", { unison: NaN, release: Infinity, detune: NaN });
  for (const value of Object.values(cfg.wave)) if (typeof value === "number") assert.ok(Number.isFinite(value));
});
test("300 repeated real-gate chord cycles recover all voice slots", () => {
  configure("wave", { unison: 6, detune: 20, release: 0.3, colorAmount: 1 });
  const d = setup();
  const runtime = createTransientRuntime({ silentHotPathSources: { wave: true } });
  d.deps.transientRuntime = runtime;
  let admitted = 0;
  for (let cycle = 0; cycle < 300; cycle++) {
    perfNow += 100;
    for (let note = 0; note < 8; note++) {
      const plan = runtime.beginEvent("wave", 6);
      if (play(d.deps, { ...req, freq: 220 * Math.pow(2, note / 12), options: { ...req.options, plan } })) admitted++;
    }
    for (const tone of [...d.active.current]) tone.osc.onended();
    assert.equal(runtime.getSnapshot().activeVoices, 0);
    assert.equal(d.active.current.length, 0);
  }
  assert.equal(admitted, 2400);
  assert.ok(d.ctx.nodes.every((n) => n.disconnected));
});
test("curve cache is bit-exact and callers cannot corrupt it", () => {
  for (const amount of [0, 0.3, 1, 8, 9]) {
    const expected = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 2047) * 2 - 1;
      expected[i] = Math.tanh(x * (Math.max(0, Math.min(8, amount)) * 18 + 1)) * (1 - 0.06 * Math.abs(x));
    }
    const c = curve(amount);
    assert.deepEqual(c, expected);
    c.fill(0);
    assert.deepEqual(curve(amount), expected);
  }
});
test("control task fault isolation, no catch-up storm, stop during callback", () => {
  let cb: any;
  let next = 0;
  const cancelled: number[] = [];
  (globalThis as any).requestAnimationFrame = (f: any) => {
    cb = f;
    return ++next;
  };
  (globalThis as any).cancelAnimationFrame = (id: number) => cancelled.push(id);
  let a = 0,
    b = 0,
    errors = 0;
  const scheduler = createControlScheduler({
    getAudioNow: () => 1,
    onTaskError: () => {
      errors++;
    },
    tasks: [
      {
        id: "bad",
        intervalMs: 10,
        run: () => {
          a++;
          throw Error("expected");
        },
      },
      {
        id: "good",
        intervalMs: 10,
        run: () => {
          b++;
        },
      },
    ],
  });
  scheduler.start();
  cb(10);
  cb(10000);
  assert.equal(a, 2);
  assert.equal(b, 2);
  assert.equal(errors, 1);
  scheduler.stop();
  const stopped = createControlScheduler({
    getAudioNow: () => 1,
    tasks: [
      { id: "stop", intervalMs: 10, run: () => stopped.stop() },
      { id: "must-not-run", intervalMs: 10, run: () => assert.fail() },
    ],
  });
  stopped.start();
  const count = next;
  cb(20000);
  assert.equal(next, count);
});
console.log(JSON.stringify({ proofClass: "behavioural-mocked-WebAudio", passed: results.length, results }, null, 2));
