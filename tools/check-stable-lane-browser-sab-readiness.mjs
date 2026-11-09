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
const reportFile = path.resolve(reportsDir, 'stable-lane-browser-sab-readiness.json');
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
  console.error(`[xensonar-browser-sab-readiness] ${message}`);
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

    if (requestUrl.pathname === '/__xensonar_browser_sab_probe.json') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({
        ok: true,
        purpose: 'xensonar-browser-visible-stable-lane-sab-readiness-probe',
        htmlFile: htmlFilePath,
        expectedUiReadout: 'available/ready or blocked with a browser-runtime reason, never unknown/not-in-browser-runtime',
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
        response.end(`[xensonar-browser-sab-readiness] Failed to read ${resolvedFile}: ${error.message}`);
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
          resolve({
            locationHref: window.location.href,
            protocol: window.location.protocol,
            isSecureContext: window.isSecureContext === true,
            crossOriginIsolated: window.crossOriginIsolated === true,
            sharedArrayBufferType: typeof window.SharedArrayBuffer,
            liveSabReadiness: window.__XENSONAR_STABLE_LANE_SAB_READINESS__ || null,
            ui: {
              rootFound: Boolean(readoutRoot),
              rootLiveSabReadinessAttribute: readoutRoot?.getAttribute('data-root-follow-live-sab-readiness') || null,
              legacyReliefGate: valueAfterLabel('Legacy-Relief Gate'),
              stableLane: valueAfterLabel('Stable Lane'),
              planTransport: valueAfterLabel('Plan-Transport'),
              sabReadiness: valueAfterLabel('SAB-Readiness'),
              responsibilityLayerText: readoutRoot?.innerText || null,
            },
            bodyTextHead: (document.body.innerText || '').slice(0, 2500),
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
    : 'This report reflects what the headless Chromium browser sees after opening Performance & Krisenmanagement and reading the SAB-Readiness UI line.',
};
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);

if (browserPolicyBlocked) {
  console.warn('[xensonar-browser-sab-readiness] Browser navigation was blocked by managed Chromium policy before Xensonar could render.');
  console.warn(`[xensonar-browser-sab-readiness] Report: ${reportFile}`);
  if (strictUi) {
    fail('Strict UI mode: browser policy blocked the Xensonar UI probe', { reportFile, result });
  }
  process.exit(0);
}

assert(result, 'Browser probe returned no result', { reportFile, probe });
assert(result.ui?.rootFound, 'Performance & Krisenmanagement responsibility readout was not found in the browser DOM', { reportFile, result });
assert(result.ui?.sabReadiness, 'SAB-Readiness UI value was not found in the browser DOM', { reportFile, result });
assert(result.liveSabReadiness, 'Live SAB readiness global probe was not published by the UI runtime', { reportFile, result });
assert(result.liveSabReadiness.stableLaneSabTransportReadinessReason !== 'not-in-browser-runtime', 'Browser probe still reports not-in-browser-runtime inside an actual browser', { reportFile, result });
assert(!/^unknown\b/.test(String(result.ui.sabReadiness)), 'SAB-Readiness UI still displays unknown in the browser', { reportFile, result });

const readiness = result.liveSabReadiness.stableLaneSabTransportReadiness;
const reason = result.liveSabReadiness.stableLaneSabTransportReadinessReason;
const uiReadout = result.ui.sabReadiness;
console.log('[xensonar-browser-sab-readiness] Browser UI SAB-Readiness:', uiReadout);
console.log('[xensonar-browser-sab-readiness] Runtime:', `${readiness} · ${reason}`);
console.log('[xensonar-browser-sab-readiness] Browser globals:', JSON.stringify({
  isSecureContext: result.isSecureContext,
  crossOriginIsolated: result.crossOriginIsolated,
  sharedArrayBufferType: result.sharedArrayBufferType,
}, null, 2));
console.log(`[xensonar-browser-sab-readiness] Report: ${reportFile}`);
