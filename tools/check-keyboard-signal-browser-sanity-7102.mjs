import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const htmlPath = path.resolve(process.argv[2] ?? 'dist/index.html');
if (!existsSync(htmlPath)) {
  console.error(`[keyboard-signal-browser-sanity-7102] missing html: ${htmlPath}`);
  process.exit(1);
}

const htmlDir = path.dirname(htmlPath);
const htmlName = path.basename(htmlPath);
const chromeBin = process.env.CHROMIUM_BIN || process.env.CHROME_BIN || 'chromium';
const port = Number(process.env.XENSONAR_SANITY_PORT || 8873);
const pageHost = process.env.XENSONAR_SANITY_HOST || 'localhost';
const cdpPort = Number(process.env.XENSONAR_SANITY_CDP_PORT || 9273);
const pageUrl = process.env.XENSONAR_SANITY_PAGE_URL || pathToFileURL(htmlPath).href;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 6000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }
  throw lastError ?? new Error(`timeout waiting for ${url}`);
}

function openCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) reject(new Error(`${payload.error.message || 'CDP error'} ${JSON.stringify(payload.error)}`));
      else resolve(payload);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        call(method, params = {}) {
          const id = nextId++;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
        },
        close() { ws.close(); },
      });
    }, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${pageHost}:${port}`);
  const target = url.pathname === '/' ? htmlPath : path.join(htmlDir, decodeURIComponent(url.pathname.slice(1)));
  try {
    const data = await readFile(target);
    res.writeHead(200, {
      'content-type': target.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
const userDataDir = await mkdtemp(path.join(tmpdir(), 'xensonar-keyboard-sanity-'));
const chrome = spawn(chromeBin, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required',
  '--allow-file-access-from-files',
  `--user-data-dir=${userDataDir}`,
  `--remote-debugging-port=${cdpPort}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeStderr = '';
chrome.stderr.on('data', (chunk) => { chromeStderr += String(chunk); });

try {
  const pages = await waitForJson(`http://127.0.0.1:${cdpPort}/json/list`);
  const page = pages.find((entry) => entry.type === 'page') ?? pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target available');
  const cdp = await openCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');
  await cdp.call('Log.enable');

  const probeSource = String.raw`
(() => {
  window.__xensonarKeyboardSignalProbe = { audioCalls: [], keyEvents: [], errors: [] };
  const log = (type, data = {}) => {
    try { window.__xensonarKeyboardSignalProbe.audioCalls.push({ type, data, t: performance.now() }); } catch {}
  };
  window.addEventListener('error', (event) => window.__xensonarKeyboardSignalProbe.errors.push(String(event.message || event.error || event)), true);
  window.addEventListener('unhandledrejection', (event) => window.__xensonarKeyboardSignalProbe.errors.push('rejection:' + String(event.reason && (event.reason.message || event.reason) || event.reason)), true);
  window.addEventListener('keydown', (event) => window.__xensonarKeyboardSignalProbe.keyEvents.push({ type: 'down', key: event.key, code: event.code, repeat: event.repeat, defaultPrevented: event.defaultPrevented, t: performance.now() }), true);
  window.addEventListener('keyup', (event) => window.__xensonarKeyboardSignalProbe.keyEvents.push({ type: 'up', key: event.key, code: event.code, repeat: event.repeat, defaultPrevented: event.defaultPrevented, t: performance.now() }), true);
  const RealAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!RealAudioContext) return;
  const wrapNode = (node, kind) => {
    try {
      const start = node.start;
      if (typeof start === 'function') node.start = function (...args) { log(kind + '.start', { t: args[0], freq: this.frequency?.value, gain: this.gain?.value }); return start.apply(this, args); };
      const connect = node.connect;
      if (typeof connect === 'function') node.connect = function (...args) { log(kind + '.connect'); return connect.apply(this, args); };
    } catch {}
    return node;
  };
  class ProbeAudioContext extends RealAudioContext {
    constructor(...args) { super(...args); log('AudioContext.constructor', { state: this.state }); }
    resume(...args) { log('AudioContext.resume', { state: this.state }); return super.resume(...args); }
    createGain(...args) { log('createGain'); return wrapNode(super.createGain(...args), 'gain'); }
    createOscillator(...args) { log('createOscillator'); return wrapNode(super.createOscillator(...args), 'oscillator'); }
    createBufferSource(...args) { log('createBufferSource'); return wrapNode(super.createBufferSource(...args), 'bufferSource'); }
    createBiquadFilter(...args) { log('createBiquadFilter'); return wrapNode(super.createBiquadFilter(...args), 'biquad'); }
    createWaveShaper(...args) { log('createWaveShaper'); return wrapNode(super.createWaveShaper(...args), 'waveshaper'); }
    createDynamicsCompressor(...args) { log('createDynamicsCompressor'); return wrapNode(super.createDynamicsCompressor(...args), 'compressor'); }
    createDelay(...args) { log('createDelay'); return wrapNode(super.createDelay(...args), 'delay'); }
    createStereoPanner(...args) { log('createStereoPanner'); return wrapNode(super.createStereoPanner(...args), 'panner'); }
    createAnalyser(...args) { log('createAnalyser'); return wrapNode(super.createAnalyser(...args), 'analyser'); }
    createConvolver(...args) { log('createConvolver'); return wrapNode(super.createConvolver(...args), 'convolver'); }
  }
  window.AudioContext = ProbeAudioContext;
  window.webkitAudioContext = ProbeAudioContext;
})();`;
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: probeSource });
  await cdp.call('Page.navigate', { url: pageUrl });
  await wait(3000);
  const bodyText = await cdp.call('Runtime.evaluate', { expression: 'document.body.innerText.slice(0,120)', returnByValue: true });
  if (!String(bodyText.result?.result?.value ?? '').includes('XENSONAR')) {
    const debug = await cdp.call('Runtime.evaluate', { expression: 'JSON.stringify({href: location.href, ready: document.readyState, bodyHtml: document.body.innerHTML.slice(0,300), probe: window.__xensonarKeyboardSignalProbe})', returnByValue: true });
    throw new Error(`App did not mount. Body starts with: ${JSON.stringify(bodyText.result?.result?.value ?? '')}; debug=${debug.result?.result?.value}`);
  }
  await cdp.call('Runtime.evaluate', {
    expression: `(() => { for (const button of Array.from(document.querySelectorAll('button'))) { const text = (button.innerText || button.textContent || '').trim(); if (text === 'Power' || text.includes('AKTIVIEREN')) { button.click(); return text; } } return null; })()`,
    returnByValue: true,
  });
  await wait(1000);
  await cdp.call('Runtime.evaluate', {
    expression: 'window.__xensonarKeyboardSignalProbe.audioCalls = []; window.__xensonarKeyboardSignalProbe.keyEvents = []; window.__xensonarKeyboardSignalProbe.errors = []; window.focus(); document.body.focus?.();',
    returnByValue: true,
  });

  for (const [key, code, vk, repeat] of [
    ['a', 'KeyA', 65, false],
    ['w', 'KeyW', 87, false],
    ['s', 'KeyS', 83, false],
    ['Enter', 'Enter', 13, false],
    ['a', 'KeyA', 65, true],
  ]) {
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, autoRepeat: repeat });
    await wait(220);
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await wait(180);
  }
  await wait(1200);
  const payloadResult = await cdp.call('Runtime.evaluate', {
    expression: `JSON.stringify({
      errors: window.__xensonarKeyboardSignalProbe.errors,
      keys: window.__xensonarKeyboardSignalProbe.keyEvents,
      counts: window.__xensonarKeyboardSignalProbe.audioCalls.reduce((acc, call) => { acc[call.type] = (acc[call.type] || 0) + 1; return acc; }, {}),
      totalAudioCalls: window.__xensonarKeyboardSignalProbe.audioCalls.length,
      firstAudioCalls: window.__xensonarKeyboardSignalProbe.audioCalls.slice(0, 30),
    })`,
    returnByValue: true,
  });
  const payload = JSON.parse(payloadResult.result?.result?.value ?? '{}');
  const startCount = (payload.counts?.['oscillator.start'] ?? 0) + (payload.counts?.['bufferSource.start'] ?? 0);
  const constructionCount = (payload.counts?.createOscillator ?? 0) + (payload.counts?.createBufferSource ?? 0) + (payload.counts?.createGain ?? 0);
  if (payload.errors?.length) {
    throw new Error(`Runtime errors during keyboard signal probe: ${payload.errors.join(' | ')}`);
  }
  if ((payload.keys ?? []).filter((event) => event.type === 'down').length < 5) {
    throw new Error(`Expected keydown events to reach browser; got ${JSON.stringify(payload.keys)}`);
  }
  if (startCount < 1 || constructionCount < 3) {
    throw new Error(`Keyboard signal did not reach audio construction/start path: ${JSON.stringify(payload)}`);
  }
  console.log('[keyboard-signal-browser-sanity-7102] PASS', JSON.stringify({ startCount, constructionCount, totalAudioCalls: payload.totalAudioCalls, keydowns: payload.keys.filter((event) => event.type === 'down').length }));
  cdp.close();
} finally {
  chrome.kill('SIGTERM');
  server.close();
}
