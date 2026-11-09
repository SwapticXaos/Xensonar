export type InstallationParticleMode = "normal" | "all_off";

export function resolveInstallationParticleMode(particleSoundsMuted: boolean): InstallationParticleMode {
  return particleSoundsMuted ? "all_off" : "normal";
}

export function resolveEffectiveAgentEnabled(agentEnabled: boolean[], particleSoundsMuted: boolean): boolean[] {
  if (!particleSoundsMuted) return agentEnabled;
  return agentEnabled.map(() => false);
}

export function isWaveCollisionTargetMuted(targetKind: "particle" | "resident", particleSoundsMuted: boolean): boolean {
  return targetKind === "particle" && particleSoundsMuted;
}
