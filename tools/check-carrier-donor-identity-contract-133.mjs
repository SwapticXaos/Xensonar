#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const failures = [];
const transpile = (file, fakeRequire = () => ({})) => {
  const source = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const errors = (out.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) failures.push(`${file}: TypeScript transpile diagnostics`);
  const module = { exports: {} };
  new Function('module', 'exports', 'require', out.outputText)(module, module.exports, fakeRequire);
  return module.exports;
};

const trajectoryPath = 'src/features/l3lab/spectralForge/carrierTrajectory/musicalTrajectory.ts';
const backendContractPath = 'src/features/l3lab/spectralForge/donorIdentity/donorIdentityBackend.ts';
const v3BackendPath = 'src/features/l3lab/spectralForge/donorIdentity/donorBodyV3IdentityBackend.ts';
for (const file of [trajectoryPath, backendContractPath, v3BackendPath]) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const trajectoryModule = transpile(trajectoryPath);
const {
  projectionCarrierPlanToMusicalTrajectory,
  musicalTrajectoryToProjectionCarrierPlan,
} = trajectoryModule;
const plan = {
  rootReferenceHz: 110,
  bands: [
    { centerRatioCurve: [1, 1.5, 2], gainCurve: [0.2, 0.7, 0] },
    { centerRatioCurve: [2, 2.25, 2.5], gainCurve: [0, 0.4, 0.8] },
  ],
};
const trajectory = projectionCarrierPlanToMusicalTrajectory(plan);
if (trajectory.version !== 'musical-trajectory-v1' || trajectory.curveDomain !== 'normalized-time') failures.push('trajectory identity/domain drift');
if (trajectory.voices[0].pitchHzCurve.join(',') !== '110,165,220') failures.push(`absolute pitch conversion drift: ${trajectory.voices[0].pitchHzCurve}`);
if (trajectory.voices[1].gainCurve.join(',') !== '0,0.4,0.8') failures.push('trajectory gain/silence semantics drift');
const roundTrip = musicalTrajectoryToProjectionCarrierPlan(trajectory);
if (roundTrip.rootReferenceHz !== 1) failures.push('compatibility adapter must use 1 Hz reference');
for (let voice = 0; voice < plan.bands.length; voice++) {
  for (let i = 0; i < plan.bands[voice].centerRatioCurve.length; i++) {
    const beforeHz = plan.bands[voice].centerRatioCurve[i] * plan.rootReferenceHz;
    const afterHz = roundTrip.bands[voice].centerRatioCurve[i] * roundTrip.rootReferenceHz;
    if (Math.abs(beforeHz - afterHz) > 1e-12) failures.push(`carrier pitch roundtrip drift at voice ${voice}, index ${i}`);
    if (plan.bands[voice].gainCurve[i] !== roundTrip.bands[voice].gainCurve[i]) failures.push(`carrier gain roundtrip drift at voice ${voice}, index ${i}`);
  }
}

// The backend adapter must only translate ownership contracts; it must not invent score/timbre data.
let analysisCall = null;
let renderCall = null;
const fakeModel = { version: 'donor-body-v3', frames: [{}], referenceHz: 110, voicedFrameRatio: 1 };
const v3BackendModule = transpile(v3BackendPath, (id) => {
  if (id.includes('donorBodyModel')) return {
    analyzeDonorBodyV3: async (...args) => { analysisCall = args; return fakeModel; },
  };
  if (id.includes('renderDonorBodyV3')) return {
    donorBodyV3CanRender: (model) => model === fakeModel,
    renderDonorBodyV3: async (...args) => { renderCall = args; return new Float32Array([0.25, -0.25]); },
  };
  if (id.includes('musicalTrajectory')) return trajectoryModule;
  return {};
});
const backend = v3BackendModule.donorBodyV3IdentityBackend;
if (backend.id !== 'donor-body-v3-dsp') failures.push('V3 backend id drift');
if (backend.capabilities.execution !== 'browser-dsp' || !backend.capabilities.carrierOwnsPitch || !backend.capabilities.supportsPolyphony || !backend.capabilities.supportsContinuousPitch) failures.push('V3 capability declaration drift');
const channels = [new Float32Array([0, 1, 0])];
await backend.analyze({ channels, sampleRate: 48000, startSample: 3, sampleLength: 128 });
if (!analysisCall || analysisCall[0] !== channels || analysisCall[1] !== 48000 || analysisCall[2] !== 3 || analysisCall[3] !== 128) failures.push('V3 backend analysis adapter drift');
if (!backend.canRender(fakeModel) || backend.canRender(undefined)) failures.push('V3 backend canRender delegation drift');
const rendered = await backend.render(trajectory, fakeModel, { sampleRate: 44100, durationSec: 1.5, sourceTimeline: false });
if (!(rendered instanceof Float32Array) || rendered.length !== 2) failures.push('V3 backend output delegation drift');
if (!renderCall || renderCall[0]?.rootReferenceHz !== 1 || renderCall[0]?.bands?.[0]?.centerRatioCurve?.[1] !== 165) failures.push('V3 backend carrier trajectory adapter drift');
if (renderCall?.[1] !== fakeModel || renderCall?.[2] !== 44100 || renderCall?.[3] !== 1.5 || renderCall?.[4]?.sourceTimeline !== false) failures.push('V3 backend render options delegation drift');

const contract = fs.readFileSync(backendContractPath, 'utf8');
for (const marker of ['interface DonorIdentityBackend', "execution: 'browser-dsp' | 'browser-neural' | 'remote-neural'", 'carrierOwnsPitch: true', 'MusicalTrajectory']) {
  if (!contract.includes(marker)) failures.push(`backend contract missing ${marker}`);
}

if (failures.length) {
  console.error('[carrier-donor-identity-contract-133] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[carrier-donor-identity-contract-133] PASS');
