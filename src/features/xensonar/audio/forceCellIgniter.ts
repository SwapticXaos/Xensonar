import { addAudioWorkletBlobModule } from './audioWorkletBlobModule';

const FORCE_CELL_PROCESSOR_NAME = 'xensonar-force-cell';

const FORCE_CELL_WORKLET_SOURCE = String.raw`
class XensonarForceCellProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.running = false;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'force-cell-start') this.running = true;
      if (data.type === 'force-cell-stop') this.running = false;
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output) return true;
    const frequency = 220;
    const gain = 0.28;
    const phaseStep = (2 * Math.PI * frequency) / sampleRate;
    for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
      const channel = output[channelIndex];
      for (let i = 0; i < channel.length; i += 1) {
        this.phase += phaseStep;
        if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;
        channel[i] = this.running ? Math.sin(this.phase) * gain : 0;
      }
    }
    return true;
  }
}

registerProcessor('${FORCE_CELL_PROCESSOR_NAME}', XensonarForceCellProcessor);
`;

type ForceCellAudioContextConstructor = typeof AudioContext;

type ForceCellState = {
  ctx: AudioContext | null;
  node: AudioWorkletNode | null;
  gain: GainNode | null;
  loadPromise: Promise<void> | null;
  running: boolean;
  uiInstalled: boolean;
  lastError: string | null;
  clickCount: number;
};

const forceCellState: ForceCellState = {
  ctx: null,
  node: null,
  gain: null,
  loadPromise: null,
  running: false,
  uiInstalled: false,
  lastError: null,
  clickCount: 0,
};

function getAudioContextConstructor(): ForceCellAudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window.AudioContext || (window as unknown as { webkitAudioContext?: ForceCellAudioContextConstructor }).webkitAudioContext) ?? null;
}

async function ensureForceCell(): Promise<ForceCellState> {
  if (forceCellState.ctx && forceCellState.node && forceCellState.gain) return forceCellState;
  if (forceCellState.loadPromise) {
    await forceCellState.loadPromise;
    return forceCellState;
  }

  forceCellState.loadPromise = (async () => {
    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) throw new Error('AudioContext is unavailable');

    const ctx = new AudioContextCtor();
    await ctx.resume();

    if (!ctx.audioWorklet) {
      await ctx.close().catch(() => undefined);
      throw new Error('AudioWorklet is unavailable in this browser/context');
    }

    await addAudioWorkletBlobModule(ctx, FORCE_CELL_WORKLET_SOURCE);

    const node = new AudioWorkletNode(ctx, FORCE_CELL_PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    const gain = ctx.createGain();
    gain.gain.value = 1;
    node.connect(gain);
    gain.connect(ctx.destination);

    forceCellState.ctx = ctx;
    forceCellState.node = node;
    forceCellState.gain = gain;
  })();

  try {
    await forceCellState.loadPromise;
  } finally {
    forceCellState.loadPromise = null;
  }
  return forceCellState;
}

function setForceCellUiStatus(status: 'idle' | 'loading' | 'running' | 'error', error?: unknown): void {
  if (typeof document === 'undefined') return;
  const root = document.querySelector<HTMLElement>('[data-xensonar-force-cell-panel="true"]');
  const button = document.querySelector<HTMLButtonElement>('[data-xensonar-force-cell-igniter="true"]');
  if (root) {
    root.dataset.xensonarForceCellStatus = status;
    root.dataset.xensonarForceCellRunning = String(forceCellState.running);
    root.dataset.xensonarForceCellClickCount = String(forceCellState.clickCount);
    if (error) root.dataset.xensonarForceCellError = error instanceof Error ? error.message : String(error);
  }
  if (!button) return;
  button.dataset.xensonarForceCellStatus = status;
  button.dataset.xensonarForceCellRunning = String(forceCellState.running);
  if (status === 'loading') {
    button.textContent = 'KRAFT LAEDT …';
    button.style.background = '#b45309';
    button.style.transform = 'translateY(1px) scale(0.99)';
    return;
  }
  if (status === 'running') {
    button.textContent = 'KRAFT AUS · 220 Hz LAEUFT';
    button.style.background = '#047857';
    button.style.transform = 'translateY(1px) scale(0.99)';
    return;
  }
  if (status === 'error') {
    button.textContent = 'KRAFT FEHLER';
    button.style.background = '#7f1d1d';
    button.style.transform = 'none';
    return;
  }
  button.textContent = 'KRAFT AN · 220 Hz';
  button.style.background = '#b00020';
  button.style.transform = 'none';
}

export async function toggleForceCell(start: boolean): Promise<void> {
  try {
    forceCellState.lastError = null;
    if (!start) {
      forceCellState.running = false;
      forceCellState.node?.port.postMessage({ type: 'force-cell-stop' });
      setForceCellUiStatus('idle');
      return;
    }

    setForceCellUiStatus('loading');
    const state = await ensureForceCell();
    if (!state.ctx || !state.node) throw new Error('Force cell was not initialized');
    if (state.ctx.state === 'suspended') await state.ctx.resume();
    state.node.port.postMessage({ type: 'force-cell-start' });
    forceCellState.running = true;
    setForceCellUiStatus('running');
  } catch (error) {
    forceCellState.running = false;
    forceCellState.lastError = error instanceof Error ? error.message : String(error);
    setForceCellUiStatus('error', error);
    console.error('[force-cell] start/stop failed', error);
  }
}

export function installForceCellBodyButton(): void {
  if (typeof document === 'undefined') return;
  if (forceCellState.uiInstalled || document.querySelector('[data-xensonar-force-cell-panel="true"]')) return;
  forceCellState.uiInstalled = true;

  const panel = document.createElement('div');
  panel.dataset.xensonarForceCellPanel = 'true';
  panel.dataset.xensonarForceCellStatus = 'idle';
  panel.dataset.xensonarForceCellRunning = 'false';
  Object.assign(panel.style, {
    position: 'fixed',
    left: '14px',
    bottom: '14px',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    pointerEvents: 'auto',
    userSelect: 'none',
    touchAction: 'none',
  } satisfies Partial<CSSStyleDeclaration>);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'KRAFT AN · 220 Hz';
  button.dataset.xensonarForceCellIgniter = 'true';
  Object.assign(button.style, {
    position: 'relative',
    display: 'block',
    pointerEvents: 'auto',
    cursor: 'pointer',
    background: '#b00020',
    color: 'white',
    border: '2px solid white',
    borderRadius: '10px',
    padding: '12px 16px',
    fontWeight: '900',
    fontSize: '13px',
    letterSpacing: '0.04em',
    boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
    minWidth: '13rem',
  } satisfies Partial<CSSStyleDeclaration>);

  const caption = document.createElement('div');
  caption.textContent = 'ForceCell: echter DOM-Schalter, nicht AppShell';
  Object.assign(caption.style, {
    maxWidth: '16rem',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.74)',
    color: '#fee2e2',
    border: '1px solid rgba(255,255,255,0.22)',
    padding: '4px 7px',
    fontSize: '10px',
    fontFamily: 'monospace',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);

  const activate = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    forceCellState.clickCount += 1;
    void toggleForceCell(!forceCellState.running);
  };

  button.addEventListener('click', activate, { capture: true });
  button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    button.style.filter = 'brightness(1.25)';
  }, { capture: true });
  button.addEventListener('pointerup', (event) => {
    event.stopPropagation();
    button.style.filter = 'none';
  }, { capture: true });
  button.addEventListener('pointercancel', () => { button.style.filter = 'none'; }, { capture: true });
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    activate(event);
  }, { capture: true });

  panel.appendChild(button);
  panel.appendChild(caption);
  document.body.appendChild(panel);
  setForceCellUiStatus('idle');
}

export async function disposeForceCell(): Promise<void> {
  const ctx = forceCellState.ctx;
  forceCellState.node?.port.postMessage({ type: 'force-cell-stop' });
  forceCellState.node?.disconnect();
  forceCellState.gain?.disconnect();
  forceCellState.node = null;
  forceCellState.gain = null;
  forceCellState.ctx = null;
  forceCellState.loadPromise = null;
  forceCellState.running = false;
  setForceCellUiStatus('idle');
  if (ctx && ctx.state !== 'closed') await ctx.close().catch(() => undefined);
}

export const FORCE_CELL_IGNITER_CONTRACT = {
  noReactState: true,
  noXensonarBus: true,
  noStableMusicLane: true,
  directDestination: true,
  processorName: FORCE_CELL_PROCESSOR_NAME,
  frequencyHz: 220,
  bodyDomButton: true,
  clickToggle: true,
} as const;

export { FORCE_CELL_WORKLET_SOURCE };
