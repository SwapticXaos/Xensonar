import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fixtures = await import(pathToFileURL(path.join(root, 'web/p0-fixtures.js')).href);
const bytes = fs.readFileSync(path.join(root, 'artifacts/p0_core.wasm'));
const { instance } = await WebAssembly.instantiate(bytes, {});
const e = instance.exports;
const sr = 48000;
e.p0_init(sr);
// Fill the fixed wavetable once, before arm.
const sine = new Float32Array(e.memory.buffer, e.p0_sine_table_ptr(), 4096);
for (let i = 0; i < sine.length; i++) sine[i] = Math.sin(2 * Math.PI * i / sine.length);
e.p0_set_frame(0n);
assert.equal(e.p0_arm(1, BigInt(sr * 2)), 1);
assert.equal(e.p0_set_state(1, 21n, 220, 1), 1);
assert.equal(e.p0_set_state(1, 20n, 330, 1), 0, 'old state revision must be rejected');
assert.equal(e.p0_state_revision(), 21n);

function enqueue(groupId, intendedFrame, deadlineFrame, notes) {
  assert.equal(e.p0_begin_attack_group(1, BigInt(groupId), notes.length, BigInt(intendedFrame), BigInt(deadlineFrame)), 1);
  notes.forEach((n, i) => {
    assert.equal(e.p0_set_attack_note(i, n.tokenSlot, n.tokenGeneration, n.kind, n.frequencyHz, n.peak,
      n.b0, n.b1, n.b2, n.a1, n.a2, n.attackFrames, n.releaseStartFrames, n.stopFrames, n.releaseCoef), 1);
  });
  return e.p0_commit_attack_group();
}

const chord = [220, 330, 440].map((f, i) => fixtures.makeLegacyNote(sr, i + 1, 1, f));
assert.equal(enqueue(1, 256, 256 + Math.round(0.09 * sr), chord), 1);
for (let i = 0; i < 4; i++) e.p0_render(128);
assert.equal(e.p0_started_external(), 3n, 'chord3 must start atomically');
assert.ok(e.p0_active_voices() >= 3);

// Release-before-start fences that exact token and cancels the pending group.
const future = fixtures.makeGatedNote(sr, 10, 1, 550);
assert.equal(enqueue(2, 2000, 4000, [future]), 1);
assert.equal(e.p0_release(1, 10, 1, Math.round(0.03 * sr)), 1);
for (let i = 0; i < 20; i++) e.p0_render(128);
assert.equal(e.p0_started_external(), 3n, 'released pending token must never start later');

// Recycled logical slot with higher generation remains valid.
const recycled = fixtures.makeGatedNote(sr, 10, 2, 660);
const now = Number(e.p0_frame());
assert.equal(enqueue(3, now + 128, now + 2000, [recycled]), 1);
for (let i = 0; i < 4; i++) e.p0_render(128);
assert.equal(e.p0_started_external(), 4n, 'higher generation must survive old release watermark');

// Configure and start the autonomous 16-step program.
const coeff = fixtures.webAudioLowpassCoefficients(sr, 2400, 1);
const penv = fixtures.legacy323Envelope(sr, 0.18, false);
assert.equal(e.p0_program_set_header(1, 1, 16, 120000, coeff.b0, coeff.b1, coeff.b2, coeff.a1, coeff.a2,
  penv.attackFrames, penv.releaseStartFrames, penv.stopFrames, penv.releaseCoef), 1);
fixtures.P0_PROGRAM_STEPS.forEach((step, i) => {
  const a = step[0] ?? [1, 0], b = step[1] ?? [1, 0], c = step[2] ?? [1, 0];
  assert.equal(e.p0_program_set_step(1, i, step.length, a[0], a[1], b[0], b[1], c[0], c[1]), 1);
});
const programStart = Number(e.p0_frame()) + 256;
assert.equal(e.p0_program_start(1, BigInt(programStart)), 1);
const beforeProgram = e.p0_started_program();
for (let i = 0; i < Math.ceil(sr * 1.1 / 128); i++) e.p0_render(128);
assert.ok(e.p0_started_program() > beforeProgram, 'program must generate notes without control messages per step');

// Panic is terminal for owner epoch and prevents stale starts.
assert.equal(e.p0_panic(1, Math.round(0.005 * sr)), 1);
for (let i = 0; i < 8; i++) e.p0_render(128);
assert.equal(e.p0_program_running(), 0);
assert.equal(e.p0_owner_closed(), 1);
const stale = fixtures.makeLegacyNote(sr, 20, 1, 770);
assert.equal(e.p0_begin_attack_group(1, 99n, 1, e.p0_frame() + 128n, e.p0_frame() + 4000n), -3);

console.log(JSON.stringify({
  pass: true,
  frame: e.p0_frame().toString(),
  startedExternal: e.p0_started_external().toString(),
  startedProgram: e.p0_started_program().toString(),
  cancelled: e.p0_cancelled().toString(),
  expired: e.p0_expired().toString(),
  panicCount: e.p0_panic_count().toString(),
  stateRevision: e.p0_state_revision().toString(),
  stateIgnoredOld: e.p0_state_ignored_old().toString(),
}, null, 2));
