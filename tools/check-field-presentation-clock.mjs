#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const must = (ok, label) => { if (!ok) failures.push(label); };
const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const types = read('src/features/xensonar/domain/runtimeTypes.ts');
const launch = read('src/features/xensonar/rooms/resonanceWaveLaunchActions.ts');
const clockPath = 'src/features/xensonar/rooms/resonanceFieldPresentationClock.ts';
const clock = fs.existsSync(clockPath) ? read(clockPath) : '';

must(clock.includes('stepFieldWaveDisplayRadius'), 'field presentation clock must export display follower');
must(clock.includes('resolveFieldWaveTruthRadius'), 'field presentation clock must export truth-radius resolver');
must(clock.includes('resolveFieldWaveCatchupGhostRadius'), 'field presentation clock must export catch-up ghost helper');
must(app.includes('resolveFieldWaveTruthRadius'), 'App must read time-locked truth radius');
must(app.includes('stepFieldWaveDisplayRadius'), 'App must render smoothed display radius');
must(app.includes('visualRadius'), 'App must draw visualRadius instead of raw truth radius');
must(!app.includes('resolveTimeLockedWaveRadius'), 'old hard-jump helper must be removed');
must(types.includes('displayRadius?: number;'), 'Nexus wave types must carry displayRadius');
must(types.includes('displayPrevRadius?: number;'), 'Nexus wave types must carry displayPrevRadius');
must(launch.includes('displayRadius: 0'), 'wave launches must initialize displayRadius');
must(launch.includes('timeLocked: true'), 'wave launches must remain time-locked');

if (failures.length) {
  console.error('[field-presentation-clock] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[field-presentation-clock] OK');
console.log(JSON.stringify({
  contract: 'truth-radius + smoothed-display-radius',
  drawing: 'visualRadius',
  oldHardJumpHelperRemoved: true,
}, null, 2));
