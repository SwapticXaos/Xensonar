import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
/** Readiness is tied to the exact decoded material AND selected region.
 * Names/durations alone cannot prove an extraction belongs to this sample. */
export function sameDonorSelection(a: AudioSourceAsset | null, b: AudioSourceAsset | null): boolean {
  return !!a && !!b && a.leftSamples === b.leftSamples && a.rightSamples === b.rightSamples
    && a.monoSamples === b.monoSamples && a.sampleRate === b.sampleRate
    && a.importStartSec === b.importStartSec && a.importDurationSec === b.importDurationSec;
}
