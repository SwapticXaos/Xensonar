import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireContains = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};

const contract = read('src/features/xensonar/rootFollow/rootFollowAnchorMode.ts');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const anchorControl = read('src/features/xensonar/rooms/materialLoopPanel/RootFollowAnchorControl.tsx');
const rootFollowPanelSurface = `${panel}\n${anchorControl}`;
const controller = read('src/features/xensonar/material/useRootFollowLoopBankController.ts');
const rootFollowTypes = read('src/features/xensonar/rootFollow/rootFollowTypes.ts');
const pkg = JSON.parse(read('package.json'));

requireContains('anchor contract', contract, "FLEXIBLE: 'flexible'");
requireContains('anchor contract', contract, "FIXED_HZ: 'fixed-hz'");
requireContains('anchor contract', contract, 'export type RootFollowAnchorMode');
requireContains('anchor contract', contract, 'normalizeRootFollowAnchorHz');
requireContains('anchor contract', contract, 'resolveRootFollowAnchorMode');
requireContains('anchor contract', contract, 'rootFollowAnchorModeToRootHz');
requireContains('anchor contract', contract, 'ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP');

requireContains('root follow panel surface', rootFollowPanelSurface, '../rootFollow/rootFollowAnchorMode');
requireContains('root follow panel surface', rootFollowPanelSurface, 'resolveRootFollowAnchorMode(entry?.rootHz ?? null)');
requireContains('root follow panel surface', rootFollowPanelSurface, 'formatRootFollowAnchorMode(anchorMode)');
requireContains('root follow panel surface', rootFollowPanelSurface, 'ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP');
requireContains('root follow panel surface', rootFollowPanelSurface, 'ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS.maxHz');
requireContains('root follow panel', panel, '<RootFollowAnchorControl');
if (rootFollowPanelSurface.includes('function formatAnchorHz(')) failures.push('root follow panel surface still has local formatAnchorHz instead of anchor contract');

requireContains('root follow bank controller', controller, '../rootFollow/rootFollowAnchorMode');
requireContains('root follow bank controller', controller, 'normalizeRootFollowAnchorHz(rootHz)');

const duplicateSynthPatternCount = (rootFollowTypes.match(/synthPattern: null,/g) ?? []).length;
if (duplicateSynthPatternCount !== 2) {
  failures.push(`unexpected synthPattern: null count (${duplicateSynthPatternCount}); expected one material default + one synth default`);
}

if (!pkg.scripts?.['xensonar:check-root-follow-anchor-mode-contract']) {
  failures.push('package.json missing xensonar:check-root-follow-anchor-mode-contract script');
}

if (failures.length) {
  console.error('[check-root-follow-anchor-mode-contract] FAIL');
  for (const failure of failures) console.error('-', failure);
  process.exit(1);
}
console.log('[check-root-follow-anchor-mode-contract] OK');
