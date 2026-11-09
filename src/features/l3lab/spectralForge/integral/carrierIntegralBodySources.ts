import type {
  AnchorRelativeTimbreTensor,
  DonorAnchor,
  DonorRegisterLabel,
} from '../types/carrierDonorV2Types';
import { buildNeutralCarrierDonorV2Tensor } from '../donorV2/buildNeutralCarrierDonorV2Tensor';
import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import { carrierIntegralFnv1aShortHash } from './carrierIntegralStableIdentity';
import { resolveCarrierIntegralMachine } from './carrierIntegralRegistry';

export type CarrierIntegralBodySourceRole =
  | 'direct-synth-source'
  | 'neutral-synthetic-pigment'
  | 'audio-donor-analysis'
  | 'rendered-material-audio'
  | 'legacy-direct-source'
  | 'formant-plan-source'
  | 'spectral-window-body-source'
  | 'harmonic-xplore-source'
  | 'spektral-synthese-source'
  | 'attractor-swarm-source';

export type CarrierIntegralBodySourceContract = {
  mode: CarrierIntegralBodySourceMode;
  label: string;
  role: CarrierIntegralBodySourceRole;
  requiresAudioDonor: boolean;
  providesSyntheticPigment: boolean;
  providesDonorTensor: boolean;
  mayRenderAudioBody: boolean;
  isFallback: boolean;
  summary: string;
  guardrail: string;
};

export type CarrierIntegralNeutralPigmentSummary = {
  anchorCount: number;
  atomCount: number;
  sourceFrameCount: number;
  registerCounts: Record<DonorRegisterLabel, number>;
  fingerprint: string;
};

export type CarrierIntegralNeutralPigmentSource = {
  mode: 'neutral_pigment';
  label: 'Neutral-Pigment';
  anchors: DonorAnchor[];
  tensor: AnchorRelativeTimbreTensor;
  summary: CarrierIntegralNeutralPigmentSummary;
  sourceSignature: string;
};

export type CarrierIntegralMachineBodySourceOption = {
  machineId: CarrierIntegralMachineId;
  mode: CarrierIntegralBodySourceMode;
  contract: CarrierIntegralBodySourceContract;
  preferred: boolean;
};

export const CARRIER_INTEGRAL_BODY_SOURCE_CONTRACTS: Partial<Record<CarrierIntegralBodySourceMode, CarrierIntegralBodySourceContract>> = {
  raw_oscillator: {
    mode: 'raw_oscillator',
    label: 'Roh-Oszillator',
    role: 'direct-synth-source',
    requiresAudioDonor: false,
    providesSyntheticPigment: false,
    providesDonorTensor: false,
    mayRenderAudioBody: false,
    isFallback: false,
    summary: 'Absichtlich donorloser, abstrakter Synth-/Darkpsy-Körper für direkte Hörweise-senden-Pfade.',
    guardrail: 'Roh-Oszillator ist nicht neutral_pigment und nicht audio_donor; fehlende Timbre-Extraktion ist hier eine ästhetische Entscheidung.',
  },
  neutral_pigment: {
    mode: 'neutral_pigment',
    label: 'Neutral-Pigment',
    role: 'neutral-synthetic-pigment',
    requiresAudioDonor: false,
    providesSyntheticPigment: true,
    providesDonorTensor: true,
    mayRenderAudioBody: false,
    isFallback: false,
    summary: 'Synthetischer Donor-/Pigment-Stub aus Branch B: Carrier-Lesarten können vorbereitet werden, ohne echte Timbre-Extraktion zu behaupten.',
    guardrail: 'Neutral-Pigment darf den Roh-Oszillator nicht ersetzen und darf nicht als echte Audio-Donor-Analyse etikettiert werden.',
  },
  audio_donor: {
    mode: 'audio_donor',
    label: 'Audio-Donor',
    role: 'audio-donor-analysis',
    requiresAudioDonor: true,
    providesSyntheticPigment: false,
    providesDonorTensor: true,
    mayRenderAudioBody: true,
    isFallback: false,
    summary: 'Rudimentär donor-informierter V2-Pfad; kann später stärker timbral werden, bleibt aktuell aber optional.',
    guardrail: 'Audio-Donor darf nicht stillschweigend Voraussetzung für alle Carrier-Hörweisen sein.',
  },
  legacy_direct: {
    mode: 'legacy_direct',
    label: '5.69 Legacy',
    role: 'legacy-direct-source',
    requiresAudioDonor: false,
    providesSyntheticPigment: false,
    providesDonorTensor: false,
    mayRenderAudioBody: false,
    isFallback: true,
    summary: 'Erhaltene 5.69-Direktlesung / Legacy Supernote als expliziter Kompatibilitätskörper.',
    guardrail: 'Legacy Direct bleibt auf 5.69-Kompatibilität begrenzt und darf weder als aktive Antonia noch als Roh-Oszillator etikettiert werden.',
  },
  harmonic_xplore: {
    mode: 'harmonic_xplore',
    label: 'HarmonicXplorE Direkt',
    role: 'harmonic-xplore-source',
    requiresAudioDonor: false,
    providesSyntheticPigment: false,
    providesDonorTensor: false,
    mayRenderAudioBody: true,
    isFallback: false,
    summary: 'Fremder Verhältnis-/Geometrie-Klangkörper: HarmonicXplorE darf als eigener Carrier-Timbre-Renderer deutlich anders klingen.',
    guardrail: 'HarmonicXplorE Direkt darf Legacy-Synth-Labor überformen, aber keine Hauptraum-/Wellenstarter-/Burst-Parameter ändern und keine Audio-Wahrheit für mPRG behaupten.',
  },
  spektral_synthese: {
    mode: 'spektral_synthese',
    label: 'SpektralSynthese',
    role: 'spektral-synthese-source',
    requiresAudioDonor: false,
    providesSyntheticPigment: false,
    providesDonorTensor: false,
    mayRenderAudioBody: true,
    isFallback: false,
    summary: 'Descriptor-informierter Bildkörper: Dichte, Kontrast, Schwerpunkt und Kanten modulieren einen HX-kompatiblen Direktkörper.',
    guardrail: 'SpektralSynthese ist eine explizite Hörweise; sie darf nicht still als HarmonicXplorE-Default oder Pure-Dieter-Ersatz auftreten.',
  }
};

export function resolveCarrierIntegralBodySourceContract(mode: CarrierIntegralBodySourceMode): CarrierIntegralBodySourceContract {
  return CARRIER_INTEGRAL_BODY_SOURCE_CONTRACTS[mode] ?? CARRIER_INTEGRAL_BODY_SOURCE_CONTRACTS.raw_oscillator!;
}

export function listCarrierIntegralBodySourceContracts(): CarrierIntegralBodySourceContract[] {
  return Object.values(CARRIER_INTEGRAL_BODY_SOURCE_CONTRACTS);
}

export function resolveCarrierIntegralMachineBodySourceOptions(machineId: CarrierIntegralMachineId): CarrierIntegralMachineBodySourceOption[] {
  const machine = resolveCarrierIntegralMachine(machineId);
  return machine.bodySourceModes.map((mode, index) => ({
    machineId,
    mode,
    contract: resolveCarrierIntegralBodySourceContract(mode),
    preferred: index === 0,
  }));
}

export function buildCarrierIntegralNeutralPigmentSource(): CarrierIntegralNeutralPigmentSource {
  const bundle = buildNeutralCarrierDonorV2Tensor();
  const summary = summarizeNeutralPigment(bundle.anchors, bundle.tensor);
  return {
    mode: 'neutral_pigment',
    label: 'Neutral-Pigment',
    anchors: bundle.anchors,
    tensor: bundle.tensor,
    summary,
    sourceSignature: `carrier-integral-neutral-pigment:${summary.fingerprint}`,
  };
}

export function summarizeNeutralPigment(anchors: DonorAnchor[], tensor: AnchorRelativeTimbreTensor): CarrierIntegralNeutralPigmentSummary {
  const registerCounts: Record<DonorRegisterLabel, number> = { low: 0, mid: 0, high: 0 };
  for (const anchor of anchors) registerCounts[anchor.register] += 1;
  const normalized = [
    anchors.length,
    tensor.atoms.length,
    tensor.sourceFrameCount,
    registerCounts.low,
    registerCounts.mid,
    registerCounts.high,
    tensor.registerBoundariesHz.join(','),
  ].join('|');
  return {
    anchorCount: anchors.length,
    atomCount: tensor.atoms.length,
    sourceFrameCount: tensor.sourceFrameCount,
    registerCounts,
    fingerprint: carrierIntegralFnv1aShortHash(normalized),
  };
}

export function resolveDefaultCarrierIntegralBodySource(machineId: CarrierIntegralMachineId): CarrierIntegralBodySourceMode {
  return resolveCarrierIntegralMachine(machineId).bodySourceModes[0];
}

export function canMachineUseCarrierIntegralBodySource(machineId: CarrierIntegralMachineId, mode: CarrierIntegralBodySourceMode): boolean {
  return resolveCarrierIntegralMachine(machineId).bodySourceModes.includes(mode);
}

export function inspectCarrierIntegralBodySourceContracts(machineIds: CarrierIntegralMachineId[]) {
  const findings: { level: 'ok' | 'warning' | 'error'; code: string; message: string }[] = [];
  const neutral = buildCarrierIntegralNeutralPigmentSource();
  if (neutral.summary.anchorCount < 24 || neutral.summary.atomCount < 24 || !neutral.sourceSignature.includes('neutral-pigment')) {
    findings.push({ level: 'error', code: 'neutral-pigment-tensor-missing', message: 'Neutral-Pigment muss einen echten synthetischen Donor-Tensor mit stabiler Signatur erzeugen.' });
  } else {
    findings.push({ level: 'ok', code: 'neutral-pigment-tensor-ready', message: `Neutral-Pigment erzeugt ${neutral.summary.anchorCount} Anker und ${neutral.summary.atomCount} Atome.` });
  }

  const raw = resolveCarrierIntegralBodySourceContract('raw_oscillator');
  const neutralContract = resolveCarrierIntegralBodySourceContract('neutral_pigment');
  const audio = resolveCarrierIntegralBodySourceContract('audio_donor');
  if (raw.providesDonorTensor || raw.requiresAudioDonor || raw.providesSyntheticPigment) {
    findings.push({ level: 'error', code: 'raw-oscillator-pigment-confused', message: 'Roh-Oszillator darf nicht als Donor- oder Neutral-Pigment-Quelle modelliert sein.' });
  } else {
    findings.push({ level: 'ok', code: 'raw-oscillator-distinct', message: 'Roh-Oszillator bleibt eine donorlose Direktquelle.' });
  }
  if (!neutralContract.providesDonorTensor || neutralContract.requiresAudioDonor) {
    findings.push({ level: 'error', code: 'neutral-pigment-contract-invalid', message: 'Neutral-Pigment muss Donor-Tensor bereitstellen, darf aber keinen Audio-Donor verlangen.' });
  } else {
    findings.push({ level: 'ok', code: 'neutral-pigment-contract-valid', message: 'Neutral-Pigment entlastet die echte Timbre-Extraktion korrekt.' });
  }
  if (!audio.requiresAudioDonor || !audio.providesDonorTensor) {
    findings.push({ level: 'error', code: 'audio-donor-contract-invalid', message: 'Audio-Donor muss als echte Donor-Analysequelle erkennbar bleiben.' });
  } else {
    findings.push({ level: 'ok', code: 'audio-donor-distinct', message: 'Audio-Donor bleibt von Neutral-Pigment und Roh-Oszillator unterscheidbar.' });
  }

  for (const machineId of machineIds) {
    const options = resolveCarrierIntegralMachineBodySourceOptions(machineId);
    if (!options.length) {
      findings.push({ level: 'error', code: `${machineId}:no-body-source-options`, message: `${machineId} hat keine Körperquellen-Optionen.` });
    }
  }

  if (!canMachineUseCarrierIntegralBodySource('branch-b573-synth-window', 'neutral_pigment')) {
    findings.push({ level: 'error', code: 'b573-neutral-pigment-missing', message: 'B_5.73 muss neutral_pigment nutzen können, ohne Audio-Donor zu verlangen.' });
  } else {
    findings.push({ level: 'ok', code: 'b573-neutral-pigment-ready', message: 'B_5.73 kann mit Neutral-Pigment vorbereitet werden.' });
  }

  if (canMachineUseCarrierIntegralBodySource('raw-darkpsy-oscillator', 'neutral_pigment') || canMachineUseCarrierIntegralBodySource('raw-darkpsy-oscillator', 'audio_donor')) {
    findings.push({ level: 'error', code: 'raw-darkpsy-body-source-too-broad', message: 'Roh-Oszillator darf nicht über Neutral-Pigment oder Audio-Donor laufen.' });
  } else {
    findings.push({ level: 'ok', code: 'raw-darkpsy-body-source-exclusive', message: 'Roh-Oszillator bleibt als eigene Körperquelle exklusiv.' });
  }

  return findings;
}

