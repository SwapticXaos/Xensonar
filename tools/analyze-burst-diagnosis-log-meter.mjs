#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback = undefined) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);
const outDir = getArg('--out', process.env.XENSONAR_BURST_DIAGNOSIS_METER_OUT_DIR || null);
const valueFlags = new Set(['--out']);
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    if (valueFlags.has(arg)) i += 1;
    continue;
  }
  positional.push(arg);
}

const VERSION = '3.2.91.6.9.116-stable-lane-buffer-plan-generation-split';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function collectJsonFiles(inputPath, acc = []) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) return acc;
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(resolved)) collectJsonFiles(path.join(resolved, name), acc);
  } else if (resolved.endsWith('.json')) {
    acc.push(resolved);
  }
  return acc;
}

function unwrapPayloads(value, sourceFile, context = {}) {
  const payloads = [];
  const obj = safeObject(value);
  if (obj.metadata && Array.isArray(obj.entries)) {
    payloads.push({ payload: obj, sourceFile, wrapper: context });
  }
  if (obj.payload && typeof obj.payload === 'object') {
    payloads.push(...unwrapPayloads(obj.payload, sourceFile, { ...context, candidateId: obj.candidateId ?? context.candidateId, scenarioId: obj.scenarioId ?? context.scenarioId, runId: obj.runId ?? context.runId }));
  }
  if (Array.isArray(obj.payloads)) {
    for (const item of obj.payloads) payloads.push(...unwrapPayloads(item, sourceFile, { ...context, candidateId: item?.candidateId ?? context.candidateId, scenarioId: item?.scenarioId ?? context.scenarioId, runId: item?.runId ?? context.runId }));
  }
  return payloads;
}

function stressFromAudioTraffic(audioTraffic) {
  return safeObject(audioTraffic?.stressComparison);
}

function pickWindow(stress, ms) {
  return Math.max(
    asNumber(stress[`maxEventsPer${ms}Ms`]),
    asNumber(stress?.eventWindows?.[String(ms)]?.maxEvents),
    asNumber(stress?.burstWindows?.[String(ms)]?.maxEvents),
  );
}

function pickSubsystemWindow(stress, name, ms = 16) {
  const canonical = name[0].toUpperCase() + name.slice(1);
  return Math.max(
    asNumber(stress[`max${canonical}EventsPer${ms}Ms`]),
    asNumber(stress[`max${name}EventsPer${ms}Ms`]),
    asNumber(stress?.subsystemWindows?.[name]?.[String(ms)]?.maxEvents),
    asNumber(stress?.[`${name}${ms}`]),
  );
}

function addCounter(map, key) {
  const normalized = asString(key, 'unknown');
  map[normalized] = (map[normalized] ?? 0) + 1;
}

function summarizePayload(payloadWrap) {
  const payload = payloadWrap.payload;
  const metadata = safeObject(payload.metadata);
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const stressRows = [];
  if (metadata.audioTraffic?.stressComparison) stressRows.push({ source: 'metadata', stress: stressFromAudioTraffic(metadata.audioTraffic), audioTraffic: metadata.audioTraffic });
  entries.forEach((entry, index) => {
    const audioTraffic = entry?.audioTraffic;
    const stress = stressFromAudioTraffic(audioTraffic);
    if (Object.keys(stress).length) stressRows.push({ source: `entry:${index}:${entry?.kind ?? 'unknown'}`, stress, audioTraffic, entry });
  });

  const candidateId = asString(metadata.candidateId, asString(payloadWrap.wrapper?.candidateId, 'unknown-candidate'));
  const scenarioId = asString(metadata.scenarioId, asString(metadata.burstStressScenarioId, asString(payloadWrap.wrapper?.scenarioId, 'unknown-scenario')));
  const runId = asString(metadata.runId, asString(payloadWrap.wrapper?.runId, `${candidateId}::${scenarioId}`));
  const browserId = asString(metadata.burstStressBrowserProfile?.browserId, asString(stressRows[0]?.stress?.browserProfile?.browserId, 'unknown-browser'));
  const engine = asString(metadata.candidateConfig?.rootFollowVoiceEngineMode, asString(stressRows[0]?.stress?.rootFollowVoiceEngineMode, 'unknown-engine'));
  const row = {
    sourceFile: path.basename(payloadWrap.sourceFile),
    runId,
    candidateId,
    scenarioId,
    browserId,
    engine,
    exportedAtIso: asString(payload.exportedAtIso, ''),
    startedAtIso: asString(payload.startedAtIso, asString(metadata.startedAtIso, '')),
    entryCount: asNumber(payload.entryCount, entries.length),
    markerCount: asNumber(payload.markerCount),
    stressRowCount: stressRows.length,
    maxBurstRiskScore: 0,
    minRobustnessScore: null,
    maxRestrictionCostScore: 0,
    maxEvents16: 0,
    maxEvents50: 0,
    maxEvents100: 0,
    maxRootFollow16: 0,
    maxParticle16: 0,
    maxWaveStarter16: 0,
    maxQuantizedTraffic16: 0,
    maxQuantizedTraffic50: 0,
    maxQuantizedTraffic100: 0,
    workletThroughputSignal: false,
    maxWorkletProcessQuantumCount: 0,
    maxWorkletRenderedFrameCount: 0,
    maxWorkletActiveRenderQuantumCount: 0,
    maxWorkletDirectRenderedFrameCount: 0,
    maxWorkletGranularRenderedFrameCount: 0,
    maxWorkletStableLaneRenderedFrameCount: 0,
    maxWorkletStableLaneHoldQuantumCount: 0,
    maxWorkletStableLaneCrossfadeFrameCount: 0,
    maxWorkletStableLaneGainRampFrameCount: 0,
    maxWorkletStableLanePlanCount: 0,
    maxWorkletStableLaneRetuneCount: 0,
    maxWorkletBridgeSessionId: 0,
    maxWorkletProcessorGeneration: 0,
    workletStableLaneBufferAcked: false,
    workletStableLaneBufferRejectedReasons: {},
    workletStableLanePlanAcked: false,
    workletStableLanePlanRejectedReasons: {},
    maxWorkletStableLaneBufferAckCount: 0,
    maxWorkletStableLaneBufferRejectCount: 0,
    maxWorkletStableLanePlanAckCount: 0,
    maxWorkletStableLanePlanRejectCount: 0,
    maxWorkletStableLaneBufferGeneration: 0,
    maxWorkletDirectPilotAcceptedEventTotal: 0,
    maxWorkletGranularPilotAcceptedWindowTotal: 0,
    maxWorkletBufferTransferCopiedByteLengthTotal: 0,
    workletProcessorErrors: 0,
    maxRejectsPerSecondProxy: 0,
    maxSmoothingBeforeDropProxy: 0,
    primaryCandidateMuteEvents: 0,
    directPilotPostedEvents: 0,
    granularAcceptedWindows: 0,
    maxBufferCopiedBytes: 0,
    workletHealth: {},
    dominantSubsystems: {},
    scenarioTags: {},
    browserReadouts: {},
  };

  for (const { stress } of stressRows) {
    row.maxBurstRiskScore = Math.max(row.maxBurstRiskScore, asNumber(stress.burstRiskScore));
    const robustness = asNumber(stress.robustnessScore, 0);
    row.minRobustnessScore = row.minRobustnessScore === null ? robustness : Math.min(row.minRobustnessScore, robustness);
    row.maxRestrictionCostScore = Math.max(row.maxRestrictionCostScore, asNumber(stress.restrictionCostScore));
    row.maxEvents16 = Math.max(row.maxEvents16, pickWindow(stress, 16));
    row.maxEvents50 = Math.max(row.maxEvents50, pickWindow(stress, 50));
    row.maxEvents100 = Math.max(row.maxEvents100, pickWindow(stress, 100));
    row.maxRootFollow16 = Math.max(row.maxRootFollow16, pickSubsystemWindow(stress, 'rootFollow'));
    row.maxParticle16 = Math.max(row.maxParticle16, pickSubsystemWindow(stress, 'particle'));
    row.maxWaveStarter16 = Math.max(row.maxWaveStarter16, pickSubsystemWindow(stress, 'waveStarter'));
    row.maxQuantizedTraffic16 = Math.max(row.maxQuantizedTraffic16, pickSubsystemWindow(stress, 'quantizedTraffic', 16));
    row.maxQuantizedTraffic50 = Math.max(row.maxQuantizedTraffic50, pickSubsystemWindow(stress, 'quantizedTraffic', 50));
    row.maxQuantizedTraffic100 = Math.max(row.maxQuantizedTraffic100, pickSubsystemWindow(stress, 'quantizedTraffic', 100));
    row.workletThroughputSignal = row.workletThroughputSignal || stress.workletThroughputSignal === true;
    row.maxWorkletProcessQuantumCount = Math.max(row.maxWorkletProcessQuantumCount, asNumber(stress.workletProcessQuantumCount));
    row.maxWorkletRenderedFrameCount = Math.max(row.maxWorkletRenderedFrameCount, asNumber(stress.workletRenderedFrameCount));
    row.maxWorkletActiveRenderQuantumCount = Math.max(row.maxWorkletActiveRenderQuantumCount, asNumber(stress.workletActiveRenderQuantumCount));
    row.maxWorkletDirectRenderedFrameCount = Math.max(row.maxWorkletDirectRenderedFrameCount, asNumber(stress.workletDirectRenderedFrameCount));
    row.maxWorkletGranularRenderedFrameCount = Math.max(row.maxWorkletGranularRenderedFrameCount, asNumber(stress.workletGranularRenderedFrameCount));
    row.maxWorkletStableLaneRenderedFrameCount = Math.max(row.maxWorkletStableLaneRenderedFrameCount, asNumber(stress.workletStableLaneRenderedFrameCount));
    row.maxWorkletStableLaneHoldQuantumCount = Math.max(row.maxWorkletStableLaneHoldQuantumCount, asNumber(stress.workletStableLaneHoldQuantumCount));
    row.maxWorkletStableLaneCrossfadeFrameCount = Math.max(row.maxWorkletStableLaneCrossfadeFrameCount, asNumber(stress.workletStableLaneCrossfadeFrameCount));
    row.maxWorkletStableLaneGainRampFrameCount = Math.max(row.maxWorkletStableLaneGainRampFrameCount, asNumber(stress.workletStableLaneGainRampFrameCount));
    row.maxWorkletStableLanePlanCount = Math.max(row.maxWorkletStableLanePlanCount, asNumber(stress.workletStableLanePlanCount));
    row.maxWorkletStableLaneRetuneCount = Math.max(row.maxWorkletStableLaneRetuneCount, asNumber(stress.workletStableLaneRetuneCount));
    row.maxWorkletBridgeSessionId = Math.max(row.maxWorkletBridgeSessionId, asNumber(stress.workletBridgeSessionId));
    row.maxWorkletProcessorGeneration = Math.max(row.maxWorkletProcessorGeneration, asNumber(stress.workletProcessorGeneration));
    row.workletStableLaneBufferAcked = row.workletStableLaneBufferAcked || stress.workletStableLaneBufferAcked === true;
    if (stress.workletStableLaneBufferRejectedReason) addCounter(row.workletStableLaneBufferRejectedReasons, stress.workletStableLaneBufferRejectedReason);
    row.workletStableLanePlanAcked = row.workletStableLanePlanAcked || stress.workletStableLanePlanAcked === true;
    if (stress.workletStableLanePlanRejectedReason) addCounter(row.workletStableLanePlanRejectedReasons, stress.workletStableLanePlanRejectedReason);
    row.maxWorkletStableLaneBufferAckCount = Math.max(row.maxWorkletStableLaneBufferAckCount, asNumber(stress.workletStableLaneBufferAckCount));
    row.maxWorkletStableLaneBufferRejectCount = Math.max(row.maxWorkletStableLaneBufferRejectCount, asNumber(stress.workletStableLaneBufferRejectCount));
    row.maxWorkletStableLanePlanAckCount = Math.max(row.maxWorkletStableLanePlanAckCount, asNumber(stress.workletStableLanePlanAckCount));
    row.maxWorkletStableLanePlanRejectCount = Math.max(row.maxWorkletStableLanePlanRejectCount, asNumber(stress.workletStableLanePlanRejectCount));
    row.maxWorkletStableLaneBufferGeneration = Math.max(row.maxWorkletStableLaneBufferGeneration, asNumber(stress.workletStableLaneBufferGeneration));
    row.maxWorkletDirectPilotAcceptedEventTotal = Math.max(row.maxWorkletDirectPilotAcceptedEventTotal, asNumber(stress.workletDirectPilotAcceptedEventTotal));
    row.maxWorkletGranularPilotAcceptedWindowTotal = Math.max(row.maxWorkletGranularPilotAcceptedWindowTotal, asNumber(stress.workletGranularPilotAcceptedWindowTotal));
    row.maxWorkletBufferTransferCopiedByteLengthTotal = Math.max(row.maxWorkletBufferTransferCopiedByteLengthTotal, asNumber(stress.workletBufferTransferCopiedByteLengthTotal));
    row.workletProcessorErrors = Math.max(row.workletProcessorErrors, asNumber(stress.workletProcessorErrorCount));
    row.maxRejectsPerSecondProxy = Math.max(row.maxRejectsPerSecondProxy, asNumber(stress.rejectsPerSecondProxy));
    row.maxSmoothingBeforeDropProxy = Math.max(row.maxSmoothingBeforeDropProxy, asNumber(stress.smoothingBeforeDropProxy));
    row.primaryCandidateMuteEvents += asNumber(stress.primaryCandidateMuteEvents);
    row.directPilotPostedEvents += asNumber(stress.directPilotPostedEvents);
    row.granularAcceptedWindows += asNumber(stress.granularAcceptedWindows);
    row.maxBufferCopiedBytes = Math.max(row.maxBufferCopiedBytes, asNumber(stress.bufferCopiedBytes));
    addCounter(row.workletHealth, stress.workletPilotHealth ?? stress.workletStatus ?? 'unknown');
    addCounter(row.dominantSubsystems, stress.dominantSubsystem ?? 'none');
    addCounter(row.scenarioTags, stress.scenarioTag ?? 'unknown');
    addCounter(row.browserReadouts, stress.browserOptimizedReadout ?? 'unknown');
  }

  row.minRobustnessScore = row.minRobustnessScore ?? 0;
  row.validBurstCounterSignal = Boolean(
    row.maxBurstRiskScore > 0 || row.maxEvents16 > 0 || row.maxEvents50 > 0 || row.maxEvents100 > 0 || row.maxRootFollow16 > 0 || row.maxParticle16 > 0 || row.maxWaveStarter16 > 0 || row.maxQuantizedTraffic16 > 0 || row.maxQuantizedTraffic50 > 0 || row.maxQuantizedTraffic100 > 0 || row.maxRejectsPerSecondProxy > 0 || row.maxSmoothingBeforeDropProxy > 0
  );
  row.logPresentButCountersFlat = Boolean(row.entryCount > 0 && row.stressRowCount > 0 && !row.validBurstCounterSignal);
  row.interpretation = row.validBurstCounterSignal
    ? 'burst-counters-active'
    : row.logPresentButCountersFlat
      ? 'diagnosis-log-present-but-burst-counters-flat'
      : 'no-machine-readable-burst-counter-signal';
  return row;
}

function csvEscape(value) {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  const cols = ['candidateId','scenarioId','browserId','engine','entryCount','stressRowCount','maxBurstRiskScore','minRobustnessScore','maxRestrictionCostScore','maxEvents16','maxEvents50','maxEvents100','maxRootFollow16','maxParticle16','maxWaveStarter16','maxQuantizedTraffic16','maxQuantizedTraffic50','maxQuantizedTraffic100','workletThroughputSignal','maxWorkletProcessQuantumCount','maxWorkletRenderedFrameCount','maxWorkletActiveRenderQuantumCount','maxWorkletDirectRenderedFrameCount','maxWorkletGranularRenderedFrameCount','maxWorkletStableLaneRenderedFrameCount','maxWorkletStableLaneHoldQuantumCount','maxWorkletStableLaneCrossfadeFrameCount','maxWorkletStableLaneGainRampFrameCount','maxWorkletStableLanePlanCount','maxWorkletStableLaneRetuneCount','maxWorkletBridgeSessionId','maxWorkletProcessorGeneration','workletStableLaneBufferAcked','workletStableLaneBufferRejectedReasons','workletStableLanePlanAcked','workletStableLanePlanRejectedReasons','maxWorkletStableLaneBufferAckCount','maxWorkletStableLaneBufferRejectCount','maxWorkletStableLanePlanAckCount','maxWorkletStableLanePlanRejectCount','maxWorkletStableLaneBufferGeneration','maxWorkletDirectPilotAcceptedEventTotal','maxWorkletGranularPilotAcceptedWindowTotal','maxWorkletBufferTransferCopiedByteLengthTotal','workletProcessorErrors','maxRejectsPerSecondProxy','maxSmoothingBeforeDropProxy','primaryCandidateMuteEvents','directPilotPostedEvents','granularAcceptedWindows','maxBufferCopiedBytes','validBurstCounterSignal','interpretation','sourceFile'];
  return [cols.join(','), ...rows.map((row) => cols.map((col) => csvEscape(row[col])).join(','))].join('\n') + '\n';
}

function groupSummary(rows) {
  const byCandidate = new Map();
  for (const row of rows) {
    const key = `${row.candidateId}::${row.scenarioId}`;
    const item = byCandidate.get(key) ?? {
      candidateId: row.candidateId,
      scenarioId: row.scenarioId,
      samples: 0,
      validSamples: 0,
      flatCounterSamples: 0,
      maxRisk: 0,
      maxEvents16: 0,
      maxEvents50: 0,
      maxEvents100: 0,
      maxRootFollow16: 0,
      maxParticle16: 0,
      maxWaveStarter16: 0,
      maxQuantizedTraffic16: 0,
      maxQuantizedTraffic50: 0,
      maxQuantizedTraffic100: 0,
      workletThroughputSamples: 0,
      maxWorkletProcessQuantumCount: 0,
      maxWorkletActiveRenderQuantumCount: 0,
      maxWorkletGranularRenderedFrameCount: 0,
      maxWorkletStableLaneRenderedFrameCount: 0,
      maxWorkletStableLaneHoldQuantumCount: 0,
      maxWorkletStableLaneCrossfadeFrameCount: 0,
      maxWorkletStableLaneGainRampFrameCount: 0,
      maxWorkletBufferTransferCopiedByteLengthTotal: 0,
      maxWorkletStableLaneBufferAckCount: 0,
      maxWorkletStableLanePlanAckCount: 0,
      maxWorkletStableLaneBufferRejectCount: 0,
      maxWorkletStableLanePlanRejectCount: 0,
      workletProcessorErrors: 0,
      maxRejectsPerSecondProxy: 0,
      maxSmoothingBeforeDropProxy: 0,
      minRobustness: null,
      maxRestriction: 0,
      totalEntries: 0,
      interpretations: {},
    };
    item.samples += 1;
    if (row.validBurstCounterSignal) item.validSamples += 1;
    if (row.logPresentButCountersFlat) item.flatCounterSamples += 1;
    item.maxRisk = Math.max(item.maxRisk, row.maxBurstRiskScore);
    item.maxEvents16 = Math.max(item.maxEvents16, row.maxEvents16);
    item.maxEvents50 = Math.max(item.maxEvents50, row.maxEvents50);
    item.maxEvents100 = Math.max(item.maxEvents100, row.maxEvents100);
    item.maxRootFollow16 = Math.max(item.maxRootFollow16, row.maxRootFollow16);
    item.maxParticle16 = Math.max(item.maxParticle16, row.maxParticle16);
    item.maxWaveStarter16 = Math.max(item.maxWaveStarter16, row.maxWaveStarter16);
    item.maxQuantizedTraffic16 = Math.max(item.maxQuantizedTraffic16, row.maxQuantizedTraffic16);
    item.maxQuantizedTraffic50 = Math.max(item.maxQuantizedTraffic50, row.maxQuantizedTraffic50);
    item.maxQuantizedTraffic100 = Math.max(item.maxQuantizedTraffic100, row.maxQuantizedTraffic100);
    if (row.workletThroughputSignal) item.workletThroughputSamples += 1;
    item.maxWorkletProcessQuantumCount = Math.max(item.maxWorkletProcessQuantumCount, row.maxWorkletProcessQuantumCount);
    item.maxWorkletActiveRenderQuantumCount = Math.max(item.maxWorkletActiveRenderQuantumCount, row.maxWorkletActiveRenderQuantumCount);
    item.maxWorkletGranularRenderedFrameCount = Math.max(item.maxWorkletGranularRenderedFrameCount, row.maxWorkletGranularRenderedFrameCount);
    item.maxWorkletStableLaneRenderedFrameCount = Math.max(item.maxWorkletStableLaneRenderedFrameCount, row.maxWorkletStableLaneRenderedFrameCount);
    item.maxWorkletStableLaneHoldQuantumCount = Math.max(item.maxWorkletStableLaneHoldQuantumCount, row.maxWorkletStableLaneHoldQuantumCount);
    item.maxWorkletStableLaneCrossfadeFrameCount = Math.max(item.maxWorkletStableLaneCrossfadeFrameCount, row.maxWorkletStableLaneCrossfadeFrameCount);
    item.maxWorkletStableLaneGainRampFrameCount = Math.max(item.maxWorkletStableLaneGainRampFrameCount, row.maxWorkletStableLaneGainRampFrameCount);
    item.maxWorkletBufferTransferCopiedByteLengthTotal = Math.max(item.maxWorkletBufferTransferCopiedByteLengthTotal, row.maxWorkletBufferTransferCopiedByteLengthTotal);
    item.maxWorkletStableLaneBufferAckCount = Math.max(item.maxWorkletStableLaneBufferAckCount, row.maxWorkletStableLaneBufferAckCount);
    item.maxWorkletStableLanePlanAckCount = Math.max(item.maxWorkletStableLanePlanAckCount, row.maxWorkletStableLanePlanAckCount);
    item.maxWorkletStableLaneBufferRejectCount = Math.max(item.maxWorkletStableLaneBufferRejectCount, row.maxWorkletStableLaneBufferRejectCount);
    item.maxWorkletStableLanePlanRejectCount = Math.max(item.maxWorkletStableLanePlanRejectCount, row.maxWorkletStableLanePlanRejectCount);
    item.workletProcessorErrors = Math.max(item.workletProcessorErrors, row.workletProcessorErrors);
    item.maxRejectsPerSecondProxy = Math.max(item.maxRejectsPerSecondProxy, row.maxRejectsPerSecondProxy);
    item.maxSmoothingBeforeDropProxy = Math.max(item.maxSmoothingBeforeDropProxy, row.maxSmoothingBeforeDropProxy);
    item.minRobustness = item.minRobustness === null ? row.minRobustnessScore : Math.min(item.minRobustness, row.minRobustnessScore);
    item.maxRestriction = Math.max(item.maxRestriction, row.maxRestrictionCostScore);
    item.totalEntries += row.entryCount;
    addCounter(item.interpretations, row.interpretation);
    byCandidate.set(key, item);
  }
  return [...byCandidate.values()].sort((a, b) => b.maxRisk - a.maxRisk || b.maxEvents16 - a.maxEvents16 || b.totalEntries - a.totalEntries);
}

function summaryToMarkdown(output) {
  const lines = [];
  lines.push('# Xensonar Burst-Diagnosis Log Meter');
  lines.push('');
  lines.push('Der normale Audio-Recorder wird hier nicht als Burst-Beweis verwendet. Ausgewertet werden maschinenlesbare Burst-Diagnose-/AudioTraffic-Logs.');
  lines.push('');
  lines.push(`Analysierte JSON-Dateien: ${output.fileCount}`);
  lines.push(`Gefundene Payloads: ${output.payloadCount}`);
  lines.push(`Payloads mit aktivem Burst-Counter-Signal: ${output.validCounterPayloadCount}`);
  lines.push(`Payloads mit Log, aber flachen Burst-Countern: ${output.flatCounterPayloadCount}`);
  lines.push('');
  lines.push('## Kandidaten / Szenarien');
  lines.push('');
  lines.push('| Kandidat | Szenario | Samples | Valid | Risk | 16ms | 50ms | QT16 | QT50 | WorkletQ | BufferAck | PlanAck | Interpretation |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const row of output.byCandidateScenario) {
    lines.push(`| ${row.candidateId} | ${row.scenarioId} | ${row.samples} | ${row.validSamples} | ${row.maxRisk} | ${row.maxEvents16} | ${row.maxEvents50} | ${row.maxQuantizedTraffic16} | ${row.maxQuantizedTraffic50} | ${row.workletThroughputSamples} | ${row.maxWorkletStableLaneBufferAckCount} | ${row.maxWorkletStableLanePlanAckCount} | ${Object.keys(row.interpretations).join(' / ')} |`);
  }
  lines.push('');
  lines.push('## Lesart');
  lines.push('');
  if (output.validCounterPayloadCount === 0 && output.payloadCount > 0) {
    lines.push('Die Logs sind vorhanden, aber die maschinenlesbaren Burst-Counter bleiben flach. Das ist ein Messbefund: Der Test-/Recorderpfad erzeugt Diagnoseeinträge, aber die exportierten AudioTraffic-Fenster liefern noch keine differenzierende Burst-Zahl.');
  } else if (output.validCounterPayloadCount > 0) {
    lines.push('Mindestens ein Log enthält aktive Burst-Counter. Diese Reihen sind als technische Burst-Messung verwertbar; Audio-Recorder-Aufnahmen bleiben davon getrennt.');
  } else {
    lines.push('Es wurden keine verwertbaren Burst-Diagnose-Payloads gefunden.');
  }
  lines.push('');
  return lines.join('\n');
}

const inputPaths = positional.length ? positional : [process.cwd()];
const files = inputPaths.flatMap((input) => collectJsonFiles(input));
const payloadWraps = [];
const parseErrors = [];
for (const file of files) {
  try {
    payloadWraps.push(...unwrapPayloads(readJson(file), file));
  } catch (error) {
    parseErrors.push({ file, error: String(error?.message || error) });
  }
}
const payloadRows = payloadWraps.map(summarizePayload);
const byCandidateScenario = groupSummary(payloadRows);
const output = {
  kind: 'xensonar-burst-diagnosis-log-meter-summary',
  version: VERSION,
  generatedAtIso: new Date().toISOString(),
  inputPaths: inputPaths.map((input) => path.resolve(input)),
  fileCount: files.length,
  parseErrorCount: parseErrors.length,
  parseErrors,
  payloadCount: payloadRows.length,
  validCounterPayloadCount: payloadRows.filter((row) => row.validBurstCounterSignal).length,
  flatCounterPayloadCount: payloadRows.filter((row) => row.logPresentButCountersFlat).length,
  note: 'Normaler Audio-Recorder wird nicht als Burst-Beweis gelesen; diese Auswertung nutzt Burst-Diagnose-/AudioTraffic-Logs und markiert flache Counter ausdrücklich.',
  byCandidateScenario,
  rows: payloadRows,
};

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'burst_diagnosis_log_meter_summary.json'), JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'burst_diagnosis_log_meter_rows.csv'), rowsToCsv(payloadRows));
  fs.writeFileSync(path.join(outDir, 'burst_diagnosis_log_meter_report.md'), summaryToMarkdown(output));
}

if (hasFlag('--quiet')) process.exit(0);
console.log(JSON.stringify(output, null, 2));
