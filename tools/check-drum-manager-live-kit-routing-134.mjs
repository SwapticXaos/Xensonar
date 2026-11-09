#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transpileTypeScriptGraph } from './typescript-graph-transpiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const requireCheck = (label, value) => { if (!value) failures.push(label); };

const playback = read('src/features/xensonar/groove/groovePlaybackHelpers.ts');
const runner = read('src/features/xensonar/input/appStableRhythmLaneDrumStepRunnerProbe.ts');
const playlist = read('src/features/xensonar/drumPatternPlaylist.ts');
const events = read('src/features/xensonar/drumConfig/drumConfigLibraryEvents.ts');
const controls = read('src/features/xensonar/rooms/grooveBassPanel/DrumManagerControls.tsx');
const routing = read('src/features/xensonar/groove/drumKitRouting.ts');

requireCheck('exported playback accepts runtimeGlobalKit', playback.includes('runtimeGlobalKit: DrumKit'));
requireCheck('exported playback resolves trigger kit from live palette', playback.includes('globalKit: runtimeGlobalKit, overrides: laneKitOverrides'));
requireCheck('stable rhythm runner forwards current drum kit', runner.includes('runtimeGlobalKit: drumValues.drumKit'));
requireCheck('playlist selection hydrates canonical sound palette', playlist.includes('buildDrumSoundPalette({ drumKit: entry.drumKit, laneKitOverrides: entry.laneKitOverrides })'));
requireCheck('config selection hydrates canonical sound palette', read('src/features/xensonar/drumConfigUiHelpers.ts').includes('...buildDrumSoundPalette({ drumKit: entry.drumKit, laneKitOverrides: entry.laneKitOverrides })'));
requireCheck('send-request selection hydrates saved palette', events.includes('buildDrumConfigSelectionPatch(entry)'));
requireCheck('fallback selection hydrates saved palette', read('src/features/xensonar/drumConfigUiHelpers.ts').includes('buildDrumConfigSelectionPatch(fallbackEntry)'));
requireCheck('main-room controls use canonical lane override helper', controls.includes('withDrumLaneKitOverride(drumLaneKitOverrides, laneId, event.target.value)'));
requireCheck('Forge controls and main room can share canonical helper', routing.includes('export function withDrumLaneKitOverride'));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xensonar-drum-routing-134-'));
try {
  const result = transpileTypeScriptGraph({
    root,
    entry: 'tests/runtime/drum-manager-sound-routing-134.test.ts',
    outRoot: tempRoot,
  });
  const compiledTest = path.join(tempRoot, 'tests/runtime/drum-manager-sound-routing-134.test.js');
  const run = spawnSync(process.execPath, ['--test', compiledTest], { encoding: 'utf8' });
  requireCheck('runtime drum routing tests pass', run.status === 0);
  if (run.status !== 0) {
    process.stderr.write(run.stdout || '');
    process.stderr.write(run.stderr || '');
  }
  const summary = {
    ok: failures.length === 0,
    patch: 134,
    transpiledRuntimeFiles: result.files.length,
    checks: 11,
    failures,
  };
  console.log(JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length) process.exit(1);
