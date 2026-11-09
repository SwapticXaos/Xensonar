import type { TransientRuntime } from "../../resonance/transientRuntime";
import type { ScheduledToneHandle } from "./useAudioContextRuntimeRefs";

type MutableRefLike<T> = { current: T };

export type RegisterScheduledToneLifecycleArgs = {
  activeScheduledTonesRef: MutableRefLike<ScheduledToneHandle[]>;
  transientRuntime: Pick<TransientRuntime, "releaseVoice">;
  activeTone: ScheduledToneHandle;
  disconnect: () => void;
};

export function registerScheduledToneLifecycle({
  activeScheduledTonesRef,
  transientRuntime,
  activeTone,
  disconnect,
}: RegisterScheduledToneLifecycleArgs): () => void {
  activeScheduledTonesRef.current.push(activeTone);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = activeScheduledTonesRef.current.indexOf(activeTone);
    if (index >= 0) activeScheduledTonesRef.current.splice(index, 1);
    try {
      transientRuntime.releaseVoice(activeTone.ticket);
    } finally {
      disconnect();
    }
  };
}

export function disconnectScheduledToneNodes(...nodes: Array<AudioNode | null | undefined>): void {
  for (const node of nodes) {
    try {
      node?.disconnect();
    } catch {
      // WebAudio nodes may already be disconnected after browser-side stop/cleanup races.
    }
  }
}

/** Own only nodes made for this voice, never shared outputs or destinations. */
export function createScheduledToneGraph() {
  const nodes: AudioNode[] = [];
  let disposed = false;
  return {
    own<T extends AudioNode>(node: T): T {
      if (disposed) throw new Error("Cannot add nodes to a released tone graph");
      nodes.push(node);
      return node;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const node of nodes) {
        if ("stop" in node) {
          try {
            (node as AudioScheduledSourceNode).stop();
          } catch {
            /* Already ended or never started. */
          }
        }
        try {
          node.disconnect();
        } catch {
          /* Already disconnected. */
        }
      }
      nodes.length = 0;
    },
  };
}
