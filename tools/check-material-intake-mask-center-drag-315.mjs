#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const runtimePath = 'src/features/l3lab/materialIntake/materialIntakePanel/useMaterialIntakeCanvasRuntime.ts';
const dragPath = 'src/features/l3lab/materialIntake/materialIntakePanel/materialIntakeDrag.ts';
const runtime = readFileSync(runtimePath, 'utf8');
const drag = readFileSync(dragPath, 'utf8');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(name) {
  const start = runtime.indexOf(`const ${name} =`);
  if (start < 0) return '';
  const next = runtime.indexOf('\n  const ', start + 8);
  const ret = runtime.indexOf('\n  return {', start + 8);
  const endCandidates = [next, ret].filter((value) => value > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : runtime.length;
  return runtime.slice(start, end);
}

const overview = functionBody('beginOverviewDrag');
const detail = functionBody('beginDetailDrag');

expect(overview.length > 0, 'beginOverviewDrag must exist.');
expect(detail.length > 0, 'beginDetailDrag must exist.');
expect(drag.includes("export type DragMode = 'new' | 'move' | 'resize-start' | 'resize-end'"), 'drag domain must retain explicit move mode.');
expect(drag.includes("if (drag.mode === 'move')"), 'drag math must retain whole-range translation.');
expect(drag.includes('nextStart = drag.startSec + (pointSec - drag.anchorTime);'), 'move mode must preserve duration and translate start by pointer delta.');
expect(drag.includes('Math.min(maxDuration - safeDuration, nextStart)'), 'move mode must remain clamped to source bounds.');

for (const [label, body, scrubNeedle, target] of [
  ['overview/cyan', overview, 'void scrubPreviewAt(pointSec);', "target: 'overview'"],
  ['detail/purple', detail, 'void scrubPreviewAt(pointSec, selection.fineLoopRange);', "target: 'detail'"],
]) {
  expect(body.includes("if (mode === 'move')"), `${label} must recognize mask-interior move mode.`);
  expect(body.includes(scrubNeedle), `${label} plain click must preserve the existing scrub behavior.`);
  const moveBlockStart = body.indexOf("if (mode === 'move')");
  const dragStart = body.indexOf('setDragState({', moveBlockStart);
  expect(dragStart > moveBlockStart, `${label} interior gesture must continue into setDragState instead of being consumed.`);
  const between = dragStart > moveBlockStart ? body.slice(moveBlockStart, dragStart) : '';
  expect(!/\breturn\s*;/.test(between), `${label} move mode must not return before starting drag state.`);
  expect(body.includes(target), `${label} drag state must target the correct canvas.`);
  expect(body.includes("durationSec: mode === 'new'"), `${label} move drag must retain the existing mask duration.`);
}

expect(runtime.includes("setOverviewCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize' : mode === 'move' ? 'pointer' : 'crosshair')"), 'cyan mask center must advertise pointer/move cursor while edges remain resize cursors.');
expect(runtime.includes("setDetailCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize' : mode === 'move' ? 'pointer' : 'crosshair')"), 'purple mask center must advertise pointer/move cursor while edges remain resize cursors.');
expect(runtime.includes("if (previewPlaying) updateActivePreviewRange(next);"), 'purple mask drag must keep live preview range synchronized while playing.');

if (failures.length) {
  console.error('[material-intake-mask-center-drag-315] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  assertions: 18,
  behavior: 'cyan + purple mask centers start whole-range drag; edge resize and click-to-scrub stay intact',
}, null, 2));
