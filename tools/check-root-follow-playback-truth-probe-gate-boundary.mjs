import { readFileSync } from 'node:fs';

const files = {
  probe: 'src/features/xensonar/rootFollow/rootFollowPlaybackTruthProbe.ts',
  playback: 'src/features/xensonar/material/useRootFollowLoopPlayback.ts',
  runtime: 'src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts',
  materialEvents: 'src/features/xensonar/material/materialLoopLibraryEvents.ts',
  panel: 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx',
};

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertIncludes(path, content, needle) {
  if (!content.includes(needle)) {
    throw new Error(`${path} missing required marker: ${needle}`);
  }
}

for (const [name, path] of Object.entries(files)) {
  read(path);
}

const probe = read(files.probe);
const playback = read(files.playback);
const runtime = read(files.runtime);
const materialEvents = read(files.materialEvents);
const panel = read(files.panel);

assertIncludes(files.probe, probe, '__xensonarReadRootFollowPlaybackTruthProbe');
assertIncludes(files.probe, probe, 'MAX_RECENT_EVENTS = 32');
assertIncludes(files.probe, probe, "'playback-gate-closed'");
assertIncludes(files.probe, probe, "'scheduler-first-tick'");
assertIncludes(files.probe, probe, "'first-render-window'");
assertIncludes(files.probe, probe, 'COLD_START_LEAD_RISK_MS');

assertIncludes(files.playback, playback, 'resolveRootFollowGateCloseReason');
assertIncludes(files.playback, playback, "stage: 'gate-close'");
assertIncludes(files.playback, playback, "stage: 'gate-open'");
assertIncludes(files.playback, playback, "stage: 'scheduler-first-tick'");
assertIncludes(files.playback, playback, "stage: 'first-render-window'");
assertIncludes(files.playback, playback, 'firstRestartLeadFloorSec');
assertIncludes(files.playback, playback, 'Math.max(\n            isSynthDirect ? 0.018');

assertIncludes(files.runtime, runtime, 'rootFollowPreviewActive: boolean');
assertIncludes(files.runtime, runtime, 'rootFollowPlayfieldInside: boolean');
assertIncludes(files.runtime, runtime, 'effectivePlaybackGate: boolean');
assertIncludes(files.runtime, runtime, 'lastStopReason');
assertIncludes(files.runtime, runtime, 'readRootFollowPlaybackTruthProbe');

assertIncludes(files.materialEvents, materialEvents, 'isRootFollowOnlyMaterialLoop');
assertIncludes(files.materialEvents, materialEvents, 'Materialspur-Auswahl bleibt unverändert');

assertIncludes(files.panel, panel, 'Gate {rootFollowHealth.effectivePlaybackGate');
assertIncludes(files.panel, panel, 'Stop {rootFollowHealth.lastStopReason');

// Guard against turning the probe into continuous per-window telemetry.
const recordCalls = (playback.match(/recordRootFollowPlaybackTruthEvent\(/g) ?? []).length;
if (recordCalls > 9) {
  throw new Error(`too many playback truth probe callsites in useRootFollowLoopPlayback.ts: ${recordCalls}`);
}

console.log('[check-root-follow-playback-truth-probe-gate-boundary] PASS');
