/**
 * carrierIntegralSpektralSyntheseProfile — 3.2.91-7.7.6
 *
 * Übersetzt Bilddeskriptoren in ein HX-kompatibles Profil. Das ist die zentrale
 * Kompromissschicht: Die Malerei moduliert Klangparameter, aber der schnelle,
 * musikalisch brauchbare HarmonicXplorE-Direktkörper bleibt der Renderer.
 */
import type {
  CarrierIntegralHarmonicXplorePhase,
  CarrierIntegralHarmonicXploreProfile,
  CarrierIntegralHarmonicXploreSeriesType,
  CarrierIntegralHarmonicXploreTimbreFlavor,
} from './carrierIntegralHarmonicXploreLens';
import type { SpektralSyntheseDescriptor } from './carrierIntegralSpektralSyntheseDescriptor';
import { carrierIntegralRound3 } from './carrierIntegralStableIdentity';

function pickSeries(descriptor: SpektralSyntheseDescriptor): CarrierIntegralHarmonicXploreSeriesType {
  if (descriptor.density < 0.18 && descriptor.entropy < 0.30) return 'octave';
  if (descriptor.vertCenter < 0.28) return 'lower';
  if (descriptor.vertCenter > 0.72) return 'upper';
  if (descriptor.edgeDensity > 0.52 && descriptor.horizontality < 0.42) return 'numPrime';
  if (descriptor.density > 0.55 && descriptor.horizontality > 0.62 && descriptor.entropy < 0.42) return 'numEven';
  if (descriptor.density < 0.26 && descriptor.registerSpan > 0.44) return 'numFibo';
  if (descriptor.entropy > 0.66 && descriptor.density < 0.50) return 'inharmonic';
  return 'natural';
}

function pickFlavor(descriptor: SpektralSyntheseDescriptor): CarrierIntegralHarmonicXploreTimbreFlavor {
  if (descriptor.edgeDensity > 0.58) return 'bell';
  if (descriptor.contrast > 0.64) return 'bright';
  if (descriptor.entropy > 0.55 && descriptor.edgeDensity > 0.34) return 'metallic';
  if (descriptor.density > 0.52 && descriptor.horizontality > 0.58 && descriptor.entropy < 0.42) return 'warm';
  if (descriptor.entropy > 0.46 && descriptor.horizontality > 0.50) return 'chorus';
  if (descriptor.entropy > 0.48) return 'scatter';
  return 'resonator';
}

function pickPhase(descriptor: SpektralSyntheseDescriptor): CarrierIntegralHarmonicXplorePhase {
  if (descriptor.horizontality > 0.58) return 'phaseUp';
  if (descriptor.vertCenter < 0.32) return 'phaseDown';
  return 'phaseFull';
}

function pickCarrierReading(
  descriptor: SpektralSyntheseDescriptor,
  seriesType: CarrierIntegralHarmonicXploreSeriesType,
): CarrierIntegralHarmonicXploreProfile['carrierReading'] {
  if (seriesType === 'numPrime') return 'prime-skeleton';
  if (seriesType === 'numFibo') return 'fibonacci-shell';
  if (descriptor.vertCenter < 0.32 || seriesType === 'lower' || seriesType === 'under') return 'undertone-mirror';
  return 'overtone-ribbon';
}

export function deriveSpektralSyntheseProfile(
  descriptor: SpektralSyntheseDescriptor,
): CarrierIntegralHarmonicXploreProfile {
  const seriesType = pickSeries(descriptor);
  const timbreFlavor = pickFlavor(descriptor);
  const phase = pickPhase(descriptor);
  // 7.7.11: density gets a stronger role in texture depth.  Low-density
  // paintings stay sparse; dense paintings can open more HX partials before
  // the SpektralSynthese-only density spread pass thickens the rendered body.
  const count = Math.max(3, Math.min(16, 3 + Math.round(descriptor.density * 11 + descriptor.registerSpan * 2)));
  const swarmDispersion = carrierIntegralRound3(Math.max(0, Math.min(0.78, descriptor.entropy * 0.50 + descriptor.edgeDensity * 0.14 + descriptor.density * 0.12)));
  const formantFocus = carrierIntegralRound3(Math.max(0, Math.min(1, 0.48 + (0.5 - descriptor.vertCenter) * 0.62 + descriptor.contrast * 0.16)));

  return {
    id: `spektral-synthese-derived-${descriptor.descriptorKey}`,
    label: 'SpektralSynthese',
    seriesType,
    phase,
    count,
    carrierReading: pickCarrierReading(descriptor, seriesType),
    timbreFlavor,
    swarmDispersion,
    formantFocus,
    summary: [
      'SpektralSynthese',
      `Dichte ${descriptor.density.toFixed(2)}`,
      `Kontrast ${descriptor.contrast.toFixed(2)}`,
      `Kante ${descriptor.edgeDensity.toFixed(2)}`,
      `Textur ${count} Partials`,
      `Serie ${seriesType}`,
      `Flavor ${timbreFlavor}`,
    ].join(' · '),
  };
}
