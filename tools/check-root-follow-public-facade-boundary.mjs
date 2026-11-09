#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const facadePath = 'src/features/xensonar/rootFollow/rootFollowSynthFacade.ts';
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts';
const audioEnginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const materialPlaybackPath = 'src/features/xensonar/material/useRootFollowLoopPlayback.ts';

if (!exists(facadePath)) failures.push(`${facadePath} missing`);
if (!exists(rendererPath)) failures.push(`${rendererPath} missing`);

const facade = exists(facadePath) ? read(facadePath) : '';
const renderer = exists(rendererPath) ? read(rendererPath) : '';
const audioEngine = exists(audioEnginePath) ? read(audioEnginePath) : '';
const materialPlayback = exists(materialPlaybackPath) ? read(materialPlaybackPath) : '';
const app = exists('src/App.tsx') ? read('src/App.tsx') : '';

const mustContain = [
  [facade, 'from "./rootFollowRendererTypes"', 'facade must expose renderer argument/result types from the stable type module'],
  [facade, 'from "./rootFollowSynthRenderer"', 'facade must be the only public wrapper around the synth renderer'],
  [facade, 'scheduleRootFollowSynthWindowInternal', 'facade must alias the internal renderer entrypoint'],
  [facade, 'export async function scheduleRootFollowSynthWindow', 'facade must export the public synth-window scheduler'],
  [facade, 'return scheduleRootFollowSynthWindowInternal(args)', 'facade must remain a no-policy pass-through wrapper'],
  [renderer, 'export async function scheduleRootFollowSynthWindow', 'renderer must keep the internal implementation export for the facade'],
  [audioEngine, 'rootFollowSynthFacade', 'SpectralForge AudioEngine must import through the public facade'],
  [materialPlayback, 'rootFollowSynthFacade', 'Material Root-Follow playback must import through the public facade'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenFacadeNeedles = [
  'ctx.createOscillator',
  'ctx.createBufferSource',
  'coordinateRootFollowSynthWindow',
  'resolveRootFollowDirectNoteRenderPlan',
  'scheduleRootFollowSampleDirectBody',
  'scheduleRootFollowOscillatorDirectBody',
  'buildRootFollowDirectEventWindow',
  'retuneRootFollowActiveSynthVoices',
  'useState(',
  'useEffect(',
  'useRef(',
];
for (const needle of forbiddenFacadeNeedles) {
  if (facade.includes(needle)) failures.push(`facade contains implementation detail: ${needle}`);
}

if (app.includes('rootFollowSynthRenderer') || app.includes('rootFollowSynthFacade')) {
  failures.push('App.tsx should not import Root-Follow synth renderer/facade directly');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(rel, files);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      files.push(rel.replaceAll('\\\\', '/'));
    }
  }
  return files;
}

const sourceFiles = walk('src');
const directRendererImporters = [];
for (const file of sourceFiles) {
  if (file === facadePath || file === rendererPath) continue;
  const content = read(file);
  if (/from\s+['"][^'"]*rootFollowSynthRenderer['"]/.test(content) || /import\([^)]*rootFollowSynthRenderer/.test(content)) {
    directRendererImporters.push(file);
  }
}
if (directRendererImporters.length) {
  failures.push(`rootFollowSynthRenderer is still imported directly outside its facade: ${directRendererImporters.join(', ')}`);
}

const facadeImporters = [];
for (const file of sourceFiles) {
  if (file === facadePath) continue;
  const content = read(file);
  if (/from\s+['"][^'"]*rootFollowSynthFacade['"]/.test(content) || /import\([^)]*rootFollowSynthFacade/.test(content)) {
    facadeImporters.push(file);
  }
}
for (const expected of [audioEnginePath, materialPlaybackPath]) {
  if (!facadeImporters.includes(expected)) failures.push(`${expected} must import Root-Follow synth through facade`);
}

if (failures.length) {
  console.error('[root-follow-public-facade-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[root-follow-public-facade-boundary] OK');
