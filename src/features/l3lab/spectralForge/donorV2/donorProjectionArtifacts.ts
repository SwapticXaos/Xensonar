import type { SpectralEmbodimentArtifactInputs, SpectralEmbodimentArtifacts } from '../embodiment/buildSpectralEmbodimentArtifacts';
import { analyzeCarrierDonorV2AudioBuffer, buildCarrierDonorV2LoopMetadata, buildCarrierDonorV2ValidationReport } from '../validation/evaluateCarrierDonorV2Validation';
import { extractSpectralSkeleton } from '../carrierV2/extractSpectralSkeleton';
import { summarizeCarrierSpectralSkeleton } from '../carrierV2/carrierDiagnostics';
import { buildCarrierPresenceInterpretationBridge } from '../interpretation/carrierPresenceInterpretationField';
import { buildCarrierFieldCoverageContract } from '../interpretation/carrierFieldCoverageContract';
import type { SpectralData } from '../audio/SpectralData';
import type { EmbodimentField } from '../types/embodimentFieldTypes';

/** The drawing preview is explicitly a carrier view, not a claimed FFT of the final audio. */
export function buildDonorCarrierField(spectralData: SpectralData, durationSec: number): EmbodimentField {
  const trace = spectralData.data.slice();
  const empty = new Float32Array(trace.length);
  return { width: spectralData.width, height: spectralData.height, durationSec,
    carrierTrace: trace, orderedField: empty, bodyField: empty, residualField: empty,
    transientField: empty, compositeField: trace, builtFromSignature: 'carrier-donor-v2:donor-projection:carrier-view' };
}

/** Donor projection does not need a legacy tensor, atlas, allocation or binding. */
export function buildDonorProjectionArtifacts(args: SpectralEmbodimentArtifactInputs): SpectralEmbodimentArtifacts {
  const skeleton = extractSpectralSkeleton(args.spectralData, args.meter.intendedLoopDurationSec, { maxAnchorsPerFrame: 8, minPeakAmplitude: 0.025, verticalSmoothingRadius: 1, minPeakDistanceBins: 2 });
  const summary = summarizeCarrierSpectralSkeleton(skeleton);
  const loopMetadata = buildCarrierDonorV2LoopMetadata({ ...args.meter, durationSec: args.meter.intendedLoopDurationSec, donorUseMode: 'timbre_projection' });
  const bridge = buildCarrierPresenceInterpretationBridge(args.spectralData);
  const audioStats = analyzeCarrierDonorV2AudioBuffer(args.renderedBuffer);
  const report = buildCarrierDonorV2ValidationReport({
    sourceSignature: args.sourceSignature, loopMetadata, audioStats, carrierSummary: summary,
    continuitySummary: null, donorSummary: null, donorAtlasSummary: null,
    gestaltFieldSummary: null, materialFieldSummary: null, bindingSummary: null, materialAllocationSummary: null,
    transferProfile: args.current.transferProfile,
    fieldCoverageContract: buildCarrierFieldCoverageContract(bridge.presence, skeleton, []), rootFollowPlan: null,
  });
  const finite = [...Array(args.renderedBuffer.numberOfChannels).keys()].every(c => args.renderedBuffer.getChannelData(c).every(Number.isFinite));
  report.checks = [
    { id: 'projection-finite', label: 'Endliches Audiosignal', passed: finite, severity: finite ? 'info' : 'fail', detail: 'Berechnete PCM-Samples geprüft.' },
    { id: 'projection-duration', label: 'Zeit folgt der Figur', passed: report.metrics.timeMasterPass, severity: report.metrics.timeMasterPass ? 'info' : 'fail', detail: `Dauer ${audioStats.durationSec.toFixed(3)} s.` },
    { id: 'projection-headroom', label: 'Ausgangspegel', passed: audioStats.peak <= 0.98, severity: audioStats.peak <= 0.98 ? 'info' : 'warn', detail: `Peak ${audioStats.peak.toFixed(3)}, RMS ${audioStats.rms.toFixed(3)}.` },
  ];
  report.warnings = ['Atlas-/Binding-Metriken gelten für diese direkte Materialprojektion nicht. Dieser Bericht beurteilt keine subjektive Klangqualität.'];
  report.summaryLine = `Donor-Körper · ${summary.anchorCount} Carrier-Anker · ${audioStats.durationSec.toFixed(2)} s · Peak ${audioStats.peak.toFixed(3)}`;
  return { mode: 'carrier_donor_v2', sourceSignature: args.sourceSignature, buffer: args.renderedBuffer,
    loopMetadata, report, rootFollowConfig: null, rootFollowPlan: null, rootFollowGranularProfile: null,
    donorMaterialProfile: null, syntheticRootFollow: false };
}
