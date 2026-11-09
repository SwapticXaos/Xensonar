#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assertIncludes(file, needle, label) {
  if (!file.includes(needle)) {
    console.error(`[room3-topology-actions-boundary] missing: ${label}`);
    process.exit(1);
  }
}
function assertNotIncludes(file, needle, label) {
  if (file.includes(needle)) {
    console.error(`[room3-topology-actions-boundary] forbidden: ${label}`);
    process.exit(1);
  }
}

const app = read('src/App.tsx');
const boundary = read('src/features/xensonar/room3/room3TopologyActions.ts');

assertIncludes(app, 'buildRoom3TopologyActions({', 'App.tsx delegates Myzel topology actions to Room III boundary');
assertIncludes(app, 'const { resetMyzelTopologyNodes, setMyzelModeAndPower, toggleMyzelEnabled } = room3TopologyActions;', 'App.tsx receives named action seam');
assertNotIncludes(app, 'const resetMyzelTopologyNodes = () => {', 'reset action must not be inline in App.tsx');
assertNotIncludes(app, 'const setMyzelModeAndPower = (mode:', 'mode/power action must not be inline in App.tsx');
assertNotIncludes(app, 'const toggleMyzelEnabled = () => {', 'power toggle action must not be inline in App.tsx');
assertNotIncludes(app, 'createInitialMyzelTopologyNodes(220, TOPO_WIDTH, TOPO_HEIGHT)', 'node reset construction must stay out of App.tsx');
assertNotIncludes(app, 'applyResidentModeMask(topologyRefs.current.nodes', 'resident mode reset mask must stay out of App.tsx');

assertIncludes(boundary, 'export function buildRoom3TopologyActions', 'Room III topology action boundary exported');
assertIncludes(boundary, 'createInitialMyzelTopologyNodes', 'reset keeps the original topology node construction');
assertIncludes(boundary, 'applyResidentModeMask', 'reset keeps the resident mode mask');
assertIncludes(boundary, 'DEFAULT_INSTALLATION_FIELD_CONFIG', 'installation mode still resets field config');
assertIncludes(boundary, "setMyzelPattern('choir')", 'installation mode still sets choir pattern');
assertIncludes(boundary, "setMyzelPostFxEnabled(false)", 'installation mode still disables Myzel post-FX');
assertIncludes(boundary, "setMyzelPostFxEnabled(true)", 'enhancer mode still enables Myzel post-FX');
assertIncludes(boundary, 'warmMyzelAudioRuntime();', 'activation still goes through the warmup callback without importing audio readiness into this boundary');
assertNotIncludes(boundary, 'ensureAudioReady', 'Room III action boundary must not own audio-unlock mechanics');
assertNotIncludes(boundary, 'prewarmAudioRuntime', 'Room III action boundary must not own audio prewarm mechanics');

console.log('[room3-topology-actions-boundary] ok');
