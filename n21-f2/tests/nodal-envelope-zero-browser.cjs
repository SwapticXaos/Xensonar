'use strict';

const fs = require('fs'), assert = require('assert/strict'), {chromium: chromium} = require('playwright'), m = require('../source-manifest.json');

const html = fs.readFileSync(m.entry, 'utf8').replace('const kEe=CEe("root");', 'window.__env={plot:PF,session:()=>EQ(),model:__XenNodalModel,dsp:__XenNodalDSP,options:nodalMelodicNoteOptions,schedule:nodalScheduleOffline,steps:iD,duration:lD};const kEe=CEe("root");');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.XEN_CHROMIUM_PATH || '/usr/bin/chromium',
    args: [ '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required' ]
  });
  const report = {
    errors: []
  };
  try {
    const p = await browser.newPage({
      viewport: {
        width: 1600,
        height: 1e3
      }
    });
    p.setDefaultTimeout(15e3);
    p.on('pageerror', e => report.errors.push(e.message));
    await p.route('https://xensonar.test/**', r => r.fulfill({
      contentType: 'text/html',
      body: html
    }));
    await p.goto('https://xensonar.test/envelope');
    await p.getByRole('button', {
      name: 'III. NODAL INSTALLATION',
      exact: true
    }).click();
    await p.getByRole('tab', {
      name: 'Envelopes',
      exact: true
    }).click();
    await p.getByRole('tab', {
      name: 'Volume',
      exact: true
    }).click();
    const canvas = p.locator('.nd-shared-field-compact canvas');
    await canvas.waitFor();
    await canvas.scrollIntoViewIfNeeded();
    await p.waitForTimeout(100);
    async function handle(which) {
      return canvas.evaluate((canvas, which) => {
        const r = canvas.getBoundingClientRect(), g = __env.plot(canvas);
        return {
          x: r.x + (which === 'left' ? g.padX : canvas.width - g.padX) * r.width / canvas.width,
          mid: r.y + (g.padY + g.usableH / 2) * r.height / canvas.height,
          bottom: r.y + (g.padY + g.usableH) * r.height / canvas.height
        };
      }, which);
    }
    async function pull(which) {
      const r = await handle(which);
      await p.mouse.move(r.x, r.mid);
      await p.mouse.down();
      await p.mouse.move(r.x, r.bottom + 8, {
        steps: 24
      });
      await p.mouse.up();
    }
    async function capture() {
      await p.getByRole('button', {
        name: 'Send to Melodic Loop',
        exact: true
      }).click();
      return p.evaluate(() => {
        const c = __env.session().loopComposer, track = c.tracks.find(t => t.id === c.selectedTrackId);
        return c.nodalInstruments[track.instrumentPreset];
      });
    }
    await pull('right');
    const fade = await capture();
    assert.equal(fade.articulation.volumeEnvelope.edgeHandles.right, -1, 'actual bottom triangle drag must store the lower boundary');
    assert.equal(fade.articulation.volumeEnvelope.edgeHandles.left, 0);
    report.fade = await p.evaluate(async instrument => {
      const a = __env, plan = a.model.compile(instrument), curve = plan.articulation.volumeCurve, rate = 48e3, duration = .3, b = a.dsp.render(plan, {
        durationSec: duration
      }, rate), zeroFrame = Math.ceil(duration * curve.findIndex(v => v === 0) / (curve.length - 1) * rate) + 2;
      let early = 0, tail = 0;
      for (let i = 0; i < b.pcm.length; i++) {
        if (i < zeroFrame) early = Math.max(early, Math.abs(b.pcm[i])); else tail = Math.max(tail, Math.abs(b.pcm[i]), Math.abs(b.left?.[i] ?? 0), Math.abs(b.right?.[i] ?? 0));
      }
      const composer = a.session().loopComposer, track = composer.tracks.find(t => t.id === composer.selectedTrackId), note = composer.notes.find(n => n.trackId === track.id), ctx = new OfflineAudioContext(2, rate * 3, rate);
      a.schedule(ctx, ctx.destination, composer, note, track, 0, a.duration({
        composer: composer,
        bpm: 120
      }) / a.steps(composer), {
        kind: 'nodal',
        instrument: instrument,
        plan: plan
      });
      const offline = await ctx.startRendering();
      return {
        firstGain: curve[0],
        lastGain: curve.at(-1),
        earlyPeak: early,
        tailPeak: tail,
        offlineAudible: offline.getChannelData(0).some(v => v !== 0)
      };
    }, fade);
    assert.equal(report.fade.firstGain, 1);
    assert.equal(report.fade.lastGain, 0);
    assert(report.fade.earlyPeak > 1e-4 && report.fade.offlineAudible);
    assert.equal(report.fade.tailPeak, 0);
    await canvas.scrollIntoViewIfNeeded();
    await p.screenshot({
      path: 'results/ui-refinement/envelope.png'
    });
    await pull('left');
    const silent = await capture();
    assert.equal(silent.articulation.volumeEnvelope.edgeHandles.left, -1);
    assert.equal(silent.articulation.volumeEnvelope.edgeHandles.right, -1);
    assert.equal(JSON.stringify(silent.articulation.pitchEnvelope), JSON.stringify(fade.articulation.pitchEnvelope));
    report.silent = await p.evaluate(instrument => {
      const plan = __env.model.compile(instrument), b = __env.dsp.render(plan, {
        durationSec: .3
      }, 48e3);
      return {
        allGainsZero: plan.articulation.volumeCurve.every(v => v === 0),
        allSamplesZero: b.pcm.every(v => v === 0) && b.left.every(v => v === 0) && b.right.every(v => v === 0)
      };
    }, silent);
    assert(report.silent.allGainsZero && report.silent.allSamplesZero);
    assert.deepEqual(report.errors, []);
    console.log('PASS actual Nodal triangle drags: fade reaches exact-zero PCM, fully lowered envelope is silent, Melodic scheduling audible before fade, Pitch envelope preserved');
  } finally {
    await browser.close();
    fs.writeFileSync('results/ui-refinement/envelope-browser.json', JSON.stringify(report, null, 2) + '\n');
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
