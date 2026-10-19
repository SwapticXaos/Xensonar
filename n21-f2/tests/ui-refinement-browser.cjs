'use strict';

const fs = require('fs'), assert = require('assert/strict'), {chromium: chromium} = require('playwright'), manifest = require('../source-manifest.json');

const current = fs.readFileSync(manifest.entry, 'utf8').replace('const params=p?.nParamsUI??{},waveId=', 'globalThis.__panel=p;const params=p?.nParamsUI??{},waveId=').replace('function dSe({', 'function dSe({');

const baseline = fs.readFileSync('Xensonar_N21_F2_Live_Controls_Test.html', 'utf8');

assert.equal(require('crypto').createHash('sha256').update(baseline).digest('hex'), 'cfff8263c2d39c083ba1b7ea5bf24eb7e4cc6208a25085385dd6b1ed64229d30', 'layout baseline must remain the previous delivery');

const rect = e => {
  const r = e.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    bottom: r.bottom
  };
};

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.XEN_CHROMIUM_PATH || '/usr/bin/chromium',
    args: [ '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required' ]
  });
  const report = {
    errors: [],
    layouts: []
  };
  try {
    async function open(html, viewport, shortcuts = 0) {
      const p = await browser.newPage({
        viewport: viewport
      });
      p.setDefaultTimeout(15e3);
      p.on('pageerror', e => report.errors.push(e.message));
      if (shortcuts) await p.addInitScript(n => localStorage.setItem('xensonar.quick-menu.v1', JSON.stringify(Array.from({
        length: n
      }, (_, i) => ({
        kind: 'material',
        id: 'saved-' + i,
        name: 'Material ' + i
      })))), shortcuts);
      await p.route('https://xensonar.test/**', r => r.fulfill({
        contentType: 'text/html',
        body: html
      }));
      await p.goto('https://xensonar.test/refinement');
      await p.locator('.xen-performance').waitFor();
      return p;
    }
    const p = await open(current, {
      width: 1740,
      height: 1e3
    });
    const drone = p.getByRole('combobox', {
      name: 'Drone sound',
      exact: true
    });
    assert.equal(await drone.count(), 1);
    assert.equal(await drone.inputValue(), 'xenpolar_drone');
    assert.equal(await p.locator('[data-drone-voice]').count(), 1);
    const choices = await drone.locator('option').evaluateAll(nodes => nodes.map(n => ({
      value: n.value,
      label: n.textContent
    })));
    assert.deepEqual(choices.slice(0, 2).map(c => c.value), [ 'xenpolar_drone', 'fjord_tape' ]);
    assert(choices[1].label.includes('Legacy'));
    assert(choices.length >= 17);
    assert.equal(await p.evaluate(() => __panel.nParamsUI.droneRhythm), 'Off');
    await drone.selectOption('fjord_tape');
    assert.equal(await p.evaluate(() => __panel.nParamsUI.dronePreset), 'fjord_tape');
    assert.equal(await p.evaluate(() => __panel.nParamsUI.droneRhythm), 'Puls 1/4');
    await drone.selectOption('xenpolar_drone');
    assert.equal(await p.evaluate(() => __panel.nParamsUI.droneTimbre), .35);
    await p.getByRole('button', {
      name: /Open Drone Workbench/
    }).click();
    assert.equal(await drone.inputValue(), 'xenpolar_drone');
    report.drone = {
      default: 'xenpolar_drone',
      second: choices[1],
      choices: choices.length,
      realCallbacks: true
    };
    const mute = p.locator('[data-quick-mute]');
    assert.equal(await mute.count(), 5);
    const grid = p.locator('[data-quick-mute="grid"]');
    await p.evaluate(() => __panel.updateNParams({
      rootFollowImpulsRasterEvery: 4,
      rootFollowImpulsRasterCycleDiv: 4,
      rootFollowImpulsRasterPattern: [ 1, 0, 0, 0 ]
    }));
    const before = await p.evaluate(() => ({
      pattern: __panel.nParamsUI.rootFollowImpulsRasterPattern,
      mode: __panel.nParamsUI.rootFollowLoopGranulationMode,
      grid: __panel.nParamsUI.gridOn
    }));
    await grid.click();
    assert.equal(await p.evaluate(() => __panel.nParamsUI.rootFollowImpulsRasterMuted), true);
    assert.equal(await grid.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await p.evaluate(() => ({
      pattern: __panel.nParamsUI.rootFollowImpulsRasterPattern,
      mode: __panel.nParamsUI.rootFollowLoopGranulationMode,
      grid: __panel.nParamsUI.gridOn
    })), before);
    await grid.click();
    assert.equal(await p.evaluate(() => __panel.nParamsUI.rootFollowImpulsRasterMuted), false);
    report.grid = {
      masterBypass: true,
      patternAndTimbrePreserved: true
    };
    const main = await p.evaluate(() => {
      const r = e => {
        const b = e.getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height
        };
      };
      return {
        rack: r(document.querySelector('.xen-performance')),
        quick: r(document.querySelector('.xen-quick-collection')),
        mute: r(document.querySelector('[data-quick-mute]')),
        particles: [ ...document.querySelectorAll('.xen-particle-mix-row') ].map(row => [ ...row.querySelectorAll('input[type=range]') ].map(r))
      };
    });
    assert.equal(main.rack.width, main.quick.width);
    assert.equal(main.mute.height, 17);
    for (const pair of main.particles) {
      assert.equal(pair[0].height, pair[1].height);
      assert.equal(pair[0].width, pair[1].width);
    }
    report.main = main;
    await p.screenshot({
      path: 'results/ui-refinement/main.png'
    });
    await p.close();
    for (const viewport of [ {
      width: 1740,
      height: 1e3
    }, {
      width: 1600,
      height: 1e3
    } ]) {
      const q = await open(current, viewport, 7);
      await q.locator('.xen-quick-collection.is-migrated').waitFor();
      const widths = await q.evaluate(() => ({
        rack: document.querySelector('.xen-performance').getBoundingClientRect().width,
        dock: document.querySelector('.xen-quick-dock').getBoundingClientRect().width,
        right: document.querySelector('.xen-quick-collection').getBoundingClientRect().width,
        tile: document.querySelector('.xen-quick-tile').getBoundingClientRect().height,
        mute: document.querySelector('[data-quick-mute]').getBoundingClientRect().height,
        rightX: document.querySelector('.xen-quick-collection').getBoundingClientRect().x,
        contentRight: document.querySelector('.xen-performance').parentElement.getBoundingClientRect().right
      }));
      assert.equal(widths.rack, widths.dock);
      assert.equal(widths.rack, widths.right);
      assert(widths.rightX >= widths.contentRight - 1, 'right rail cannot cover the work area');
      assert.equal(widths.tile, widths.mute * 2);
      report.layouts.push({
        viewport: viewport,
        rails: widths
      });
      await q.close();
    }
    async function loop(p) {
      await p.getByRole('button', {
        name: 'III. NODAL INSTALLATION',
        exact: true
      }).click();
      await p.getByRole('button', {
        name: 'Send to Melodic Loop',
        exact: true
      }).click();
      await p.getByRole('button', {
        name: 'Open Loop ↗',
        exact: true
      }).click();
      await p.locator('[data-ml-instrument-card]').first().waitFor();
    }
    for (const viewport of [ {
      width: 1740,
      height: 1e3
    }, {
      width: 1600,
      height: 1e3
    }, {
      width: 1100,
      height: 900
    }, {
      width: 760,
      height: 900
    } ]) {
      const old = await open(baseline, viewport);
      await loop(old);
      const base = await old.locator('[data-xensonar-melodic-import-body-rack]').evaluate(e => ({
        width: e.getBoundingClientRect().width,
        height: e.getBoundingClientRect().height,
        columns: getComputedStyle(e).gridTemplateColumns
      }));
      await old.close();
      const q = await open(current, viewport);
      await loop(q);
      const box = q.locator('[data-xensonar-melodic-import-body-rack]'), transport = q.locator('[data-ml-transport]');
      assert.equal(await transport.count(), 1);
      const geometry = await box.evaluate(e => {
        const r = e => {
          const b = e.getBoundingClientRect();
          return {
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            bottom: b.bottom
          };
        };
        return {
          ...r(e),
          columns: getComputedStyle(e).gridTemplateColumns,
          undo: r([ ...e.querySelectorAll('button') ].find(n => n.textContent === 'Undo')),
          play: r(e.querySelector('[data-ml-transport] button')),
          others: [ ...e.children ].slice(1).map(r),
          canvas: r(document.querySelector('[data-xensonar-melodic-loop-workspace-canvas]'))
        };
      });
      assert.equal(geometry.width, base.width);
      assert.equal(geometry.columns, base.columns);
      if (viewport.width >= 768) assert(Math.abs(geometry.height - base.height) < 1, 'bars box must retain its size ' + JSON.stringify({
        viewport: viewport,
        base: base,
        geometry: geometry
      }));
      assert.equal(geometry.play.width, 44);
      assert.equal(geometry.play.height, 44);
      assert.equal(geometry.play.x, geometry.undo.x);
      assert(geometry.play.y >= geometry.undo.bottom && geometry.play.y - geometry.undo.bottom < 12);
      assert(geometry.play.bottom < geometry.canvas.y);
      for (const other of geometry.others) {
        const hit = geometry.play.x < other.x + other.width && geometry.play.x + geometry.play.width > other.x && geometry.play.y < other.bottom && geometry.play.bottom > other.y;
        assert(!hit, 'transport cannot cover the segment or import controls');
      }
      async function aligned() {
        const rows = await q.locator('[data-ml-instrument-card]').evaluateAll(cards => cards.map(e => {
          const a = e.querySelector('.melodic-track-volume input').getBoundingClientRect(), b = e.querySelector('.melodic-track-pan input').getBoundingClientRect();
          return {
            x: a.x,
            panX: b.x,
            width: a.width,
            panWidth: b.width,
            height: a.height,
            panHeight: b.height
          };
        }));
        for (const r of rows) {
          assert(Math.abs(r.x - r.panX) < .1);
          assert(Math.abs(r.width - r.panWidth) < .1);
          assert.equal(r.height, r.panHeight);
          assert(r.width > 20);
        }
        return rows;
      }
      const normal = await aligned();
      const card = q.locator('[data-ml-instrument-card]').first();
      await card.getByRole('button', {
        name: 'Only You',
        exact: true
      }).click();
      const solo = await aligned();
      await card.getByRole('button', {
        name: 'All Together Now',
        exact: true
      }).click();
      await aligned();
      assert.equal(await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      report.layouts.push({
        viewport: viewport,
        base: base,
        geometry: geometry,
        normal: normal,
        solo: solo
      });
      if (viewport.width === 1740) await q.screenshot({
        path: 'results/ui-refinement/melodic.png'
      });
      await q.close();
    }
    assert.deepEqual(report.errors, []);
    console.log('PASS aligned volume/pan in default/solo/restored views; original bars geometry; relocated transport; matching rails; 17px mute gates; per-particle sliders; main-room Drone and reversible raster bypass');
  } finally {
    await browser.close();
    fs.writeFileSync('results/ui-refinement/browser.json', JSON.stringify(report, null, 2) + '\n');
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
