#!/usr/bin/env node
import fs from 'node:fs';
const fail = (message) => { console.error(`[xensonar][source-intake-args-boundary] ${message}`); process.exit(1); };
const read = (path) => fs.readFileSync(path, 'utf8');
const room = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const builders = read('src/features/l3lab/canonicalForge/canonicalControllerArgBuilders.ts');
if (!room.includes('flattenCanonicalControllerArgGroups<CanonicalSourceIntakeControllerArgs>')) fail('source intake controller must use generic grouped args flattener');
if (!room.includes('createCanonicalSourceIntakeController(flattenCanonicalControllerArgGroups<CanonicalSourceIntakeControllerArgs>({')) fail('source intake controller must be wired through grouped flattener');
for (const group of ['state: {', 'setters: {', 'deps: {']) {
  if (!room.includes(group)) fail(`room must keep grouped source-intake args: ${group}`);
}
if (!builders.includes('export type CanonicalSourceIntakeControllerArgs')) fail('canonical controller arg file must export source intake args type');
if (!builders.includes('export function flattenCanonicalControllerArgGroups')) fail('generic controller args flattener missing');
for (const forbidden of ['AudioContext', 'requestAnimationFrame', 'window.addEventListener', 'prepareAudioSourceAsset', 'buildCanonicalSourceIntakeControllerArgs']) {
  if (builders.includes(forbidden)) fail(`controller arg file must stay thin/generic; found ${forbidden}`);
}
console.log('[xensonar][source-intake-args-boundary] ok');
