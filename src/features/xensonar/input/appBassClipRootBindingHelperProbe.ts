import type { BassClip } from '../groove/bassPatternEvents';

export type AppBassClipPlaybackCache = {
  readonly id: string;
  readonly clip: BassClip | null;
};

export type AppBassClipBarRootBinding = {
  readonly clipId: string;
  readonly barIndex: number;
  readonly rootHz: number;
};

export type AppBassClipRootBindingHelperProbeArgs = {
  readonly bassClipId: string;
  readonly currentPlaybackCache: AppBassClipPlaybackCache;
  readonly currentBarRoot: AppBassClipBarRootBinding;
  readonly barIndex: number;
  readonly rootHz: number;
  readonly readBassClipById: (id: string) => BassClip | null;
};

export type AppBassClipRootBindingHelperProbeResult = {
  readonly clip: BassClip | null;
  readonly clipRootHz: number;
  readonly rootBinding: BassClip['generatorMeta']['rootBinding'];
  readonly nextPlaybackCache: AppBassClipPlaybackCache;
  readonly nextBarRoot: AppBassClipBarRootBinding;
  readonly playbackCacheWriteRequired: boolean;
  readonly barRootWriteRequired: boolean;
  readonly writerStillAppOwned: true;
  readonly schedulingStillAppOwned: true;
  readonly runtimeOwned: false;
};

export const resolveAppBassClipRootBindingHelperProbe = (
  args: AppBassClipRootBindingHelperProbeArgs,
): AppBassClipRootBindingHelperProbeResult => {
  const playbackCacheWriteRequired = args.currentPlaybackCache.id !== args.bassClipId;
  const nextPlaybackCache = playbackCacheWriteRequired
    ? { id: args.bassClipId, clip: args.readBassClipById(args.bassClipId) }
    : args.currentPlaybackCache;
  const clip = nextPlaybackCache.clip;
  const rootBinding = clip?.generatorMeta.rootBinding ?? 'live-step-root';

  let nextBarRoot = args.currentBarRoot;
  let barRootWriteRequired = false;
  let clipRootHz = args.rootHz;

  if (clip && rootBinding === 'free') {
    clipRootHz = clip.generatorMeta.rootHz ?? args.rootHz;
  } else if (clip && rootBinding === 'bar-frozen') {
    barRootWriteRequired = args.currentBarRoot.clipId !== args.bassClipId || args.currentBarRoot.barIndex !== args.barIndex;
    nextBarRoot = barRootWriteRequired
      ? { clipId: args.bassClipId, barIndex: args.barIndex, rootHz: args.rootHz }
      : args.currentBarRoot;
    clipRootHz = nextBarRoot.rootHz;
  }

  return {
    clip,
    clipRootHz,
    rootBinding,
    nextPlaybackCache,
    nextBarRoot,
    playbackCacheWriteRequired,
    barRootWriteRequired,
    writerStillAppOwned: true,
    schedulingStillAppOwned: true,
    runtimeOwned: false,
  };
};
