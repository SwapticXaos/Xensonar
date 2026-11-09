#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];

const registryPath = 'src/features/xensonar/rootFollow/rootFollowAudioNodeRegistry.ts';
const activeVoicePath = 'src/features/xensonar/rootFollow/rootFollowActiveVoiceRuntime.ts';
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts';
const bodyPath = 'src/features/xensonar/rootFollow/rootFollowDirectNoteRenderBody.ts';
const formantPath = 'src/features/xensonar/rootFollow/rootFollowFormantRenderer.ts';
const materialPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const appPath = 'src/App.tsx';

if (!exists(registryPath)) failures.push(`${registryPath} missing`);

const registry = exists(registryPath) ? read(registryPath) : '';
const activeVoice = exists(activeVoicePath) ? read(activeVoicePath) : '';
const renderer = exists(rendererPath) ? read(rendererPath) : '';
const body = exists(bodyPath) ? read(bodyPath) : '';
const formant = exists(formantPath) ? read(formantPath) : '';
const material = exists(materialPath) ? read(materialPath) : '';
const app = exists(appPath) ? read(appPath) : '';

const mustContain = [
  [registry, 'export type RootFollowAudioNodeRegistrar', 'registry must export the direct-note audio node registrar type'],
  [registry, 'export function registerRootFollowScheduledSourceNode', 'registry must expose scheduled-source onended cleanup primitive'],
  [registry, 'export function registerRootFollowScheduledSourceNodeWithFallback', 'registry must expose source cleanup with fallback for Materialspur slices'],
  [registry, 'export function registerRootFollowTimedAudioNode', 'registry must expose timed node cleanup primitive'],
  [registry, 'export function registerRootFollowDirectAudioNode', 'registry must expose direct-note node policy'],
  [registry, 'export function registerRootFollowFormantAudioNode', 'registry must expose formant node policy'],
  [registry, 'export function makeRootFollowMaterialAudioNodeRegistrar', 'registry must expose Materialspur node registrar factory'],
  [registry, 'export function makeRootFollowAudioNodeRegistrar', 'registry must expose direct-note registrar factory'],
  [registry, 'node instanceof AudioScheduledSourceNode', 'registry must own scheduled-source detection'],
  [registry, 'node instanceof GainNode', 'registry must preserve direct gain-node cleanup branch'],
  [registry, 'node instanceof StereoPannerNode', 'registry must preserve direct panner cleanup branch'],
  [registry, 'node instanceof BiquadFilterNode', 'registry must preserve direct filter cleanup branch'],
  [registry, 'window.clearTimeout(fallbackCleanupRef.current)', 'registry must preserve Materialspur fallback timer clearing'],
  [renderer, 'from "./rootFollowAudioNodeRegistry"', 'renderer must import direct registrar from registry'],
  [body, 'from \'./rootFollowAudioNodeRegistry\'', 'direct-note body must import registrar type from registry'],
  [formant, 'registerRootFollowFormantAudioNode', 'formant renderer must delegate node registration to registry'],
  [material, 'makeRootFollowMaterialAudioNodeRegistrar', 'material renderer must delegate node registration to registry'],
  [material, 'getCleanupDelayMs: () => scheduledGainCleanupMs', 'material renderer must preserve dynamic cleanup-delay capture'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenActiveVoiceNeedles = [
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
for (const needle of forbiddenActiveVoiceNeedles) {
  if (activeVoice.includes(needle)) failures.push(`active voice runtime still owns audio node registry detail: ${needle}`);
}

const forbiddenLocalRegisterPatterns = [
  [formant, /function\s+registerNode\s*\([\s\S]*activeNodesRef\.current\.add/, 'formant renderer still has local activeNodesRef registration body'],
  [material, /const\s+registerNode\s*=\s*\(node:\s*AudioNode\)[\s\S]*activeNodesRef\.current\.add/, 'material renderer still has local activeNodesRef registration body'],
  [renderer, /activeNodesRef\.current\.add/, 'synth renderer still directly registers active nodes'],
  [body, /activeNodesRef\.current\.add/, 'direct-note render body still directly registers active nodes'],
];
for (const [content, pattern, message] of forbiddenLocalRegisterPatterns) {
  if (pattern.test(content)) failures.push(message);
}

const forbiddenRegistryNeedles = [
  'scheduleRootFollowSynthWindow',
  'scheduleRootFollowSampleDirectBody',
  'scheduleRootFollowOscillatorDirectBody',
  'scheduleRootFollowMaterialWindow',
  'scheduleRootFollowFormantWindow',
  'ctx.createOscillator()',
  'ctx.createBufferSource()',
  'osc.start(',
  'source.start(',
  'markAudioTrafficEvent',
  'recordAudioPressure',
  'useState(',
  'useEffect(',
  'useRef(',
];
for (const needle of forbiddenRegistryNeedles) {
  if (registry.includes(needle)) failures.push(`registry owns non-registry detail: ${needle}`);
}

if (app.includes('rootFollowAudioNodeRegistry')) {
  failures.push('App.tsx must not import rootFollowAudioNodeRegistry directly');
}

if (failures.length) {
  console.error('[root-follow-audio-node-registry-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[root-follow-audio-node-registry-boundary] OK');
