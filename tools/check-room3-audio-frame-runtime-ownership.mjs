#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const wrapperPath = 'src/features/xensonar/room3/useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary.ts';
const nodePath = 'src/features/xensonar/room3/useRoom3NodeDeviceAudioFrameRuntime.ts';
const legacyPath = 'src/features/xensonar/room3/useRoom3LegacyTopologyAudioFrameRuntime.ts';
const typesPath = 'src/features/xensonar/room3/room3NodeDeviceLegacyAudioRuntimeTypes.ts';
const wrapper = read(wrapperPath);
const node = read(nodePath);
const legacy = read(legacyPath);
const types = read(typesPath);
const count = (source, needle) => source.split(needle).length - 1;
const failures = [];
const requireCheck = (ok, message) => { if (!ok) failures.push(message); };

requireCheck(wrapper.split(/\r?\n/).length <= 20, 'wrapper must stay a thin composition owner');
requireCheck(count(wrapper, 'requestAnimationFrame(') === 0, 'wrapper must not own RAF');
requireCheck(wrapper.includes('useRoom3NodeDeviceAudioFrameRuntime(args);'), 'wrapper must mount node-device frame owner first');
requireCheck(wrapper.includes('useRoom3LegacyTopologyAudioFrameRuntime(args);'), 'wrapper must mount legacy topology frame owner second');
requireCheck(count(node, 'useEffect(') === 1, 'node-device runtime must own exactly one effect');
requireCheck(count(node, 'requestAnimationFrame(') === 2 && count(node, 'cancelAnimationFrame(') === 1, 'node-device runtime must own one self-scheduling RAF loop');
requireCheck(node.includes('updateRoom3NodeDeviceAudioFrame({'), 'node-device runtime must own node-device frame update');
requireCheck(!node.includes('updateRefactorTopologyLegacyAudio('), 'node-device runtime must not own legacy topology audio');
requireCheck(count(legacy, 'useEffect(') === 1, 'legacy runtime must own exactly one effect');
requireCheck(count(legacy, 'requestAnimationFrame(') === 2 && count(legacy, 'cancelAnimationFrame(') === 1, 'legacy runtime must own one self-scheduling RAF loop');
requireCheck(legacy.includes('ensureRefactorTopologyLegacyAudio(') && legacy.includes('updateRefactorTopologyLegacyAudio('), 'legacy runtime must own legacy topology graph/frame calls');
requireCheck(!legacy.includes('updateRoom3NodeDeviceAudioFrame('), 'legacy runtime must not own node-device frame update');
requireCheck(types.includes('export type Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs'), 'shared runtime contract must remain explicit');

if (failures.length) {
  console.error('[xensonar][check-room3-audio-frame-runtime-ownership] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  wrapperLines: wrapper.split(/\r?\n/).length,
  nodeDeviceLines: node.split(/\r?\n/).length,
  legacyLines: legacy.split(/\r?\n/).length,
  contract: 'one node-device RAF owner + one legacy-topology RAF owner behind unchanged wrapper API',
}, null, 2));
