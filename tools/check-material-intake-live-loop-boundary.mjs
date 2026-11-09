import { readFileSync } from 'node:fs';

const fail = (message) => {
  console.error(`[material-intake-live-loop-boundary] ${message}`);
  process.exit(1);
};

const read = (path) => readFileSync(path, 'utf8');
const engine = read('src/features/l3lab/materialIntake/LoopPreviewEngine.ts');
const panel = read('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx');
const canvasRuntime = read('src/features/l3lab/materialIntake/materialIntakePanel/useMaterialIntakeCanvasRuntime.ts');
const controller = read('src/features/l3lab/materialIntake/useMaterialIntakeController.ts');

const expect = (condition, message) => {
  if (!condition) fail(message);
};

expect(engine.includes('updateLoopRangeLive(range: TimeRange)'), 'LoopPreviewEngine must expose live range updates instead of only stop/play restarts.');
expect(engine.includes('node.loopStart = safeRange.startSec') && engine.includes('node.loopEnd = safeEndSec'), 'LoopPreviewEngine must run the full source with mutable loopStart/loopEnd.');
expect(engine.includes('buffer.copyToChannel(Float32Array.from(source.monoSamples), 0, 0)'), 'LoopPreviewEngine must not slice the visible loop into a frozen playback buffer.');
expect(!engine.includes('Float32Array.from(source.monoSamples.subarray(startSample'), 'LoopPreviewEngine must not freeze the active loop into a sliced buffer.');
expect(controller.includes('const updateActivePreviewRange = useCallback'), 'controller must expose updateActivePreviewRange.');
expect(controller.includes('loopPreviewEngine.updateLoopRangeLive(range)'), 'controller live update must call updateLoopRangeLive.');
expect(panel.includes('useMaterialIntakeCanvasRuntime'), 'panel must delegate canvas/pointer lifecycle to the canvas runtime owner.');
expect(canvasRuntime.includes('if (previewPlaying) updateActivePreviewRange(next);'), 'detail drag must live-update the active preview range.');
expect(!canvasRuntime.includes('if (previewPlaying) void restartPreviewWithRange(next);'), 'detail drag must not restart preview on every pointermove.');
expect(!canvasRuntime.includes('if (previewPlaying) void restartPreviewWithRange(selection.fineLoopRange);'), 'detail drag start must not restart from the old snapshot.');
expect(canvasRuntime.includes("setDetailCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize'"), 'detail zipfel cursor must remain ew-resize.');
expect(canvasRuntime.includes("setOverviewCursor(mode === 'resize-start' || mode === 'resize-end' ? 'ew-resize'"), 'overview zipfel cursor must remain ew-resize.');
expect(canvasRuntime.includes('void scrubPreviewAt(pointSec, selection.fineLoopRange);'), 'middle-zone detail click must still scrub/seek without moving zipfel.');
expect(canvasRuntime.includes('void scrubPreviewAt(pointSec);'), 'middle-zone overview click must still scrub/seek.');

console.log('[material-intake-live-loop-boundary] ok');
