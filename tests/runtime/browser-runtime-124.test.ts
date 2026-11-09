import assert from "node:assert/strict";
import { createControlScheduler } from "../../src/features/resonance/controlScheduler";
import { createEntrophonVoicePreview } from "../../src/features/xensonar/audio/entrophonVoicePreview";
import { createScheduledToneGraph } from "../../src/features/xensonar/audio/scheduledToneLifecycle";
import { getEntrophonSurfaceSoundConfig } from "../../src/core/audio/xensonarMicrotonalSoundEngine";
import { pushDescriptorFrame } from "../../src/features/resonance/collectiveMemoryEffect";

const results: string[] = [];
function test(name: string, run: () => void) {
  run();
  results.push(name);
}
let nextId = 1;
const frames = new Map<number, FrameRequestCallback>();
const timers = new Map<number, () => void>();
Object.assign(globalThis, {
  requestAnimationFrame(callback: FrameRequestCallback) {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id: number) {
    frames.delete(id);
  },
  setTimeout(callback: () => void) {
    const id = nextId++;
    timers.set(id, callback);
    return id;
  },
  clearTimeout(id: number) {
    timers.delete(id);
  },
});
function frame(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(time);
}

test("clock failure recovers on the next frame", () => {
  let reads = 0,
    runs = 0,
    errors = 0;
  const scheduler = createControlScheduler({
    getAudioNow: () => {
      if (++reads === 1) throw Error("clock");
      return 1;
    },
    onTaskError: () => {
      errors++;
    },
    tasks: [
      {
        id: "effect",
        intervalMs: 8,
        run: () => {
          runs++;
        },
      },
    ],
  });
  scheduler.start();
  frame(10);
  frame(30);
  assert.equal(runs, 1);
  assert.equal(errors, 1);
  assert.equal(frames.size, 1);
  scheduler.stop();
});
test("failing metrics cannot kill the frame chain or retain old counters", () => {
  let runs = 0,
    reports = 0,
    errors = 0;
  const scheduler = createControlScheduler({
    getAudioNow: () => 1,
    onTaskError: () => {
      errors++;
    },
    onMetrics: () => {
      reports++;
      throw Error("monitor");
    },
    tasks: [
      {
        id: "effect",
        intervalMs: 8,
        run: () => {
          runs++;
        },
      },
    ],
  });
  scheduler.start();
  frame(10);
  frame(510);
  frame(1010);
  assert.equal(runs, 3);
  assert.equal(reports, 2);
  assert.equal(errors, 1);
  assert.equal(frames.size, 1);
  scheduler.stop();
});
test("stop/restart within a task keeps exactly one live frame chain", () => {
  let runs = 0;
  const scheduler = createControlScheduler({
    getAudioNow: () => 1,
    tasks: [
      {
        id: "restart",
        intervalMs: 8,
        run: () => {
          if (++runs === 1) {
            scheduler.stop();
            scheduler.start();
          }
        },
      },
    ],
  });
  scheduler.start();
  const stale = [...frames.values()][0];
  frame(10);
  assert.equal(frames.size, 1);
  stale(20);
  assert.equal(runs, 1);
  frame(30);
  assert.equal(runs, 2);
  assert.equal(frames.size, 1);
  scheduler.stop();
});
test("metrics callback can restart without duplicating frames", () => {
  let restarts = 0;
  const scheduler = createControlScheduler({
    getAudioNow: () => 1,
    tasks: [],
    onMetrics: () => {
      if (++restarts === 1) {
        scheduler.stop();
        scheduler.start();
      }
    },
  });
  scheduler.start();
  frame(10);
  frame(510);
  assert.equal(frames.size, 1);
  scheduler.stop();
});

class Param {
  value = 1;
  setValueAtTime(value: number) {
    assert.ok(Number.isFinite(value));
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number) {
    assert.ok(value > 0);
    this.setValueAtTime(value);
  }
  cancelScheduledValues() {}
  setTargetAtTime(value: number) {
    this.setValueAtTime(value);
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  delayTime = new Param();
  disconnected = false;
  stopped = false;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start() {}
  stop() {
    this.stopped = true;
  }
}
class Context {
  currentTime = 1;
  state = "running";
  destination = {};
  nodes: Node[] = [];
  closed = 0;
  fail = false;
  make() {
    const node = new Node();
    this.nodes.push(node);
    return node;
  }
  createGain() {
    return this.make();
  }
  createBiquadFilter() {
    return this.make();
  }
  createWaveShaper() {
    return this.make();
  }
  createDelay() {
    return this.make();
  }
  createOscillator() {
    if (this.fail) throw Error("oscillator allocation");
    return this.make();
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.closed++;
    this.state = "closed";
    return Promise.resolve();
  }
}
test("repeated audition reuses one context and bounds retiring graphs", () => {
  const contexts: Context[] = [];
  const preview = createEntrophonVoicePreview(() => {
    const context = new Context();
    contexts.push(context);
    return context as any;
  });
  const cfg = getEntrophonSurfaceSoundConfig("wave");
  preview.play(cfg);
  const size = contexts[0].nodes.length;
  for (let i = 0; i < 30; i++) preview.play(cfg, 220 + i);
  assert.equal(contexts.length, 1);
  assert.ok(contexts[0].nodes.filter((node) => !node.disconnected).length <= size * 5);
  assert.ok(timers.size <= 5);
  preview.dispose();
  preview.dispose();
  assert.equal(contexts[0].closed, 1);
  assert.equal(timers.size, 0);
  assert.ok(contexts[0].nodes.every((node) => node.disconnected));
});
test("audition errors dispose partial graph and close the context", () => {
  const ctx = new Context();
  ctx.fail = true;
  const preview = createEntrophonVoicePreview(() => ctx as any);
  let errors = 0;
  const original = console.error;
  console.error = () => {
    errors++;
  };
  try {
    preview.play(getEntrophonSurfaceSoundConfig("wave"));
  } finally {
    console.error = original;
  }
  assert.equal(errors, 1);
  assert.equal(ctx.closed, 1);
  assert.ok(ctx.nodes.every((node) => node.disconnected));
});
test("zero-volume audition uses valid exponential ramps and releases its timer", () => {
  const ctx = new Context();
  const preview = createEntrophonVoicePreview(() => ctx as any);
  let errors = 0;
  const original = console.error;
  console.error = () => {
    errors++;
  };
  try {
    preview.play({ ...getEntrophonSurfaceSoundConfig("wave"), volume: 0 });
  } finally {
    console.error = original;
  }
  assert.equal(errors, 0);
  assert.equal(timers.size, 1);
  const finish = [...timers.values()][0];
  finish();
  assert.equal(ctx.closed, 1);
  assert.equal(timers.size, 0);
});
test("owned graph cleanup continues after a broken node and is idempotent", () => {
  const graph = createScheduledToneGraph();
  let stopped = 0,
    disconnected = 0;
  graph.own({
    stop() {
      throw Error("ended");
    },
    disconnect() {
      throw Error("gone");
    },
  } as any);
  graph.own({
    stop() {
      stopped++;
    },
    disconnect() {
      disconnected++;
    },
  } as any);
  graph.dispose();
  graph.dispose();
  assert.equal(stopped, 1);
  assert.equal(disconnected, 1);
});
test("descriptor compaction preserves the original window exactly", () => {
  const history: any[] = [],
    expected: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const item = { time: i < 999 ? i * 0.18 : 10000, id: i };
    const window = i % 2 ? 5 : 12;
    expected.push(item);
    while (expected.length > 1 && expected[0].time < item.time - window) expected.shift();
    assert.equal(pushDescriptorFrame(history, item as any, window), history);
    assert.deepEqual(history, expected);
  }
});
console.log(JSON.stringify({ proofClass: "behavioural-runtime-with-mocks", passed: results.length, results }, null, 2));
