import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';

const htmlPath = process.argv[2] || 'dist/index.html';
if (!fs.existsSync(htmlPath)) {
  console.error(`[hauptraum-power-sanity] missing HTML: ${htmlPath}`);
  process.exit(2);
}

let html = fs.readFileSync(htmlPath, 'utf8')
  .replace(/import\.meta\.url/g, '"https://xensonar.local/dist/index.html"')
  .replace('<script type="module" crossorigin>', '<script>')
  .replace('<script>', '<div id="root"></div><script>')
  .replace('<div id="root"></div>\n  </body>', '</body>');

const errors = [];
const warnings = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...args) => errors.push(['console.error', ...args.map(String)].join(' ')));
virtualConsole.on('warn', (...args) => warnings.push(['console.warn', ...args.map(String)].join(' ')));
virtualConsole.on('jsdomError', (error) => errors.push(`jsdomError: ${error?.message || String(error)}`));

const installBrowserMocks = (window) => {
  window.URL.createObjectURL = () => 'blob:xensonar-power-sanity';
  window.URL.revokeObjectURL = () => {};
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    get() { return this.textContent || ''; },
    set(value) { this.textContent = value; },
  });
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    return {
      canvas: this,
      fillRect() {}, clearRect() {}, strokeRect() {},
      getImageData() { return { data: new Uint8ClampedArray(4) }; },
      putImageData() {}, createImageData() { return []; },
      setTransform() {}, resetTransform() {}, drawImage() {},
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {},
      translate() {}, scale() {}, rotate() {}, arc() {}, arcTo() {}, ellipse() {}, rect() {}, roundRect() {},
      bezierCurveTo() {}, quadraticCurveTo() {}, clip() {},
      fillText() {}, strokeText() {},
      measureText() { return { width: 0 }; },
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
      fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
      globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter',
    };
  };

  class AudioParamMock {
    constructor(value = 0) { this.value = value; }
    setValueAtTime(value) { this.value = value; return this; }
    linearRampToValueAtTime(value) { this.value = value; return this; }
    exponentialRampToValueAtTime(value) { this.value = value; return this; }
    setTargetAtTime(value) { this.value = value; return this; }
    cancelScheduledValues() { return this; }
    cancelAndHoldAtTime() { return this; }
  }

  class AudioNodeMock {
    constructor(context) {
      this.context = context;
      this.gain = new AudioParamMock(1);
      this.frequency = new AudioParamMock(440);
      this.detune = new AudioParamMock(0);
      this.Q = new AudioParamMock(1);
      this.delayTime = new AudioParamMock(0);
      this.playbackRate = new AudioParamMock(1);
      this.pan = new AudioParamMock(0);
      this.offset = new AudioParamMock(1);
      this.buffer = null;
      this.type = 'sine';
      this.channelCount = 2;
      this.channelCountMode = 'max';
      this.channelInterpretation = 'speakers';
      this.port = { postMessage() {}, close() {}, onmessage: null };
    }
    connect() { return this; }
    disconnect() {}
    start() {}
    stop() { if (typeof this.onended === 'function') this.onended(); }
    addEventListener() {}
    removeEventListener() {}
  }

  class AudioContextMock {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.state = 'running';
      this.destination = new AudioNodeMock(this);
      this.listener = { positionX: new AudioParamMock(0), positionY: new AudioParamMock(0), positionZ: new AudioParamMock(0), forwardX: new AudioParamMock(0), forwardY: new AudioParamMock(0), forwardZ: new AudioParamMock(-1), upX: new AudioParamMock(0), upY: new AudioParamMock(1), upZ: new AudioParamMock(0) };
      this.audioWorklet = { addModule: () => Promise.resolve() };
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createGain() { return new AudioNodeMock(this); }
    createOscillator() { return new AudioNodeMock(this); }
    createBiquadFilter() { return new AudioNodeMock(this); }
    createDelay() { return new AudioNodeMock(this); }
    createWaveShaper() { return new AudioNodeMock(this); }
    createStereoPanner() { return new AudioNodeMock(this); }
    createPanner() { return new AudioNodeMock(this); }
    createChannelMerger() { return new AudioNodeMock(this); }
    createChannelSplitter() { return new AudioNodeMock(this); }
    createConstantSource() { return new AudioNodeMock(this); }
    createConvolver() { return new AudioNodeMock(this); }
    createDynamicsCompressor() {
      const node = new AudioNodeMock(this);
      node.threshold = new AudioParamMock(-24);
      node.knee = new AudioParamMock(30);
      node.ratio = new AudioParamMock(12);
      node.attack = new AudioParamMock(0.003);
      node.release = new AudioParamMock(0.25);
      return node;
    }
    createAnalyser() {
      const node = new AudioNodeMock(this);
      node.fftSize = 2048;
      node.frequencyBinCount = 1024;
      node.getByteFrequencyData = () => {};
      node.getByteTimeDomainData = () => {};
      node.getFloatFrequencyData = () => {};
      return node;
    }
    createBuffer(numberOfChannels = 1, length = 1, sampleRate = this.sampleRate) {
      return {
        numberOfChannels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData() { return new Float32Array(length); },
        copyToChannel() {},
        copyFromChannel() {},
      };
    }
    createBufferSource() { return new AudioNodeMock(this); }
    decodeAudioData(arrayBuffer) { return Promise.resolve(this.createBuffer(1, Math.max(1, arrayBuffer?.byteLength || 1), this.sampleRate)); }
  }

  window.AudioContext = AudioContextMock;
  window.webkitAudioContext = AudioContextMock;
  window.AudioWorkletNode = class extends AudioNodeMock {
    constructor(context) { super(context); }
  };
  window.Blob = window.Blob || class BlobMock { constructor(parts = []) { this.parts = parts; } };
};

const dom = new JSDOM(html, {
  url: 'https://xensonar.local/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse: installBrowserMocks,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bodyText = () => dom.window.document.getElementById('root')?.textContent || dom.window.document.body?.innerText || dom.window.document.body?.textContent || '';

await wait(2500);
const buttons = Array.from(dom.window.document.querySelectorAll('button'));
const powerButton = buttons.find((button) => (button.textContent || '').trim() === 'Power');
if (!powerButton) {
  console.error('[hauptraum-power-sanity] Power button not found');
  console.error(bodyText().slice(0, 1500));
  dom.window.close();
  process.exit(3);
}

powerButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
await wait(1200);

const text = bodyText();
const whiteScreenLike = text.length < 1000 || !/V\. Xensonar Synth|XENSONAR|Hauptraum|Power|aus- und wieder anschalten/.test(text);
const forbidden = [
  /ReferenceError: frameNowMs is not defined/,
  /frameNowMs is not defined/,
  /SyntheticForge abgefangen/,
  /ist in einen Fehler gelaufen/,
  /Cannot read properties of undefined/,
];
const errorBlob = errors.join('\n');
const forbiddenHit = forbidden.find((pattern) => pattern.test(text) || pattern.test(errorBlob));

const result = {
  buttonCount: buttons.length,
  powerClicked: true,
  whiteScreenLike,
  forbiddenHit: forbiddenHit ? String(forbiddenHit) : null,
  errors: errors.slice(0, 10),
  textStart: text.slice(0, 500),
};
console.log(JSON.stringify(result, null, 2));

dom.window.close();

if (whiteScreenLike || forbiddenHit || errors.length > 0) {
  process.exit(2);
}
process.exit(0);
