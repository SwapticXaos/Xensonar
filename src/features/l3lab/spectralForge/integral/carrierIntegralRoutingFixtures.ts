import type { CarrierIntegralMachineId, CarrierIntegralTargetId } from './carrierIntegralContracts';
import type {
  CarrierIntegralMaterialEntryKind,
  CarrierIntegralMelodicHandoffKind,
  CarrierIntegralRootFollowConfigKind,
  CarrierIntegralRenderSourceKind,
} from './carrierIntegralSendTargets';

export type CarrierIntegralGestureFixtureId =
  | 'thin-glissando-line'
  | 'thick-glissando-band'
  | 'opposing-contour-lines'
  | 'parallel-lines'
  | 'wide-cloud'
  | 'staccato-burst';

export type CarrierIntegralGestureFixtureRole =
  | 'line-fidelity'
  | 'bandwidth-fidelity'
  | 'polyphonic-contour'
  | 'texture-preservation'
  | 'transient-preservation';

export type CarrierIntegralGestureFixture = {
  id: CarrierIntegralGestureFixtureId;
  role: CarrierIntegralGestureFixtureRole;
  summary: string;
  mustPreserve: string[];
  mustNotCollapseTo: string[];
};

export type DonatelloFormantFixtureExpectation = {
  id: string;
  fixtureId: CarrierIntegralGestureFixtureId;
  expectedMachineId: 'donatello-formant-window-body';
  expectedSchemaVersion: 'donatello-formant-plan-v1';
  expectedCurveResolution: 64;
  maxBands: 8;
  requiresNoNoteEvents: true;
  expectedDominantRole: 'core-line' | 'body-band' | 'residual-band' | 'transient-dust';
  mustPreserve: string[];
  mustNotCollapseTo: string[];
  summary: string;
};

export type CarrierIntegralRouteFixtureExpectation = {
  id: string;
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  fixtureId: CarrierIntegralGestureFixtureId;
  expectedMaterialEntryKind: CarrierIntegralMaterialEntryKind;
  expectedRenderSource: CarrierIntegralRenderSourceKind;
  expectedRootFollowConfigKind: CarrierIntegralRootFollowConfigKind;
  expectedMelodicHandoffKind: CarrierIntegralMelodicHandoffKind;
  requiresAudibleRenderedBody: boolean;
  mustPreserveCarrierField: boolean;
  mustUseRawMaterialBody: boolean;
  mustNotAliasMachineIds: CarrierIntegralMachineId[];
  summary: string;
};

export const CARRIER_INTEGRAL_GESTURE_FIXTURES: CarrierIntegralGestureFixture[] = [
  {
    id: 'thin-glissando-line',
    role: 'line-fidelity',
    summary: 'Eine einzelne dünne Glissando-Linie; muss als zusammenhängende Fretless-Kontur lesbar bleiben.',
    mustPreserve: ['centerLine', 'relativePitchCurve', 'continuousGlissando'],
    mustNotCollapseTo: ['staccatoSteps', 'singleStaticPitch', 'gridQuantizedBlocks'],
  },
  {
    id: 'thick-glissando-band',
    role: 'bandwidth-fidelity',
    summary: 'Eine dicke gemalte Linie; Dicke muss Bandbreite/Textur werden, nicht mehr Note-On-Events.',
    mustPreserve: ['centerLine', 'bandwidth', 'energyEnvelope'],
    mustNotCollapseTo: ['extraParallelNotesOnly', 'flatPlaybackRate', 'deletedResidualEnergy'],
  },
  {
    id: 'opposing-contour-lines',
    role: 'polyphonic-contour',
    summary: 'Zwei gegenläufige Konturlinien; prüft Mehrstimmigkeit und Linien-Provenienz bei einer Lackmus-Kreuzung, ohne daraus eine eigene Code-Semantik zu machen.',
    mustPreserve: ['multipleVoices', 'opposingPitchCurves', 'localField', 'spectralWindowMeta'],
    mustNotCollapseTo: ['singleStandardNote', 'staccatoSteps', 'activeGridQuantization'],
  },
  {
    id: 'parallel-lines',
    role: 'polyphonic-contour',
    summary: 'Zwei parallele Linien; prüft, dass Polyphonie nicht auf eine Root-Linie zusammenfällt.',
    mustPreserve: ['multipleVoices', 'relativeSemitoneOffsets', 'voiceDurations'],
    mustNotCollapseTo: ['oneVoice', 'sharedLineHzOnly', 'monoFlattening'],
  },
  {
    id: 'wide-cloud',
    role: 'texture-preservation',
    summary: 'Breite Wolke; Restenergie muss als Textur/Bandbreite erhalten bleiben statt als Raster-Events zu explodieren.',
    mustPreserve: ['textureEnergy', 'spread', 'roughness', 'residualBody'],
    mustNotCollapseTo: ['tooManyEvents', 'silentMaterialEntry', 'hardGateSkeletonOnly'],
  },
  {
    id: 'staccato-burst',
    role: 'transient-preservation',
    summary: 'Kurze vertikale/transiente Energie; darf nicht unbegrenzt Events erzeugen und muss als Transienten-Körper begrenzt bleiben.',
    mustPreserve: ['transientEnergy', 'boundedEventCount', 'audiblePeak'],
    mustNotCollapseTo: ['audioBurst', 'emptyRenderedBlob', 'infiniteEnvelopeStarts'],
  },
];

export const CARRIER_INTEGRAL_ROUTE_FIXTURE_EXPECTATIONS: CarrierIntegralRouteFixtureExpectation[] = [
  {
    id: 'pure-dieter-raw-to-melodic-granular-material',
    machineId: 'raw-darkpsy-oscillator',
    targetId: 'melodic-pink-export',
    fixtureId: 'thick-glissando-band',
    expectedMaterialEntryKind: 'raw-oscillator-material',
    expectedRenderSource: 'raw-spectral-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'raw-material',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['legacy-supernote-5.69', 'branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'],
    summary: 'Pure Dieter an Melodic Loop muss Raw-/granularer Materialkörper bleiben; kein Audio-Paint- oder Antonia-Synthplan.',
  },
  {
    id: 'harmonic-xplore-to-melodic-raw-audio-material',
    machineId: 'harmonic-xplore-direct-carrier',
    targetId: 'melodic-pink-export',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'carrier-granular-material',
    expectedRenderSource: 'raw-spectral-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'raw-material',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'legacy-supernote-5.69', 'branch-a-line-traffic'],
    summary: 'HarmonicXplorE an Melodic Loop muss den gehörten Ratio-/Klangkörper als Raw-Audio-Materialbasis erhalten; kein Audio-Paint-Feldclip und kein synthetischer Pinkspur-Adapter.',
  },
  {
    id: 'spektral-synthese-to-melodic-raw-audio-material',
    machineId: 'spektral-synthese-body',
    targetId: 'melodic-pink-export',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'carrier-granular-material',
    expectedRenderSource: 'raw-spectral-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'raw-material',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['harmonic-xplore-direct-carrier', 'raw-darkpsy-oscillator', 'legacy-supernote-5.69'],
    summary: 'SpektralSynthese an Melodic Loop muss den gehörten Descriptor-/Akzent-Klangkörper als Raw-Audio-Materialbasis erhalten; kein HX-Fallback, kein Audio-Paint-Feldclip und kein generischer synthetischer Pinkspur-Adapter.',
  },
  {
    id: 'spektral-synthese-to-root-follow-material-flowing',
    machineId: 'spektral-synthese-body',
    targetId: 'root-follow-export',
    fixtureId: 'wide-cloud',
    expectedMaterialEntryKind: 'carrier-rendered-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'material-flowing',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['harmonic-xplore-direct-carrier', 'raw-darkpsy-oscillator', 'branch-a-line-traffic'],
    summary: 'SpektralSynthese an Root Follow bleibt zunächst gerenderter Materialkörper mit material-flowing-Konfig; kein synthetischer Config-Plan, der die Bilddeskriptor- und Akzent-Schicht verliert.',
  },
  {
    id: 'antonia-voll-to-melodic-own-granular-material',
    machineId: 'legacy-supernote-5.69',
    targetId: 'melodic-pink-export',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'carrier-granular-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'raw-material',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'branch-a-line-traffic'],
    summary: 'Antonia darf nicht Pure Dieter oder 5.69 Legacy aliasen; sie muss ihren eigenen Branch-A Linienkörper rendern und granular importieren.',
  },
  {
    id: 'antonia-glatt-to-melodic-audio-paint-field',
    machineId: 'branch-a-line-traffic',
    targetId: 'melodic-pink-export',
    fixtureId: 'thin-glissando-line',
    expectedMaterialEntryKind: 'audio-paint-field-clip',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'audio-paint-field',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: true,
    mustUseRawMaterialBody: false,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'legacy-supernote-5.69'],
    summary: 'Branch-A-Archiv an Melodic Loop muss ein Carrier-Integral-Feldclip sein und stale Raw-Handoffs löschen.',
  },
  {
    id: 'bert-to-root-follow-synthetic-window',
    machineId: 'branch-b573-synth-window',
    targetId: 'root-follow-export',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'carrier-rendered-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: true,
    mustUseRawMaterialBody: false,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'legacy-supernote-5.69', 'branch-c-interval-body'],
    summary: 'Bert/B_5.73 muss als eigener synthetischer Root-Follow-Fensterplan mit localField/spectralWindowMeta erhalten bleiben.',
  },
  {
    id: 'cecilia-to-root-follow-interval-body',
    machineId: 'branch-c-interval-body',
    targetId: 'root-follow-export',
    fixtureId: 'wide-cloud',
    expectedMaterialEntryKind: 'carrier-rendered-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'artifact-config',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: true,
    mustUseRawMaterialBody: false,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'branch-b573-synth-window'],
    summary: 'Cecilia/C-Intervallkörper darf Bert nicht absorbieren und muss Fenster-/Intervallkörper-Meta erhalten.',
  },
  {
    id: 'dieter-v2-opposing-contour-lines-to-root-follow-material-body',
    machineId: 'material-render-body',
    targetId: 'root-follow-export',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'carrier-rendered-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'material-flowing',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: true,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body', 'donatello-formant-window-body'],
    summary: 'Dieter V2/material-render-body muss gegenläufige Konturlinien als gerenderten V2-/Embodiment-Materialkörper an Root Follow geben; kein A/B/C-Artifact-Config und kein Donatello-Plan.',
  },
  {
    id: 'all-named-machines-to-materialspur-audible-body',
    machineId: 'branch-a-line-traffic',
    targetId: 'materialspur-export',
    fixtureId: 'staccato-burst',
    expectedMaterialEntryKind: 'carrier-rendered-material',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: true,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: false,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator'],
    summary: 'Labor-Bibliothek an Materialspur muss für benannte Synth-Lesarten hörbare gerenderte WAV-Körper erzeugen; kein leerer Eintrag.',
  },
  {
    id: 'donatello-plan-foundation-validation-only',
    machineId: 'donatello-formant-window-body',
    targetId: 'validation',
    fixtureId: 'opposing-contour-lines',
    expectedMaterialEntryKind: 'none',
    expectedRenderSource: 'root-follow-config-buffer',
    expectedRootFollowConfigKind: 'none',
    expectedMelodicHandoffKind: 'none',
    requiresAudibleRenderedBody: false,
    mustPreserveCarrierField: false,
    mustUseRawMaterialBody: false,
    mustNotAliasMachineIds: ['raw-darkpsy-oscillator', 'legacy-supernote-5.69', 'branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'],
    summary: 'Donatello bleibt in 6.8.42 ein Plan-Fundament: keine Audio-/Material-/Melodic-Route, keine Note-Event-Masse, keine Alias-Lesart.',
  },
];

export const DONATELLO_FORMANT_FIXTURE_EXPECTATIONS: DonatelloFormantFixtureExpectation[] = [
  {
    id: 'donatello-thin-glissando-narrow-band',
    fixtureId: 'thin-glissando-line',
    expectedMachineId: 'donatello-formant-window-body',
    expectedSchemaVersion: 'donatello-formant-plan-v1',
    expectedCurveResolution: 64,
    maxBands: 8,
    requiresNoNoteEvents: true,
    expectedDominantRole: 'core-line',
    mustPreserve: ['continuousGlissando', 'centerRatioCurve', 'narrowBandwidth'],
    mustNotCollapseTo: ['noteEvents', 'staccatoSteps', 'flatPlaybackRate'],
    summary: 'Dünne Glissando-Linie muss als schmales Formantband entstehen, nicht als Note-Event-Serie.',
  },
  {
    id: 'donatello-thick-glissando-wide-band',
    fixtureId: 'thick-glissando-band',
    expectedMachineId: 'donatello-formant-window-body',
    expectedSchemaVersion: 'donatello-formant-plan-v1',
    expectedCurveResolution: 64,
    maxBands: 8,
    requiresNoNoteEvents: true,
    expectedDominantRole: 'body-band',
    mustPreserve: ['centerRatioCurve', 'bandwidthRatioCurve', 'energyEnvelope'],
    mustNotCollapseTo: ['extraParallelNotesOnly', 'tooManyEvents', 'deletedResidualEnergy'],
    summary: 'Dicke Linie muss als breiteres Band/Texturenergie verdichtet werden.',
  },
  {
    id: 'donatello-opposing-contour-lines-two-curves',
    fixtureId: 'opposing-contour-lines',
    expectedMachineId: 'donatello-formant-window-body',
    expectedSchemaVersion: 'donatello-formant-plan-v1',
    expectedCurveResolution: 64,
    maxBands: 8,
    requiresNoNoteEvents: true,
    expectedDominantRole: 'core-line',
    mustPreserve: ['opposingCenterRatioCurves', 'crossingGesture', 'boundedBandCount'],
    mustNotCollapseTo: ['singleStandardNote', 'gridQuantizedBlocks', 'audioBurst'],
    summary: 'Gegenläufige Konturlinien müssen mindestens zwei gegensätzliche Formantkurven erzeugen und dürfen nicht zu Standardnoten flachfallen.',
  },
  {
    id: 'donatello-wide-cloud-roughness-residual',
    fixtureId: 'wide-cloud',
    expectedMachineId: 'donatello-formant-window-body',
    expectedSchemaVersion: 'donatello-formant-plan-v1',
    expectedCurveResolution: 64,
    maxBands: 8,
    requiresNoNoteEvents: true,
    expectedDominantRole: 'residual-band',
    mustPreserve: ['roughnessCurve', 'residualEnergyCurve', 'textureEnergy'],
    mustNotCollapseTo: ['tooManyEvents', 'silentMaterialEntry', 'hardGateSkeletonOnly'],
    summary: 'Wolken/Sprenkel werden als Roughness/Residual/Dust-Kurven erhalten, nicht als Raster-Event-Müll.',
  },
  {
    id: 'donatello-staccato-burst-transient-dust',
    fixtureId: 'staccato-burst',
    expectedMachineId: 'donatello-formant-window-body',
    expectedSchemaVersion: 'donatello-formant-plan-v1',
    expectedCurveResolution: 64,
    maxBands: 8,
    requiresNoNoteEvents: true,
    expectedDominantRole: 'transient-dust',
    mustPreserve: ['transientDustCurve', 'boundedAutomationCurves'],
    mustNotCollapseTo: ['infiniteEnvelopeStarts', 'audioBurst', 'noteEvents'],
    summary: 'Vertikale/transiente Energie wird als begrenzte Dust-Kurve modelliert.',
  },
];

export const CARRIER_INTEGRAL_ROUTING_FIXTURE_GALLERY_VERSION = 'carrier-integral-routing-fixture-gallery-3.2.91.6.8.49-dieter-v2';
