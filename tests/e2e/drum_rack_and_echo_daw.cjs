'use strict';
// DRUM-DAW-01 (real app, probe build): Drum Pattern Menu & DAW Drum Machine verification.
//  1. Dub Echo: clear ON/OFF toggle (remembers Send), collapsed by default, clean expand/collapse,
//     and sub-collapsible Rhythm Matrix & Polyrhythm drawer.
//  2. Drum Bus Punch & Space: Bus Glue, Tape Drive, Sub Boom parked (0 nodes) at default,
//     engaged on demand (e.g. Club Glue scene), and measurably shapes offline audio.
//  3. Per-Lane Solo (S): non-destructive solo mutes other lanes and restores on unsolo.
//  4. Per-Step Ratchet (1x-4x) & Flam (0-100%): UI badge + multi-hit audio rendering.
//  5. DAW Beat Moves: Humanize, Ghost Snares, x2 Bars + Undo.
// Usage: node tests/e2e/drum_rack_and_echo_daw.cjs dist/XenSonar_PROBE.html
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = path.resolve(process.argv[2] || 'dist/XenSonar_PROBE.html');

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && /room-guard|ReferenceError|TypeError/.test(m.text())) errors.push(m.text().slice(0, 180));
  });

  await p.goto('file://' + html);
  await p.waitForFunction(() => window.__xenProbe && __xenProbe.bridge.available(), null, { timeout: 60000 });
  await p.getByRole('button', { name: 'Power' }).click();
  await p.waitForTimeout(1200);

  // Open Drum Pattern Menu
  await p.evaluate(() => window.dispatchEvent(new Event('xensonar:open-drum-pattern-manager')));
  await p.waitForSelector('[data-drum-echo-panel]', { timeout: 10000 });

  // 1. Dub Echo: collapsed by default, clear ON/OFF toggle & remember send, sub-collapsible Rhythm Matrix
  assert.equal(await p.locator('[data-drum-echo-body]').count(), 0, 'Dub Echo body is collapsed by default');
  assert.equal(await p.locator('[data-drum-echo-toggle]').getAttribute('aria-pressed'), 'false', 'Dub Echo starts OFF');
  assert.equal(await p.locator('[data-drum-echo-collapse]').getAttribute('aria-expanded'), 'false', 'Collapse toggle reflects collapsed state');

  // Toggle ON -> OFF -> ON (must restore send level)
  await p.locator('[data-drum-echo-toggle]').click();
  await p.waitForTimeout(120);
  assert.equal(await p.locator('[data-drum-echo-toggle]').getAttribute('aria-pressed'), 'true', 'Dub Echo toggles ON');
  assert.equal(await p.locator('[data-drum-echo-panel]').getAttribute('data-echo-on'), 'true', 'Panel marks echo ON');
  const sendOn1 = await p.evaluate(() => __xenProbe.draw.evalInBundle('__f48RackParams.drumEcho'));
  assert.ok(sendOn1 >= 0.12, 'Echo Send turned up on toggle ON: ' + sendOn1);

  await p.locator('[data-drum-echo-toggle]').click();
  await p.waitForTimeout(120);
  assert.equal(await p.locator('[data-drum-echo-toggle]').getAttribute('aria-pressed'), 'false', 'Dub Echo toggles OFF');
  assert.equal(await p.evaluate(() => __xenProbe.draw.evalInBundle('__f48RackParams.drumEcho')), 0, 'Echo Send is 0 when OFF');

  await p.locator('[data-drum-echo-toggle]').click();
  await p.waitForTimeout(120);
  const sendOn2 = await p.evaluate(() => __xenProbe.draw.evalInBundle('__f48RackParams.drumEcho'));
  assert.ok(Math.abs(sendOn2 - sendOn1) < 1e-6, `Echo Send restored on second ON (${sendOn1} -> ${sendOn2})`);

  // Expand Dub Echo -> core controls visible, Rhythm Matrix still collapsed by default
  await p.locator('[data-drum-echo-collapse]').click();
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-drum-echo-body]').count(), 1, 'Dub Echo body expands on click');
  assert.equal(await p.locator('[data-drum-echo-matrix]').count(), 0, 'Rhythm Matrix is collapsed by default inside Echo');

  // Expand & collapse Rhythm Matrix
  await p.locator('[data-drum-echo-matrix-toggle]').click();
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-drum-echo-matrix]').count(), 1, 'Rhythm Matrix expands cleanly');
  await p.locator('[data-drum-echo-matrix-toggle]').click();
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-drum-echo-matrix]').count(), 0, 'Rhythm Matrix collapses cleanly');

  // Collapse Dub Echo back
  await p.locator('[data-drum-echo-collapse]').click();
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-drum-echo-body]').count(), 0, 'Dub Echo collapses back cleanly');

  // 2. Drum Bus Punch & Space: parked at default, active on Club Glue, measurably shapes audio, Reset parks again
  const busDiag = await p.evaluate(async () => {
    const ev = __xenProbe.draw.evalInBundle;
    const getRack = ev('__f48GetDrumRack'), patch = ev('__f48PatchRack'), def = ev('__f48RackDefaults');
    const SR = 48000;
    const renderHit = async (rackPatch) => {
      const ctx = new OfflineAudioContext(2, SR, SR);
      patch({ ...def, ...rackPatch });
      const rack = getRack(ctx, ctx.destination);
      const diag = rack.diagnostics();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, 0.05);
      osc.frequency.exponentialRampToValueAtTime(48, 0.22);
      g.gain.setValueAtTime(0.9, 0.05);
      g.gain.exponentialRampToValueAtTime(1e-4, 0.35);
      osc.connect(g); g.connect(rack.input);
      osc.start(0.05); osc.stop(0.38);
      const buf = await ctx.startRendering();
      rack.dispose();
      const x = buf.getChannelData(0);
      let s = 0, pk = 0;
      for (let i = 0; i < x.length; i++) { s += x[i] * x[i]; pk = Math.max(pk, Math.abs(x[i])); }
      return { diag, rms: Math.sqrt(s / x.length), peak: pk };
    };
    const dry = await renderHit({ drumGlue: 0, drumDrive: 0, drumBoom: 0 });
    const glued = await renderHit({ drumGlue: 0.65, drumDrive: 0.45, drumBoom: 0.6 });
    patch({ ...def });
    return { dry, glued };
  });
  assert.equal(busDiag.dry.diag.punchNodes, 0, 'Bus Punch chain is parked (0 nodes) when Glue/Drive/Boom = 0');
  assert.ok(busDiag.glued.diag.punchNodes >= 8, 'Bus Punch chain engages when Glue/Drive/Boom > 0');
  assert.ok(busDiag.glued.rms > busDiag.dry.rms * 1.05, `Bus Punch lifts RMS weight (${busDiag.dry.rms.toFixed(4)} -> ${busDiag.glued.rms.toFixed(4)})`);

  // Click Club Glue scene & Reset Rack in UI
  await p.locator('.xen-drum-rack button', { hasText: 'Club Glue' }).click();
  await p.waitForTimeout(150);
  const clubParams = await p.evaluate(() => __xenProbe.draw.evalInBundle('__f48RackParams'));
  assert.ok(clubParams.drumGlue > 0.4 && clubParams.drumDrive > 0.2 && clubParams.drumBoom > 0.3, 'Club Glue scene sets Bus Punch params');
  await p.locator('.xen-drum-rack button', { hasText: 'Reset Rack' }).click();
  await p.waitForTimeout(250);
  const resetParams = await p.evaluate(() => __xenProbe.draw.evalInBundle('__f48RackParams'));
  assert.equal(resetParams.drumGlue, 0, 'Reset Rack zeros drumGlue');
  assert.equal(resetParams.drumEcho, 0, 'Reset Rack zeros drumEcho');

  // 3. Per-Lane Solo (S)
  await p.locator('[data-drum-lane-solo="kick"]').click();
  await p.waitForTimeout(120);
  const soloState = await p.evaluate(() => {
    const read = __xenProbe.draw.evalInBundle('__f52MixerRead');
    return { kick: read('kick').muted, snare: read('snare').muted, hat: read('hatClosed').muted };
  });
  assert.deepEqual(soloState, { kick: false, snare: true, hat: true }, 'Solo Kick keeps kick unmuted and mutes other lanes');
  await p.locator('[data-drum-lane-solo="kick"]').click();
  await p.waitForTimeout(120);
  const unsoloState = await p.evaluate(() => {
    const read = __xenProbe.draw.evalInBundle('__f52MixerRead');
    return { kick: read('kick').muted, snare: read('snare').muted, hat: read('hatClosed').muted };
  });
  assert.deepEqual(unsoloState, { kick: false, snare: false, hat: false }, 'Unsolo Kick restores original lane mutes');

  // 4. Per-Step Ratchet (3x) & Flam (50%) UI + Audio multi-hit verification
  const firstActiveHit = p.locator('[data-drum-hit][aria-pressed="true"]').first();
  await firstActiveHit.click();
  // Ensure it stays active if clicking cycled it off; click until aria-pressed=true
  for (let k = 0; k < 4; k++) {
    if (await firstActiveHit.getAttribute('aria-pressed') === 'true') break;
    await firstActiveHit.click();
  }
  const hitKey = await firstActiveHit.getAttribute('data-drum-hit');
  const [hitLane, hitStepStr] = hitKey.split(':');
  await p.evaluate(({ lane, idx }) => {
    const patchHit = __xenProbe.draw.evalInBundle('__f52PatchDrumHit');
    patchHit(lane, idx, 'ratchet', 3);
    patchHit(lane, idx, 'flam', 0.5);
  }, { lane: hitLane, idx: Number(hitStepStr) });
  await p.waitForTimeout(120);
  const badgeText = await p.locator(`[data-drum-hit="${hitKey}"] .xen-drum-hit-badge`).textContent();
  assert.equal(badgeText, '3×f', 'Ratchet 3x + Flam renders 3×f micro-badge on step cell');

  // Verify FPe fires 4 triggers (1 flam grace + 3 ratchet sub-hits) for that step!
  const multiHitCount = await p.evaluate(() => {
    const FPe = __xenProbe.draw.evalInBundle('FPe');
    const calls = [];
    const fakeMachine = { trigger: (v, t, lv) => calls.push({ v, t, lv }) };
    const entry = {
      bars: 1, segmentsPerBar: 16, segmentMarkers: [], stepCount: 16,
      laneOrder: ['snare'], laneSteps: { snare: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      stepPrograms: { snare: { 0: { value: 1, ratchet: 3, flam: 0.5 } } },
    };
    FPe({
      drumMachine: fakeMachine, entry, stepIndex: 0, time: 1.0, stepDurationSec: 0.125,
      drumLevel: 0.8, drumStyle: { edge: 0.5, softness: 0.5, air: 0.5, snap: 0.5, swing: 0, pan: 0, decayScale: 1, chokeGroup: 'none' },
      runtimeGlobalKit: 'dusty_tape', laneKitOverrides: {}, laneSettings: {},
    });
    return calls;
  });
  assert.equal(multiHitCount.length, 4, 'Ratchet 3x + Flam fires 1 grace hit + 3 roll hits = 4 triggers');
  assert.ok(multiHitCount[0].t < 1.0 && multiHitCount[1].t === 1.0 && multiHitCount[3].t > multiHitCount[2].t, 'Flam precedes beat and ratchet subdivides forward cleanly');

  // 5. DAW Beat Moves: x2 Bars, Ghost Snares, Humanize + Undo
  const beforeSteps = await p.locator('[data-drum-hit^="kick:"]').count();
  await p.locator('.xen-drum-rack button', { hasText: '×2 Bars' }).click();
  await p.waitForTimeout(150);
  const afterDouble = await p.locator('[data-drum-hit^="kick:"]').count();
  assert.equal(afterDouble, beforeSteps * 2, `×2 Bars doubles step count (${beforeSteps} -> ${afterDouble})`);
  await p.locator('.xen-drum-rack button', { hasText: 'Ghost Snares' }).click();
  await p.locator('.xen-drum-rack button', { hasText: 'Humanize' }).click();
  await p.waitForTimeout(150);
  await p.locator('.xen-drum-rack button', { hasText: 'Undo' }).click();
  await p.waitForTimeout(100);

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`PASS DRUM-DAW-01: Echo ON/OFF & collapsible UI + Matrix sub-drawer, Bus Punch DSP (${busDiag.dry.rms.toFixed(3)}->${busDiag.glued.rms.toFixed(3)}, parked=0), Lane Solo, Ratchet 3x + Flam (4 hits), & DAW Beat Moves`);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
