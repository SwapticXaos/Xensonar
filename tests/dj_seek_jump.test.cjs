'use strict';
// DJ-SEEK-01: the material phase worklet's 'jump' interaction moves the PCM playhead by exactly
// the requested beats in one step (short de-click crossfade), without a transport glide.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/mix/03_quick_menu__before_eq-core.js'), 'utf8');
const line = source.split('\n').find(l => l.startsWith(' const code="') && l.includes('xen-material-phase-v1'));
const code = JSON.parse(line.slice(line.indexOf('"'), line.lastIndexOf('"') + 1));

function setup({ mode = 'granular', feel = 'soft' } = {}) {
  const messages = [];
  const w = {
    sampleRate: 48000, currentFrame: 0, Math, Float32Array, Float64Array, Int32Array, Number,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => messages.push(m) }; } },
    registerProcessor: (_, Processor) => { w.Processor = Processor; }
  };
  vm.createContext(w);
  vm.runInContext(code, w);
  const processor = new w.Processor();
  const send = m => processor.port.onmessage({ data: m });
  // 2 s ramp = one 4-beat bar at 120 BPM; the sample value encodes its own index
  const len = 96000;
  const ramp = new Float32Array(len);
  for (let i = 0; i < len; i++) ramp[i] = i / len;
  send({ type: 'load', channels: [ramp], sampleRate: 48000 });
  send({ type: 'start', loopStart: 0, loopEnd: 2, offset: 0, baseRate: 1, bpm: 120, mode, feel, attack: 0, when: 0 });
  const run = (frames = 128) => {
    const out = [new Float32Array(frames), new Float32Array(frames)];
    processor.process([], [out]);
    w.currentFrame += frames;
    return out[0];
  };
  return { processor, send, run, messages, len };
}

for (const [mode, feel] of [['granular', 'soft'], ['granular', 'hard'], ['vinyl', 'soft'], ['vinyl', 'hard']]) {
  test(`jump moves the playhead by exactly the requested beats (${mode}/${feel})`, () => {
    const { processor, send, run, len } = setup({ mode, feel });
    run(1280);
    const before = processor.position;
    send({ type: 'target', attack: -1, interaction: 'jump' }); // one beat ahead = 24000 samples
    assert.equal(processor.motion.active, false, 'no glide is planned');
    assert.equal(processor.motion.phase, 1);
    assert.equal(processor.motion.target, 1);
    assert.equal(((processor.position - before) % len + len) % len, 24000);
    // de-click: the first output sample still starts at the old position, the crossfade ends in 12 ms
    const first = run(128);
    assert.ok(Math.abs(first[0] - before / len) < 0.02, 'starts from the old audio: ' + first[0]);
    run(48000 * 0.013);
    const settled = run(128);
    const expected = processor.position / len;
    assert.ok(Math.abs(settled[127] - (expected - 1 / len)) < 1e-3, 'plays the new position at normal rate');
    assert.equal(processor.motion.rate, 1);
  });
}

test('a jump cancels a running soft glide and reports the new phase', () => {
  const { processor, send, run, messages } = setup();
  send({ type: 'target', attack: 0.5, interaction: 'drag' });
  run(2048);
  assert.equal(processor.motion.active, true, 'soft glide running');
  send({ type: 'target', attack: -2, interaction: 'jump' });
  assert.equal(processor.motion.active, false);
  run(128);
  const report = messages.filter(m => m.type === 'motion').pop();
  assert.equal(report.phase, 2);
  assert.equal(report.active, false);
});

// DJ-CUE-01: loop roll repeats the current cell sample-exactly; releasing resumes at the slip position.
test('loop roll repeats the cell and resumes at the slip position', () => {
  const { processor, send, run, len } = setup();
  run(4800);
  const p0 = processor.position;                       // 4800 samples into the loop
  // roll 1/4 beat (6000 samples) starting 0.1 beat (2400 samples) before "now"
  send({ type: 'roll-begin', lenBeats: 0.25, backBeats: 0.1, at: 4800 / 48000 }); // sent at the current audio time: no lag
  const start = ((p0 - 2400) % len + len) % len;
  assert.equal(processor.roll.start, start);
  const seen = [];
  for (let k = 0; k < 40; k++) { run(512); seen.push(processor.position); }
  for (const pos of seen) assert.ok(pos >= start - 1e-6 && pos < start + 6000 + 1e-6, 'inside the roll cell: ' + pos);
  const slip = processor.roll.slip;
  assert.equal(slip, ((p0 + 40 * 512) % len + len) % len, 'slip runs on underneath');
  send({ type: 'roll-end' });
  assert.equal(processor.roll, null);
  assert.equal(processor.position, slip, 'resumes where the loop would be without the roll');
  run(512);
  assert.equal(processor.position, ((slip + 512) % len + len) % len);
});

test('a roll longer than the loop is ignored; roll-end without a roll is harmless', () => {
  const { processor, send, run } = setup();
  run(256);
  send({ type: 'roll-begin', lenBeats: 8, backBeats: 0 }); // the loop is 4 beats long
  assert.equal(processor.roll, null);
  send({ type: 'roll-end' });
  const before = processor.position;
  run(256);
  assert.equal(processor.position, before + 256);
});
