import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const requireRegex = (source, regex, message) => {
  if (!regex.test(source)) failures.push(message);
};

const registry = read('src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts');
const rawHandoff = read('src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts');
const execution = read('src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts');
const sendRequest = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSendRequest.ts');
const panel = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const sendSection = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx');
const pkg = JSON.parse(read('package.json'));

requireRegex(
  registry,
  /id: 'strange-attractor-schwarmkoerper',[\s\S]*?targetSupport: \{[\s\S]*?'melodic-pink-export': true,[\s\S]*?validation: true/s,
  'Strange Attractor must expose melodic-pink-export in its registry targetSupport.',
);
requireText(
  rawHandoff,
  '"strange-attractor-schwarmkoerper"',
  'Raw melodic handoff specs must include Strange Attractor.',
);
requireText(
  rawHandoff,
  '"harmonic-xplore-direct-carrier"',
  'Raw melodic handoff specs must preserve HarmonicXplorE.',
);
requireText(
  rawHandoff,
  'kein Pure-Dieter-Fallback',
  'Raw handoff guardrail must explicitly prevent Pure-Dieter fallback.',
);
requireRegex(
  execution,
  /case "raw-spectral-buffer":[\s\S]*?args\.machineId === "harmonic-xplore-direct-carrier"[\s\S]*?renderHarmonicXploreLastHeardRawMaterialBuffer/s,
  'raw-spectral-buffer transfer must render HarmonicXplorE through its direct renderer.',
);
requireRegex(
  execution,
  /case "raw-spectral-buffer":[\s\S]*?args\.machineId === "strange-attractor-schwarmkoerper"[\s\S]*?renderStrangeAttractorLastHeardRawMaterialBuffer/s,
  'raw-spectral-buffer transfer must render Strange Attractor through its swarm renderer.',
);
requireText(
  execution,
  'renderCarrierIntegralHarmonicXploreDirectPreviewBuffer({',
  'HarmonicXplorE last-heard handoff must use the direct preview buffer renderer.',
);
requireText(
  execution,
  'buildStrangeAttractorCarrierPlanFromSpectralData(spectralData',
  'Strange Attractor last-heard handoff must build its attractor plan from the carrier spectral data.',
);
requireText(
  execution,
  'renderStrangeAttractorCarrierPlanToStereoSamples(plan',
  'Strange Attractor last-heard handoff must use the host swarm renderer.',
);
requireText(
  sendRequest,
  'lastPreviewMachine?: CarrierIntegralMachineId | null',
  'Send request flow must accept lastPreviewMachine.',
);
requireRegex(
  sendRequest,
  /args\.targetId === 'melodic-pink-export'[\s\S]*?args\.lastPreviewMachine \?\? args\.currentMachine/s,
  'Melodic pink send must prefer the last-previewed machine over a stale selected machine.',
);
requireText(
  panel,
  'const activeSignalMachine = lastPreviewMachineId ?? selectedMachine;',
  'Panel must derive signal-send machine from lastPreviewMachineId.',
);
requireText(
  panel,
  'lastPreviewMachine: lastPreviewMachineId',
  'Panel must pass lastPreviewMachine into the send request flow.',
);
requireText(
  panel,
  'selectedMachine={activeSignalMachine}',
  'Signal send section must show the active/last-heard machine contract.',
);
requireText(
  sendSection,
  'resolveCarrierIntegralRawMelodicMaterialHandoffSpec(selectedMachine)',
  'Signal section must continue resolving raw-material UI from the active machine.',
);
if (pkg.scripts?.['xensonar:check-carrier-last-heard-raw-melodic-handoff'] !== 'node tools/check-carrier-last-heard-raw-melodic-handoff.mjs') {
  failures.push('package script missing for last-heard raw melodic handoff guard.');
}

if (failures.length > 0) {
  console.error('[carrier-last-heard-raw-melodic-handoff] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[carrier-last-heard-raw-melodic-handoff] OK');
