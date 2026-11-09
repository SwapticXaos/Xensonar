import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function installBrowserLikeRuntime() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://xensonar-runtime-dummy.test/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const { window } = dom;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  Object.assign(globalThis, {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    Blob: window.Blob,
    File: window.File,
    CustomEvent: window.CustomEvent,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    URL: window.URL,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  });

  window.URL.createObjectURL = () => 'blob:xensonar-runtime-dummy';
  window.URL.revokeObjectURL = () => {};
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    const target = {
      canvas: this,
      measureText: () => ({ width: 10 }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    };
    return new Proxy(target, {
      get(obj, prop) {
        if (prop in obj) return obj[prop];
        if (typeof prop === 'string') {
          obj[prop] = () => {};
          return obj[prop];
        }
        return undefined;
      },
      set(obj, prop, value) {
        obj[prop] = value;
        return true;
      },
    });
  };

  class DummyAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.sampleRate = 44100;
    }
    createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() { return { type: 'sine', frequency: { value: 440, setValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} }; }
    createBuffer(channels = 1, length = 44100, sampleRate = 44100) {
      return { duration: length / sampleRate, numberOfChannels: channels, sampleRate, getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() { return { buffer: null, playbackRate: { value: 1, setValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} }; }
    decodeAudioData() { return Promise.resolve(this.createBuffer(1, 44100, 44100)); }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  globalThis.AudioContext = DummyAudioContext;
  globalThis.OfflineAudioContext = DummyAudioContext;
  window.AudioContext = DummyAudioContext;
  window.OfflineAudioContext = DummyAudioContext;
  return window;
}

function findButtonByText(text) {
  return [...document.querySelectorAll('button')].find((button) => (button.textContent || '').includes(text));
}

async function flush(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

installBrowserLikeRuntime();

const server = await createServer({
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: [] },
});

try {
  const { CanonicalForgeRoom } = await server.ssrLoadModule('/src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
  const { registerMaterialExport } = await server.ssrLoadModule('/src/features/l3lab/materialLibrary.ts');

  const dummyWav = new Blob([new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69])], { type: 'audio/wav' });
  registerMaterialExport({
    name: 'Dummy Runtime Material',
    role: 'loop',
    bpm: 108,
    bars: 2,
    guideSegments: 4,
    guideMarkers: [],
    loopStartSec: 0,
    loopEndSec: 4,
    rootHz: 55,
    sourceVersion: 'runtime-dummy-5120',
    renderMode: 'runtime-dummy-wav',
    durationSec: 4,
    intendedLoopDurationSec: 4,
  }, dummyWav);

  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(CanonicalForgeRoom, { onBack: () => {} }));
  await flush(700);

  const shortcutButton = findButtonByText('Materialspur importieren');
  assert(shortcutButton, 'Der reale Materialspur-importieren-Button muss im gerenderten Raum existieren.');
  assert(!shortcutButton.disabled, 'Der reale Materialspur-importieren-Button darf nicht deaktiviert sein.');
  shortcutButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await flush(900);

  const bodyText = document.body.textContent || '';
  assert(bodyText.includes('Melodic Loop'), 'Der Schnellzugriff muss in den Melodic Loop wechseln.');
  assert(bodyText.includes('Materialspur importieren'), 'Der Materialimport-Dialog muss nach dem Schnellzugriff offen sein.');
  assert(bodyText.includes('Dummy Runtime Material'), 'Der Dummy-Materialeintrag muss im offenen Importdialog sichtbar sein.');
  assert(findButtonByText('Einfügen') || findButtonByText('In Melodic Loop einfuegen'), 'Der Dialog muss einen Einfügen-Button anbieten.');

  console.log('[material-import-runtime-dummy-5120] OK', JSON.stringify({
    shortcut: 'clicked',
    switchedTo: 'Melodic Loop',
    dummyVisible: true,
  }));
} finally {
  await server.close();
}
