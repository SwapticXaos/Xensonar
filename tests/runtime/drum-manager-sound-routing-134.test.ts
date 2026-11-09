import test from 'node:test';
import assert from 'node:assert/strict';
import { patchForDrumPlaylistEntry } from '../../src/features/xensonar/drumPatternPlaylist';
import { resolveDeletedDrumConfigFallback } from '../../src/features/xensonar/drumConfigUiHelpers';
import { scheduleExportedDrumConfigStep } from '../../src/features/xensonar/groove/groovePlaybackHelpers';
import { DEFAULT_DRUM_STYLE, type DrumMachine } from '../../src/features/resonance/drumMachine';
import { buildDrumSoundPalette } from '../../src/features/xensonar/groove/drumKitRouting';
import type { DrumConfigEntry } from '../../src/features/xensonar/drumConfigLibrary';

const entry: DrumConfigEntry = {
  id: 'cfg-134',
  name: 'Routing proof',
  presetSource: 'custom',
  drumKit: 'glass_metal',
  bars: 1,
  segmentsPerBar: 16,
  segmentMarkers: [],
  stepCount: 16,
  laneOrder: ['kick', 'snare', 'hatClosed', 'hatOpen', 'clap', 'perc'],
  laneSteps: {
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: Array(16).fill(0),
    hatClosed: Array(16).fill(0),
    hatOpen: Array(16).fill(0),
    clap: Array(16).fill(0),
    perc: Array(16).fill(0),
  },
  laneKitOverrides: { kick: 'bronze_static' },
  stepPrograms: {
    kick: {
      0: {
        laneId: 'kick',
        stepIndex: 0,
        value: 1,
        microOffsetRatio: 0,
        layers: [{ id: 'primary', active: true, kit: 'paper_spark', levelScale: 1, decayScale: 1, panOffset: 0, gradient: 0 }],
      },
    },
  },
  createdAt: 1,
  updatedAt: 1,
};

function captureTriggeredKit(args: { runtimeGlobalKit: any; laneKitOverrides?: any }) {
  const kits: string[] = [];
  const drumMachine: DrumMachine = {
    trigger: (_voice, _time, _level, kit) => { kits.push(kit); },
    schedulePattern: () => {},
  };
  scheduleExportedDrumConfigStep({
    drumMachine,
    entry,
    stepIndex: 0,
    time: 1,
    stepDurationSec: 0.125,
    drumLevel: 1,
    drumStyle: DEFAULT_DRUM_STYLE,
    runtimeGlobalKit: args.runtimeGlobalKit,
    laneKitOverrides: args.laneKitOverrides,
  });
  assert.equal(kits.length, 1);
  return kits[0];
}

test('134: main-room global kit owns exported-pattern playback when no live lane override is set', () => {
  assert.equal(captureTriggeredKit({ runtimeGlobalKit: 'neon_arc' }), 'neon_arc');
});

test('134: main-room per-lane kit overrides both exported lane and step-layer kits', () => {
  assert.equal(captureTriggeredKit({ runtimeGlobalKit: 'neon_arc', laneKitOverrides: { kick: 'resin_tom' } }), 'resin_tom');
});

test('134: selecting an exported playlist entry hydrates its saved sound palette into live controls', () => {
  const patch = patchForDrumPlaylistEntry({
    id: 'exported:cfg-134',
    kind: 'exported',
    value: 'cfg-134',
    name: 'Routing proof',
    bars: 1,
    drumKit: 'glass_metal',
    laneKitOverrides: { kick: 'bronze_static', snare: 'velvet_breaks' },
  });
  assert.equal(patch.drumConfigMode, 'exported');
  assert.equal(patch.drumConfigId, 'cfg-134');
  assert.equal(patch.drumKit, 'glass_metal');
  assert.deepEqual(patch.drumLaneKits, {
    kick: 'bronze_static',
    snare: 'velvet_breaks',
    hatClosed: undefined,
    hatOpen: undefined,
    clap: undefined,
    perc: undefined,
  });
});


test('134: exported-config fallback selection also hydrates the saved sound palette', () => {
  const nextEntry: DrumConfigEntry = {
    ...entry,
    id: 'cfg-134-next',
    name: 'Routing proof next',
    drumKit: 'neon_arc',
    laneKitOverrides: { kick: 'resin_tom', perc: 'paper_spark' },
  };
  const patch = resolveDeletedDrumConfigFallback({
    deletedId: 'cfg-134',
    currentDrumConfigId: 'cfg-134',
    entries: [nextEntry],
  });
  assert.ok(patch);
  assert.equal(patch.drumConfigMode, 'exported');
  assert.equal(patch.drumConfigId, 'cfg-134-next');
  assert.equal(patch.drumKit, 'neon_arc');
  assert.equal(patch.drumLaneKits?.kick, 'resin_tom');
  assert.equal(patch.drumLaneKits?.perc, 'paper_spark');
});


test('134: sound-palette normalization rejects unknown lane kits instead of leaking strings into audio routing', () => {
  const palette = buildDrumSoundPalette({
    drumKit: 'not-a-real-kit',
    laneKitOverrides: { kick: 'also-not-a-kit', snare: 'velvet_breaks' },
  });
  assert.equal(palette.drumKit, 'dusty_tape');
  assert.equal(palette.drumLaneKits.kick, undefined);
  assert.equal(palette.drumLaneKits.snare, 'velvet_breaks');
});
