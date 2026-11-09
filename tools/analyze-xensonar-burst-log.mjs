#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPaths = process.argv.slice(2);

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function number(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function string(value, fallback = null) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function collectStressRows(payload, sourceFile) {
  const rows = [];
  const root = payload?.metadata?.audioTraffic?.stressComparison;
  if (root) rows.push({ sourceFile, source: 'metadata', stress: root, sourceMetadata: payload?.metadata });
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  for (const [index, entry] of entries.entries()) {
    const stress = entry?.audioTraffic?.stressComparison;
    if (stress) rows.push({ sourceFile, source: `entry:${index}:${entry.kind ?? 'unknown'}`, stress, sourceMetadata: payload?.metadata });
  }
  return rows;
}

function summarizeRows(rows) {
  const byEngine = new Map();
  for (const row of rows) {
    const engine = string(row.stress.rootFollowVoiceEngineMode, 'unknown-engine');
    const scenario = string(row.stress.scenarioId, string(row?.sourceMetadata?.burstStressScenarioId, 'manual-unlabeled'));
    const browser = string(row.stress?.browserProfile?.browserId, string(row?.sourceMetadata?.burstStressBrowserProfile?.browserId, 'unknown-browser'));
    const groupKey = `${browser}::${scenario}::${engine}`;
    const item = byEngine.get(groupKey) ?? {
      groupKey,
      browser,
      scenario,
      engine,
      samples: 0,
      maxRisk: 0,
      maxEvents16: 0,
      maxEvents50: 0,
      maxRootFollow16: 0,
      maxParticle16: 0,
      maxWaveStarter16: 0,
      primaryMuteEvents: 0,
      directPilotPostedEvents: 0,
      granularAcceptedWindows: 0,
      maxBufferCopiedBytes: 0,
      maxRobustnessScore: 0,
      minRobustnessScore: null,
      maxMusicalPreservationScore: 0,
      minRestrictionCostScore: null,
      maxRestrictionCostScore: 0,
      rejectsPerSecondProxyMax: 0,
      smoothingBeforeDropProxyMax: 0,
      browserOptimizedReadout: {},
      pilotHealth: {},
      dominantSubsystem: {},
    };
    item.samples += 1;
    item.maxRisk = Math.max(item.maxRisk, number(row.stress.burstRiskScore));
    item.maxEvents16 = Math.max(item.maxEvents16, number(row.stress.maxEventsPer16Ms));
    item.maxEvents50 = Math.max(item.maxEvents50, number(row.stress.maxEventsPer50Ms));
    item.maxRootFollow16 = Math.max(item.maxRootFollow16, number(row.stress.maxRootFollowEventsPer16Ms));
    item.maxParticle16 = Math.max(item.maxParticle16, number(row.stress.maxParticleEventsPer16Ms));
    item.maxWaveStarter16 = Math.max(item.maxWaveStarter16, number(row.stress.maxWaveStarterEventsPer16Ms));
    item.primaryMuteEvents += number(row.stress.primaryCandidateMuteEvents);
    item.directPilotPostedEvents += number(row.stress.directPilotPostedEvents);
    item.granularAcceptedWindows += number(row.stress.granularAcceptedWindows);
    item.maxBufferCopiedBytes = Math.max(item.maxBufferCopiedBytes, number(row.stress.bufferCopiedBytes));
    item.maxRobustnessScore = Math.max(item.maxRobustnessScore, number(row.stress.robustnessScore));
    const robustness = number(row.stress.robustnessScore, 0);
    item.minRobustnessScore = item.minRobustnessScore === null ? robustness : Math.min(item.minRobustnessScore, robustness);
    item.maxMusicalPreservationScore = Math.max(item.maxMusicalPreservationScore, number(row.stress.musicalPreservationScore));
    const restrictionCost = number(row.stress.restrictionCostScore, 0);
    item.minRestrictionCostScore = item.minRestrictionCostScore === null ? restrictionCost : Math.min(item.minRestrictionCostScore, restrictionCost);
    item.maxRestrictionCostScore = Math.max(item.maxRestrictionCostScore, restrictionCost);
    item.rejectsPerSecondProxyMax = Math.max(item.rejectsPerSecondProxyMax, number(row.stress.rejectsPerSecondProxy));
    item.smoothingBeforeDropProxyMax = Math.max(item.smoothingBeforeDropProxyMax, number(row.stress.smoothingBeforeDropProxy));
    const readout = string(row.stress.browserOptimizedReadout, 'unknown');
    item.browserOptimizedReadout[readout] = (item.browserOptimizedReadout[readout] ?? 0) + 1;
    const health = string(row.stress.workletPilotHealth, string(row.stress.workletStatus, 'unknown'));
    item.pilotHealth[health] = (item.pilotHealth[health] ?? 0) + 1;
    const subsystem = string(row.stress.dominantSubsystem, 'none');
    item.dominantSubsystem[subsystem] = (item.dominantSubsystem[subsystem] ?? 0) + 1;
    byEngine.set(groupKey, item);
  }
  return [...byEngine.values()].sort((a, b) => b.maxRisk - a.maxRisk || b.maxMusicalPreservationScore - a.maxMusicalPreservationScore || b.samples - a.samples);
}

if (!inputPaths.length) {
  console.log(JSON.stringify({
    tool: 'analyze-xensonar-burst-log',
    usage: 'npm run xensonar:analyze-burst-log -- xensonar-burst-log-*.json',
    note: 'Analysiert exportierte Xensonar-Burst-Logs und gruppiert nach Browserprofil + Stress-Szenario + Root-Follow Voice Engine. Robustheit und musikalischer Erhalt bleiben getrennte Achsen.',
  }, null, 2));
  process.exit(0);
}

const rows = [];
for (const inputPath of inputPaths) {
  const resolved = path.resolve(inputPath);
  const payload = readJson(resolved);
  rows.push(...collectStressRows(payload, path.basename(inputPath)));
}

const output = {
  tool: 'analyze-xensonar-burst-log',
  analyzedAtIso: new Date().toISOString(),
  fileCount: inputPaths.length,
  stressRowCount: rows.length,
  byEngine: summarizeRows(rows),
  rows: rows.slice(-80).map((row) => ({
    sourceFile: row.sourceFile,
    source: row.source,
    browser: string(row.stress?.browserProfile?.browserId, string(row?.sourceMetadata?.burstStressBrowserProfile?.browserId, 'unknown-browser')),
    scenario: string(row.stress.scenarioId, string(row?.sourceMetadata?.burstStressScenarioId, 'manual-unlabeled')),
    engine: string(row.stress.rootFollowVoiceEngineMode, 'unknown-engine'),
    risk: number(row.stress.burstRiskScore),
    robustness: number(row.stress.robustnessScore),
    preservation: number(row.stress.musicalPreservationScore),
    restriction: number(row.stress.restrictionCostScore),
    browserReadout: string(row.stress.browserOptimizedReadout, 'unknown'),
    max16: number(row.stress.maxEventsPer16Ms),
    root16: number(row.stress.maxRootFollowEventsPer16Ms),
    particle16: number(row.stress.maxParticleEventsPer16Ms),
    wave16: number(row.stress.maxWaveStarterEventsPer16Ms),
    pilotHealth: string(row.stress.workletPilotHealth, string(row.stress.workletStatus, 'unknown')),
    primaryMuteEvents: number(row.stress.primaryCandidateMuteEvents),
    bufferCopiedBytes: number(row.stress.bufferCopiedBytes),
  })),
};

console.log(JSON.stringify(output, null, 2));
