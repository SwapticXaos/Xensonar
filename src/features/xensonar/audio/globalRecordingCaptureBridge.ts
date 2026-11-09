export type XensonarExternalAudioCaptureRegistration = {
  readonly key: string;
  readonly label?: string;
  readonly stream: MediaStream;
};

export type XensonarExternalAudioPcmBlock = {
  readonly left: Float32Array;
  readonly right?: Float32Array;
  readonly frames: number;
  readonly sampleRate: number;
};

export type XensonarExternalAudioPcmCaptureHandle = {
  readonly pushBlock: (block: XensonarExternalAudioPcmBlock) => void;
  readonly dispose: () => void;
};

export type XensonarExternalAudioPcmCaptureRegistration = {
  readonly key: string;
  readonly label?: string;
  readonly sampleRate?: number;
};

const noopPcmCaptureHandle: XensonarExternalAudioPcmCaptureHandle = {
  pushBlock: () => undefined,
  dispose: () => undefined,
};

export type XensonarSharedAudioOutputBridge = {
  readonly ensureAudioReady: () => Promise<AudioContext>;
  readonly resolveOutputBus: (ctx: AudioContext) => AudioNode | null;
  readonly registerExternalAudioCapture?: (registration: XensonarExternalAudioCaptureRegistration) => () => void;
  readonly registerExternalAudioPcmCapture?: (registration: XensonarExternalAudioPcmCaptureRegistration) => XensonarExternalAudioPcmCaptureHandle;
  readonly label?: string;
};

let activeBridge: XensonarSharedAudioOutputBridge | null = null;
let activeBridgeGeneration = 0;

export function registerXensonarSharedAudioOutputBridge(bridge: XensonarSharedAudioOutputBridge | null): void {
  activeBridge = bridge;
  activeBridgeGeneration += 1;
}

export function readXensonarSharedAudioOutputBridgeGeneration(): number {
  return activeBridgeGeneration;
}

export function readXensonarSharedAudioOutputBridge(): XensonarSharedAudioOutputBridge | null {
  return activeBridge;
}

export async function resolveXensonarSharedAudioOutput(): Promise<{ ctx: AudioContext; output: AudioNode; label: string } | null> {
  const bridge = activeBridge;
  if (!bridge) return null;
  const ctx = await bridge.ensureAudioReady();
  const output = bridge.resolveOutputBus(ctx);
  if (!output) return null;
  return { ctx, output, label: bridge.label ?? 'xensonar-shared-audio-output' };
}

export function registerXensonarExternalAudioCapture(registration: XensonarExternalAudioCaptureRegistration): () => void {
  const bridge = activeBridge;
  if (!bridge?.registerExternalAudioCapture) return () => undefined;
  return bridge.registerExternalAudioCapture(registration);
}

export function registerXensonarExternalAudioPcmCapture(registration: XensonarExternalAudioPcmCaptureRegistration): XensonarExternalAudioPcmCaptureHandle {
  const bridge = activeBridge;
  if (!bridge?.registerExternalAudioPcmCapture) return noopPcmCaptureHandle;
  return bridge.registerExternalAudioPcmCapture(registration);
}
