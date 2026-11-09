#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const hookPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeWarpProxyState.ts';

const fail = (message) => {
  console.error(`[canonical-forge-warp-proxy-state-boundary] ${message}`);
  process.exit(1);
};

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);
const room = read(roomPath);
const hook = read(hookPath);

if (!room.includes("import { useCanonicalForgeWarpProxyState } from './useCanonicalForgeWarpProxyState';")) {
  fail('CanonicalForgeRoom must import the warp/proxy state boundary hook.');
}

if (!room.includes('useCanonicalForgeWarpProxyState({')) {
  fail('CanonicalForgeRoom must instantiate warp/proxy state through useCanonicalForgeWarpProxyState.');
}

for (const forbidden of [
  'const proxyBaselineSnapshotRef = useRef<Float32Array | null>',
  'const warpTimeColumnsRef = useRef<Float32Array | null>',
  'const warpPitchColumnsRef = useRef<Float32Array | null>',
  'const [warpVersion, setWarpVersion] = useState',
  'const resetWarpFields = () =>',
]) {
  if (room.includes(forbidden)) {
    fail(`CanonicalForgeRoom still owns warp/proxy implementation detail: ${forbidden}`);
  }
}

for (const required of [
  'export function useCanonicalForgeWarpProxyState',
  'proxyBaselineSnapshotRef',
  'warpTimeColumnsRef',
  'warpPitchColumnsRef',
  'warpVersion',
  'setWarpVersion',
  'applyWarpSnapshot',
  'ensureWarpFields',
  'updateProxyBaselineSnapshot',
  'resetWarpFields',
]) {
  if (!hook.includes(required)) {
    fail(`warp/proxy hook is missing required contract: ${required}`);
  }
}

for (const forbidden of [
  'audioEngine',
  'window.addEventListener',
  'document.',
  'createCanonicalMaterialTransferController',
  'loopPreview',
]) {
  if (hook.includes(forbidden)) {
    fail(`warp/proxy hook must stay state-only and lifecycle-local; found: ${forbidden}`);
  }
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1740) {
  fail(`CanonicalForgeRoom exceeds warp/proxy boundary threshold (${roomLines} > 1740).`);
}

console.log(JSON.stringify({ ok: true, roomLines, hookLines: hook.split(/\r?\n/).length }, null, 2));
