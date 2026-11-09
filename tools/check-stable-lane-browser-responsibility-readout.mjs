#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const byPrefix = args.find((value) => value.startsWith(prefix));
  if (byPrefix) return byPrefix.slice(prefix.length);
  const index = args.findIndex((value) => value === `--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

const positionalFile = args.find((value) => !value.startsWith('--'));
const htmlFile = path.resolve(root, readArg('file', positionalFile ?? 'dist/index.html'));
const chromiumBinary = readArg('chromium', process.env.CHROMIUM_BIN ?? '/usr/bin/chromium');
const reportsDir = path.resolve(root, readArg('report-dir', 'reports'));
const reportFile = path.resolve(reportsDir, 'stable-lane-browser-responsibility-readout.json');
const timeoutMs = Number(readArg('timeout-ms', process.env.XENSONAR_BROWSER_PROBE_TIMEOUT_MS ?? '25000'));
const strictUi = args.includes('--strict-ui') || process.env.XENSONAR_BROWSER_PROBE_STRICT_UI === '1';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
]);

function fail(message, details = {}) {
  console.error(`[xensonar-browser-responsibility-readout] ${message}`);
  if (Object.keys(details).length > 0) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assert(condition, message, details = {}) {
  if (!condition) fail(message, details);
}

function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function applyCoopCoepHeaders(response) {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Origin-Agent-Cluster', '?1');
  response.setHeader('Cache-Control', 'no-store');
}

function createCoopCoepServer({ host, port, htmlFilePath }) {
  const htmlDir = path.dirname(htmlFilePath);
  const htmlName = path.basename(htmlFilePath);

  function safeResolveRequestPath(urlPathname) {
    const decoded = decodeURIComponent(urlPathname);
    const relative = decoded === '/' ? htmlName : decoded.replace(/^\/+/, '');
    const candidate = path.resolve(htmlDir, relative);
    const relativeToHtmlDir = path.relative(htmlDir, candidate);
    if (relativeToHtmlDir.startsWith('..') || path.isAbsolute(relativeToHtmlDir)) return null;
    return candidate;
  }

  const server = http.createServer((request, response) => {
    applyCoopCoepHeaders(response);
    const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);

    if (requestUrl.pathname === '/__xensonar_browser_responsibility_probe.json') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({
        ok: true,
        purpose: 'xensonar-browser-visible-stable-lane-responsibility-readout-probe',
        htmlFile: htmlFilePath,
        expectedUiReadout: 'root-follow voice engine plus responsibility readout fields visible in browser runtime',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Origin-Agent-Cluster': '?1',
        },
      }, null, 2));
      return;
    }

    const filePath = safeResolveRequestPath(requestUrl.pathname);
    const resolvedFile = filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : htmlFilePath;
    const ext = path.extname(resolvedFile).toLowerCase();
    response.setHeader('Content-Type', mimeTypes.get(ext) ?? 'application/octet-stream');
    fs.createReadStream(resolvedFile)
      .on('error', (error) => {
        response.statusCode = 500;
        response.end(`[xensonar-browser-responsibility-readout] Failed to read ${resolvedFile}: ${error.message}`);
      })
      .pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.setTimeout(1500, () => request.destroy(new Error(`Timeout fetching ${url}`)));
  });
}

async function waitForDevTools(debugPort, deadlineMs) {
  const versionUrl = `http://127.0.0.1:${debugPort}/json/version`;
  let lastError = null;
  while (Date.now() < deadlineMs) {
    try {
      return await httpGetJson(versionUrl);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw lastError ?? new Error('DevTools endpoint did not become available');
}

class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws = new WebSocket(webSocketUrl);
    this.ws.addEventListener('message', (event) => this.handleMessage(event));
  }

  waitOpen() {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', () => reject(new Error('CDP WebSocket failed to open')), { once: true });
    });
  }

  handleMessage(event) {
    const payload = JSON.parse(String(event.data));
    if (payload.id && this.pending.has(payload.id)) {
      const { resolve, reject } = this.pending.get(payload.id);
      this.pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message ?? JSON.stringify(payload.error)));
      else resolve(payload.result ?? {});
      return;
    }
    if (payload.method) {
      const listeners = this.listeners.get(payload.method) ?? [];
      for (const listener of listeners) listener(payload.params ?? {}, payload.sessionId);
    }
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const message = sessionId ? { id, method, params, sessionId } : { id, method, params };
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify(message));
    return promise;
  }

  once(method, predicate = () => true, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(method, listener);
        reject(new Error(`Timed out waiting for CDP event ${method}`));
      }, timeout);
      const listener = (params, sessionId) => {
        if (!predicate(params, sessionId)) return;
        clearTimeout(timer);
        this.off(method, listener);
        resolve({ params, sessionId });
      };
      this.on(method, listener);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  off(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    this.listeners.set(method, listeners.filter((entry) => entry !== listener));
  }

  close() {
    this.ws.close();
  }
}

async function probeBrowser({ url, chromiumBinaryPath, debugPort, timeout }) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xensonar-browser-sab-'));
  const chromiumArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];
  const chromium = spawn(chromiumBinaryPath, chromiumArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  chromium.stderr.on('data', (chunk) => { stderr += String(chunk); });

  let client = null;
  const cleanup = async () => {
    try { client?.close(); } catch {}
    if (!chromium.killed) chromium.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 100));
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  };

  try {
    const deadline = Date.now() + timeout;
    const version = await waitForDevTools(debugPort, deadline);
    client = new CdpClient(version.webSocketDebuggerUrl);
    await client.waitOpen();
    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    const loadEvent = client.once('Page.loadEventFired', () => true, Math.max(4000, timeout - 5000));
    await client.send('Page.navigate', { url }, sessionId);
    await loadEvent;
    await new Promise((resolve) => setTimeout(resolve, 900));

    const expression = `(() => new Promise((resolve) => {
      const finish = () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toggle = buttons.find((button) => /Management anzeigen/.test(button.textContent || ''));
        if (toggle) toggle.click();
        window.setTimeout(() => {
          const lines = (document.body.innerText || '')
            .split('\\n')
            .map((line) => line.trim())
            .filter(Boolean);
          const valueAfterLabel = (label) => {
            const index = lines.findIndex((line) => line === label);
            return index >= 0 ? (lines[index + 1] || null) : null;
          };
          const readoutRoot = document.querySelector('[data-root-follow-legacy-relief-gate-readout]');
          const voiceSelect = document.querySelector('select[aria-label="Root-Follow Voice Engine wählen"]');
          resolve({
            locationHref: window.location.href,
            protocol: window.location.protocol,
            isSecureContext: window.isSecureContext === true,
            crossOriginIsolated: window.crossOriginIsolated === true,
            sharedArrayBufferType: typeof window.SharedArrayBuffer,
            liveSabReadiness: window.__XENSONAR_STABLE_LANE_SAB_READINESS__ || null,
            liveResponsibilityReadout: window.__XENSONAR_STABLE_LANE_RESPONSIBILITY_READOUT__ || null,
            liveBootProbe: window.__XENSONAR_STABLE_LANE_BOOT_PROBE__ || null,
            liveAudioProbe: window.__XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__ || null,
            liveSyntheticSilentPlanProbe: window.__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__ || null,
            liveStressScenarioHarness: window.__XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__ || null,
            liveStableLaneABReport: window.__XENSONAR_STABLE_LANE_AB_REPORT__ || null,
            liveClickBurstProxyReport: window.__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__ || null,
            liveRootMaterialReliefProofReport: window.__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__ || null,
            liveExpressivePressureAddOnReport: window.__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__ || null,
            liveSabDifferentialReport: window.__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__ || null,
            liveStableLaneLiveDeliveryProofReport: window.__XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__ || null,
            liveHolisticVoicePoolFallbackReport: window.__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__ || null,
            liveHolisticPressureBudgetPolicy: window.__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__ || null,
            liveHolisticCapacityFirstAdmissionGuard: window.__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__ || null,
            liveWaveStarterVoicePoolReport: window.__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__ || null,
            liveWaveStarterWorkletPilotReport: window.__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__ || null,
            liveWaveStarterParallelMixAbGuard: window.__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__ || null,
            liveWaveStarterPressureScenario: window.__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__ || null,
            liveWaveStarterPilotGainStabilityReport: window.__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__ || null,
            liveWaveStarterVoiceSpecFailoverContract: window.__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__ || null,
            liveWaveStarterSynthFailoverCandidate: window.__XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE__ || null,
            liveWaveStarterSampleBufferTokenShadow: window.__XENSONAR_WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW__ || null,
            liveWaveStarterSampleFailoverCandidate: window.__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE__ || null,
            liveParticleVoicePoolReport: window.__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__ || null,
            ui: {
              rootFound: Boolean(readoutRoot),
              rootLiveSabReadinessAttribute: readoutRoot?.getAttribute('data-root-follow-live-sab-readiness') || null,
              rootResponsibilityAttribute: readoutRoot?.getAttribute('data-root-follow-browser-responsibility-readout') || null,
              rootResponsibilityVoiceEngineAttribute: readoutRoot?.getAttribute('data-root-follow-browser-responsibility-voice-engine') || null,
              rootResponsibilityPlanTransportAttribute: readoutRoot?.getAttribute('data-root-follow-browser-responsibility-plan-transport') || null,
              rootFollowVoiceEngineSelectValue: voiceSelect?.value || null,
              legacyReliefGate: valueAfterLabel('Legacy-Relief Gate'),
              stableLane: valueAfterLabel('Stable Lane'),
              frameDelta: valueAfterLabel('Frame-Delta'),
              laneQuanta: valueAfterLabel('Lane-Quanten'),
              planTransport: valueAfterLabel('Plan-Transport'),
              sabReadiness: valueAfterLabel('SAB-Readiness'),
              bootProbe: valueAfterLabel('Boot-Probe'),
              audioProbe: valueAfterLabel('Audio-Probe'),
              audioContext: valueAfterLabel('AudioContext'),
              silentPlanProbe: valueAfterLabel('Silent-Plan Probe'),
              stressHarness: valueAfterLabel('Stress-Harness'),
              abReport: valueAfterLabel('A/B-Report'),
              clickBurstProxy: valueAfterLabel('Click/Burst Proxy'),
              reliefProof: valueAfterLabel('Relief-Proof'),
              expressivePressure: valueAfterLabel('Expressive Pressure'),
              sabDifferential: valueAfterLabel('SAB-Differenz'),
              liveDeliveryProof: valueAfterLabel('Live-Ankunft'),
              holisticVoicePool: valueAfterLabel('Voice-Pool Gesamt'),
              pressurePolicy: valueAfterLabel('Pressure-Policy'),
              capacityGuard: valueAfterLabel('Capacity-Guard'),
              waveStarterVoicePool: valueAfterLabel('Wellenstarter Pool'),
              waveStarterWorkletPilot: valueAfterLabel('Wellenstarter Worklet'),
              waveStarterParallelMixAbGuard: valueAfterLabel('Wellenstarter A/B'),
              waveStarterPressureScenario: valueAfterLabel('Wellenstarter Druck'),
              waveStarterPilotGainStability: valueAfterLabel('Wellenstarter Pilot-Stabilität'),
              waveStarterVoiceSpecFailoverContract: valueAfterLabel('Wellenstarter VoiceSpec'),
              waveStarterSynthFailoverCandidate: valueAfterLabel('Wellenstarter Synth-Failover'),
              waveStarterSampleBufferTokenShadow: valueAfterLabel('Wellenstarter Sample-Token'),
              particleVoicePool: valueAfterLabel('Partikel Pool'),
              reliefEvents: valueAfterLabel('Relief Events'),
              blend: valueAfterLabel('Blend L/S'),
              responsibilityLayerText: readoutRoot?.innerText || null,
            },
            bodyTextHead: (document.body.innerText || '').slice(0, 3000),
          });
        }, 350);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', finish, { once: true });
      } else {
        finish();
      }
    }))()`;

    const evaluated = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    return { result: evaluated.result?.value ?? null, chromiumStderr: stderr.slice(-3000) };
  } finally {
    await cleanup();
  }
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  fail(`Invalid timeout: ${timeoutMs}`);
}
assert(fs.existsSync(htmlFile), `HTML file not found: ${htmlFile}. Build first, for example: npm run patch:html`);
assert(fs.existsSync(chromiumBinary), `Chromium binary not found: ${chromiumBinary}`);

const host = '127.0.0.1';
const serverPort = await findFreePort(host);
const debugPort = await findFreePort(host);
const server = await createCoopCoepServer({ host, port: serverPort, htmlFilePath: htmlFile });
const url = `http://${host}:${serverPort}/`;
let probe = null;
try {
  probe = await probeBrowser({ url, chromiumBinaryPath: chromiumBinary, debugPort, timeout: timeoutMs });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const result = probe?.result ?? null;
fs.mkdirSync(reportsDir, { recursive: true });
const browserPolicyBlocked = result?.locationHref?.startsWith('chrome-error://')
  && /organization|blocked/i.test(String(result?.bodyTextHead ?? ''));

const report = {
  ok: !browserPolicyBlocked,
  generatedAt: new Date().toISOString(),
  htmlFile,
  servedUrl: url,
  chromiumBinary,
  browserResult: result,
  classification: browserPolicyBlocked ? 'browser-navigation-blocked-by-policy' : 'xensonar-ui-probed',
  note: browserPolicyBlocked
    ? 'The headless browser was prevented by managed browser policy before reaching Xensonar. This is a browser/harness environment result, not a Xensonar UI-readout result.'
    : 'This report reflects what the headless Chromium browser sees after opening Performance & Krisenmanagement and reading the full Root-Follow responsibility layer readout.',
};
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);

if (browserPolicyBlocked) {
  console.warn('[xensonar-browser-responsibility-readout] Browser navigation was blocked by managed Chromium policy before Xensonar could render.');
  console.warn(`[xensonar-browser-responsibility-readout] Report: ${reportFile}`);
  if (strictUi) {
    fail('Strict UI mode: browser policy blocked the Xensonar UI probe', { reportFile, result });
  }
  process.exit(0);
}

assert(result, 'Browser probe returned no result', { reportFile, probe });
assert(result.ui?.rootFound, 'Performance & Krisenmanagement responsibility readout was not found in the browser DOM', { reportFile, result });
assert(result.ui?.rootResponsibilityAttribute === 'true', 'Responsibility readout attribute was not published in the browser DOM', { reportFile, result });
assert(result.ui?.rootFollowVoiceEngineSelectValue === 'worklet-stable-lane-pilot', 'Fresh browser session does not start in Worklet Stable-Lane Pilot test default', { reportFile, result });
assert(result.ui?.legacyReliefGate, 'Legacy-Relief Gate UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.stableLane, 'Stable Lane UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.frameDelta, 'Frame-Delta UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.laneQuanta, 'Lane-Quanten UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.planTransport, 'Plan-Transport UI value was not found in the browser DOM', { reportFile, result });
assert(/^message-port\b/.test(String(result.ui.planTransport)), 'Plan-Transport UI does not expose the active message-port backend', { reportFile, result });
assert(result.ui?.sabReadiness, 'SAB-Readiness UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.bootProbe, 'Boot-Probe UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.audioProbe, 'Audio-Probe UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.audioContext, 'AudioContext UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.silentPlanProbe, 'Silent-Plan Probe UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.stressHarness, 'Stress-Harness UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.abReport, 'A/B-Report UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.clickBurstProxy, 'Click/Burst Proxy UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.reliefProof, 'Relief-Proof UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.liveDeliveryProof, 'Live-Ankunft UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.holisticVoicePool, 'Voice-Pool Gesamt UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.pressurePolicy, 'Pressure-Policy UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.capacityGuard, 'Capacity-Guard UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.waveStarterVoicePool, 'Wellenstarter Pool UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.waveStarterWorkletPilot, 'Wellenstarter Worklet UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.waveStarterParallelMixAbGuard, 'Wellenstarter A/B UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.waveStarterPressureScenario, 'Wellenstarter Druck UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui?.waveStarterPilotGainStability, 'Wellenstarter Pilot-Stabilität UI value was not found in the browser DOM', { reportFile, result });
assert(result.ui.waveStarterPilotGainStability.includes('Legacy dominant'), 'Wellenstarter Pilot-Stabilität does not preserve legacy-dominant wording', { reportFile, result });
assert(result.liveWaveStarterPilotGainStabilityReport, 'Live Wellenstarter pilot gain stability report was not published by the UI runtime', { reportFile, result });
assert(result.liveWaveStarterPilotGainStabilityReport.primaryReplacementForbidden === true, 'Wellenstarter pilot stability report must forbid primary replacement', { reportFile, result });
assert(result.liveWaveStarterPilotGainStabilityReport.gainIncreaseForbidden === true, 'Wellenstarter pilot stability report must forbid gain increase', { reportFile, result });
assert(result.ui?.waveStarterSynthFailoverCandidate, 'Wellenstarter Synth-Failover UI value was not found in the browser DOM', { reportFile, result });
assert(result.liveWaveStarterSynthFailoverCandidate, 'Live Wellenstarter synth failover candidate report was not published by the UI runtime', { reportFile, result });
assert(result.liveWaveStarterSynthFailoverCandidate.sampleFailoverBlockedUntilBufferToken === true, 'Synth-Failover report must keep sample failover blocked until buffer/token shadow exists', { reportFile, result });
assert(result.liveWaveStarterSynthFailoverCandidate.forbidsGenericSampleSubstitution === true, 'Synth-Failover report must forbid generic sample substitution', { reportFile, result });
assert(result.liveWaveStarterSynthFailoverCandidate.failoverOnlyForDroppedLegacySlots === true, 'Synth-Failover report must stay limited to dropped legacy slots', { reportFile, result });
assert(result.liveWaveStarterSynthFailoverCandidate.preservesLegacyForAdmittedSlots === true, 'Synth-Failover report must preserve admitted legacy slots', { reportFile, result });
assert(result.ui?.waveStarterSampleBufferTokenShadow, 'Wellenstarter Sample-Token UI value was not found in the browser DOM', { reportFile, result });
assert(result.liveWaveStarterSampleBufferTokenShadow, 'Live Wellenstarter sample buffer token shadow report was not published by the UI runtime', { reportFile, result });
assert(result.liveWaveStarterSampleBufferTokenShadow.sampleFailoverStillBlocked === true, 'Sample buffer token shadow must still block audible sample failover', { reportFile, result });
assert(result.liveWaveStarterSampleBufferTokenShadow.sampleRendererPilotEnabled === true, 'Sample one-shot pilot renderer must be visible once the sample failover pilot exists', { reportFile, result });
assert(result.liveWaveStarterSampleBufferTokenShadow.synthFallbackForbiddenForSamples === true, 'Sample shadow must forbid synth fallback for samples', { reportFile, result });
assert(result.liveWaveStarterSampleBufferTokenShadow.forbidsGenericSampleSubstitution === true, 'Sample shadow must forbid generic sample substitution', { reportFile, result });

assert(result.liveWaveStarterSampleFailoverCandidate, 'Live Wellenstarter sample failover candidate report was not published by the UI runtime', { reportFile, result });
assert(result.liveWaveStarterSampleFailoverCandidate.sampleRenderingStillDisabled === true, 'Sample failover candidate must keep audible rendering disabled until the pilot renderer patch', { reportFile, result });
assert(result.liveWaveStarterSampleFailoverCandidate.sampleFailoverEligibleOnlyWhenHydrated === true, 'Sample failover candidate must require hydrated tokens', { reportFile, result });
assert(result.liveWaveStarterSampleFailoverCandidate.synthFallbackForbiddenForSamples === true, 'Sample failover candidate must forbid sample-to-synth fallback', { reportFile, result });
assert(result.liveWaveStarterSampleFailoverCandidate.forbidsGenericSampleSubstitution === true, 'Sample failover candidate must forbid generic sample substitution', { reportFile, result });
assert(result.ui?.particleVoicePool, 'Partikel Pool UI value was not found in the browser DOM', { reportFile, result });
assert(result.liveSabReadiness, 'Live SAB readiness global probe was not published by the UI runtime', { reportFile, result });
assert(result.liveResponsibilityReadout, 'Live responsibility readout global probe was not published by the UI runtime', { reportFile, result });
assert(result.liveBootProbe, 'Live boot probe global snapshot was not published by the UI runtime', { reportFile, result });
assert(result.liveAudioProbe, 'Live AudioContext/User-Gesture probe global snapshot was not published by the UI runtime', { reportFile, result });
assert(result.liveStressScenarioHarness, 'Live Stable-Lane stress scenario harness report was not published by the UI runtime', { reportFile, result });
assert(result.liveStableLaneABReport, 'Live Stable-Lane A/B report was not published by the UI runtime', { reportFile, result });
assert(result.liveClickBurstProxyReport, 'Live Stable-Lane Click/Burst proxy report was not published by the UI runtime', { reportFile, result });
assert(result.liveRootMaterialReliefProofReport, 'Live Stable-Lane Root/Material relief proof report was not published by the UI runtime', { reportFile, result });
assert(result.liveExpressivePressureAddOnReport, 'Live Stable-Lane expressive pressure add-on report was not published by the UI runtime', { reportFile, result });
assert(result.liveSabDifferentialReport, 'Live Stable-Lane SAB differential report was not published by the UI runtime', { reportFile, result });
assert(result.liveStableLaneLiveDeliveryProofReport, 'Live Stable-Lane delivery proof report was not published by the UI runtime', { reportFile, result });
assert(result.liveHolisticVoicePoolFallbackReport, 'Live holistic voice-pool fallback report was not published by the UI runtime', { reportFile, result });
assert(result.liveResponsibilityReadout.rootFollowVoiceEngineMode === result.ui.rootFollowVoiceEngineSelectValue, 'Global responsibility readout does not match the visible voice-engine select', { reportFile, result });
assert(result.liveResponsibilityReadout.planTransport === result.ui.planTransport, 'Global responsibility readout does not match the visible Plan-Transport line', { reportFile, result });
assert(result.liveSabReadiness.stableLaneSabTransportReadinessReason !== 'not-in-browser-runtime', 'Browser probe still reports not-in-browser-runtime inside an actual browser', { reportFile, result });
assert(!/^unknown\b/.test(String(result.ui.sabReadiness)), 'SAB-Readiness UI still displays unknown in the browser', { reportFile, result });

console.log('[xensonar-browser-responsibility-readout] Voice Engine:', result.ui.rootFollowVoiceEngineSelectValue);
console.log('[xensonar-browser-responsibility-readout] Legacy-Relief Gate:', result.ui.legacyReliefGate);
console.log('[xensonar-browser-responsibility-readout] Stable Lane:', result.ui.stableLane);
console.log('[xensonar-browser-responsibility-readout] Frame-Delta:', result.ui.frameDelta);
console.log('[xensonar-browser-responsibility-readout] Lane-Quanten:', result.ui.laneQuanta);
console.log('[xensonar-browser-responsibility-readout] Plan-Transport:', result.ui.planTransport);
console.log('[xensonar-browser-responsibility-readout] SAB-Readiness:', result.ui.sabReadiness);
console.log('[xensonar-browser-responsibility-readout] Boot-Probe:', result.ui.bootProbe);
console.log('[xensonar-browser-responsibility-readout] Audio-Probe:', result.ui.audioProbe);
console.log('[xensonar-browser-responsibility-readout] Silent-Plan Probe:', result.ui.silentPlanProbe);
console.log('[xensonar-browser-responsibility-readout] Stress-Harness:', result.ui.stressHarness);
console.log('[xensonar-browser-responsibility-readout] A/B-Report:', result.ui.abReport);
console.log('[xensonar-browser-responsibility-readout] Click/Burst Proxy:', result.ui.clickBurstProxy);
console.log('[xensonar-browser-responsibility-readout] Relief-Proof:', result.ui.reliefProof);
console.log('[xensonar-browser-responsibility-readout] Expressive Pressure:', result.ui.expressivePressure);
console.log('[xensonar-browser-responsibility-readout] SAB-Differenz:', result.ui.sabDifferential);
console.log('[xensonar-browser-responsibility-readout] Live-Ankunft:', result.ui.liveDeliveryProof);
console.log('[xensonar-browser-responsibility-readout] Voice-Pool Gesamt:', result.ui.holisticVoicePool);
console.log('[xensonar-browser-responsibility-readout] Pressure-Policy:', result.ui.pressurePolicy);
console.log('[xensonar-browser-responsibility-readout] Capacity-Guard:', result.ui.capacityGuard);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Pool:', result.ui.waveStarterVoicePool);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Worklet:', result.ui.waveStarterWorkletPilot);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Druck:', result.ui.waveStarterPressureScenario);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Pilot-Stabilität:', result.ui.waveStarterPilotGainStability);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Synth-Failover:', result.ui.waveStarterSynthFailoverCandidate);
console.log('[xensonar-browser-responsibility-readout] Wellenstarter Sample-Token:', result.ui.waveStarterSampleBufferTokenShadow);
console.log('[xensonar-browser-responsibility-readout] Partikel Pool:', result.ui.particleVoicePool);
console.log('[xensonar-browser-responsibility-readout] Browser globals:', JSON.stringify({
  isSecureContext: result.isSecureContext,
  crossOriginIsolated: result.crossOriginIsolated,
  sharedArrayBufferType: result.sharedArrayBufferType,
}, null, 2));
console.log(`[xensonar-browser-responsibility-readout] Report: ${reportFile}`);
