import type {
  CarrierIntegralMachineId,
  CarrierIntegralRouteKind,
} from './carrierIntegralContracts';
import type { CarrierIntegralSendContract } from './carrierIntegralSendTargetContracts';

const RAW_AUDIO_MELODIC_MACHINES = new Set<CarrierIntegralMachineId>([
  'raw-darkpsy-oscillator',
  'harmonic-xplore-direct-carrier',
  'spektral-synthese-body',
]);

export function buildRootFollowLoopContract(machineId: CarrierIntegralMachineId, routeKind: CarrierIntegralRouteKind): CarrierIntegralSendContract {
  if (machineId === 'raw-darkpsy-oscillator' || machineId === 'spektral-synthese-body' || routeKind === 'rendered-material-body') {
    return {
      destination: 'root-follow-loop',
      targetId: 'root-follow-export',
      routeKind,
      signalKind: 'raw-audio-body',
      defaultElasticity: 'raw-granular-elastic',
      allowedElasticities: ['raw-granular-elastic', 'raw-tape-coupled'],
      defaultIsTimeElastic: true,
      canChooseElasticity: true,
      tradeoff: 'pitch-time-independent-raw-stretch',
      summary: machineId === 'spektral-synthese-body'
        ? 'SpektralSynthese geht als gerenderter Descriptor-/Akzent-Klangkörper in Root Follow; kein synthetischer Plan, der die Bilddeskriptor-Schicht verliert.'
        : 'Gerenderter/roher Audiokörper kann in die Root Follow Loop gehen; Standard ist granulare Zeit-Pitch-Elastik.',
      guardrail: machineId === 'spektral-synthese-body'
        ? 'SpektralSynthese-Root-Follow muss den gehörten Buffer als Materialkörper bewahren, bis ein eigener descriptor-synthetischer Root-Follow-Plan existiert.'
        : 'Raw Audio in Root Follow muss zwischen granularer Elastik und tonbandartiger Pitch-Time-Kopplung unterscheidbar bleiben.',
    };
  }

  return {
    destination: 'root-follow-loop',
    targetId: 'root-follow-export',
    routeKind,
    signalKind: 'synthetic-carrier-body',
    defaultElasticity: 'synthetic-time-elastic',
    allowedElasticities: ['synthetic-time-elastic'],
    defaultIsTimeElastic: true,
    canChooseElasticity: false,
    tradeoff: 'root-follow-synthetic-default',
    summary: 'Synthetische Carrier-Lesungen sind in der Root Follow Loop per Default zeit-elastisch.',
    guardrail: 'Root Follow Synth-Pfade dürfen nicht als starre gerenderte Audioschleife behandelt werden.',
  };
}

export function buildMaterialspurContract(machineId: CarrierIntegralMachineId, routeKind: CarrierIntegralRouteKind): CarrierIntegralSendContract {
  const rawSynth = machineId === 'raw-darkpsy-oscillator';
  return {
    destination: 'materialspur',
    targetId: 'materialspur-export',
    routeKind,
    signalKind: rawSynth || routeKind === 'rendered-material-body' ? 'raw-audio-body' : 'synthetic-carrier-body',
    defaultElasticity: 'fixed-rendered-audio',
    allowedElasticities: ['fixed-rendered-audio'],
    defaultIsTimeElastic: false,
    canChooseElasticity: false,
    tradeoff: 'material-track-fixed-render',
    summary: rawSynth
      ? 'Pure Dieter wird für die Materialspur als hörbarer Rohmaterial-WAV-Körper gerendert.'
      : 'Materialspur erhält einen stabilen hörbaren Materialeintrag; Root-Follow-Elastik ist davon getrennt.',
    guardrail: 'Materialspur-Senden und Root-Follow-Senden sind zwei Zielwege; keiner darf den anderen stillschweigend ersetzen.',
  };
}

export function buildLoopTrackDirectContract(routeKind: CarrierIntegralRouteKind): CarrierIntegralSendContract {
  return {
    destination: 'loop-track-direct',
    targetId: 'loop-track-direct-export',
    routeKind,
    signalKind: 'synthetic-carrier-body',
    defaultElasticity: 'synthetic-time-elastic',
    allowedElasticities: ['synthetic-time-elastic', 'fixed-rendered-audio'],
    defaultIsTimeElastic: true,
    canChooseElasticity: true,
    tradeoff: 'root-follow-synthetic-default',
    summary: 'Direkter Loop-Spur-Export für rohe synthetische Carrier-Körper.',
    guardrail: 'Der Roh-Oszillator darf nicht verschwinden, nur weil kein Donor/Timbre-Schritt vorausging.',
  };
}

export function buildMelodicPinkLaneContract(machineId: CarrierIntegralMachineId, routeKind: CarrierIntegralRouteKind): CarrierIntegralSendContract {
  const rawLike = RAW_AUDIO_MELODIC_MACHINES.has(machineId);
  return {
    destination: 'melodic-pink-lane',
    targetId: 'melodic-pink-export',
    routeKind,
    signalKind: rawLike ? 'raw-audio-body' : 'synthetic-carrier-body',
    defaultElasticity: rawLike ? 'raw-granular-elastic' : 'synthetic-time-elastic',
    allowedElasticities: rawLike ? ['raw-granular-elastic', 'raw-tape-coupled'] : ['synthetic-time-elastic'],
    defaultIsTimeElastic: true,
    canChooseElasticity: rawLike,
    tradeoff: rawLike ? 'pitch-time-independent-raw-stretch' : 'root-follow-synthetic-default',
    summary: machineId === 'harmonic-xplore-direct-carrier'
      ? 'Pinke Spur erhält HarmonicXplorE als gerenderten Raw-Audio-Materialkörper; keine synthetische Pinkspur-Umdeutung.'
      : machineId === 'spektral-synthese-body'
        ? 'Pinke Spur erhält SpektralSynthese als gerenderten Descriptor-/Akzent-Klangkörper; keine synthetische Pinkspur-Umdeutung.'
        : rawLike
          ? 'Pinke Spur erhält einen Raw-/granularen Materialkörper; kein Audio-Paint-Feldclip.'
          : 'Pinke Spur erhält einen Carrier-Integral-Feldclip; Synth bleibt synthetisch und wird nicht pauschal granularisiert.',
    guardrail: 'Hybride Loop-Ausgaben dürfen nicht pauschal granularisiert werden; Quelle und Elastik müssen pro Element kenntlich bleiben.',
  };
}
