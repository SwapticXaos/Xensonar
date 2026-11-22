'use strict';
// Melodic Loop:
//  1. Right-click on empty grid starts loop playback from that exact step position.
//  2. Right-click on empty grid while already playing seeks immediately to that step.
//  3. Right-click on a note deletes the note and does NOT trigger playback.
//  4. Dragging a note block lights up all other visible note blocks at the same pitch (unison)
//     or any octave multiple, and clears cleanly on release.
// Usage: NODE_PATH=/tmp/pw/node_modules node tests/e2e/melodic_rclick_play_and_octave_glow.cjs dist/XenSonar_PROBE.html
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = path.resolve(process.argv[2] || 'dist/XenSonar_PROBE.html');
const shotPath = process.env.ML_SHOT_PATH || '';

(async () => {
 const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
 const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.goto('file://' + html);
 await page.waitForTimeout(3000);
 await page.locator('button', { hasText: 'MATERIAL FORGE' }).first().click();
 await page.waitForTimeout(2000);
 await page.locator('button', { hasText: 'MELODIC LOOP' }).first().click();
 await page.waitForTimeout(3500);

 const cv = page.locator('canvas').last();
 await cv.scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 const rect = await cv.boundingBox();
 assert(rect && rect.width > 200 && rect.height > 150, 'Melodic canvas visible');

 const E = code => page.evaluate(x => window.__xenProbe.draw.evalInBundle(x), code);

 // Compute exact canvas pixel coordinates for notes & pitch lines from EQ().loopComposer
 // Uses the same layout constants as canonical.js: gutterW=104 (KL), headerH=62 ($L)
 async function getComposerLayout() {
  return page.evaluate(() => {
   const canvases = Array.from(document.querySelectorAll('canvas'));
   const canvas = canvases[canvases.length - 1];
   const r = canvas.getBoundingClientRect();
   const st = window.__xenProbe.draw.evalInBundle('EQ()?.loopComposer');
   if (!st) return null;
   const gutterW = 152, headerH = 58;
   const cw = canvas.width, ch = canvas.height;
   const totalSteps = Math.max(1, (st.bars || 4) * (st.stepsPerBar || 16));
   const zoom = Math.max(1, st.zoom || 1);
   const visibleSteps = Math.max(8, Math.min(totalSteps, totalSteps / zoom));
   const scrollStart = Math.max(0, totalSteps - visibleSteps) * Math.max(0, Math.min(1, st.scrollX || 0));
   const cellW = (cw - gutterW) / Math.max(1, visibleSteps);

   const layoutInfo = window.__xenProbe.draw.evalInBundle(`(() => {
    const st = EQ()?.loopComposer;
    if (!st) return null;
    const p = VL(st, ${ch}, 58);
    return { bodyTop: p.bodyTop, bodyBottom: p.bodyBottom, lineYs: p.lineYs };
   })()`);
   const bodyTop = layoutInfo.bodyTop;
   const lineYs = layoutInfo.lineYs;
   const toClient = (cx, cy) => ({
    x: r.left + (cx / cw) * r.width,
    y: r.top + (cy / ch) * r.height,
   });
   const activeSet = new Set(st.activeTrackIds || []);
   const visNotes = st.notes.filter(n => activeSet.has(n.trackId)).map(n => {
    const lineIdx = st.pitchLines.findIndex(l => l.id === n.lineId);
    const chIdx = lineIdx >= 0 ? lineIdx : (n.channelIndex ?? 0);
    const startU = Number.isFinite(n.startUnit) ? n.startUnit : (n.step ?? 0);
    const durU = Number.isFinite(n.durationUnits) ? n.durationUnits : (n.length ?? 2);
    const x0 = gutterW + (startU - scrollStart) * cellW;
    const w = Math.max(6, durU * cellW);
    const ly = lineYs[chIdx] ?? bodyTop;
    const line = st.pitchLines[chIdx];
    const hz = (line?.hz ?? 220) * Math.pow(2, (line?.offsetCents ?? 0) / 1200);
    return {
     id: n.id, trackId: n.trackId, chIdx, startU, durU, hz,
     isMaterial: n.noteClass === 'material-base' || n.noteClass === 'material-fragment' || n.sourceKind === 'material',
     cx: x0 + w * 0.5, cy: ly, x0, x1: x0 + w,
     client: toClient(x0 + w * 0.5, ly),
    };
   });
   const pitchLines = st.pitchLines.map((l, idx) => ({
    idx,
    hz: (l?.hz ?? 220) * Math.pow(2, (l?.offsetCents ?? 0) / 1200),
    y: lineYs[idx],
    clientY: toClient(gutterW + 20, lineYs[idx]).y,
   }));
   return { gutterW, headerH, cw, ch, totalSteps, visibleSteps, scrollStart, cellW, visNotes, pitchLines, rect: r };
  });
 }

 function findEmptyPoint(layout, targetStep, preferredLineIdx) {
  const { gutterW, cw, ch, scrollStart, cellW, visNotes, pitchLines, rect: r } = layout;
  const cx = gutterW + (targetStep - scrollStart) * cellW;
  for (let delta = 0; delta < pitchLines.length; delta++) {
   const idx = (preferredLineIdx + delta) % pitchLines.length;
   const cy = pitchLines[idx].y;
   if (cy < layout.headerH + 14 || cy > ch - 14) continue;
   const overlaps = visNotes.some(n => Math.abs(n.cy - cy) < 16 && cx >= n.x0 - 10 && cx <= n.x1 + 10);
   if (!overlaps) {
    return {
     step: targetStep,
     clientX: r.left + (cx / cw) * r.width,
     clientY: r.top + (cy / ch) * r.height,
    };
   }
  }
  return null;
 }

 // ── 1. Right-click on empty grid starts playback from that exact step ──
 assert.equal(await E('b9e() !== null'), false, 'initially not playing');
 const layout1 = await getComposerLayout();
 assert(layout1 && layout1.visNotes.length >= 2, 'Melodic Loop has visible notes');
 const targetStep1 = layout1.scrollStart + layout1.visibleSteps * 0.42;
 const pt1 = findEmptyPoint(layout1, targetStep1, Math.floor(layout1.pitchLines.length * 0.35));
 assert(pt1, 'found empty grid point near 42%');

 await page.mouse.click(pt1.clientX, pt1.clientY, { button: 'right' });
 await page.waitForFunction(() => window.__xenProbe.draw.evalInBundle('b9e() !== null'), { timeout: 12000 });
 const playState1 = await E(`(() => {
  const s = b9e();
  return s ? { loopOffsetSec: s.loopOffsetSec, totalDurationSec: s.totalDurationSec, totalSteps: s.totalSteps, stepAtStart: s.loopOffsetSec / Math.max(1e-6, s.stepDurationSec) } : null;
 })()`);
 assert(playState1, 'active playback session exists');
 assert(Math.abs(playState1.stepAtStart - pt1.step) < 0.6,
  `playback started at clicked step: expected ~${pt1.step.toFixed(2)}, got ${playState1.stepAtStart.toFixed(2)}`);

 // ── 2. Right-click on another empty point while playing seeks immediately ──
 const targetStep2 = layout1.scrollStart + layout1.visibleSteps * 0.74;
 const pt2 = findEmptyPoint(layout1, targetStep2, Math.floor(layout1.pitchLines.length * 0.65));
 assert(pt2, 'found second empty grid point near 74%');
 await page.mouse.click(pt2.clientX, pt2.clientY, { button: 'right' });
 await page.waitForTimeout(150);
 const playState2 = await E(`(() => {
  const s = b9e();
  return s ? { stepAtSeek: s.loopOffsetSec / Math.max(1e-6, s.stepDurationSec) } : null;
 })()`);
 assert(Math.abs(playState2.stepAtSeek - pt2.step) < 0.6,
  `right-click seeked to second step: expected ~${pt2.step.toFixed(2)}, got ${playState2.stepAtSeek.toFixed(2)}`);

 // Stop playback cleanly before testing note-delete right-click
 await E('hS(); 1');
 await page.waitForTimeout(200);
 assert.equal(await E('b9e() !== null'), false, 'stopped cleanly');

 // ── 3. Right-click on an existing note deletes it and does NOT start playback ──
 const delTarget = layout1.visNotes[layout1.visNotes.length - 1];
 const countBeforeDel = await E('EQ()?.loopComposer?.notes?.length ?? -1');
 await page.mouse.click(delTarget.client.x, delTarget.client.y, { button: 'right' });
 await page.waitForTimeout(250);
 const afterDel = await E(`({ playing: b9e() !== null, count: EQ()?.loopComposer?.notes?.length ?? -1, stillThere: !!EQ()?.loopComposer?.notes?.some(n => n.id === ${JSON.stringify(delTarget.id)}) })`);
 assert.equal(afterDel.stillThere, false, 'right-clicked note was deleted');
 assert.equal(afterDel.count, countBeforeDel - 1, 'note count decremented by 1');
 assert.equal(afterDel.playing, false, 'right-clicking a note did NOT start playback');

 // ── 4. Dragging a note block glows octave & unison matches and clears on release ──
 const layout2 = await getComposerLayout();
 const editableNotes = layout2.visNotes.filter(n => !n.isMaterial);
 assert(editableNotes.length >= 2, 'at least 2 editable notes for octave-match test');

 let ref = null, octLine = null, unisonLine = null, nonMatchLine = null;
 for (const cand of editableNotes) {
  let oL = null, nmL = null;
  for (const pl of layout2.pitchLines) {
   if (pl.idx === cand.chIdx) continue;
   const diff = 1200 * Math.log2(pl.hz / cand.hz);
   const mod = ((diff % 1200) + 1200) % 1200;
   const dist = Math.min(mod, 1200 - mod);
   if (dist <= 12 && !oL) oL = pl;
   if (dist > 150 && dist < 1050 && !nmL) nmL = pl;
  }
  if (oL && nmL) {
   ref = cand;
   octLine = oL;
   unisonLine = layout2.pitchLines[cand.chIdx];
   nonMatchLine = nmL;
   break;
  }
 }
 assert(ref && octLine && unisonLine && nonMatchLine, 'found reference note with octave & non-octave pitch lines');
 const dragNote = editableNotes.find(n => n.id !== ref.id);
 assert(dragNote, 'found distinct note to drag');

 // Grab dragNote in its middle
 await page.mouse.move(dragNote.client.x, dragNote.client.y);
 await page.mouse.down();
 await page.waitForTimeout(120);

 // Move to non-matching line
 await page.mouse.move(dragNote.client.x, nonMatchLine.clientY, { steps: 6 });
 await page.waitForTimeout(120);
 const matchNon = await cv.getAttribute('data-octave-match-ids');
 assert(!(matchNon || '').split(',').includes(ref.id),
  `ref note should NOT glow on non-octave line, got: ${matchNon}`);

 // Move to exact octave line of ref note
 await page.mouse.move(dragNote.client.x, octLine.clientY, { steps: 6 });
 await page.waitForTimeout(150);
 const matchOct = await cv.getAttribute('data-octave-match-ids');
 assert((matchOct || '').split(',').includes(ref.id),
  `ref note MUST glow on octave line! expected ${ref.id} in "${matchOct}"`);

 if (shotPath) {
  await page.screenshot({ path: shotPath, fullPage: false });
 }

 // Move to unison line of ref note
 await page.mouse.move(dragNote.client.x, unisonLine.clientY, { steps: 6 });
 await page.waitForTimeout(150);
 const matchUnison = await cv.getAttribute('data-octave-match-ids');
 assert((matchUnison || '').split(',').includes(ref.id),
  `ref note MUST glow on unison line! expected ${ref.id} in "${matchUnison}"`);

 // Release drag -> glow must clear completely
 await page.mouse.up();
 await page.waitForTimeout(150);
 const matchAfter = await cv.getAttribute('data-octave-match-ids');
 const draggedAfter = await cv.getAttribute('data-dragged-note-ids');
 assert.equal(matchAfter, null, 'octave-match glow clears on mouseup');
 assert.equal(draggedAfter, null, 'draggedNoteIds clears on mouseup');

 // ── 5. Horizontal Zoom Window: left-click & right-click in middle play/seek from that point ──
 const navViewport = page.locator('[data-ml-nav-mode="move"]').first();
 await navViewport.scrollIntoViewIfNeeded();
 await page.waitForTimeout(200);
 const navBarBox = await navViewport.locator('..').boundingBox();
 assert(navBarBox && navBarBox.width > 120, 'Horizontal Zoom Window visible');

 // Left-click in the middle (~50%) of the horizontal zoom window -> starts playback from ~50%
 assert.equal(await E('b9e() !== null'), false, 'stopped before zoom-bar left-click');
 await page.mouse.click(navBarBox.x + navBarBox.width * 0.5, navBarBox.y + navBarBox.height * 0.5, { button: 'left' });
 await page.waitForFunction(() => window.__xenProbe.draw.evalInBundle('b9e() !== null'), { timeout: 12000 });
 const navPlayLeft = await E(`(() => { const s = b9e(); return s ? s.loopOffsetSec / Math.max(1e-6, s.totalDurationSec) : -1; })()`);
 assert(Math.abs(navPlayLeft - 0.5) < 0.05, `zoom-bar left-click started near 50%, got ${(navPlayLeft * 100).toFixed(1)}%`);

 // Right-click at ~25% of the horizontal zoom window -> seeks to ~25%
 await page.mouse.click(navBarBox.x + navBarBox.width * 0.25, navBarBox.y + navBarBox.height * 0.5, { button: 'right' });
 await page.waitForTimeout(150);
 const navPlayRight = await E(`(() => { const s = b9e(); return s ? s.loopOffsetSec / Math.max(1e-6, s.totalDurationSec) : -1; })()`);
 assert(Math.abs(navPlayRight - 0.25) < 0.05, `zoom-bar right-click seeked near 25%, got ${(navPlayRight * 100).toFixed(1)}%`);

 // Stop & verify right-click from stopped state also starts playback at ~75%
 await E('hS(); 1');
 await page.waitForTimeout(200);
 await page.mouse.click(navBarBox.x + navBarBox.width * 0.75, navBarBox.y + navBarBox.height * 0.5, { button: 'right' });
 await page.waitForFunction(() => window.__xenProbe.draw.evalInBundle('b9e() !== null'), { timeout: 12000 });
 const navPlayRightStart = await E(`(() => { const s = b9e(); return s ? s.loopOffsetSec / Math.max(1e-6, s.totalDurationSec) : -1; })()`);
 assert(Math.abs(navPlayRightStart - 0.75) < 0.05, `zoom-bar right-click from stopped started near 75%, got ${(navPlayRightStart * 100).toFixed(1)}%`);

 await E('hS(); 1');
 assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
 console.log('melodic_rclick_play_and_octave_glow OK', {
  playStartStep: Number(playState1.stepAtStart.toFixed(2)),
  seekStep: Number(playState2.stepAtSeek.toFixed(2)),
  deletedNoteId: delTarget.id,
  octaveMatches: matchOct,
  unisonMatches: matchUnison,
  navPlayLeftPct: Math.round(navPlayLeft * 100),
  navPlayRightPct: Math.round(navPlayRight * 100),
  navPlayRightStartPct: Math.round(navPlayRightStart * 100),
 });
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
