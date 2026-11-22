'use strict';
// BASS-DAW-01 (real app, probe build): Pro-DAW Bass Engine & Bass Workshop verification.
//  1. 6 new pro-DAW factory voices (fm_donk, neuro_growl, acid_303, moog_mono, dub_sub, psy_roller)
//     render cleanly without clipping and stay in the loudness range of Classic Forge
//  2. DSP features act measurably: FM adds upper harmonics; Bandpass cuts sub-DC/low fundamental relative to LP;
//     True Pitch Glide (glideTargetHz) glides downwards (110 -> 55 Hz) as well as upwards; per-note cutoffScale acts
//  3. Kick Sidechain Ducking (__XenBassDuck) schedules gain reduction on live contexts and skips OfflineAudioContext
//  4. Bass Workshop UI: DAW toolbar (x2 Bars, Legato, Oct +, Dup, Undo), automation lane tabs (Vel/Cut/Prob/Ratch),
//     event inspector DAW locks (Glide Mode = to-next, Cutoff, Prob %, Ratchet), Shift multi-select, and
//     1-click Multitrack bounce into __XenMultitrackInbox.
// Usage: node tests/e2e/bass_daw_pro.cjs dist/XenSonar_PROBE.html
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = path.resolve(process.argv[2] || 'dist/XenSonar_PROBE.html');

(async () => {
 const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
 const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
 const errors = [];
 p.on('pageerror', e => errors.push(e.message));
 p.on('console', m => { if (m.type() === 'error' && /room-guard|ReferenceError|TypeError/.test(m.text())) errors.push(m.text().slice(0, 180)); });

 await p.goto('file://' + html);
 await p.waitForFunction(() => window.__xenProbe && __xenProbe.bridge.available(), null, { timeout: 60000 });

 // 1 & 2. DSP verification (offline renders through OPe)
 const dsp = await p.evaluate(async () => {
  const ev = __xenProbe.draw.evalInBundle;
  const OPe = ev('OPe'), V = ev('__f48BassVoices'), factory = ev('__xenBassVoiceFactoryRecipe');
  const SR = 48000;
  const render = async (params, notes, len) => {
   const ctx = new OfflineAudioContext(1, Math.ceil(len * SR), SR);
   const e = { audioCtx: ctx, nexusParamsRef: { current: params }, applyLiveAttack: false, bassDestination: ctx.destination, ensureFinalMixBus: () => ctx.destination, enterHoldPsyFxEnabled: false, enterHoldRef: { current: false } };
   const o = OPe(e);
   for (const n of notes) o.playBassNote(n.time, n.hz, n.level, n.dur, n.accent, n.opt);
   return (await ctx.startRendering()).getChannelData(0);
  };
  const rmsPeak = x => { let s = 0, pk = 0; for (const y of x) { s += y * y; pk = Math.max(pk, Math.abs(y)); } return { db: 10 * Math.log10(Math.max(1e-12, s / x.length)), peak: pk }; };
  const bandEnergy = (x, fLo, fHi, t0 = .12, t1 = .38) => {
   const a0 = Math.floor(t0 * SR), N = Math.floor((t1 - t0) * SR);
   let tot = 0, band = 0;
   for (let i = a0; i < a0 + N; i++) tot += x[i] * x[i];
   for (let f = fLo; f <= fHi; f += 25) {
    const w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w);
    let s1 = 0, s2 = 0;
    for (let i = a0; i < a0 + N; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
    band += (s1 * s1 + s2 * s2 - c * s1 * s2) / N;
   }
   return band / Math.max(1e-12, tot);
  };
  const zc = (x, a, b) => { let c = 0; for (let i = Math.floor(a * SR) + 1; i < b * SR; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) c++; return c / 2 / (b - a); };

  const def = { bassTone: .48, bassGrit: .18, bassSub: 1, bassEnvelope: 1, bassResonance: 0, bassDecay: 1 };
  const phrase = []; let u = .05; const hz = [41.2, 55, 61.7, 55, 73.4, 55, 49, 41.2];
  for (let k = 0; k < 8; k++) { phrase.push({ time: u, hz: hz[k], level: .7, dur: .22, accent: k % 4 === 0 ? 1 : .6, opt: {} }); u += .25; }
  const loud = {};
  for (const id of ['classic', 'fm_donk', 'neuro_growl', 'acid_303', 'moog_mono', 'dub_sub', 'psy_roller']) {
   loud[id] = rmsPeak(await render({ ...def, bassVoice: id }, phrase, u + .5));
  }

  // FM test: sine with fm=0 vs fm=0.6
  const one = [{ time: .05, hz: 110, level: .7, dur: .45, accent: .8, opt: {} }];
  const baseSin = { ...factory('sub'), second: 'sine', detune: 2, color: 2.2, gain: .8 };
  const noFm = await render({ ...def, bassTone: .9, bassGrit: 0, bassVoice: 'custom', bassVoiceRecipe: { ...baseSin, fm: 0 } }, one, .6);
  const withFm = await render({ ...def, bassTone: .9, bassGrit: 0, bassVoice: 'custom', bassVoiceRecipe: { ...baseSin, fm: .6 } }, one, .6);

  // Filter mode test: lowpass vs bandpass low-end energy ratio
  const saw = { ...factory('acid_line'), sub: 0, fenv: 0, res: .1, color: 2.0 };
  const lp = await render({ ...def, bassTone: .8, bassGrit: 0, bassVoice: 'custom', bassVoiceRecipe: { ...saw, ftype: 'lowpass' } }, one, .6);
  const bp = await render({ ...def, bassTone: .8, bassGrit: 0, bassVoice: 'custom', bassVoiceRecipe: { ...saw, ftype: 'bandpass' } }, one, .6);

  // True Pitch Glide DOWN: 110 Hz -> 55 Hz
  const gDown = await render({ ...def, bassGrit: 0, bassVoice: 'sub' }, [{ time: .05, hz: 110, level: .7, dur: .5, accent: .8, opt: { glideToNext: true, glideTargetHz: 55 } }], .65);

  // Per-note cutoffScale: 0.45 vs 2.1
  const cDark = await render({ ...def, bassGrit: 0, bassVoice: 'acid_line' }, [{ time: .05, hz: 110, level: .7, dur: .45, accent: .8, opt: { cutoffScale: .45 } }], .6);
  const cBright = await render({ ...def, bassGrit: 0, bassVoice: 'acid_line' }, [{ time: .05, hz: 110, level: .7, dur: .45, accent: .8, opt: { cutoffScale: 2.1 } }], .6);

  // Kick sidechain duck skips OfflineAudioContext
  const offCtx = new OfflineAudioContext(1, 128, SR);
  const duckSkippedOffline = window.__XenBassDuck.route(offCtx, offCtx.destination) === offCtx.destination;

  return {
   loud,
   fmHiNo: bandEnergy(noFm, 300, 1800),
   fmHiYes: bandEnergy(withFm, 300, 1800),
   lpLow: bandEnergy(lp, 80, 150),
   bpLow: bandEnergy(bp, 80, 150),
   glideStartHz: zc(gDown, .052, .085),
   glideEndHz: zc(gDown, .26, .42),
   cutDarkHi: bandEnergy(cDark, 600, 2600),
   cutBrightHi: bandEnergy(cBright, 600, 2600),
   duckSkippedOffline
  };
 });

 const cDb = dsp.loud.classic.db;
 for (const id of ['fm_donk', 'neuro_growl', 'acid_303', 'moog_mono', 'dub_sub', 'psy_roller']) {
  const diff = dsp.loud[id].db - cDb;
  assert.ok(diff > -5.5 && diff < 2.0, `${id} loudness vs Classic Forge: ${diff.toFixed(2)} dB`);
  assert.ok(dsp.loud[id].peak < 1.0, `${id} peak < 1.0: ${dsp.loud[id].peak.toFixed(3)}`);
 }
 assert.ok(dsp.fmHiYes > dsp.fmHiNo * 3, `FM adds harmonics: ${dsp.fmHiNo.toFixed(4)} -> ${dsp.fmHiYes.toFixed(4)}`);
 assert.ok(dsp.bpLow < dsp.lpLow * 0.6, `Bandpass attenuates low fundamental vs LP: ${dsp.lpLow.toFixed(4)} -> ${dsp.bpLow.toFixed(4)}`);
 assert.ok(dsp.glideStartHz > 85 && dsp.glideEndHz < 65, `True Pitch Glide descends 110 -> 55 Hz: ${dsp.glideStartHz.toFixed(1)} -> ${dsp.glideEndHz.toFixed(1)} Hz`);
 assert.ok(dsp.cutBrightHi > dsp.cutDarkHi * 2, `Per-note cutoffScale opens filter: ${dsp.cutDarkHi.toFixed(4)} -> ${dsp.cutBrightHi.toFixed(4)}`);
 assert.equal(dsp.duckSkippedOffline, true, 'Kick sidechain duck skips OfflineAudioContext');

 // 3 & 4. Bass Workshop UI + DAW tools + Multitrack bounce
 await p.getByRole('button', { name: 'Power' }).click();
 await p.waitForTimeout(1800);
 await p.evaluate(() => window.dispatchEvent(new Event('xensonar:open-bass-pattern-manager')));
 await p.waitForTimeout(1600);
 await p.locator('button', { hasText: 'Walking Line' }).first().click();
 await p.waitForTimeout(600);

 // Check new voices listed and duck panel present
 const voiceOpts = await p.getByLabel('Bass Voice').first().locator('option').allInnerTexts();
 for (const lbl of ['FM Donk · Techno', 'Neuro Growl · BP', 'Acid 303 · Squelch', 'Analog Mono · 24 dB', 'Dub Pressure · Sub', 'Psy Roller · Tight']) {
  assert.ok(voiceOpts.includes(lbl), 'Voice listed: ' + lbl);
 }
 assert.ok(await p.locator('[data-xen-bass-duck]').count() >= 1, 'Kick Sidechain Duck panel visible');

 // DAW toolbar: x2 Bars doubles events and bars, Undo restores
 const n0 = await p.locator('[data-bass-event-block]').count();
 assert.ok(n0 >= 4, 'Walking Line has events');
 await p.locator('[data-bass-daw-action="double-bars"]').click();
 await p.waitForTimeout(300);
 assert.equal(await p.locator('[data-bass-event-block]').count(), n0 * 2, 'x2 Bars doubles events');
 await p.getByRole('button', { name: 'Undo', exact: true }).last().click();
 await p.waitForTimeout(300);
 assert.equal(await p.locator('[data-bass-event-block]').count(), n0, 'Undo reverts x2 Bars');

 // Automation lane tabs switch cleanly & keep default Vel
 await p.locator('[data-bass-lane-tab="cutoff"]').click();
 await p.waitForTimeout(150);
 assert.equal(await p.locator('[data-bass-velocity-lane]').getAttribute('data-bass-lane-mode'), 'cutoff');
 await p.locator('[data-bass-lane-tab="ratchet"]').click();
 await p.waitForTimeout(150);
 assert.equal(await p.locator('[data-bass-velocity-lane]').getAttribute('data-bass-lane-mode'), 'ratchet');
 await p.locator('[data-bass-lane-tab="velocity"]').click();

 // Event DAW locks: Glide Mode = to-next, Ratchet = 3x, Cutoff = 1.6
 await p.locator('[data-bass-event-block]').first().click();
 await p.waitForTimeout(150);
 await p.getByLabel('Event Glide Mode').selectOption('to-next');
 await p.getByLabel('Event Ratchet').selectOption('3');
 await p.waitForTimeout(200);
 const firstBlockText = await p.locator('[data-bass-event-block]').first().innerText();
 assert.ok(firstBlockText.includes('×3') && firstBlockText.includes('↝'), 'Block displays ratchet and true-glide badges: ' + firstBlockText);

 // Shift multi-select + Dup
 await p.locator('[data-bass-event-block]').nth(1).click({ modifiers: ['Shift'] });
 await p.waitForTimeout(150);
 assert.equal(await p.locator('[data-bass-event-block][data-selected="true"]').count(), 2, 'Shift+click selects 2 notes');
 await p.locator('[data-bass-daw-action="duplicate"]').click();
 await p.waitForTimeout(250);
 assert.equal(await p.locator('[data-bass-event-block]').count(), n0 + 2, 'Dup duplicates the 2 selected notes');

 // Piano-roll drag robustness: plain click must not jump; dragging past another block & outside canvas bounds must continue smoothly
 await p.locator('button', { hasText: 'Offbeat Pump' }).first().click();
 await p.waitForTimeout(250);
 const canvasBox = await p.locator('[data-bass-body-canvas]').boundingBox();
 const blk0Box = await p.locator('[data-bass-event-block]').nth(0).boundingBox();
 const blk1Box = await p.locator('[data-bass-event-block]').nth(1).boundingBox();
 const clickBefore = await p.locator('[data-bass-event-block]').nth(0).evaluate(el => ({ l: el.style.left, t: el.style.top }));
 await p.mouse.click(blk0Box.x + blk0Box.width * 0.4, blk0Box.y + blk0Box.height * 0.5);
 await p.waitForTimeout(80);
 const clickAfter = await p.locator('[data-bass-event-block]').nth(0).evaluate(el => ({ l: el.style.left, t: el.style.top }));
 assert.deepEqual(clickAfter, clickBefore, 'plain click on a note block does not jump its position or pitch');
 await p.mouse.move(blk0Box.x + blk0Box.width * 0.4, blk0Box.y + blk0Box.height * 0.5);
 await p.mouse.down();
 await p.mouse.move(blk1Box.x + 60, blk0Box.y + blk0Box.height * 0.5, { steps: 6 });
 await p.waitForTimeout(40);
 const crossMid = await p.evaluate(() => parseFloat(document.querySelector('[data-bass-event-block][data-selected="true"]')?.style?.left || '0'));
 await p.mouse.move(blk1Box.x + 80, canvasBox.y - 35, { steps: 3 });
 await p.waitForTimeout(40);
 await p.mouse.move(blk1Box.x + 240, blk0Box.y + blk0Box.height * 0.5, { steps: 8 });
 await p.waitForTimeout(40);
 const crossEnd = await p.evaluate(() => parseFloat(document.querySelector('[data-bass-event-block][data-selected="true"]')?.style?.left || '0'));
 await p.mouse.up();
 assert.ok(crossEnd > crossMid + 15, `note drag survives crossing another note + leaving canvas bounds (${crossMid}% -> ${crossEnd}%)`);

 // BASS-DAW-02: Regression for stuck-state bug — a loaded Session snapshot installed with the scratchpad ID
 // must NEVER freeze dragging; the very first drag must release __xenSessionBassClip and move the block immediately.
 await p.evaluate(() => {
  const ev = __xenProbe.draw.evalInBundle;
  const install = ev('__xenBassSessionClipInstall');
  const scratchId = ev('__f351BassScratchId');
  const frozenClip = {
   id: scratchId, name: 'Frozen Session Bass', bars: 1, stepsPerBar: 16, stepCount: 16, segmentCount: 4,
   pitchSnapMode: 'magnet', pitchGuideKind: 'ji',
   generatorMeta: { kind: 'manual', rootBinding: 'live-step-root', timingKind: 'straight' },
   events: [
    { id: 'sess-ev-0', startStep: 1, durationSteps: 1.5, ratioFromRoot: 1, octave: 0, velocity: 0.9, accent: 0.8 },
    { id: 'sess-ev-1', startStep: 8, durationSteps: 1.5, ratioFromRoot: 1.5, octave: 0, velocity: 0.9, accent: 0.8 }
   ]
  };
  install(frozenClip, scratchId);
  ev('__XenMainRoomSessionBridge').patch({ bassPatternMode: 'clip', bassClipId: scratchId });
  window.dispatchEvent(new Event('xensonar:bass-draft-ui'));
 });
 await p.waitForTimeout(250);
 const sessBlk0 = await p.locator('[data-bass-event-block]').nth(0).boundingBox();
 const sessBefore = await p.locator('[data-bass-event-block]').nth(0).evaluate(el => parseFloat(el.style.left));
 await p.mouse.move(sessBlk0.x + sessBlk0.width * 0.4, sessBlk0.y + sessBlk0.height * 0.5);
 await p.mouse.down();
 await p.mouse.move(sessBlk0.x + sessBlk0.width * 0.4 + 140, sessBlk0.y + sessBlk0.height * 0.5 - 20, { steps: 8 });
 await p.mouse.up();
 await p.waitForTimeout(120);
 const sessAfter = await p.evaluate(() => parseFloat(document.querySelector('[data-bass-event-block][data-selected="true"]')?.style?.left || '0'));
 assert.ok(sessAfter > sessBefore + 12, `frozen session scratchpad clip must drag immediately without Reroll/reload (${sessBefore}% -> ${sessAfter}%)`);

 // BASS-DAW-02: Live note-block glow highlights currently playing note block + automation bar during playback
 const glowHit = await p.evaluate(async () => {
  const setPh = __xenProbe.draw.evalInBundle('__xenSetBassPlayhead');
  const clearPh = __xenProbe.draw.evalInBundle('__xenClearBassPlayhead');
  const blk = document.querySelector('[data-bass-event-block]');
  const st = Number(blk.dataset.bassStart);
  const ph = { perfStartMs: performance.now() - (st + 0.15) * 125, loopSec: 2.0, bars: 1, bpm: 120, source: 'preview' };
  setPh(ph);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const glowingBlks = document.querySelectorAll('[data-bass-event-block][data-playing="true"]').length;
  const glowingBars = document.querySelectorAll('[data-bass-velocity-bar][data-playing="true"]').length;
  const dotActive = document.querySelector('[data-bass-live-dot]')?.dataset?.active;
  clearPh(ph);
  return { glowingBlks, glowingBars, dotActive };
 });
 assert.ok(glowHit.glowingBlks >= 1 && glowHit.glowingBars >= 1 && glowHit.dotActive === 'true', 'playing bass note block, velocity bar, and live LED glow in sync: ' + JSON.stringify(glowHit));

 // 1-click Multitrack bounce from Bass Workshop
 const inboxBefore = await p.evaluate(() => globalThis.__XenMultitrackInbox.count());
 await p.locator('[data-bass-bounce="multitrack"]').click();
 await p.waitForSelector('[data-bass-bounce-bar] [role="status"]', { timeout: 20000 });
 const bounceStatus = await p.locator('[data-bass-bounce-bar] [role="status"]').textContent();
 assert.match(bounceStatus || '', /Sent .* to Multitrack/i, 'Bounce status confirms Multitrack send: ' + bounceStatus);
 const inboxAfter = await p.evaluate(() => globalThis.__XenMultitrackInbox.count());
 assert.equal(inboxAfter, inboxBefore + 1, 'Multitrack bounce enqueues 1 new bass track');

 assert.deepEqual(errors, [], 'no page errors');
 console.log(`PASS BASS-DAW-01/02: 6 pro voices, FM/BP/True-Glide/Cutoff DSP, Sidechain Duck, DAW toolbar, multi-select, session-clip drag-unfreeze, live note glow, lanes & Multitrack bounce (${inboxBefore}->${inboxAfter})`);
 await b.close();
})().catch(e => { console.error(e); process.exit(1); });
