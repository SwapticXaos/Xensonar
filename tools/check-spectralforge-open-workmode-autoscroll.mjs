#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roomPath = path.join(root, 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx');
const panelShellPath = path.join(root, 'src/features/l3lab/spectralForge/components/CarrierIntegralPanel.tsx');
const managePanelPath = path.join(root, 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const contractsPath = path.join(root, 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralVerwaltenPanelContracts.ts');

const room = fs.readFileSync(roomPath, 'utf8');
const panelShell = fs.readFileSync(panelShellPath, 'utf8');
const managePanel = fs.readFileSync(managePanelPath, 'utf8');
const contracts = fs.readFileSync(contractsPath, 'utf8');

const failures = [];

for (const [label, text, required] of [
  ['SpectralForgeRoom', room, [
    'const workModeHeaderRef = useRef<HTMLDivElement>(null);',
    'const scrollToWorkModeHeader = () => {',
    'workModeHeaderRef.current?.scrollIntoView({',
    "behavior: 'smooth'",
    "block: 'start'",
    'data-xensonar-spectralforge-workmode-header="true"',
    '<CarrierIntegralPanel onOpenInSpectralForge={scrollToWorkModeHeader} />',
  ]],
  ['CarrierIntegralPanel', panelShell, [
    'onOpenInSpectralForge?: () => void;',
    'export default function CarrierIntegralPanel({ onOpenInSpectralForge }',
    'onOpenInSpectralForge={onOpenInSpectralForge}',
  ]],
  ['CarrierIntegralVerwaltenPanel', managePanel, [
    'onOpenInSpectralForge,',
    'onOpenInSpectralForge?.();',
    'onClose();',
    'In SpectralForge öffnen',
  ]],
  ['carrierIntegralVerwaltenPanelContracts', contracts, [
    'onOpenInSpectralForge?: () => void;',
  ]],
]) {
  for (const needle of required) {
    if (!text.includes(needle)) failures.push(`${label} missing ${needle}`);
  }
}

const closeIndex = managePanel.indexOf('onClose();');
const scrollIndex = managePanel.indexOf('onOpenInSpectralForge?.();');
if (closeIndex < 0 || scrollIndex < 0 || closeIndex > scrollIndex) {
  failures.push('open flow should close the manager before requesting the SpectralForge workmode autoscroll');
}

if (failures.length > 0) {
  console.error('[spectralforge-open-workmode-autoscroll] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[spectralforge-open-workmode-autoscroll] PASS');
console.log('- “In SpectralForge öffnen” closes the manager and requests a smooth scroll to the Arbeitsmodus header.');
console.log('- The scroll target is anchored on the SpectralForge workmode header, not inside the manager overlay.');
