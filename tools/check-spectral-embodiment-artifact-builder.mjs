import fs from 'node:fs';

const requiredFiles = [
  'src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts',
  'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[spectral-embodiment-artifact-builder] missing ${file}`);
    process.exit(1);
  }
}

const builder = fs.readFileSync(requiredFiles[0], 'utf8');
const room = fs.readFileSync(requiredFiles[1], 'utf8');

const requiredBuilderExports = [
  'export function buildSpectralEmbodimentArtifacts',
  'export function buildSpectralEmbodimentMaterialExportMeta',
  'export function buildSpectralEmbodimentSourceSignature',
  'type SpectralEmbodimentArtifacts',
  'rootFollowConfig',
  'rootFollowPlan',
  'buildCarrierDonorV2ValidationReport',
  'buildSpectralForgeV2RootFollowEntryConfig',
];

for (const token of requiredBuilderExports) {
  if (!builder.includes(token)) {
    console.error(`[spectral-embodiment-artifact-builder] builder missing token: ${token}`);
    process.exit(1);
  }
}

const forbiddenBuilderTokens = [
  'carrierDonorLab',
  'donorSourceAsset',
  'window.dispatchEvent',
  'registerMaterialExport',
  'audioEngine.',
  'playCarrierDonorV2Preview',
  'setEmbodiment',
];

for (const token of forbiddenBuilderTokens) {
  if (builder.includes(token)) {
    console.error(`[spectral-embodiment-artifact-builder] builder must stay side-effect free / main-path clean, found: ${token}`);
    process.exit(1);
  }
}

const forbiddenRoomDirectBuilders = [
  'buildCarrierDonorV2ValidationReport',
  'buildCarrierDonorV2LoopMetadata',
  'analyzeCarrierDonorV2AudioBuffer',
  'buildSpectralForgeV2RootFollowEntryConfig',
  'buildCarrierFieldCoverageContract',
];

for (const token of forbiddenRoomDirectBuilders) {
  const importPattern = new RegExp(`import\\s*(?:\\{[^}]*${token}[^}]*\\}|${token})`);
  if (importPattern.test(room)) {
    console.error(`[spectral-embodiment-artifact-builder] SpectralForgeRoom should use artifact builder instead of importing ${token}`);
    process.exit(1);
  }
}

const requiredRoomTokens = [
  "from './embodiment/buildSpectralEmbodimentArtifacts'",
  'buildSpectralEmbodimentArtifacts({',
  'buildSpectralEmbodimentMaterialExportMeta({',
  'buildSpectralEmbodimentSourceSignature({',
];

for (const token of requiredRoomTokens) {
  if (!room.includes(token)) {
    console.error(`[spectral-embodiment-artifact-builder] SpectralForgeRoom missing token: ${token}`);
    process.exit(1);
  }
}

console.log('[spectral-embodiment-artifact-builder] OK');
