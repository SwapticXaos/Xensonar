import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const core = read('src/features/xensonar/rooms/ResonanceControlCorePanel.tsx');
const hook = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts');
const app = read('src/App.tsx');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!panel.includes('Preset folgen'), 'Krisenmanager must not show the vague label "Preset folgen".');
assert(panel.includes('Stilvorlage übernimmt'), 'Non-quantization preset inheritance must be named as a style-template inheritance.');
const modeOptions = panel.match(/const QUANTIZATION_MODE_OPTIONS[\s\S]*?\] as const;/)?.[0] ?? '';
const gridOptions = panel.match(/const QUANTIZATION_GRID_OPTIONS[\s\S]*?\] as const;/)?.[0] ?? '';
assert(!modeOptions.includes('id: "preset"'), 'Quantization mode dropdown must not contain a second hidden preset-following mode.');
assert(!gridOptions.includes('id: "preset"'), 'Quantization grid dropdown must not contain a second hidden preset-following grid.');
assert(panel.includes('Partikel-Zeit unter Druck'), 'Particle crisis quantization must be named as pressure-time behavior, not as a second global quantization.');
assert(panel.includes('data-particle-time-under-pressure="zeit-echo-canonical-grid"'), 'Particle crisis time control must declare it mirrors the Zeit & Echo grid.');
assert(panel.includes('Raster aus Zeit &amp; Echo'), 'Particle crisis time UI must show the canonical Zeit & Echo grid source.');
assert(!panel.includes('title="Partikel-Quantisierung"'), 'Particle crisis manager must not keep the old separate Partikel-Quantisierung control title.');
assert(core.includes('data-particle-quantization-in-time-echo="true"'), 'Main particle quantization grid must live in Zeit & Echo.');
assert(core.includes('Partikel-Raster'), 'Zeit & Echo must show the particle grid label.');
const droneSection = core.split('Drone · Begleitung · Drive')[1]?.split('Drone Rhythmus')[0] ?? '';
assert(!droneSection.includes('Partikel-Raster') && !droneSection.includes('<span>Quantisierung</span>'), 'Drone/Drive section must not own the particle quantization grid.');
assert(hook.includes('useState<CrisisQuantizationModeSelection>("fallback")'), 'Quantization state must default to an explicit fallback mode, not preset-following.');
assert(hook.includes('useState<CrisisQuantizationGridSelection>("16")'), 'Particle quantization grid must default to the visible 16tel particle grid.');
assert(hook.includes('particleQuantizeGrid?: CanonicalParticleQuantizeGrid'), 'Hook must accept the canonical Zeit & Echo particle grid.');
assert(hook.includes('effectiveParticleQuantizationGrid'), 'Runtime policy must receive the canonical effective particle grid.');
assert(app.includes('usePerformanceCrisisUiPolicyState({ particleQuantizeGrid: quantizeGrid })'), 'App must bind particle crisis quantization to the visible Zeit & Echo particle grid.');

console.log(JSON.stringify({
  ok: true,
  guard: 'crisis-quantization-ui-truth-contract',
  contract: {
    quantizationPresetFollowing: 'removed from quantization dropdowns',
    particleGridSource: 'Zeit & Echo',
    particleCrisisControl: 'mode only; grid is canonical mirror',
  },
}, null, 2));
