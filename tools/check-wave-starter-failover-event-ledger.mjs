import fs from 'node:fs';
const files = [
  'src/features/xensonar/audio/waveStarterFailoverEventLedger.ts',
  'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
];
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`${file} missing`);
}
const ledger = fs.readFileSync(files[0], 'utf8');
for (const token of [
  'WAVE_STARTER_FAILOVER_EVENT_LEDGER_GLOBAL',
  'recordWaveStarterFailoverGateLedgerEntry',
  'recordWaveStarterFailoverCandidatePostedLedgerEntry',
  'recordWaveStarterFailoverCandidateAckLedgerEntry',
  'recordWaveStarterFailoverCandidateRejectLedgerEntry',
  'buildWaveStarterFailoverEventLedgerReport',
  'ringBufferOnly: true',
  'doesNotChangeRuntimePolicy: true',
]) {
  if (!ledger.includes(token)) throw new Error(`ledger missing ${token}`);
}
const emit = fs.readFileSync(files[1], 'utf8');
if (!emit.includes('recordWaveStarterFailoverGateLedgerEntry(failoverDecision)')) throw new Error('gate decision is not recorded into ledger');
const bridge = fs.readFileSync(files[2], 'utf8');
for (const token of [
  'recordWaveStarterFailoverCandidatePostedLedgerEntry',
  'recordWaveStarterFailoverCandidateAckLedgerEntry',
  'recordWaveStarterFailoverCandidateRejectLedgerEntry',
]) {
  if (!bridge.includes(token)) throw new Error(`bridge missing ${token}`);
}
const ui = fs.readFileSync(files[3], 'utf8');
if (!ui.includes('Wellenstarter Event-Ledger')) throw new Error('Event-Ledger UI line missing');
console.log('wave-starter failover event ledger contract OK');
