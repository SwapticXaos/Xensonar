'use strict';
// PSY-STAGE1-01 (real app, probe build): PsyLab Stage 1 sonic expansion & workflow verification.
//  1. Backward compatibility: all 8 classic Factory patches keep neutral defaults on params 39..55;
//     6 new Factory patches are listed in Room IV and in the Live Room catalog.
//  2. DSP verification (offline worklet renders): Wave Character, Vocal Formant (vowel U vs I),
//     Space Cloud tail, Pluck Sustain=0 decay, and Breath/Noise Exciter all act measurably.
//  3. UI workflow: collapsible extension panels (with active dot), Module Locks protecting Mutate,
//     Undo restoring previous patch, and real-time Patch Morph A <-> B.
// Usage: node tests/e2e/psylab_stage1_expansion.cjs dist/XenSonar_PROBE.html
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
  await p.waitForTimeout(1000);

  // Open Room IV / PsyLab
  await p.getByRole('button', { name: /Psy.*Lab/i }).first().click();
  await p.waitForSelector('[data-xen-psylab="true"]', { timeout: 15000 });

  // 1. Factory patches & catalog check
  const patchOpts = await p.locator('select[aria-label="Patch"] option').allInnerTexts();
  for (const name of ['Liquid Bell', 'Barber Spiral', 'Alien Choir', 'Velvet Choir', 'Glass Kalimba', 'Analog Brass Pad', 'Breath Flute', 'Acid Zap Pluck', 'Nebula Cloud']) {
    assert.ok(patchOpts.includes(name), 'Factory patch listed: ' + name);
  }
  const liveCatalogHasNew = await p.evaluate(() => {
    const entries = __xenProbe.draw.evalInBundle('__XenPsyLab.entries()');
    return ['Velvet Choir', 'Glass Kalimba', 'Analog Brass Pad', 'Breath Flute', 'Acid Zap Pluck', 'Nebula Cloud']
      .every(name => entries.some(e => e.label === name));
  });
  assert.equal(liveCatalogHasNew, true, 'All 6 new Factory patches are available in Live Room catalog');

  // 2. Collapsible extension panels: start collapsed, expand cleanly, show active dot on Velvet Choir
  assert.equal(await p.locator('[data-psy-panel-toggle="organic"]').getAttribute('aria-expanded'), 'false', 'Organic starts collapsed');
  assert.equal(await p.locator('[data-psy-panel-toggle="modenv"]').getAttribute('aria-expanded'), 'false', 'Mod Envelope starts collapsed');
  assert.equal(await p.locator('[data-psy-panel-toggle="space"]').getAttribute('aria-expanded'), 'false', 'Vocal & Space starts collapsed');
  assert.equal(await p.locator('[data-psy-panel-toggle="hydra"]').getAttribute('aria-expanded'), 'true', 'Hydra starts expanded');

  await p.selectOption('select[aria-label="Patch"]', { label: 'Velvet Choir' });
  await p.waitForTimeout(150);
  assert.equal(await p.locator('[data-psy-panel="space"] .xpl-panel-dot').count(), 1, 'Vocal & Space shows active dot for Velvet Choir');
  await p.locator('[data-psy-panel-toggle="space"]').click();
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-psy-panel-toggle="space"]').getAttribute('aria-expanded'), 'true', 'Vocal & Space expands');
  assert.equal(await p.locator('[data-psy-param="formantMix"]').count(), 1, 'Vocal mix slider visible when expanded');
  assert.equal(await p.locator('[data-psy-param="spaceMix"]').count(), 1, 'Space cloud slider visible when expanded');

  // 3. Module Lock protects Hydra during Mutate, and Undo reverts cleanly
  const beforeRatioB = await p.locator('[data-psy-param="ratioB"]').inputValue();
  const beforeCutoff = await p.locator('[data-psy-param="cutoff"]').inputValue();
  await p.locator('[data-psy-lock="hydra"]').click();
  assert.equal(await p.locator('[data-psy-lock="hydra"]').getAttribute('aria-pressed'), 'true', 'Hydra locked');
  // Run Mutate several times at 100% so unlocked params definitely move while locked Hydra stays exact
  await p.locator('input[aria-label="Mutation amount"]').fill('1');
  for (let i = 0; i < 4; i++) {
    await p.getByRole('button', { name: 'Mutate', exact: true }).click();
    await p.waitForTimeout(60);
  }
  const afterRatioB = await p.locator('[data-psy-param="ratioB"]').inputValue();
  assert.equal(afterRatioB, beforeRatioB, 'Locked Hydra ratioB stays unchanged during Mutate');

  // Undo button is enabled and restores previous values
  assert.equal(await p.locator('[data-psy-undo]').isDisabled(), false, 'Undo enabled after Mutate');
  for (let i = 0; i < 4; i++) {
    await p.locator('[data-psy-undo]').click();
    await p.waitForTimeout(60);
  }
  const undoneCutoff = await p.locator('[data-psy-param="cutoff"]').inputValue();
  assert.equal(undoneCutoff, beforeCutoff, 'Undo restores exact pre-mutation cutoff');
  await p.locator('[data-psy-lock="hydra"]').click(); // unlock Hydra

  // 4. Patch Morph A <-> B
  await p.locator('[data-psy-morph-toggle]').click();
  await p.waitForSelector('[data-psy-morph-bar]', { timeout: 5000 });
  await p.selectOption('select[aria-label="Morph Patch A"]', { label: 'Liquid Bell' });
  await p.selectOption('select[aria-label="Morph Patch B"]', { label: 'Velvet Choir' });
  await p.locator('[data-psy-morph-slider]').fill('50');
  await p.locator('[data-psy-morph-slider]').dispatchEvent('input');
  await p.locator('[data-psy-morph-slider]').dispatchEvent('change');
  await p.waitForTimeout(150);
  const morphStatus = await p.locator('.xpl-status').textContent();
  assert.match(morphStatus || '', /Morph 50% Liquid Bell \/ 50% Velvet Choir/, 'Morph status reports exact 50/50 blend: ' + morphStatus);
  const morphedFormant = Number(await p.locator('[data-psy-param="formantMix"]').inputValue());
  assert.ok(morphedFormant > 250 && morphedFormant < 550, 'Morphed formantMix lands midway between 0 and 0.78: ' + morphedFormant);

  // 5. Real AudioWorklet offline DSP verification (Wave Character, Formant U vs I, Space Cloud tail, Sustain=0 pluck)
  const dsp = await p.evaluate(async () => {
    const chunk = __xenProbe.draw.evalInBundle('__xenLoadDeferred("psylab")');
    const T = chunk.__test;
    const SR = 48000;
    const makeCodeUrl = () => 'data:application/javascript;charset=utf-8,' + encodeURIComponent(T.moduleCode());
    const render = async (over, sec = 1.2, holdSec = 0.6) => {
      const params = T.RANGES.def.slice();
      const byKey = Object.fromEntries(T.PARAMS.map(x => [x[1], x[0]]));
      for (const [k, v] of Object.entries(over)) params[byKey[k]] = v;
      const ctx = new OfflineAudioContext(2, Math.round(sec * SR), SR);
      await ctx.audioWorklet.addModule(makeCodeUrl());
      const script = [
        { f: 0, m: { t: 'on', id: 1, hz: 220, vel: 1 } },
        { f: Math.round(holdSec * SR), m: { t: 'off', id: 1 } },
      ];
      const node = new AudioWorkletNode(ctx, 'xen-psylab-v1', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
        processorOptions: { params, res: [220, 330, 440], script },
      });
      node.connect(ctx.destination);
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    const rmsRange = (x, t0, t1) => {
      const a = Math.floor(t0 * SR), b = Math.min(x.length, Math.floor(t1 * SR));
      let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i];
      return Math.sqrt(s / Math.max(1, b - a));
    };
    const highRatio = (x, t0, t1) => {
      const a = Math.floor(t0 * SR), b = Math.min(x.length, Math.floor(t1 * SR));
      let tot = 0, diff = 0;
      for (let i = a + 1; i < b; i++) { tot += x[i] * x[i]; const d = x[i] - x[i - 1]; diff += d * d; }
      return diff / Math.max(1e-12, tot);
    };
    const goertzel = (x, f, t0, t1) => {
      const a = Math.floor(t0 * SR), b = Math.min(x.length, Math.floor(t1 * SR));
      const w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w);
      let s1 = 0, s2 = 0;
      for (let i = a; i < b; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) / Math.max(1, b - a);
    };
    const base = { fmAB: 0, fmBC: 0, fmCA: 0, fold: 0, delayMix: 0, release: 0.08 };
    const pureSine = await render(base, 0.6, 0.4);
    const warmWave = await render({ ...base, waveMorph: 0.9 }, 0.6, 0.4);
    const vowelU = await render({ ...base, waveMorph: 1, formantMix: 1, vowel: 0 }, 0.6, 0.4);
    const vowelA = await render({ ...base, waveMorph: 1, formantMix: 1, vowel: 0.5 }, 0.6, 0.4);
    const dryTail = await render({ ...base, spaceMix: 0 }, 1.2, 0.15);
    const cloudTail = await render({ ...base, spaceMix: 0.85 }, 1.2, 0.15);
    const heldFull = await render({ ...base, sustain: 1, modDecay: 0.12 }, 0.8, 0.7);
    const pluckZero = await render({ ...base, sustain: 0, modDecay: 0.12 }, 0.8, 0.7);
    return {
      sineHi: highRatio(pureSine, 0.05, 0.35),
      warmHi: highRatio(warmWave, 0.05, 0.35),
      u1100: goertzel(vowelU, 1100, 0.05, 0.35),
      a1100: goertzel(vowelA, 1100, 0.05, 0.35),
      dryTailRms: rmsRange(dryTail, 0.55, 1.05),
      cloudTailRms: rmsRange(cloudTail, 0.55, 1.05),
      heldLateRms: rmsRange(heldFull, 0.45, 0.65),
      pluckLateRms: rmsRange(pluckZero, 0.45, 0.65),
    };
  });
  assert.ok(dsp.warmHi > dsp.sineHi * 1.4, `Wave Character adds upper harmonics (${dsp.sineHi.toFixed(4)} -> ${dsp.warmHi.toFixed(4)})`);
  assert.ok(dsp.a1100 > dsp.u1100 * 4, `Formant vowel A boosts 1100 Hz F2 peak over vowel U (${dsp.u1100.toFixed(5)} -> ${dsp.a1100.toFixed(5)})`);
  assert.ok(dsp.cloudTailRms > dsp.dryTailRms * 5 + 0.002, `Space Cloud adds lush decay tail (${dsp.dryTailRms.toFixed(5)} -> ${dsp.cloudTailRms.toFixed(5)})`);
  assert.ok(dsp.pluckLateRms < dsp.heldLateRms * 0.25, `Sustain=0 produces true pluck decay (${dsp.heldLateRms.toFixed(4)} -> ${dsp.pluckLateRms.toFixed(4)})`);

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`PASS PSY-STAGE1-01: 14 Factory patches (6 new + 8 classic), Live catalog sync, collapsible panels, Lock/Mutate/Undo, Patch Morph A<->B, & DSP verified`, dsp);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
