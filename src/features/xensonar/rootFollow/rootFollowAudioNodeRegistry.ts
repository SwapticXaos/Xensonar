import type { RootFollowSynthRenderArgs } from './rootFollowRendererTypes';

export type RootFollowAudioNodeRegistrarArgs = {
  node: AudioNode;
  cleanupDelayMs?: number;
};

export type RootFollowAudioNodeRegistrar = (
  args: RootFollowAudioNodeRegistrarArgs,
) => void;

export type RootFollowAudioNodeRegistryRefs = Pick<
  RootFollowSynthRenderArgs['refs'],
  'activeNodesRef'
>;

function cleanupRegisteredRootFollowAudioNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioNode;
  fallbackCleanupRef?: { current: number | null };
}) {
  const { refs, node, fallbackCleanupRef } = args;
  refs.activeNodesRef.current.delete(node);
  try {
    node.disconnect();
  } catch {}
  if (fallbackCleanupRef && fallbackCleanupRef.current !== null) {
    window.clearTimeout(fallbackCleanupRef.current);
    fallbackCleanupRef.current = null;
  }
}

export function registerRootFollowScheduledSourceNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioScheduledSourceNode;
}) {
  const { refs, node } = args;
  refs.activeNodesRef.current.add(node);
  node.onended = () => {
    cleanupRegisteredRootFollowAudioNode({ refs, node });
  };
}

export function registerRootFollowTimedAudioNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioNode;
  cleanupDelayMs?: number;
  defaultCleanupDelayMs?: number;
  minCleanupDelayMs?: number;
}) {
  const { refs, node } = args;
  refs.activeNodesRef.current.add(node);
  const cleanupDelayMs = Math.max(
    Number.isFinite(args.minCleanupDelayMs ?? NaN)
      ? Number(args.minCleanupDelayMs)
      : 250,
    Number.isFinite(args.cleanupDelayMs ?? NaN)
      ? Number(args.cleanupDelayMs)
      : Number.isFinite(args.defaultCleanupDelayMs ?? NaN)
        ? Number(args.defaultCleanupDelayMs)
        : 2000,
  );
  window.setTimeout(() => {
    cleanupRegisteredRootFollowAudioNode({ refs, node });
  }, cleanupDelayMs);
}

export function registerRootFollowScheduledSourceNodeWithFallback(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioScheduledSourceNode;
  cleanupDelayMs: number;
}) {
  const { refs, node, cleanupDelayMs } = args;
  refs.activeNodesRef.current.add(node);
  const fallbackCleanupRef: { current: number | null } = { current: null };
  const cleanupNode = () => {
    cleanupRegisteredRootFollowAudioNode({ refs, node, fallbackCleanupRef });
  };
  fallbackCleanupRef.current = window.setTimeout(cleanupNode, cleanupDelayMs);
  node.onended = cleanupNode;
}

export function registerRootFollowDirectAudioNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioNode;
  cleanupDelayMs?: number;
}) {
  const { refs, node } = args;
  if (node instanceof AudioScheduledSourceNode) {
    registerRootFollowScheduledSourceNode({ refs, node });
    return;
  }
  if (
    node instanceof GainNode ||
    node instanceof StereoPannerNode ||
    node instanceof BiquadFilterNode
  ) {
    registerRootFollowTimedAudioNode({
      refs,
      node,
      cleanupDelayMs: args.cleanupDelayMs,
      defaultCleanupDelayMs: 2000,
      minCleanupDelayMs: 250,
    });
    return;
  }
  refs.activeNodesRef.current.add(node);
}

export function registerRootFollowFormantAudioNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioNode;
  cleanupDelayMs?: number;
}) {
  const { refs, node } = args;
  if (node instanceof AudioScheduledSourceNode) {
    registerRootFollowScheduledSourceNode({ refs, node });
    return;
  }
  registerRootFollowTimedAudioNode({
    refs,
    node,
    cleanupDelayMs: args.cleanupDelayMs,
    defaultCleanupDelayMs: 2000,
    minCleanupDelayMs: 250,
  });
}

export function makeRootFollowMaterialAudioNodeRegistrar(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  getCleanupDelayMs: () => number;
}): (node: AudioNode) => void {
  const { refs, getCleanupDelayMs } = args;
  return (node: AudioNode) => {
    const cleanupDelayMs = getCleanupDelayMs();
    if (node instanceof AudioScheduledSourceNode) {
      registerRootFollowScheduledSourceNodeWithFallback({
        refs,
        node,
        cleanupDelayMs,
      });
      return;
    }
    registerRootFollowTimedAudioNode({
      refs,
      node,
      cleanupDelayMs,
      defaultCleanupDelayMs: cleanupDelayMs,
      minCleanupDelayMs: 0,
    });
  };
}

export function registerRootFollowAudioNode(args: {
  refs: RootFollowAudioNodeRegistryRefs;
  node: AudioNode;
  cleanupDelayMs?: number;
}) {
  registerRootFollowDirectAudioNode(args);
}

export function makeRootFollowAudioNodeRegistrar(
  refs: RootFollowAudioNodeRegistryRefs,
): RootFollowAudioNodeRegistrar {
  return (nodeArgs) => registerRootFollowDirectAudioNode({ refs, ...nodeArgs });
}
