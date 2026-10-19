'use strict';

const fs = require('fs'), assert = require('assert/strict'), {chromium: chromium} = require('playwright'), m = require('../source-manifest.json');

const html = fs.readFileSync(m.entry, 'utf8').replace('const kEe=CEe("root");', 'window.__rasterAudio={policy:__f442RFLRasterPolicy,decision:ile,window:lle,plan:R3,render:oy,settings:Fw,tuning:vG};const kEe=CEe("root");');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.XEN_CHROMIUM_PATH || '/usr/bin/chromium',
    args: [ '--no-sandbox', '--disable-dev-shm-usage' ]
  });
  try {
    const p = await browser.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.route('https://xensonar.test/**', r => r.fulfill({
      contentType: 'text/html',
      body: html
    }));
    await p.goto('https://xensonar.test/raster-audio');
    await p.waitForFunction(() => !!__rasterAudio);
    const rows = await p.evaluate(async () => {
      const a = __rasterAudio, rows = [];
      for (const mode of [ 'flowing', 'fragment' ]) for (const muted of [ false, true, false ]) {
        const rate = 48e3, ctx = new OfflineAudioContext(1, rate * 2, rate), buffer = ctx.createBuffer(1, rate, rate), pcm = buffer.getChannelData(0), destination = ctx.createGain();
        destination.gain.value = .22;
        destination.connect(ctx.destination);
        for (let i = 0; i < pcm.length; i++) pcm[i] = .15 * Math.sin(i * 2 * Math.PI * 220 / rate);
        const policy = a.policy({
          every: 4,
          counterDiv: 4,
          cycleDiv: 4,
          clockMode: 'mute-pattern',
          pattern: [ 1, 0, 0, 0 ]
        }, muted), tuning = a.tuning(a.settings({
          qualityMode: mode === 'flowing' ? 'base' : 'fragment',
          windowMs: 76,
          stepMs: 26,
          jitter: 0,
          sourceSpread: 0,
          microDensity: 1
        }, mode === 'flowing' ? 'flowing' : 'grainy'));
        let grains = 0, windows = 0;
        for (let i = 0; i < 70; i++) {
          const at = .02 + i * .026, decision = a.decision({
            candidateStartSec: at,
            transportAnchorSec: 0,
            cycleDurationSec: 1,
            policy: policy
          });
          if (!decision.audible) continue;
          const window = a.window({
            decision: decision,
            policy: policy,
            cycleDurationSec: 1
          });
          const plan = a.plan({
            buffer: buffer,
            currentTimeSec: 0,
            mode: mode,
            windowStartSec: at,
            windowDurationSec: Math.min(.076, window ? Math.max(.001, decision.slotEndSec - at) : .076),
            desiredLoopDurationSec: 1,
            transportAnchorSec: 0,
            loopStartSec: 0,
            loopEndSec: 1,
            rawTargetHz: 220,
            previousSmoothedRootHz: 220,
            entryRootHz: 220,
            sessionAnchorHz: 220,
            stepSec: .026,
            tuning: tuning
          });
          a.render({
            ctx: ctx,
            destination: destination,
            buffer: buffer,
            plan: plan,
            registerGrain() {
              grains++;
            }
          });
          windows++;
        }
        const out = (await ctx.startRendering()).getChannelData(0);
        let energy = 0, peak = 0;
        for (const v of out) {
          if (!Number.isFinite(v)) throw Error('nonfinite PCM');
          energy += v * v;
          peak = Math.max(peak, Math.abs(v));
        }
        rows.push({
          mode: mode,
          muted: muted,
          windows: windows,
          grains: grains,
          energy: energy,
          peak: peak
        });
      }
      return rows;
    });
    console.log(JSON.stringify(rows, null, 2));
    for (const mode of [ 'flowing', 'fragment' ]) {
      const [before, bypass, after] = rows.filter(r => r.mode === mode);
      assert(bypass.energy > before.energy * 2, 'bypass fills the muted time intervals');
      assert.equal(before.windows, after.windows);
      assert(Math.abs(before.energy - after.energy) < 1e-5);
      assert(bypass.windows > before.windows * 2);
    }
    assert(rows.every(r => r.peak > 0 && r.peak < .5));
    assert.deepEqual(errors, []);
    fs.writeFileSync('results/ui-refinement/raster-browser.json', JSON.stringify({
      rows: rows,
      errors: errors
    }, null, 2) + '\n');
    console.log('PASS native granular PCM: flowing/fragment, authored raster → continuous bypass → restored raster, finite output and bounded peaks');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
