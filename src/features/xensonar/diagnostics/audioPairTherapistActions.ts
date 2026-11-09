import type { AudioTrafficForensicsState } from '../audioTraffic/audioTrafficForensics';
import { resetAudioTrafficForensics, type MutableRefLike } from './burstDiagnosticsRuntime';

export type AudioPairTherapistNParamsPatch = {
  rootFollowLoopActive?: boolean;
  materialLoopActive?: boolean;
};

export function runAudioPairTherapistRuntimeReset(args: {
  stopRootFollowRuntimeOnly: () => void;
  stopMaterialLoopRuntimeOnly: () => void;
  resetResonanceTransientState: () => void;
  trafficRef: MutableRefLike<AudioTrafficForensicsState>;
  updateNParams: (patch: AudioPairTherapistNParamsPatch) => void;
  setStatus: (message: string) => void;
  ensureAudioReady: () => Promise<AudioContext>;
  prewarmAudioRuntime: (ctx: AudioContext) => void;
}) {
  args.stopRootFollowRuntimeOnly();
  args.stopMaterialLoopRuntimeOnly();
  args.resetResonanceTransientState();
  resetAudioTrafficForensics(args.trafficRef);
  args.updateNParams({ rootFollowLoopActive: false, materialLoopActive: false });
  args.setStatus('Laufzeit bereinigt: Root Follow, Materialspur, Transienten und Traffic-Zähler wurden gestoppt/geleert. Paketdaten und Samples bleiben erhalten.');
  void args.ensureAudioReady()
    .then((ctx) => args.prewarmAudioRuntime(ctx))
    .catch((error) => args.setStatus(error instanceof Error ? 'Audio-Reset: AudioContext konnte nicht reaktiviert werden: ' + error.message : 'Audio-Reset: AudioContext konnte nicht reaktiviert werden.'));
}
