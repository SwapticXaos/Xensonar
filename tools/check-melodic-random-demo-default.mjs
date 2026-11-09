#!/usr/bin/env node
import fs from 'node:fs';

const room = fs.readFileSync('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx', 'utf8');
const library = fs.readFileSync('src/features/l3lab/canonicalForge/melodicProjectLibrary.ts', 'utf8');

const checks = {
  hasRandomDemoConstants: library.includes('RANDOM_DEMO_MELODIC_PROJECT_ID') && library.includes('Random Demo Preset'),
  builtInUsesRandomDemoComposer: library.includes('createRandomDemoMelodicComposer(bars)'),
  initialComposerUsesRandomDemo: room.includes('createRandomDemoMelodicComposer('),
  selectedProjectDefaultsToRandomDemo: room.includes('RANDOM_DEMO_MELODIC_PROJECT_ID'),
  initialComposerNoLongerUsesImplicitJazzDemo: !room.includes(': buildLoopComposerDemoState('),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);
