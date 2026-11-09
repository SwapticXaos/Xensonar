#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
const lifecyclePath = path.join(root, 'src', 'features', 'xensonar', 'audio', 'scheduledToneLifecycle.ts');
const playbackPath = path.join(root, 'src', 'features', 'xensonar', 'audio', 'waveStarterGradientTonePlayback.ts');
const scheduledPlaybackPath = path.join(root, 'src', 'features', 'xensonar', 'audio', 'scheduledTonePlaybackBoundary.ts');
const app = fs.readFileSync(appPath, 'utf8');
const lifecycle = fs.readFileSync(lifecyclePath, 'utf8');
const playback = fs.readFileSync(playbackPath, 'utf8');
const scheduledPlayback = fs.existsSync(scheduledPlaybackPath) ? fs.readFileSync(scheduledPlaybackPath, 'utf8') : '';

const failures = [];
const mustContain = [
  [lifecycle, 'export function registerScheduledToneLifecycle', 'scheduled tone lifecycle registrar missing'],
  [lifecycle, 'export function disconnectScheduledToneNodes', 'scheduled tone node disconnect helper missing'],
  [lifecycle, 'activeScheduledTonesRef.current.push(activeTone)', 'active tone registration must live in lifecycle helper'],
  [lifecycle, 'transientRuntime.releaseVoice(activeTone.ticket)', 'transient release must live in lifecycle cleanup'],
  [scheduledPlayback, 'registerScheduledToneLifecycle({', 'scheduled tone playback boundary must use lifecycle registrar'],
  [scheduledPlayback, 'disconnectScheduledToneNodes(osc, filter, gain)', 'scheduled tone playback boundary should use disconnect helper'],
  [playback, 'disconnect: () => disconnectWaveStarterGradientToneGraph(gradientGraph)', 'wave gradient cleanup must be registered via lifecycle helper'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const legacyCleanupFragments = [
  'activeScheduledTonesRef.current.push(activeTone);',
  'activeScheduledTonesRef.current = activeScheduledTonesRef.current.filter((entry) => entry !== activeTone);',
  'transientRuntimeRef.current.releaseVoice(ticket);\n        disconnectWaveStarterGradientToneGraph(gradientGraph);',
];

for (const fragment of legacyCleanupFragments) {
  if (app.includes(fragment)) failures.push(`App.tsx still owns scheduled tone lifecycle detail: ${fragment}`);
}

const registrarUses = (scheduledPlayback.match(/registerScheduledToneLifecycle\(\{/g)?.length ?? 0) + (playback.match(/registerScheduledToneLifecycle\(\{/g)?.length ?? 0);
if (registrarUses < 2) failures.push(`expected at least two scheduled tone lifecycle registrar uses across scheduled/playback boundaries, found ${registrarUses}`);

if (failures.length) {
  console.error('[scheduled-tone-lifecycle-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[scheduled-tone-lifecycle-boundary] OK');
