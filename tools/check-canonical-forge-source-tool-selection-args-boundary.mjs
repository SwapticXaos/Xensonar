#!/usr/bin/env node
import fs from 'node:fs';
const fail = (message) => { console.error(`[xensonar][source-tool-selection-args-boundary] ${message}`); process.exit(1); };
const read = (path) => fs.readFileSync(path, 'utf8');
const room = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const builders = read('src/features/l3lab/canonicalForge/canonicalControllerArgBuilders.ts');
for (const name of ['CanonicalSourceToolApplyControllerArgs', 'CanonicalSourceSelectionControllerArgs']) {
  if (!builders.includes(`export type ${name}`)) fail(`arg type missing ${name}`);
  if (!room.includes(`flattenCanonicalControllerArgGroups<${name}>`)) fail(`CanonicalForgeRoom must use generic flattener with ${name}`);
}
if (!room.includes('createCanonicalSourceToolApplyController(flattenCanonicalControllerArgGroups<CanonicalSourceToolApplyControllerArgs>({')) fail('tool apply controller must use grouped args flattener');
if (!room.includes('createCanonicalSourceSelectionController(flattenCanonicalControllerArgGroups<CanonicalSourceSelectionControllerArgs>({')) fail('source selection controller must use grouped args flattener');
for (const group of ['state: {', 'refs: {', 'deps: {', 'setters: {', 'actions: {']) {
  if (!room.includes(group)) fail(`expected grouped controller args in room: ${group}`);
}
for (const forbidden of ['AudioContext', 'requestAnimationFrame', 'window.addEventListener', 'prepareAudioSourceAsset', 'buildCanonicalSourceToolApplyControllerArgs', 'buildCanonicalSourceSelectionControllerArgs']) {
  if (builders.includes(forbidden)) fail(`controller arg file must stay thin/generic; found ${forbidden}`);
}
console.log('[xensonar][source-tool-selection-args-boundary] ok');
