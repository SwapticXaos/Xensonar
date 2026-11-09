import type { InstallationFieldConfig } from "./installationFieldConfig";
import { scaleResidentCollisionAmplitude } from "./residentAudioPolicy";

export function isInstallationResidentBallCouplingActive(
  sharedFieldActive: boolean,
  config: Pick<InstallationFieldConfig, "residentsEnabled" | "residentBallCoupling">,
) {
  return sharedFieldActive && config.residentsEnabled && config.residentBallCoupling.oscillatorBall;
}

export function getResidentCollisionOutputAmp(
  config: Pick<InstallationFieldConfig, "residentVolume">,
  rawAmp: number,
  ampMul: number,
) {
  return scaleResidentCollisionAmplitude(rawAmp * ampMul * config.residentVolume);
}
