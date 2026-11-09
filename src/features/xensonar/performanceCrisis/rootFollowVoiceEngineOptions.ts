import type { RootFollowVoiceEngineMode } from './performanceCrisisTypes';

export type RootFollowVoiceEngineOption = {
  id: RootFollowVoiceEngineMode;
  label: string;
  note: string;
};

export const ROOT_FOLLOW_VOICE_ENGINE_OPTIONS: readonly RootFollowVoiceEngineOption[] = [
  {
    id: 'legacy',
    label: 'Legacy Main-Thread',
    note: 'hörbarer Referenzpfad ohne Pool-Eingriff',
  },
  {
    id: 'shadow-plan',
    label: 'Voice-Pool Schatten',
    note: 'Pool plant nur diagnostisch, Klang bleibt Legacy',
  },
  {
    id: 'main-thread-pool',
    label: 'Main-Thread Voice-Pool',
    note: 'Direct/Synth kann aktive Stimmen wiederverwenden',
  },
  {
    id: 'worklet-shadow',
    label: 'Worklet Shadow Bridge',
    note: 'stummes Blob-URL-Worklet erhält nur Diagnose-/Renderplan-Daten',
  },
  {
    id: 'worklet-direct-pilot',
    label: 'Worklet Direct-Pilot',
    note: 'kleiner hörbarer Direct/Synth-Pilot; Granular/Material bleiben Legacy und fallen bei Worklet-Fehler zurück',
  },
  {
    id: 'worklet-granular-shadow',
    label: 'Worklet Granular-Plan Shadow',
    note: 'Granular-/Material-Fenster gehen als stummer Renderplan ins Worklet; hörbarer Materialpfad bleibt Legacy',
  },
  {
    id: 'worklet-buffer-shadow',
    label: 'Worklet Buffer-Transfer Shadow',
    note: 'bounded Sample-/Buffer-Kopien gehen stumm ins Worklet; Original-Buffer und hörbarer Materialpfad bleiben Legacy',
  },
  {
    id: 'worklet-granular-pilot',
    label: 'Worklet Granular-Pilot',
    note: 'kleiner aktiver Sample-Elastic-Pilot aus bounded Bufferfenstern; Legacy-Material bleibt Referenz/Fallback',
  },
  {
    id: 'worklet-stable-lane-pilot',
    label: 'Worklet Stable-Lane Pilot',
    note: 'dauerhafter Root/Material-Lane-Körper: hält letzten gültigen Plan, glättet Retune und bleibt additiv/fail-open neben Legacy',
  },
  {
    id: 'worklet-stable-lane-primary-audition',
    label: 'Worklet Stable-Lane Primary Test',
    note: 'Crackle-Vergleich: Stable-Lane darf Legacy nach frischem Buffer/Plan-Proof früh stummschalten; Worklet-Readhead nutzt Loop-Seam-Guard',
  },
  {
    id: 'worklet-granular-primary-candidate',
    label: 'Worklet Granular-Primary Kandidat',
    note: 'testweise ersetzender Sample-Elastic-Kandidat; Legacy-Material bleibt als Fallback aktiv und wird nur bei Pilot-Health ready pro Fenster stumm gelassen',
  },
] as const;
