#!/usr/bin/env node
import fs from 'node:fs';

const renderConfigPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreRenderConfig.ts';
const directEnginePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts';
const packagePath = 'package.json';

const read = (path) => fs.readFileSync(path, 'utf8');
const renderConfig = read(renderConfigPath);
const directEngine = read(directEnginePath);
const pkg = JSON.parse(read(packagePath));

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(/^3\.2\.91-7\.5\.(149|15[0-9]|16[0-9]|17[0-9])$/.test(pkg.version), 'package version must preserve or advance the 7.5.149+ wave-mix truth line');
assert(renderConfig.includes('export function harmonicXplorePartialToOscillators'), 'render config must export plural oscillator builder');
assert(renderConfig.includes('HARMONIC_XPLORE_WAVE_COMPONENTS'), 'render config must declare explicit wave components');
assert(renderConfig.includes("['sine', 'sine'") && renderConfig.includes("['triangle', 'triangle'") && renderConfig.includes("['sawtooth', 'sawtooth'") && renderConfig.includes("['square', 'square'"), 'all four Synth-Labor waveforms must be represented as components');
assert(renderConfig.includes('partial.waveMix[key]'), 'oscillator builder must read the per-wave percentage from waveMix');
assert(renderConfig.includes('components.reduce((sum, component) => sum + component.oscillator.gain, 0)'), 'component gains must be normalized as a mixture, not winner-take-all');
assert(renderConfig.includes('gain: component.oscillator.gain * (partial.gain / gainSum)'), 'normalized component gains must preserve partial gain energy');
assert(renderConfig.includes('export function harmonicXplorePartialsToOscillators'), 'render config must expose a bounded mixed-bank builder');
assert(renderConfig.includes('maxOscillators = 32'), 'mixed-bank builder must keep an explicit oscillator ceiling');
assert(renderConfig.includes('First pass: keep the harmonic/ratio series intact'), 'mixed-bank builder must preserve the harmonic series before spending budget on secondary colors');
assert(renderConfig.includes('waveMix: partial.waveMix') && renderConfig.includes('dominantType: partial.dominantType'), 'render config hash must include waveMix, not only dominant waveform');
assert(directEngine.includes('harmonicXplorePartialsToOscillators'), 'direct engine must import/use bounded plural oscillator-bank builder');
assert(/harmonicXplorePartialsToOscillators\(\s*config\.partials,\s*32\s*\)/.test(directEngine), 'direct timbre snapshot must build a bounded mixed oscillator bank');
assert(/harmonicXplorePartialsToOscillators\(\s*renderConfig\.partials,\s*32\s*,?\s*\)/.test(directEngine), 'direct preview render must build a bounded mixed oscillator bank');
assert(/["']wave-mix-truth-v1["']/.test(directEngine), 'direct engine key/hash must include wave-mix-truth-v1');
assert(!directEngine.includes('renderConfig.partials.map(harmonicXplorePartialToOscillator)'), 'direct preview must not use dominant-wave-only map path');
assert(!directEngine.includes('flatMap(harmonicXplorePartialToOscillators)'), 'direct engine must not allow unbounded four-wave expansion in the render path');

if (failures.length) {
  console.error('HarmonicXplore wave-mix truth check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('HarmonicXplore wave-mix truth check: OK');
