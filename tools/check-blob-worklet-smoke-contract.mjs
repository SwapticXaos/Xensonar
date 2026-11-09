#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function expect(condition, message) {
  if (!condition) {
    console.error(`[xensonar:check-blob-worklet-smoke-contract] ${message}`);
    process.exit(1);
  }
}

const modulePath = 'src/core/audio/xensonarBlobWorkletSmokeTest.ts';
expect(fs.existsSync(modulePath), 'missing Blob Worklet smoke-test module');
const moduleSource = read(modulePath);
const app = read('src/App.tsx');

expect(moduleSource.includes('xensonar-blob-worklet-smoke-probe'), 'missing stable smoke processor name');
expect(moduleSource.includes('new Blob([BLOB_WORKLET_SMOKE_CODE]'), 'smoke test does not build a Blob URL module');
expect(moduleSource.includes('ctx.audioWorklet.addModule(url)'), 'smoke test does not load through audioWorklet.addModule(url)');
expect(moduleSource.includes('new AudioWorkletNode(ctx, PROCESSOR_NAME'), 'smoke test does not instantiate an AudioWorkletNode');
expect(moduleSource.includes('zeroGain.gain.value = 0'), 'smoke node must be routed through a zero-gain safety node');
expect(moduleSource.includes('cleanupProbe(node, zeroGain)'), 'smoke node must clean up after probing');
expect(moduleSource.includes('__XENSONAR_BLOB_WORKLET_SMOKE__'), 'smoke status must be inspectable from the browser console/toolkit');
expect(moduleSource.includes('isLocalFileOriginContext'), 'smoke test must guard local file:// origin before creating Blob URLs');
expect(moduleSource.includes("file-origin-blocks-blob-worklet"), 'local file:// Blob Worklet block must be reported as unsupported, not failed');
expect(moduleSource.includes("status: 'unsupported'"), 'unsupported browsers must degrade without breaking Legacy audio');
expect(moduleSource.includes("status: 'failed'"), 'failed loader state must be captured explicitly');
expect(app.includes('ensureXensonarBlobWorkletSmokeTest(ctx)'), 'App warmup does not request the silent Blob Worklet smoke test');
expect(!app.includes('new AudioWorkletNode(ctx, "xensonar-granular"'), 'patch must not introduce a Root-Follow Worklet replacement');
expect(!app.includes('new AudioWorkletNode(ctx, "xensonar-polysynth"'), 'patch must not introduce a Particle/Resident Worklet replacement');

console.log('[xensonar:check-blob-worklet-smoke-contract] OK');
