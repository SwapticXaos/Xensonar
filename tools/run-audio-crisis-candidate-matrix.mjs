#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDirDefault = path.resolve(root, 'diagnostics/audio_crisis_matrix');
const args = process.argv.slice(2);

const SCENARIOS = [
  { id: 'idle-baseline', warmupMs: 8000, measureMs: 30000 },
  { id: 'root-follow-solo', warmupMs: 10000, measureMs: 45000 },
  { id: 'root-follow-glissando', warmupMs: 10000, measureMs: 60000 },
  { id: 'particles-ringwaves', warmupMs: 10000, measureMs: 60000 },
  { id: 'wavestarter-firework', warmupMs: 8000, measureMs: 45000 },
  { id: 'combo-root-particle-wave', warmupMs: 12000, measureMs: 60000 },
  { id: 'full-lane-max-stress', warmupMs: 15000, measureMs: 60000 },
];

function getArg(flag, fallback = undefined) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function collectSelectionArgs(singularFlag, pluralFlag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === singularFlag || arg === pluralFlag) {
      const raw = args[index + 1] || '';
      values.push(...raw.split(',').map((value) => value.trim()).filter(Boolean));
    }
  }
  return [...new Set(values)];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function loadHistoricalProxySeedSummary(outDir) {
  const seedPath = path.join(outDir, 'historical_proxy_seed_runs.json');
  if (!fs.existsSync(seedPath)) {
    return { available: false, tableCount: 0, rowCount: 0, scoreUse: 'not-present' };
  }
  try {
    const seed = readJson(seedPath);
    const tables = Array.isArray(seed.tables) ? seed.tables : [];
    return {
      available: true,
      provenanceStatus: string(seed.provenanceStatus, 'unknown'),
      scoreUse: string(seed.scoreUse, 'unknown'),
      tableCount: tables.length,
      rowCount: tables.reduce((sum, table) => sum + (Array.isArray(table.rows) ? table.rows.length : 0), 0),
    };
  } catch (error) {
    return { available: true, parseError: String(error?.message || error), tableCount: 0, rowCount: 0, scoreUse: 'unreadable' };
  }
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function number(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function string(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function collectStressRows(payload, sourceFile, candidateId = null, repetitionIndex = null) {
  const rows = [];
  const metadataStress = payload?.metadata?.audioTraffic?.stressComparison;
  if (metadataStress) rows.push({ sourceFile, source: 'metadata', stress: metadataStress, payload, candidateId, repetitionIndex });
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  for (const [index, entry] of entries.entries()) {
    const stress = entry?.audioTraffic?.stressComparison;
    if (stress) rows.push({ sourceFile, source: `entry:${index}:${entry.kind ?? 'unknown'}`, stress, payload, candidateId, repetitionIndex });
  }
  return rows;
}

function mostFrequent(map) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0]?.[0] ?? '';
}

function summarizeByCandidate(rows) {
  const groups = new Map();
  for (const row of rows) {
    const candidateId = row.candidateId ?? string(row.payload?.metadata?.candidateId, 'unknown-candidate');
    const scenarioId = string(row.stress.scenarioId, string(row.payload?.metadata?.burstStressScenarioId, 'manual-unlabeled'));
    const key = `${candidateId}::${scenarioId}`;
    const group = groups.get(key) ?? {
      candidateId,
      scenarioId,
      samples: 0,
      maxBurstRiskScore: 0,
      minRobustnessScore: null,
      maxRobustnessScore: 0,
      maxMusicalPreservationScore: 0,
      minMusicalPreservationScore: null,
      minRestrictionCostScore: null,
      maxRestrictionCostScore: 0,
      maxEventsPer16Ms: 0,
      maxEventsPer50Ms: 0,
      maxRootFollowEventsPer16Ms: 0,
      maxParticleEventsPer16Ms: 0,
      maxWaveStarterEventsPer16Ms: 0,
      primaryCandidateMuteEvents: 0,
      readoutCounts: {},
      healthCounts: {},
    };
    const risk = number(row.stress.burstRiskScore);
    const robustness = number(row.stress.robustnessScore);
    const preservation = number(row.stress.musicalPreservationScore);
    const restriction = number(row.stress.restrictionCostScore);
    group.samples += 1;
    group.maxBurstRiskScore = Math.max(group.maxBurstRiskScore, risk);
    group.maxRobustnessScore = Math.max(group.maxRobustnessScore, robustness);
    group.minRobustnessScore = group.minRobustnessScore === null ? robustness : Math.min(group.minRobustnessScore, robustness);
    group.maxMusicalPreservationScore = Math.max(group.maxMusicalPreservationScore, preservation);
    group.minMusicalPreservationScore = group.minMusicalPreservationScore === null ? preservation : Math.min(group.minMusicalPreservationScore, preservation);
    group.minRestrictionCostScore = group.minRestrictionCostScore === null ? restriction : Math.min(group.minRestrictionCostScore, restriction);
    group.maxRestrictionCostScore = Math.max(group.maxRestrictionCostScore, restriction);
    group.maxEventsPer16Ms = Math.max(group.maxEventsPer16Ms, number(row.stress.maxEventsPer16Ms));
    group.maxEventsPer50Ms = Math.max(group.maxEventsPer50Ms, number(row.stress.maxEventsPer50Ms));
    group.maxRootFollowEventsPer16Ms = Math.max(group.maxRootFollowEventsPer16Ms, number(row.stress.maxRootFollowEventsPer16Ms));
    group.maxParticleEventsPer16Ms = Math.max(group.maxParticleEventsPer16Ms, number(row.stress.maxParticleEventsPer16Ms));
    group.maxWaveStarterEventsPer16Ms = Math.max(group.maxWaveStarterEventsPer16Ms, number(row.stress.maxWaveStarterEventsPer16Ms));
    group.primaryCandidateMuteEvents += number(row.stress.primaryCandidateMuteEvents);
    const readout = string(row.stress.browserOptimizedReadout, 'unknown');
    group.readoutCounts[readout] = (group.readoutCounts[readout] ?? 0) + 1;
    const health = string(row.stress.workletPilotHealth, string(row.stress.workletStatus, 'unknown'));
    group.healthCounts[health] = (group.healthCounts[health] ?? 0) + 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.candidateId.localeCompare(b.candidateId) || a.scenarioId.localeCompare(b.scenarioId));
}

function summarizeByBrowserScenarioEngine(rows) {
  const groups = new Map();
  for (const row of rows) {
    const candidateId = row.candidateId ?? string(row.payload?.metadata?.candidateId, 'unknown-candidate');
    const browserId = string(row.stress?.browserProfile?.browserId, string(row.payload?.metadata?.burstStressBrowserProfile?.browserId, 'unknown-browser'));
    const scenarioId = string(row.stress.scenarioId, string(row.payload?.metadata?.burstStressScenarioId, 'manual-unlabeled'));
    const engineMode = string(row.stress.rootFollowVoiceEngineMode, 'unknown-engine');
    const key = `${browserId}::${scenarioId}::${candidateId}::${engineMode}`;
    const group = groups.get(key) ?? {
      browserId,
      scenarioId,
      candidateId,
      engineMode,
      samples: 0,
      maxBurstRiskScore: 0,
      minRobustnessScore: null,
      maxMusicalPreservationScore: 0,
      maxRestrictionCostScore: 0,
      maxEventsPer16Ms: 0,
      maxRootFollowEventsPer16Ms: 0,
      maxParticleEventsPer16Ms: 0,
      maxWaveStarterEventsPer16Ms: 0,
      primaryCandidateMuteEvents: 0,
    };
    group.samples += 1;
    group.maxBurstRiskScore = Math.max(group.maxBurstRiskScore, number(row.stress.burstRiskScore));
    const robustness = number(row.stress.robustnessScore);
    group.minRobustnessScore = group.minRobustnessScore === null ? robustness : Math.min(group.minRobustnessScore, robustness);
    group.maxMusicalPreservationScore = Math.max(group.maxMusicalPreservationScore, number(row.stress.musicalPreservationScore));
    group.maxRestrictionCostScore = Math.max(group.maxRestrictionCostScore, number(row.stress.restrictionCostScore));
    group.maxEventsPer16Ms = Math.max(group.maxEventsPer16Ms, number(row.stress.maxEventsPer16Ms));
    group.maxRootFollowEventsPer16Ms = Math.max(group.maxRootFollowEventsPer16Ms, number(row.stress.maxRootFollowEventsPer16Ms));
    group.maxParticleEventsPer16Ms = Math.max(group.maxParticleEventsPer16Ms, number(row.stress.maxParticleEventsPer16Ms));
    group.maxWaveStarterEventsPer16Ms = Math.max(group.maxWaveStarterEventsPer16Ms, number(row.stress.maxWaveStarterEventsPer16Ms));
    group.primaryCandidateMuteEvents += number(row.stress.primaryCandidateMuteEvents);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.browserId.localeCompare(b.browserId) || a.scenarioId.localeCompare(b.scenarioId) || a.candidateId.localeCompare(b.candidateId));
}

function writeSummaries(outDir, rawRuns) {
  const rows = [];
  for (const run of rawRuns) {
    if (run.payload) rows.push(...collectStressRows(run.payload, run.outputFile ?? run.runId, run.candidateId, run.repetitionIndex));
  }
  const byCandidate = summarizeByCandidate(rows);
  const byBrowserScenarioEngine = summarizeByBrowserScenarioEngine(rows);
  writeJson(path.join(outDir, 'raw_runs.json'), rawRuns);
  writeText(path.join(outDir, 'summary_by_candidate.csv'), [
    'candidateId,scenarioId,samples,maxBurstRiskScore,minRobustnessScore,maxMusicalPreservationScore,maxRestrictionCostScore,maxEventsPer16Ms,maxRootFollowEventsPer16Ms,maxParticleEventsPer16Ms,maxWaveStarterEventsPer16Ms,primaryCandidateMuteEvents,readout,workletHealth',
    ...byCandidate.map((row) => [
      row.candidateId, row.scenarioId, row.samples, row.maxBurstRiskScore, row.minRobustnessScore ?? '', row.maxMusicalPreservationScore,
      row.maxRestrictionCostScore, row.maxEventsPer16Ms, row.maxRootFollowEventsPer16Ms, row.maxParticleEventsPer16Ms,
      row.maxWaveStarterEventsPer16Ms, row.primaryCandidateMuteEvents, mostFrequent(row.readoutCounts), mostFrequent(row.healthCounts),
    ].map(csvEscape).join(',')),
  ].join('\n') + '\n');
  writeText(path.join(outDir, 'summary_by_browser_scenario_engine.csv'), [
    'browserId,scenarioId,candidateId,engineMode,samples,maxBurstRiskScore,minRobustnessScore,maxMusicalPreservationScore,maxRestrictionCostScore,maxEventsPer16Ms,maxRootFollowEventsPer16Ms,maxParticleEventsPer16Ms,maxWaveStarterEventsPer16Ms,primaryCandidateMuteEvents',
    ...byBrowserScenarioEngine.map((row) => [
      row.browserId, row.scenarioId, row.candidateId, row.engineMode, row.samples, row.maxBurstRiskScore, row.minRobustnessScore ?? '',
      row.maxMusicalPreservationScore, row.maxRestrictionCostScore, row.maxEventsPer16Ms, row.maxRootFollowEventsPer16Ms,
      row.maxParticleEventsPer16Ms, row.maxWaveStarterEventsPer16Ms, row.primaryCandidateMuteEvents,
    ].map(csvEscape).join(',')),
  ].join('\n') + '\n');
  const dominatedText = rows.length ? computeDominatedCandidatesMarkdown(byCandidate) : '## Dominated Candidates\n\nKeine realen Stress‑Rows vorhanden. Dominanzanalyse wurde nicht durchgeführt.\n';
  writeText(path.join(outDir, 'dominated_candidates.md'), dominatedText);
  writeText(path.join(outDir, 'recommended_defaults.md'), buildRecommendationMarkdown(byCandidate, rows.length));
  return { stressRows: rows.length, byCandidate, byBrowserScenarioEngine };
}

function computeDominatedCandidatesMarkdown(byCandidate) {
  const dominated = [];
  for (const candidate of byCandidate) {
    const competitors = byCandidate.filter((other) => other.scenarioId === candidate.scenarioId && other.candidateId !== candidate.candidateId);
    const winner = competitors.find((other) => (
      other.maxBurstRiskScore <= candidate.maxBurstRiskScore
      && (other.minRobustnessScore ?? 0) >= (candidate.minRobustnessScore ?? 0)
      && other.maxMusicalPreservationScore >= candidate.maxMusicalPreservationScore
      && other.maxRestrictionCostScore <= candidate.maxRestrictionCostScore
      && (other.maxBurstRiskScore < candidate.maxBurstRiskScore
        || other.maxMusicalPreservationScore > candidate.maxMusicalPreservationScore
        || other.maxRestrictionCostScore < candidate.maxRestrictionCostScore)
    ));
    if (winner) dominated.push({ candidate, winner });
  }
  return [
    '## Dominated Candidates',
    '',
    dominated.length ? 'Diese Kandidaten wurden in mindestens einem Szenario eindeutig übertroffen:' : 'Keine eindeutige Dominanz gefunden.',
    '',
    ...dominated.map(({ candidate, winner }) => `- ${candidate.candidateId} / ${candidate.scenarioId}: dominiert von ${winner.candidateId}.`),
    '',
  ].join('\n');
}

function buildRecommendationMarkdown(byCandidate, stressRows) {
  if (!stressRows) {
    return [
      '## Empfohlene Standardkonfigurationen',
      '',
      'Keine realen Stress‑Rows vorhanden. Der Runner hat nur Matrix, Hooks und Auswertungsstruktur vorbereitet.',
      '',
      'Für belastbare Empfehlungen müssen Kandidaten und Szenarien im Zielbrowser mit aktiviertem Audio ausgeführt werden. Danach kann diese Datei aus den exportierten Logs neu erzeugt werden.',
      '',
    ].join('\n');
  }
  const scored = byCandidate.map((row) => {
    const robustness = row.minRobustnessScore ?? row.maxRobustnessScore ?? 0;
    const preservation = row.maxMusicalPreservationScore ?? 0;
    const restriction = row.maxRestrictionCostScore ?? 0;
    const risk = row.maxBurstRiskScore ?? 0;
    const score = 0.32 * robustness + 0.34 * preservation - 0.22 * restriction - 0.12 * risk;
    return { ...row, score };
  }).sort((a, b) => b.score - a.score);
  const defaultCandidate = scored.find((row) => !row.candidateId.includes('strict') && !row.candidateId.startsWith('O')) ?? scored[0];
  const liveCandidate = scored.find((row) => row.candidateId.includes('live') || row.candidateId.includes('pressure_safe')) ?? defaultCandidate;
  const densityCandidate = scored.find((row) => row.candidateId.includes('studio_density') || row.candidateId.includes('open_687')) ?? defaultCandidate;
  return [
    '## Empfohlene Standardkonfigurationen',
    '',
    `Default‑Kandidat: ${defaultCandidate?.candidateId ?? '—'}`,
    '',
    `Live‑Schutz‑Kandidat: ${liveCandidate?.candidateId ?? '—'}`,
    '',
    `Dichte‑/Studio‑Kandidat: ${densityCandidate?.candidateId ?? '—'}`,
    '',
    'Diese Empfehlung ist eine numerische Annäherung aus Burst‑Risiko, Robustheit, musikalischer Erhaltung und Restriktionskosten. Sie ersetzt keinen Hörtest.',
    '',
  ].join('\n');
}

function buildRunPlan(candidates, scenarios, repetitions, measureScale) {
  const plan = [];
  for (const candidate of candidates) {
    for (const scenario of scenarios) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        plan.push({
          runId: `${candidate.id}__${scenario.id}__r${repetition}`,
          candidateId: candidate.id,
          scenarioId: scenario.id,
          repetitionIndex: repetition,
          warmupMs: Math.round(scenario.warmupMs * measureScale),
          measureMs: Math.round(scenario.measureMs * measureScale),
          candidate,
        });
      }
    }
  }
  return plan;
}

function validateCandidateMatrix(candidates) {
  const required = ['id', 'stylePreset', 'particlePreset', 'waveStarterPreset', 'rootFollowVoiceEngineMode'];
  const ids = new Set();
  const problems = [];
  for (const [index, candidate] of candidates.entries()) {
    for (const key of required) {
      if (!candidate[key]) problems.push(`candidate[${index}] missing ${key}`);
    }
    if (ids.has(candidate.id)) problems.push(`duplicate candidate id ${candidate.id}`);
    ids.add(candidate.id);
  }
  return problems;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`timeout while waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result ?? {});
        return;
      }
      this.events.push(message);
    };
  }
  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (event) => reject(new Error(`CDP WebSocket error ${event?.message ?? ''}`));
    });
  }
  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function launchChromium(argsForBrowser) {
  const port = Number(argsForBrowser.remoteDebuggingPort ?? 9223);
  const chromeBin = argsForBrowser.chromeBin
    ?? process.env.XENSONAR_CHROME_BIN
    ?? process.env.CHROME_BIN
    ?? '/usr/bin/chromium';
  const userDataDir = argsForBrowser.userDataDir ?? path.resolve(root, '.tmp/xensonar-crisis-chromium-profile');
  fs.mkdirSync(userDataDir, { recursive: true });
  const child = spawn(chromeBin, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    argsForBrowser.headful ? '' : '--headless=new',
    'about:blank',
  ].filter(Boolean), { stdio: ['ignore', 'pipe', 'pipe'] });
  await waitFor(async () => {
    try { return await httpGetJson(`http://127.0.0.1:${port}/json/version`); }
    catch { return null; }
  }, 12000, 'Chromium remote debugging endpoint');
  return { child, port };
}

async function attachToPage(cdp, url) {
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const attach = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attach.sessionId;
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await sleep(1500);
  return sessionId;
}

async function evaluate(cdp, sessionId, expression, timeoutMs = 30000) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs,
  }, sessionId);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}

async function applyScenarioStimulus(cdp, sessionId, scenarioId, measureMs) {
  const durationMs = Math.max(1000, Math.min(measureMs, 12000));
  const expression = `(() => new Promise((resolve) => {\n    const end = performance.now() + ${durationMs};\n    let i = 0;\n    const keys = ['a','s','d','f','j','k','l',';'];\n    const tick = () => {\n      const x = 80 + ((i * 37) % Math.max(200, window.innerWidth - 160));\n      const y = 120 + ((i * 53) % Math.max(180, window.innerHeight - 240));\n      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));\n      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: x, clientY: y }));\n      if (${JSON.stringify(scenarioId)} !== 'idle-baseline' && i % 4 === 0) {\n        const key = keys[i % keys.length];\n        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));\n        window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));\n      }\n      i += 1;\n      if (performance.now() < end) window.setTimeout(tick, 33);\n      else resolve({ stimulusEvents: i, scenarioId: ${JSON.stringify(scenarioId)} });\n    };\n    tick();\n  }))()`;
  return evaluate(cdp, sessionId, expression, durationMs + 5000);
}

async function runBrowserMatrix(plan, options) {
  const url = options.url ?? (options.html ? `file://${path.resolve(root, options.html)}` : null);
  if (!url) throw new Error('browser mode requires --url or --html');
  const launch = await launchChromium(options);
  let cdp;
  const rawRuns = [];
  try {
    const version = await httpGetJson(`http://127.0.0.1:${launch.port}/json/version`);
    cdp = new CdpClient(version.webSocketDebuggerUrl);
    await cdp.ready();
    const sessionId = await attachToPage(cdp, url);
    await waitFor(() => evaluate(cdp, sessionId, 'Boolean(window.__xensonarPerformanceCrisisHarness && window.__xensonarBurstStressHarness)', 1000), 30000, 'Xensonar harness bridge');
    if (options.manualArmingMs > 0) await sleep(options.manualArmingMs);
    for (const item of plan) {
      await evaluate(cdp, sessionId, `window.__xensonarPerformanceCrisisHarness.applyCandidate(${JSON.stringify(item.candidate)})`);
      await evaluate(cdp, sessionId, `window.__xensonarBurstStressHarness.setScenario(${JSON.stringify(item.scenarioId)})`);
      await evaluate(cdp, sessionId, 'window.__xensonarBurstStressHarness.clear(); window.__xensonarBurstStressHarness.start(); true');
      await sleep(item.warmupMs);
      const stimulus = options.stimulus === 'none' ? { skipped: true } : await applyScenarioStimulus(cdp, sessionId, item.scenarioId, item.measureMs);
      if (options.stimulus === 'none') await sleep(item.measureMs);
      await evaluate(cdp, sessionId, 'window.__xensonarBurstStressHarness.stop(); true');
      const payload = await evaluate(cdp, sessionId, `window.__xensonarBurstStressHarness.exportPayload(${JSON.stringify({
        candidateId: item.candidateId,
        candidateConfig: item.candidate,
        runId: item.runId,
        repetitionIndex: item.repetitionIndex,
        harnessStimulus: stimulus,
        version: '3.2.91.6.9.102',
      })})`, 30000);
      const outputFile = path.join(options.outDir, 'browser_runs', `${item.runId}.json`);
      writeJson(outputFile, payload);
      rawRuns.push({ ...item, status: 'completed', outputFile: path.relative(options.outDir, outputFile), payload });
    }
  } finally {
    cdp?.close();
    try { launch.child.kill('SIGTERM'); } catch {}
  }
  return rawRuns;
}

function printUsage() {
  console.log(`Usage:\n  node tools/run-audio-crisis-candidate-matrix.mjs --dry-run\n  node tools/run-audio-crisis-candidate-matrix.mjs --from-logs logs/*.json\n  node tools/run-audio-crisis-candidate-matrix.mjs --url http://127.0.0.1:5173 --browser --repetitions 2\n\nOptions:\n  --out <dir>                  Output directory. Default diagnostics/audio_crisis_matrix\n  --matrix <file>              Candidate matrix JSON.\n  --scenario <id>              Limit to one scenario; can be repeated.\n  --candidate <id>             Limit to one candidate; can be repeated.\n  --repetitions <n>            Runs per candidate/scenario. Default 2 for browser, 1 for dry-run.\n  --measure-scale <n>          Multiplies scenario warmup/measure duration. Default 1.\n  --stimulus none|pointer-key  Browser stimulus mode. Default pointer-key.\n  --manual-arming-ms <n>       Wait after page load for manual audio setup.\n`);
}

async function main() {
  if (hasFlag('--help')) {
    printUsage();
    return;
  }
  const outDir = path.resolve(root, getArg('--out', path.relative(root, outDirDefault)));
  const matrixPath = path.resolve(root, getArg('--matrix', 'diagnostics/audio_crisis_matrix/crisis_candidate_matrix.json'));
  const candidatesAll = readJson(matrixPath);
  const problems = validateCandidateMatrix(candidatesAll);
  if (problems.length) {
    throw new Error(`candidate matrix invalid:\n${problems.join('\n')}`);
  }
  const selectedCandidateIds = collectSelectionArgs('--candidate', '--candidates');
  const selectedScenarioIds = collectSelectionArgs('--scenario', '--scenarios');
  const candidates = selectedCandidateIds.length ? candidatesAll.filter((candidate) => selectedCandidateIds.includes(candidate.id)) : candidatesAll;
  const scenarios = selectedScenarioIds.length ? SCENARIOS.filter((scenario) => selectedScenarioIds.includes(scenario.id)) : SCENARIOS;
  const repetitions = Number(getArg('--repetitions', hasFlag('--browser') ? '2' : '1'));
  const measureScale = Number(getArg('--measure-scale', '1'));
  const plan = buildRunPlan(candidates, scenarios, repetitions, measureScale);
  writeJson(path.join(outDir, 'candidate_run_plan.json'), {
    generatedAtIso: new Date().toISOString(),
    mode: hasFlag('--browser') ? 'browser' : hasFlag('--from-logs') ? 'from-logs' : 'dry-run',
    candidateCount: candidates.length,
    scenarioCount: scenarios.length,
    repetitions,
    measureScale,
    runCount: plan.length,
    runs: plan.map(({ candidate, ...rest }) => ({ ...rest, candidateId: candidate.id })),
  });

  let rawRuns = [];
  if (hasFlag('--from-logs')) {
    const logPaths = args.filter((arg, index) => index > args.indexOf('--from-logs') && !arg.startsWith('--'));
    rawRuns = logPaths.map((logPath, index) => ({
      runId: `imported_${index + 1}`,
      candidateId: string(readJson(logPath)?.metadata?.candidateId, 'unknown-candidate'),
      scenarioId: string(readJson(logPath)?.metadata?.burstStressScenarioId, 'manual-unlabeled'),
      repetitionIndex: index + 1,
      status: 'imported',
      outputFile: logPath,
      payload: readJson(logPath),
    }));
  } else if (hasFlag('--browser')) {
    rawRuns = await runBrowserMatrix(plan, {
      outDir,
      url: getArg('--url'),
      html: getArg('--html'),
      headful: hasFlag('--headful'),
      chromeBin: getArg('--chrome-bin'),
      remoteDebuggingPort: getArg('--remote-debugging-port'),
      userDataDir: getArg('--user-data-dir'),
      stimulus: getArg('--stimulus', 'pointer-key'),
      manualArmingMs: Number(getArg('--manual-arming-ms', '0')),
    });
  } else {
    // Dry-run writes candidate_run_plan.json only. Keep raw_runs.json reserved for real/imported browser payloads.
    rawRuns = [];
  }

  const summary = writeSummaries(outDir, rawRuns);
  const historicalProxySeedSummary = loadHistoricalProxySeedSummary(outDir);
  writeText(path.join(outDir, 'agent_run_report.md'), [
    '# Audio Crisis Candidate Matrix Runner',
    '',
    `Mode: ${hasFlag('--browser') ? 'browser' : hasFlag('--from-logs') ? 'from-logs' : 'dry-run'}`,
    '',
    `Kandidaten: ${candidates.length}`,
    '',
    `Szenarien: ${scenarios.length}`,
    '',
    `Geplante Läufe: ${plan.length}`,
    '',
    `Stress-Rows: ${summary.stressRows}`,
    '',
    `Historische Proxy-Seeds: ${historicalProxySeedSummary.available ? `${historicalProxySeedSummary.tableCount} Tabellen / ${historicalProxySeedSummary.rowCount} Zeilen · ${historicalProxySeedSummary.scoreUse}` : 'nicht vorhanden'}`,
    '',
    historicalProxySeedSummary.available ? 'Historische Proxy-Seeds werden nur als Reproduktionshypothesen angezeigt und nicht in echte Scores gemischt.' : 'Keine historischen Proxy-Seeds gefunden.',
    '',
    summary.stressRows ? 'Die CSV- und Empfehlungsausgaben wurden aus realen/exportierten Stress-Rows erzeugt.' : 'Es wurden keine realen Stress-Rows erzeugt. Die Dateien bilden nur Plan, Matrix und Auswertungsstruktur.',
    '',
  ].join('\n'));
  console.log(JSON.stringify({ ok: true, outDir, runCount: plan.length, stressRows: summary.stressRows }, null, 2));
}

main().catch((error) => {
  console.error(`[audio-crisis-candidate-matrix] ${error.stack || error.message}`);
  process.exit(1);
});
