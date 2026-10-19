'use strict';

const fs = require('fs');
const assert = require('assert/strict');
const {chromium} = require('playwright');
const {entry} = require('../source-manifest.json');
const snapshot = 'return{recordingState:y,setRecordingState:x,recordingActive:y.isRecording';
const original = fs.readFileSync(entry, 'utf8');
assert.equal(original.split(snapshot).length, 2, 'read-only recorder snapshot must bind once');
const html = original.replace(snapshot, 'globalThis.__markerRecorder={active:y.isRecording,markers:A,logoPulses:G};' + snapshot);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.XEN_CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
  });
  const report = {rows: [], errors: []};
  try {
    for (const scenario of [
      {width: 1740, height: 1000, entries: 0},
      {width: 1740, height: 1000, entries: 7},
      {width: 1740, height: 1000, entries: 20},
      {width: 1740, height: 1000, entries: 30},
      {width: 1600, height: 900, entries: 7},
      {width: 1600, height: 900, entries: 17}
    ]) {
      const page = await browser.newPage({viewport: {width: scenario.width, height: scenario.height}});
      page.setDefaultTimeout(12000);
      page.on('pageerror', error => report.errors.push(error.message));
      await page.addInitScript(count => localStorage.setItem('xensonar.quick-menu.v1', JSON.stringify(
        Array.from({length: count}, (_, i) => ({kind: 'material', id: 'marker-' + i, name: 'Material ' + i}))
      )), scenario.entries);
      await page.route('https://xensonar.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
      await page.goto('https://xensonar.test/recording-markers');
      await page.locator('.xen-performance').waitFor();
      await page.getByTitle('Start Master Recording', {exact: true}).click();
      await page.waitForFunction(() => __markerRecorder.active);
      const marker = page.getByRole('button', {name: 'Place a marker in the recording', exact: true});
      await page.waitForTimeout(100);
      const geometry = await marker.evaluate(element => {
        const box = element.getBoundingClientRect();
        return {height: box.height, width: box.width, disabled: element.disabled};
      });
      assert(geometry.height >= 120, 'a smaller marker target must retain a real hit area: ' + JSON.stringify(scenario));
      assert(geometry.width > 100);
      assert.equal(geometry.disabled, false);
      await marker.scrollIntoViewIfNeeded();
      await marker.click();
      await page.waitForFunction(() => __markerRecorder.markers.length === 1);
      assert.equal(await page.evaluate(() => __markerRecorder.logoPulses.length), 1, 'accepted side marker must pulse the logo');

      // Freeze the real CSS animation at several times and compare its visual
      // centre with the actual SVG, including the fully expanded wave.
      const centres = await page.locator('header button > span[style*="logoMarkerPulse"]').first().evaluate(element => {
        const animation = element.getAnimations()[0];
        animation.pause();
        const result = [];
        for (const time of [0, 300, 900]) {
          animation.currentTime = time;
          const ring = element.getBoundingClientRect();
          const logo = element.parentElement.querySelector('svg').getBoundingClientRect();
          result.push({time, deltaX: ring.x + ring.width / 2 - logo.x - logo.width / 2,
            deltaY: ring.y + ring.height / 2 - logo.y - logo.height / 2, width: ring.width});
        }
        return result;
      });
      assert(centres.every(row => Math.abs(row.deltaX) < .1 && Math.abs(row.deltaY) < .1), 'wave must stay centred on the logo');
      assert(centres[2].width > centres[0].width * 5, 'wave must expand');
      await page.getByRole('button', {name: 'Marker setzen', exact: true}).scrollIntoViewIfNeeded();
      await page.getByRole('button', {name: 'Marker setzen', exact: true}).click();
      await page.waitForFunction(() => __markerRecorder.markers.length === 2);
      const markers = await page.evaluate(() => __markerRecorder.markers.map(marker => ({id: marker.id, timeMs: marker.timeMs})));
      assert(markers[0].timeMs >= 0 && markers[1].timeMs >= markers[0].timeMs);
      assert.notEqual(markers[0].id, markers[1].id);
      report.rows.push({scenario, geometry, centres, markers});
      if (scenario.entries === 0) await page.screenshot({path: 'results/ui-refinement/marker.png'});
      await page.getByTitle('Stop recording and jump to Master Recording', {exact: true}).click();
      await page.waitForFunction(() => !__markerRecorder.active);
      assert.equal(await marker.isDisabled(), true);
      await marker.evaluate(element => element.click());
      assert.equal(await page.evaluate(() => __markerRecorder.markers.length), 2, 'stopped recording cannot invent a marker');
      await page.close();
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync('results/ui-refinement/marker-browser.json', JSON.stringify(report, null, 2) + '\n');
    console.log('PASS real recording: six shortcut layouts, reachable side marker, exactly one marker per click, centred expanding logo feedback');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
