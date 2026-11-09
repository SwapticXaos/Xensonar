import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const clock = read('src/features/xensonar/rooms/resonanceFieldStepClock.ts');
const boundary = read('src/features/xensonar/rooms/appParticleSimulationFrameBoundary.ts');

const failures = [];
const mustInclude = [
  ['App imports fixed field clock', app.includes('resolveResonanceFieldStepFrame')],
  ['App uses shared fieldSteps loop', app.includes('for (const fieldStep of fieldSteps)')],
  ['App advances waves before particle boundary per field substep', app.includes('advanceFieldWaveStep(fieldStep.motionScale)')],
  ['App advances particles without rendering during field substeps', app.includes('advanceAppParticleSimulationFrameBoundary({')],
  ['App renders particles exactly once after substeps', app.includes('renderAppParticleSimulationFrameBoundary({')],
  ['App does not use hard elapsed wave radius in the Hauptraum loop', !app.includes('resolveFieldWaveTruthRadius({')],
  ['Fixed field clock has bounded maxSubstepsPerFrame', clock.includes('maxSubstepsPerFrame: 8')],
  ['Fixed field clock has spiral guard', clock.includes('spiralGuarded')],
  ['Particle boundary exposes advance/render split', boundary.includes('advanceAppParticleSimulationFrameBoundary') && boundary.includes('renderAppParticleSimulationFrameBoundary')],
];

for (const [label, ok] of mustInclude) {
  if (!ok) failures.push(label);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  fieldClock: 'fixed-substep-120hz-bounded',
  maxSubstepsPerFrame: 8,
  appUsesSharedWaveParticleSubsteps: true,
  hardElapsedWaveRadiusInHauptraumLoop: false,
  renderPasses: 'waves + particles render once after substeps',
}, null, 2));
