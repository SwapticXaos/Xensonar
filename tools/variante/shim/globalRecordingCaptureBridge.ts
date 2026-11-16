// The shared audio output of the Full build was a registered bridge. In this build it is the live master input the other rooms use
// (__xenMultitrackBridge: ensureAudioReady + getMasterInput, same as Psy Lab). Without the bridge the room falls back to its own AudioContext.
declare const __xenMultitrackBridge: { current: any };
export async function resolveXensonarSharedAudioOutput(): Promise<{ ctx: AudioContext; output: AudioNode; label: string } | null> {
  const bridge = __xenMultitrackBridge.current;
  if (!bridge) return null;
  const ctx: AudioContext = await bridge.ensureAudioReady();
  const output: AudioNode | null = bridge.getMasterInput(ctx);
  return output ? { ctx, output, label: "xensonar-live-master" } : null;
}
