#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const required = [
  'tools/run-burst-diagnosis-log-meter.mjs',
  'tools/analyze-burst-diagnosis-log-meter.mjs',
  'tools/run-simple-hard-burst-meter.mjs',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`[burst-diagnosis-log-meter] missing ${file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['xensonar:run-burst-diagnosis-log-meter', 'xensonar:analyze-burst-diagnosis-log-meter']) {
  if (!pkg.scripts?.[script]) throw new Error(`[burst-diagnosis-log-meter] missing package script ${script}`);
}
const fixtureDir = path.join(root, '.tmp_burst_diagnosis_log_meter_fixture');
fs.rmSync(fixtureDir, { recursive: true, force: true });
fs.mkdirSync(fixtureDir, { recursive: true });
const fixture = {
  payloads: [{
    runId: 'fixture-run',
    candidateId: 'fixture-candidate',
    scenarioId: 'full-lane-max-stress',
    payload: {
      exportedAtIso: '2026-05-10T00:00:00.000Z',
      entryCount: 2,
      markerCount: 0,
      metadata: {
        runId: 'fixture-run',
        candidateId: 'fixture-candidate',
        scenarioId: 'full-lane-max-stress',
        candidateConfig: { rootFollowVoiceEngineMode: 'shadow-plan' },
        burstStressBrowserProfile: { browserId: 'chromium' },
        audioTraffic: {
          stressComparison: {
            version: 2,
            scenarioId: 'full-lane-max-stress',
            scenarioTag: 'stress-harness',
            browserProfile: { browserId: 'chromium' },
            rootFollowVoiceEngineMode: 'shadow-plan',
            burstRiskScore: 37,
            robustnessScore: 82,
            restrictionCostScore: 4,
            dominantSubsystem: 'root-follow',
            browserOptimizedReadout: 'playable',
            maxEventsPer16Ms: 11,
            maxEventsPer50Ms: 23,
            maxEventsPer100Ms: 34,
            maxRootFollowEventsPer16Ms: 9,
            maxParticleEventsPer16Ms: 3,
            maxWaveStarterEventsPer16Ms: 5,
            rejectsPerSecondProxy: 1.25,
          },
        },
      },
      entries: [{
        kind: 'fixture',
        audioTraffic: { stressComparison: { scenarioId: 'full-lane-max-stress', burstRiskScore: 41, robustnessScore: 77, maxEventsPer16Ms: 13, dominantSubsystem: 'wave-starter' } },
      }],
    },
  }],
};
fs.writeFileSync(path.join(fixtureDir, 'fixture.json'), JSON.stringify(fixture, null, 2));
const outDir = path.join(fixtureDir, 'out');
const proc = spawnSync(process.execPath, ['tools/analyze-burst-diagnosis-log-meter.mjs', '--out', outDir, '--quiet', fixtureDir], { cwd: root, encoding: 'utf8' });
if (proc.status !== 0) throw new Error(`[burst-diagnosis-log-meter] analyzer fixture failed\n${proc.stdout}\n${proc.stderr}`);
const summaryPath = path.join(outDir, 'burst_diagnosis_log_meter_summary.json');
if (!fs.existsSync(summaryPath)) throw new Error('[burst-diagnosis-log-meter] analyzer did not write summary');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
if (summary.validCounterPayloadCount !== 1) throw new Error(`[burst-diagnosis-log-meter] expected one valid payload, got ${summary.validCounterPayloadCount}`);
if (summary.rows?.[0]?.maxEvents16 !== 13) throw new Error('[burst-diagnosis-log-meter] maxEvents16 aggregation failed');
fs.rmSync(fixtureDir, { recursive: true, force: true });
console.log('[burst-diagnosis-log-meter] OK');
