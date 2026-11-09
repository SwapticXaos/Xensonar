#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const targetUrl = process.argv[2] || process.env.XENSONAR_TARGET_URL || 'http://127.0.0.1:8773/index.html';
const outDir = process.argv[3] || process.env.XENSONAR_HARD_BURST_OUT_DIR || '/mnt/data/xensonar_9105_hard_burst_meter';
const timeoutMs = Number(process.env.XENSONAR_HARD_BURST_TIMEOUT_MS || 210000);
const candidates = (process.env.XENSONAR_HARD_BURST_CANDIDATES || 'C1_balanced_shadow_default_candidate,C2_pressure_safe_shadow_browser_safe,C4_studio_density_shadow_musical_outlier,W1_balanced_worklet_granular_pilot').split(',').map(s => s.trim()).filter(Boolean);
const scenario = process.env.XENSONAR_HARD_BURST_SCENARIO || 'full-lane-max-stress';
const scale = process.env.XENSONAR_TARGETED_MATRIX_SCALE || '0.14';
const intensity = process.env.XENSONAR_TARGETED_INTENSITY || '3.2';
const phaseScale = process.env.XENSONAR_ESCALATION_PHASE_SCALE || '1.0';
mkdirSync(outDir, { recursive: true });

function runOne(candidateId) {
  return new Promise((resolveRun) => {
    const candidateOut = resolve(outDir, candidateId);
    mkdirSync(candidateOut, { recursive: true });
    const env = {
      ...process.env,
      XENSONAR_MATRIX_CANDIDATES: candidateId,
      XENSONAR_MATRIX_SCENARIOS: scenario,
      XENSONAR_TARGETED_MATRIX_SCALE: scale,
      XENSONAR_TARGETED_INTENSITY: intensity,
      XENSONAR_ESCALATION_PHASE_SCALE: phaseScale,
      XENSONAR_TARGETED_MATRIX_REPETITIONS: '1',
      XENSONAR_CDP_PORT: String(10300 + Math.floor(Math.random() * 900)),
    };
    const started = Date.now();
    const logPath = resolve(candidateOut, `${candidateId}.runner.log`);
    const child = spawn(process.execPath, [resolve(root, 'tools/run-escalating-full-pressure-burst-runner.mjs'), targetUrl, candidateOut], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    const append = (chunk) => { const s = chunk.toString(); log += s; process.stdout.write(s); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { child.kill('SIGTERM'); } catch {} setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 4000); }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      writeFileSync(logPath, log);
      const elapsedMs = Date.now() - started;
      resolveRun({ candidateId, ok: code === 0 && !timedOut, code, signal, timedOut, elapsedMs, logPath, candidateOut });
    });
  });
}

function latestJson(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => /^xensonar_9\.103_.*\.json$/.test(f)).map(f => resolve(dir, f));
  files.sort((a,b) => basename(a).localeCompare(basename(b)));
  return files.at(-1) || null;
}
function rowsFromJson(path) {
  if (!path) return [];
  try { return JSON.parse(readFileSync(path, 'utf8')).rows || []; } catch { return []; }
}
function csvEscape(v) { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

const runResults = [];
for (const candidate of candidates) {
  console.log(`\n[hard-burst-meter] START ${candidate}`);
  runResults.push(await runOne(candidate));
}

const allRows = [];
for (const rr of runResults) {
  const jsonPath = latestJson(rr.candidateOut);
  const rows = rowsFromJson(jsonPath);
  if (rows.length) {
    for (const row of rows) allRows.push({ ...row, runnerOk: rr.ok, runnerTimedOut: rr.timedOut, runnerElapsedMs: rr.elapsedMs, resultJson: jsonPath });
  } else {
    allRows.push({ candidateId: rr.candidateId, scenarioId: scenario, runnerOk: rr.ok, runnerTimedOut: rr.timedOut, runnerElapsedMs: rr.elapsedMs, runnerExitCode: rr.code, runnerSignal: rr.signal, resultJson: null, burstRiskScore: null, robustnessScore: null, harnessStimulusEvents: null, escalationHighestLevel: null, escalationFirstStallLevel: rr.timedOut ? 'runner-timeout' : null, escalationRecovered: null });
  }
}

const ordered = allRows.slice().sort((a,b) => {
  const stallA = a.escalationFirstStallLevel ? 1 : 0;
  const stallB = b.escalationFirstStallLevel ? 1 : 0;
  if (stallA !== stallB) return stallA - stallB;
  const riskA = Number(a.burstRiskScore ?? 999999);
  const riskB = Number(b.burstRiskScore ?? 999999);
  if (riskA !== riskB) return riskA - riskB;
  return String(a.candidateId).localeCompare(String(b.candidateId));
});

const summary = {
  kind: 'xensonar-hard-burst-meter-summary',
  version: '3.2.91.6.9.105-hard-meter-tooling',
  generatedAtIso: new Date().toISOString(),
  targetUrl,
  scenario,
  scale,
  intensity,
  phaseScale,
  timeoutMs,
  runResults,
  rows: allRows,
  ordered,
};
const summaryJson = resolve(outDir, 'hard_burst_meter_summary.json');
writeFileSync(summaryJson, JSON.stringify(summary, null, 2) + '\n');
const keys = ['candidateId','scenarioId','runnerOk','runnerTimedOut','burstRiskScore','robustnessScore','musicalPreservationScore','restrictionCostScore','dominantSubsystem','maxEvents16','maxEvents50','maxEvents100','harnessStimulusEvents','entryCount','escalationHighestLevel','escalationFirstStallLevel','escalationRecovered','rootFollowVoiceEngineMode','workletPilotHealth','runnerElapsedMs','resultJson'];
writeFileSync(resolve(outDir, 'hard_burst_meter_summary.csv'), keys.join(',') + '\n' + allRows.map(r => keys.map(k => csvEscape(r[k])).join(',')).join('\n') + '\n');
const md = [
  '# Xensonar Hard Burst Meter',
  '',
  `Target: ${targetUrl}`,
  `Scenario: ${scenario}`,
  `Intensity: ${intensity}`,
  `Scale: ${scale}`,
  `Phase scale: ${phaseScale}`,
  '',
  '| Candidate | OK | Timeout | Risk | Robust | 16ms | Events | Highest | Stall | Recovered | Engine |',
  '|---|---:|---:|---:|---:|---:|---:|---|---|---|---|',
  ...allRows.map(r => `| ${r.candidateId} | ${r.runnerOk ?? ''} | ${r.runnerTimedOut ?? ''} | ${r.burstRiskScore ?? ''} | ${r.robustnessScore ?? ''} | ${r.maxEvents16 ?? ''} | ${r.harnessStimulusEvents ?? ''} | ${r.escalationHighestLevel ?? ''} | ${r.escalationFirstStallLevel ?? ''} | ${r.escalationRecovered ?? ''} | ${r.rootFollowVoiceEngineMode ?? ''} |`),
  '',
  '## Vorläufige Reihenfolge',
  '',
  ...ordered.map((r, i) => `${i + 1}. ${r.candidateId}: stall=${r.escalationFirstStallLevel ?? 'none'}, risk=${r.burstRiskScore ?? 'n/a'}, events=${r.harnessStimulusEvents ?? 'n/a'}`),
].join('\n') + '\n';
writeFileSync(resolve(outDir, 'hard_burst_meter_summary.md'), md);
console.log(`\n[hard-burst-meter] wrote ${summaryJson}`);
