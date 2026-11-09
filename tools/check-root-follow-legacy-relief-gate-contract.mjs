import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireText = (label, text, needle) => {
  if (!text.includes(needle)) {
    throw new Error(`${label} is missing required marker: ${needle}`);
  }
};
const forbidText = (label, text, needle) => {
  if (text.includes(needle)) {
    throw new Error(`${label} still contains local/duplicated marker: ${needle}`);
  }
};

const contract = read('src/features/xensonar/rootFollow/rootFollowLegacyReliefGateContract.ts');
const renderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const forensics = read('src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const options = read('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts');

requireText('contract', contract, "export type RootFollowLegacyReliefGate");
requireText('contract', contract, "'stable-lane-primary-audition'");
requireText('contract', contract, 'resolveRootFollowLegacyReliefGate(');
requireText('contract', contract, 'resolveRootFollowLegacyReliefGateNote(');
requireText('contract', contract, 'normalizeRootFollowLegacyReliefGate(');

requireText('renderer', renderer, "from './rootFollowLegacyReliefGateContract'");
requireText('renderer', renderer, 'resolveRootFollowLegacyReliefGate({');
forbidText('renderer', renderer, 'function resolveStableLaneReliefGate');
forbidText('renderer', renderer, 'type RootFollowLegacyReliefGate =');

requireText('forensics', forensics, "from '../rootFollow/rootFollowLegacyReliefGateContract'");
forbidText('forensics', forensics, 'function isRootFollowLegacyReliefGate(value: string | null)');
forbidText('forensics', forensics, "export type RootFollowLegacyReliefGate =");

requireText('panel', panel, 'from "../rootFollowVoiceEngineOptions"');
requireText('panel', panel, 'normalizeRootFollowLegacyReliefGate(');
requireText('panel', panel, 'resolveRootFollowLegacyReliefGateNote(');
forbidText('panel', panel, 'function formatLegacyReliefGateLabel');
forbidText('panel', panel, 'function resolveLegacyReliefGateNote');
forbidText('panel', panel, 'const ROOT_FOLLOW_VOICE_ENGINE_OPTIONS: readonly');

requireText('options', options, 'ROOT_FOLLOW_VOICE_ENGINE_OPTIONS');
requireText('options', options, "'worklet-stable-lane-primary-audition'");

console.log('Root-Follow legacy relief gate contract is centralized and panel options are outside the UI monolith.');
