#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const runtimePath = 'src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts';
const audioNodeRegistryPath = 'src/features/xensonar/rootFollow/rootFollowAudioNodeRegistry.ts';
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts';
const bodyPath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody.ts';
const coordinatorPath = 'src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts';
const appPath = 'src/App.tsx';
const runtime = exists(runtimePath) ? read(runtimePath) : '';
const audioNodeRegistry = exists(audioNodeRegistryPath) ? read(audioNodeRegistryPath) : '';
const renderer = read(rendererPath);
const body = read(bodyPath);
const coordinator = exists(coordinatorPath) ? read(coordinatorPath) : '';
const app = read(appPath);
const failures = [];

if (!exists(runtimePath)) failures.push(`${runtimePath} missing`);
if (!exists(audioNodeRegistryPath)) failures.push(`${audioNodeRegistryPath} missing`);

const mustContain = [
  [runtime, 'export const ROOT_FOLLOW_RETUNE_CENT_THRESHOLD = 1.5', 'runtime must own retune cent threshold'],
  [audioNodeRegistry, 'export type RootFollowAudioNodeRegistrar', 'audio node registry must export audio node registrar type'],
  [runtime, 'export function cleanupFinishedRootFollowSynthVoices', 'runtime must export finished voice cleanup'],
  [runtime, 'export function retuneRootFollowActiveSynthVoices', 'runtime must export active voice retune'],
  [runtime, 'export function registerRootFollowActiveSynthVoice', 'runtime must export active synth voice registration'],
  [audioNodeRegistry, 'export function registerRootFollowAudioNode', 'audio node registry must export active node registration'],
  [audioNodeRegistry, 'export function makeRootFollowAudioNodeRegistrar', 'audio node registry must export refs-bound node registrar factory'],
  [runtime, 'voice.endTime < now - 0.08', 'runtime must preserve stale voice cleanup horizon'],
  [runtime, 'cancelAndHoldAtTime', 'runtime must preserve cancel-and-hold retune path'],
  [runtime, 'param.setTargetAtTime(targetValue, now, 0.026)', 'runtime must preserve retune smoothing constant'],
  [audioNodeRegistry, 'node instanceof AudioScheduledSourceNode', 'audio node registry must preserve scheduled-source onended cleanup'],
  [audioNodeRegistry, 'node instanceof GainNode', 'audio node registry must preserve gain-node cleanup path'],
  [audioNodeRegistry, 'node instanceof StereoPannerNode', 'audio node registry must preserve panner cleanup path'],
  [audioNodeRegistry, 'node instanceof BiquadFilterNode', 'audio node registry must preserve filter cleanup path'],
  [coordinator, `from "./rootFollowActiveVoiceRuntime"`, 'coordinator must import active voice runtime boundary'],
  [coordinator, 'cleanupFinishedRootFollowSynthVoices({', 'coordinator must delegate stale voice cleanup'],
  [coordinator, 'retuneRootFollowActiveSynthVoices({', 'coordinator must delegate retune pass'],
  [renderer, 'makeRootFollowAudioNodeRegistrar(refs)', 'renderer must delegate active node registration factory'],
  [renderer, 'from "./rootFollowAudioNodeRegistry"', 'renderer must import audio node registrar from registry'],
  [body, 'rootFollowActiveVoiceRuntime', 'render body must import active voice runtime boundary'],
  [body, 'registerRootFollowActiveSynthVoice({', 'render body must delegate active synth voice registration'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenRendererPatterns = [
  [/function\s+cleanupFinishedVoices\s*\(/, 'renderer still owns cleanupFinishedVoices'],
  [/function\s+retuneActiveVoices\s*\(/, 'renderer still owns retuneActiveVoices'],
  [/function\s+registerNode\s*\(/, 'renderer still owns active node registration'],
  [/ROOT_FOLLOW_RETUNE_CENT_THRESHOLD/, 'renderer still owns retune cent threshold'],
  [/cancelAndHoldAtTime/, 'renderer still owns AudioParam retune cancellation detail'],
  [/refs\.activeNodesRef\.current\.add/, 'renderer still directly adds active nodes'],
  [/refs\.activeNodesRef\.current\.delete/, 'renderer still directly deletes active nodes'],
  [/activeSynthVoices\.delete\(/, 'renderer still directly deletes active synth voices'],
  [/activeSynthVoices\.set\(/, 'renderer still directly registers active synth voices'],
];
for (const [pattern, message] of forbiddenRendererPatterns) {
  if (pattern.test(renderer)) failures.push(message);
}

const forbiddenRuntimeNeedles = [
  'scheduleRootFollowSynthWindow',
  'async function scheduleDirectNote',
  'scheduleRootFollowSampleDirectBody',
  'scheduleRootFollowOscillatorDirectBody',
  'resolveRootFollowDirectNoteRenderPlan',
  'buildRootFollowDirectEventWindow',
  'ctx.createOscillator()',
  'ctx.createBufferSource()',
  'source.start(',
  'osc.start(',
  'markAudioTrafficEvent',
  'useState(',
  'useEffect(',
  'useRef(',
];
for (const needle of forbiddenRuntimeNeedles) {
  if (runtime.includes(needle)) failures.push(`active voice runtime owns orchestration/render/UI detail: ${needle}`);
}


const forbiddenActiveVoiceNodeRegistryNeedles = [
  'RootFollowAudioNodeRegistrar',
  'registerRootFollowAudioNode',
  'makeRootFollowAudioNodeRegistrar',
  'activeNodesRef.current.add',
  'activeNodesRef.current.delete',
  'AudioScheduledSourceNode',
  'GainNode',
  'StereoPannerNode',
  'BiquadFilterNode',
];
for (const needle of forbiddenActiveVoiceNodeRegistryNeedles) {
  if (runtime.includes(needle)) failures.push(`active voice runtime still owns audio-node registry detail: ${needle}`);
}

if (body.includes('activeSynthVoices.set(')) {
  failures.push('render body still mutates activeSynthVoices map directly');
}
if (!body.includes('activeSynthVoices,')) {
  failures.push('render body must still pass activeSynthVoices to runtime registration helper');
}
if (!coordinator.includes(`from "./rootFollowActiveVoiceRuntime"`)) {
  failures.push('coordinator must import active voice runtime boundary');
}
if (app.includes('rootFollowActiveVoiceRuntime')) {
  failures.push('App.tsx should not import active voice runtime directly');
}

if (failures.length) {
  console.error('[root-follow-active-voice-runtime-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[root-follow-active-voice-runtime-boundary] OK');
