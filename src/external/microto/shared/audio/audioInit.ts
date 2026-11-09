export type EnsureAudio = () => Promise<AudioContext | null>;

export function isAudioRunning(ctx: AudioContext | null | undefined): boolean {
  return !!ctx && ctx.state === "running";
}

