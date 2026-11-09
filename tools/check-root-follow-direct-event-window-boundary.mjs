#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts';
const boundaryPath = 'src/features/xensonar/rootFollow/rootFollowDirectEventWindow.ts';
const bodyPath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody.ts';
const sampleBodyPath = 'src/features/xensonar/rootFollow/rootFollowSampleVoiceRuntime.ts';
const resolvePath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteResolve.ts';
const coordinatorPath = 'src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts';
const renderer = read(rendererPath);
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const body = exists(bodyPath) ? read(bodyPath) : '';
const sampleBody = exists(sampleBodyPath) ? read(sampleBodyPath) : '';
const resolve = exists(resolvePath) ? read(resolvePath) : '';
const coordinator = exists(coordinatorPath) ? read(coordinatorPath) : '';
const app = read('src/App.tsx');
const failures = [];

if (!exists(boundaryPath)) failures.push(`${boundaryPath} missing`);
if (!exists(bodyPath)) failures.push(`${bodyPath} missing`);
if (!exists(sampleBodyPath)) failures.push(`${sampleBodyPath} missing`);

const mustContain = [
  [boundary, 'export type RootFollowDirectTrafficProfile', 'traffic-profile type export missing'],
  [boundary, 'export type RootFollowDirectEventWindowEvent', 'direct-event-window event type export missing'],
  [boundary, 'export type RootFollowDirectEventWindowPlan', 'direct-event-window plan type export missing'],
  [boundary, 'export function isRootFollowSpectralForgeV2SupernoteConfig', 'V2 supernote traffic detector must live in boundary'],
  [boundary, 'export function rootFollowDirectTrafficOrder', 'direct traffic ordering must live in boundary'],
  [boundary, 'export function resolveRootFollowDirectTrafficSmoothing', 'direct traffic smoothing must live in boundary'],
  [boundary, 'function repetitionRatio', 'repetition-ratio helper must live in boundary'],
  [boundary, 'function assignRootFollowDirectTrafficProfiles', 'V2 traffic-profile bucket assignment must live in boundary'],
  [boundary, 'export function buildRootFollowDirectEventWindow', 'direct-event-window builder export missing'],
  [boundary, 'const activeTrackIds = new Set(pattern.activeTrackIds)', 'boundary must own active-track filtering'],
  [boundary, 'const trackMap = new Map(pattern.tracks.map', 'boundary must own track lookup'],
  [boundary, 'const cycleStartIndex', 'boundary must own cycle start planning'],
  [boundary, 'const cycleEndIndex', 'boundary must own cycle end planning'],
  [boundary, 'inferRootFollowSynthRenderSourceKind({', 'boundary must infer render source kind while collecting events'],
  [boundary, 'rootFollowRenderSourceUsesAudioElasticity(renderSourceKind)', 'boundary must distinguish sample-like event windows'],
  [boundary, 'events.sort((a, b) => a.noteStart - b.noteStart', 'boundary must own direct event sorting'],
  [boundary, "kind: 'spectralforge-v2-supernote'", 'boundary must assign V2 traffic profile metadata'],
  [coordinator, `from "./rootFollowDirectEventWindow"`, 'coordinator must import direct-event-window boundary'],
  [coordinator, 'buildRootFollowDirectEventWindow({', 'coordinator must delegate direct event collection'],
  [coordinator, 'directEventWindow.events', 'coordinator must keep boundary-planned events visible to the scheduler'],
  [coordinator, 'kind: "direct-event-window"', 'coordinator must preserve direct-event-window traffic marker'],
  [coordinator, 'scheduleDirectNote({', 'coordinator must keep direct-note scheduling execution'],
  [body, 'ctx.createOscillator()', 'direct-note render body must keep oscillator WebAudio execution'],
  [body, "export { scheduleRootFollowSampleDirectBody } from './rootFollowSampleVoiceRuntime';", 'direct-note render body must delegate sample WebAudio execution to sample voice runtime'],
  [sampleBody, 'ctx.createBufferSource()', 'sample voice runtime must keep sample WebAudio execution'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const mustMatch = [
  [boundary, /for\s*\(let\s+cycleIndex\s*=\s*cycleStartIndex;\s*cycleIndex\s*<=\s*cycleEndIndex;\s*cycleIndex\s*\+=\s*1\)/s, 'boundary must preserve cycle loop shape'],
  [boundary, /if\s*\(sampleLike\)\s*\{\s*if\s*\(renderEnd\s*<=\s*renderStart\s*\+\s*0\.004\)\s*continue;/s, 'boundary must preserve sample-like clipped-window guard'],
  [boundary, /else\s+if\s*\(noteStart\s*<\s*nextSliceStart\s*-\s*0\.0005\s*\|\|\s*noteStart\s*>=\s*horizon\s*\+\s*0\.0005\)\s*\{/s, 'boundary must preserve direct-note horizon guard'],
  [boundary, /const\s+bucket\s*=\s*Math\.round\(event\.noteStart\s*\/\s*0\.006\)/s, 'boundary must preserve V2 onset bucket width'],
  [boundary, /startOffsetSec:\s*Math\.min\(microOffset,\s*Math\.max\(0,\s*noteDuration\s*-\s*0\.04\)\)/s, 'boundary must preserve V2 micro-offset clamp'],
  [coordinator, /const\s+directEventWindow\s*=\s*buildRootFollowDirectEventWindow\(\{/s, 'coordinator must call event-window builder'],
  [resolve, /resolveRootFollowDirectTrafficSmoothing\([\s\S]*trafficProfile,[\s\S]*noteDuration[\s\S]*\)/s, 'resolve boundary must use direct-event traffic smoothing'],
  [coordinator, /for\s*\(const\s+event\s+of\s+(finalScheduleEvents|pooledScheduleEvents|scheduleEvents)\)\s*\{\s*scheduleDirectNote\(/s, 'coordinator must still execute boundary-derived events via scheduleDirectNote'],
];
for (const [content, pattern, message] of mustMatch) {
  if (!pattern.test(content)) failures.push(message);
}

const forbiddenRendererPatterns = [
  [/type\s+RootFollowDirectTrafficProfile\s*=/, 'renderer still owns direct traffic profile type'],
  [/function\s+isSpectralForgeV2SupernoteConfig\s*\(/, 'renderer still owns V2 traffic detector'],
  [/function\s+directTrafficOrder\s*\(/, 'renderer still owns direct traffic ordering'],
  [/function\s+v2TrafficSmoothing\s*\(/, 'renderer still owns V2 traffic smoothing'],
  [/function\s+repetitionRatio\s*\(/, 'renderer still owns repetition-ratio helper'],
  [/const\s+activeTrackIds\s*=\s*new\s+Set\(pattern\.activeTrackIds\)/, 'renderer still owns active-track set for event collection'],
  [/const\s+trackMap\s*=\s*new\s+Map\(pattern\.tracks\.map/, 'renderer still owns track-map event collection'],
  [/const\s+cycleStartIndex\s*=/, 'renderer still owns direct-event cycle start planning'],
  [/const\s+cycleEndIndex\s*=/, 'renderer still owns direct-event cycle end planning'],
  [/const\s+v2SupernoteTraffic\s*=/, 'renderer still owns V2 traffic switch'],
  [/const\s+onsetBuckets\s*=\s*new\s+Map/, 'renderer still owns onset bucket assignment'],
  [/scheduleEvents\.sort\(/, 'renderer still owns direct event sorting'],
  [/event\.trafficProfile\s*=\s*\{/, 'renderer still assigns traffic profiles'],
];
for (const [pattern, message] of forbiddenRendererPatterns) {
  if (pattern.test(renderer)) failures.push(message);
}

const forbiddenBoundaryNeedles = [
  'scheduleDirectNote',
  'scheduleRootFollowSynthWindow',
  'resolveDirectInstrumentDef',
  'loadMelodicSampleBuffer',
  'ctx.createOscillator',
  'ctx.createBufferSource',
  'ctx.createGain',
  'source.start',
  'source.stop',
  'osc.start',
  'osc.stop',
  'registerNode',
  'recordAudioPressure',
  'safeApplyAttack',
  'safeApplyExponentialRelease',
  'activeSynthVoicesRef',
  'useState(',
  'useEffect(',
  'useRef(',
];
for (const needle of forbiddenBoundaryNeedles) {
  if (boundary.includes(needle)) failures.push(`direct-event-window boundary owns renderer/runtime detail: ${needle}`);
}

if (!renderer.includes(`from "./rootFollowSynthWindowCoordinator"`)) {
  failures.push('renderer must delegate synth-window orchestration to coordinator');
}
if (app.includes('rootFollowDirectEventWindow')) {
  failures.push('App.tsx should not import the direct-event-window boundary directly');
}

if (failures.length) {
  console.error('[root-follow-direct-event-window-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[root-follow-direct-event-window-boundary] OK');
