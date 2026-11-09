import {
  DRONE_PRESETS as ROOM_II_DRONE_PRESETS,
  PARTICLE_PRESETS as ROOM_II_PARTICLE_PRESETS,
  WAVE_SOUND_PRESETS as ROOM_I_WAVE_PRESETS,
  type DronePreset,
  type ParticlePreset,
  type WaveSoundPreset,
} from '../xensonar/domain/instrumentData';
import { RESIDENT_SOUND_OPTIONS } from '../topology/residentSoundCatalog';

export type SharedSoundGroupId = 'bass_body' | 'lead_voice' | 'plucks_hits' | 'pads_halo' | 'texture_experiment' | 'samples';
export type SharedSoundSurface = 'melodic_loop' | 'wave_starter' | 'particle' | 'drone';
export type SharedSoundCompatibility = 'full' | 'experimental' | 'hidden';
export type SharedSoundFamily = 'bass' | 'lead' | 'plucks' | 'pads' | 'texture' | 'sample';
export type SharedSoundSourceKind = 'synthetic' | 'wave' | 'particle' | 'drone' | 'resident' | 'sample';

export type SharedSoundEntry = {
  id: string;
  label: string;
  groupId: SharedSoundGroupId;
  family: SharedSoundFamily;
  originLabel: string;
  hint: string;
  adapterPresetId: string | null;
  waveStarterPresetId: WaveSoundPreset | null;
  particlePresetId?: ParticlePreset | null;
  sourceKind: SharedSoundSourceKind;
  surfaceSupport: Record<SharedSoundSurface, SharedSoundCompatibility>;
};

export type SharedSoundGroup = {
  id: SharedSoundGroupId;
  label: string;
  description: string;
};

export const SHARED_SOUND_GROUPS: SharedSoundGroup[] = [
  { id: 'bass_body', label: 'Bass & Grundkörper', description: 'tiefe Stimmen, tragende Körper, Walking-Bass und Grundtonarbeit' },
  { id: 'lead_voice', label: 'Lead & Melodiestimmen', description: 'singende Hauptstimmen, Rohr, Bogen, Ruf und Antwort' },
  { id: 'plucks_hits', label: 'Impuls & Anschlag', description: 'Plucks, Bells, Holz, Metall und perkussive Spitzen' },
  { id: 'pads_halo', label: 'Fläche & Halo', description: 'Pads, Sustains, Streicher, Chor und breite Schwebe' },
  { id: 'texture_experiment', label: 'Textur & Experiment', description: 'staubige, spektrale oder inharmonische Sonderfarben' },
  { id: 'samples', label: 'Samples', description: 'hochgeladene Einzelklänge mit geschätzter Pitchbasis oder gesetztem Pitchanker' },
];

const fullEverywhere = {
  melodic_loop: 'full',
  wave_starter: 'experimental',
  particle: 'experimental',
  drone: 'experimental',
} as const satisfies Record<SharedSoundSurface, SharedSoundCompatibility>;

const createSupport = (
  sourceKind: SharedSoundSourceKind,
  surfaceSupport: Partial<Record<SharedSoundSurface, SharedSoundCompatibility>>,
): Record<SharedSoundSurface, SharedSoundCompatibility> => ({
  melodic_loop: sourceKind === 'sample' ? 'full' : 'experimental',
  wave_starter: sourceKind === 'wave' ? 'full' : 'hidden',
  particle: sourceKind === 'particle' ? 'full' : 'experimental',
  drone: sourceKind === 'drone' ? 'full' : 'experimental',
  ...surfaceSupport,
});

const forgeSurfaceSupport = (groupId: SharedSoundGroupId): Record<SharedSoundSurface, SharedSoundCompatibility> => ({
  ...fullEverywhere,
  wave_starter: groupId === 'texture_experiment' ? 'experimental' : 'hidden',
});

const BUILT_IN_FORGE_SOUNDS: SharedSoundEntry[] = [
  { id: 'subPulse', label: 'Sub Pulse', groupId: 'bass_body', family: 'bass', originLabel: 'SyntheticForge', hint: 'runder, stabiler Grundkörper', adapterPresetId: 'subPulse', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('bass_body') },
  { id: 'acidSquare', label: 'Acid Square', groupId: 'bass_body', family: 'bass', originLabel: 'SyntheticForge', hint: 'kantiger Treiber mit Säurekante', adapterPresetId: 'acidSquare', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('bass_body') },
  { id: 'reedTone', label: 'Reed Tone', groupId: 'lead_voice', family: 'lead', originLabel: 'SyntheticForge', hint: 'nasale Rohrblatt-Melodiestimme', adapterPresetId: 'reedTone', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('lead_voice') },
  { id: 'glassPad', label: 'Glass Pad', groupId: 'pads_halo', family: 'pads', originLabel: 'SyntheticForge', hint: 'gläserne, weich getragene Fläche', adapterPresetId: 'glassPad', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('pads_halo') },
  { id: 'airPluck', label: 'Air Pluck', groupId: 'plucks_hits', family: 'plucks', originLabel: 'SyntheticForge', hint: 'luftiger kurzer Pluck', adapterPresetId: 'airPluck', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('plucks_hits') },
  { id: 'metalBloom', label: 'Metal Bloom', groupId: 'texture_experiment', family: 'texture', originLabel: 'SyntheticForge', hint: 'inharmonischer Metallschimmer', adapterPresetId: 'metalBloom', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('texture_experiment') },
  { id: 'fmBell', label: 'FM Bell', groupId: 'plucks_hits', family: 'plucks', originLabel: 'SyntheticForge', hint: 'glasige FM-Glocke', adapterPresetId: 'fmBell', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('plucks_hits') },
  { id: 'bowGlass', label: 'Bow Glass', groupId: 'lead_voice', family: 'lead', originLabel: 'SyntheticForge', hint: 'gestrichenes Glas', adapterPresetId: 'bowGlass', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('lead_voice') },
  { id: 'amberPad', label: 'Amber Pad', groupId: 'pads_halo', family: 'pads', originLabel: 'SyntheticForge', hint: 'warme Fläche mit weichem Bauch', adapterPresetId: 'amberPad', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('pads_halo') },
  { id: 'celloVoice', label: 'Cello Voice', groupId: 'bass_body', family: 'bass', originLabel: 'SyntheticForge', hint: 'gestrichener tiefer Körper', adapterPresetId: 'celloVoice', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('bass_body') },
  { id: 'saxLead', label: 'Sax Lead', groupId: 'lead_voice', family: 'lead', originLabel: 'SyntheticForge', hint: 'atmiger Lead mit Rohrblattcharakter', adapterPresetId: 'saxLead', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('lead_voice') },
  { id: 'gongWashVoice', label: 'Gong Wash', groupId: 'texture_experiment', family: 'texture', originLabel: 'SyntheticForge', hint: 'breiter metallischer Fächer', adapterPresetId: 'gongWashVoice', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('texture_experiment') },
  { id: 'dustTexture', label: 'Dust Texture', groupId: 'texture_experiment', family: 'texture', originLabel: 'SyntheticForge', hint: 'staubige Körnung mit Schwebe', adapterPresetId: 'dustTexture', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('texture_experiment') },
  { id: 'woodPulse', label: 'Wood Pulse', groupId: 'plucks_hits', family: 'plucks', originLabel: 'SyntheticForge', hint: 'holziger kurzer Impuls', adapterPresetId: 'woodPulse', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('plucks_hits') },
  { id: 'haloStrings', label: 'Halo Strings', groupId: 'pads_halo', family: 'pads', originLabel: 'SyntheticForge', hint: 'weiche Streicherdecke', adapterPresetId: 'haloStrings', waveStarterPresetId: null, sourceKind: 'synthetic', surfaceSupport: forgeSurfaceSupport('pads_halo') },
];

const WAVE_FAMILIES: Record<WaveSoundPreset, { groupId: SharedSoundGroupId; family: SharedSoundFamily; hint: string }> = {
  glass_ping: { groupId: 'plucks_hits', family: 'plucks', hint: 'klarer glasiger Auftakt aus Raum I' },
  soft_pluck: { groupId: 'plucks_hits', family: 'plucks', hint: 'weicher gezupfter Wellenstart' },
  bell_tone: { groupId: 'plucks_hits', family: 'plucks', hint: 'heller glockiger Startton' },
  clean_pluck: { groupId: 'plucks_hits', family: 'plucks', hint: 'sauberer kurzer Anschlag' },
  deep_sub: { groupId: 'bass_body', family: 'bass', hint: 'tiefer Sub-Impuls' },
  vibrato_glass: { groupId: 'lead_voice', family: 'lead', hint: 'schimmerndes Glas mit Vibrato' },
  tape_halo: { groupId: 'pads_halo', family: 'pads', hint: 'bandwarmer Halo' },
  membrane_thump: { groupId: 'bass_body', family: 'bass', hint: 'membraniger Stoß' },
  reed_sigh: { groupId: 'lead_voice', family: 'lead', hint: 'atmiger Rohrblattzug' },
  spark_chime: { groupId: 'texture_experiment', family: 'texture', hint: 'funkender Chime-Abriss' },
  bowed_glass: { groupId: 'lead_voice', family: 'lead', hint: 'gestrichenes Glas mit Länge' },
  kalimba_tine: { groupId: 'plucks_hits', family: 'plucks', hint: 'Lamellenanschlag mit Kalimba-Farbe' },
  gong_wash: { groupId: 'texture_experiment', family: 'texture', hint: 'breiter metallischer Gongbogen' },
  chime_spray: { groupId: 'pads_halo', family: 'pads', hint: 'sprühende Chime-Fläche' },
  dust_pulse: { groupId: 'texture_experiment', family: 'texture', hint: 'staubiger Puls mit Körnung' },
};

function roomIWaveEntries(): SharedSoundEntry[] {
  return ROOM_I_WAVE_PRESETS.map((entry) => ({
    id: `wave:${entry.value}`,
    label: entry.label,
    groupId: WAVE_FAMILIES[entry.value].groupId,
    family: WAVE_FAMILIES[entry.value].family,
    originLabel: 'Raum I · Wellenstarter',
    hint: WAVE_FAMILIES[entry.value].hint,
    adapterPresetId: null,
    waveStarterPresetId: entry.value,
    sourceKind: 'wave',
    surfaceSupport: createSupport('wave', {
      melodic_loop: 'full',
      wave_starter: 'full',
      particle: 'experimental',
      drone: 'experimental',
    }),
  }));
}

const PARTICLE_FAMILIES: Record<ParticlePreset, { groupId: SharedSoundGroupId; family: SharedSoundFamily; hint: string }> = {
  glass_ping: { groupId: 'plucks_hits', family: 'plucks', hint: 'glasiger Ping aus dem Varianten-Pfad' },
  marimba: { groupId: 'plucks_hits', family: 'plucks', hint: 'holziges Marimba-Gerüst' },
  soft_pluck: { groupId: 'plucks_hits', family: 'plucks', hint: 'weicher Partikel-Pluck' },
  fm_bell: { groupId: 'plucks_hits', family: 'plucks', hint: 'FM-Glocke mit Obertönen' },
  pizzicato: { groupId: 'plucks_hits', family: 'plucks', hint: 'gezupfte Streicherkante' },
  steel_pan: { groupId: 'lead_voice', family: 'lead', hint: 'metallisch singender Pan-Ton' },
  crystal_bowl: { groupId: 'pads_halo', family: 'pads', hint: 'kristalline Schalenresonanz' },
  woodblock: { groupId: 'plucks_hits', family: 'plucks', hint: 'trockenes Hohlholz' },
  velvet_bloom: { groupId: 'pads_halo', family: 'pads', hint: 'samtige Schwebestimme' },
  shimmer_pad: { groupId: 'pads_halo', family: 'pads', hint: 'schimmernde Pad-Wolke' },
  dust_chime: { groupId: 'texture_experiment', family: 'texture', hint: 'staubige Glockenreste' },
  rubber_click: { groupId: 'plucks_hits', family: 'plucks', hint: 'gummierter Click' },
  reed_pop: { groupId: 'lead_voice', family: 'lead', hint: 'kurzer Rohrblatt-Aufriss' },
  granular_spark: { groupId: 'texture_experiment', family: 'texture', hint: 'granulare Funken' },
  kalimba: { groupId: 'plucks_hits', family: 'plucks', hint: 'lamelliger Anschlag' },
  gong: { groupId: 'texture_experiment', family: 'texture', hint: 'gongartige Metallresonanz' },
  chime: { groupId: 'plucks_hits', family: 'plucks', hint: 'klare Chime-Farbe' },
  tine: { groupId: 'plucks_hits', family: 'plucks', hint: 'Tine-Anschlag mit Biss' },
  reed_tap: { groupId: 'lead_voice', family: 'lead', hint: 'tap-artige Rohrblattfarbe' },
  blip: { groupId: 'texture_experiment', family: 'texture', hint: 'kleiner elektronischer Blip' },
  shimmer: { groupId: 'pads_halo', family: 'pads', hint: 'schwebende Schimmerfläche' },
  dust: { groupId: 'texture_experiment', family: 'texture', hint: 'staubige Körnung' },
};

function roomIIParticleEntries(): SharedSoundEntry[] {
  return ROOM_II_PARTICLE_PRESETS.map((entry) => ({
    id: `particle:${entry.value}`,
    label: entry.label,
    groupId: PARTICLE_FAMILIES[entry.value].groupId,
    family: PARTICLE_FAMILIES[entry.value].family,
    originLabel: 'Raum II · Partikel',
    hint: PARTICLE_FAMILIES[entry.value].hint,
    adapterPresetId: null,
    waveStarterPresetId: null,
    particlePresetId: entry.value,
    sourceKind: 'particle',
    surfaceSupport: createSupport('particle', {
      melodic_loop: 'full',
      particle: 'full',
      drone: 'experimental',
    }),
  }));
}

const DRONE_FAMILIES: Record<DronePreset, { groupId: SharedSoundGroupId; family: SharedSoundFamily; hint: string }> = {
  warm_pad: { groupId: 'pads_halo', family: 'pads', hint: 'warme Akkordfläche' },
  string_swell: { groupId: 'pads_halo', family: 'pads', hint: 'streichende Schwellfläche' },
  dark_sub: { groupId: 'bass_body', family: 'bass', hint: 'dunkler tiefer Grundton' },
  metallic: { groupId: 'texture_experiment', family: 'texture', hint: 'metallische Obertöne' },
  vocal_choir: { groupId: 'pads_halo', family: 'pads', hint: 'chorische Schwebestimme' },
  ethereal_halo: { groupId: 'pads_halo', family: 'pads', hint: 'ätherische Halo-Fläche' },
  reed_drone: { groupId: 'lead_voice', family: 'lead', hint: 'rohrblattige Begleitfläche' },
  pulse_matrix: { groupId: 'bass_body', family: 'bass', hint: 'pulsierender Motorboden' },
  fjord_tape: { groupId: 'pads_halo', family: 'pads', hint: 'bandwarme Weite' },
  resonant_fifths: { groupId: 'pads_halo', family: 'pads', hint: 'resonierende Quintenfläche' },
  cello: { groupId: 'bass_body', family: 'bass', hint: 'gestrichener Cellokörper' },
  saxophon: { groupId: 'lead_voice', family: 'lead', hint: 'saxophonartige Begleitstimme' },
  glass_pipe: { groupId: 'lead_voice', family: 'lead', hint: 'gläsernes Resonanzrohr' },
  membrane_bloom: { groupId: 'bass_body', family: 'bass', hint: 'membraniger Bloom-Körper' },
  bronze_reed: { groupId: 'lead_voice', family: 'lead', hint: 'bronzenes Rohrblatt' },
  dust_bow: { groupId: 'texture_experiment', family: 'texture', hint: 'staubiger Bogenklang' },
};

function roomIIDroneEntries(): SharedSoundEntry[] {
  return ROOM_II_DRONE_PRESETS.map((entry) => ({
    id: `drone:${entry.value}`,
    label: entry.label,
    groupId: DRONE_FAMILIES[entry.value].groupId,
    family: DRONE_FAMILIES[entry.value].family,
    originLabel: 'Raum II · Drone',
    hint: DRONE_FAMILIES[entry.value].hint,
    adapterPresetId: null,
    waveStarterPresetId: null,
    sourceKind: 'drone',
    surfaceSupport: createSupport('drone', {
      melodic_loop: 'full',
      drone: 'full',
      particle: 'experimental',
    }),
  }));
}

function roomIVResidentEntries(): SharedSoundEntry[] {
  return RESIDENT_SOUND_OPTIONS.map((entry) => ({
    id: `resident:${entry.value}`,
    label: entry.label,
    groupId: entry.value === 'resonance_pipe'
      ? 'lead_voice'
      : entry.value === 'glass_needle' || entry.value === 'hollow_wood'
        ? 'plucks_hits'
        : 'texture_experiment',
    family: entry.value === 'resonance_pipe'
      ? 'lead'
      : entry.value === 'glass_needle' || entry.value === 'hollow_wood'
        ? 'plucks'
        : 'texture',
    originLabel: 'Raum IV · Resident',
    hint: `Kollisionsträger: ${entry.collision.preset}`,
    adapterPresetId: null,
    waveStarterPresetId: null,
    particlePresetId: String(entry.collision.preset).includes(':') ? null : (entry.collision.preset as ParticlePreset),
    sourceKind: 'resident',
    surfaceSupport: createSupport('resident', {
      melodic_loop: 'full',
      particle: 'experimental',
      drone: 'experimental',
    }),
  }));
}

export const SHARED_SOUND_CATALOG: SharedSoundEntry[] = [
  ...BUILT_IN_FORGE_SOUNDS,
  ...roomIWaveEntries(),
  ...roomIIParticleEntries(),
  ...roomIIDroneEntries(),
  ...roomIVResidentEntries(),
];

export const SHARED_SOUND_MAP: Record<string, SharedSoundEntry> = Object.fromEntries(
  SHARED_SOUND_CATALOG.map((entry) => [entry.id, entry]),
);

const MELODIC_MENU_IDS = new Set<string>([
  ...BUILT_IN_FORGE_SOUNDS.map((entry) => entry.id),
  ...ROOM_I_WAVE_PRESETS.map((entry) => `wave:${entry.value}`),
  ...ROOM_II_PARTICLE_PRESETS.map((entry) => `particle:${entry.value}`),
  ...ROOM_II_DRONE_PRESETS.map((entry) => `drone:${entry.value}`),
  ...RESIDENT_SOUND_OPTIONS.map((entry) => `resident:${entry.value}`),
]);

const WAVE_STARTER_MENU_IDS = new Set<string>(ROOM_I_WAVE_PRESETS.map((entry) => `wave:${entry.value}`));

export function resolveSharedSoundEntry(id: string | undefined): SharedSoundEntry | null {
  if (!id) return null;
  return SHARED_SOUND_MAP[id] ?? null;
}

export function isSharedSoundSurfaceSupported(entry: SharedSoundEntry, surface: SharedSoundSurface, minimum: SharedSoundCompatibility = 'experimental') {
  const current = entry.surfaceSupport[surface];
  const ranking: Record<SharedSoundCompatibility, number> = {
    hidden: 0,
    experimental: 1,
    full: 2,
  };
  return ranking[current] >= ranking[minimum];
}

export function getSharedSoundEntriesForSurface(surface: SharedSoundSurface, minimum: SharedSoundCompatibility = 'experimental') {
  return SHARED_SOUND_CATALOG.filter((entry) => isSharedSoundSurfaceSupported(entry, surface, minimum));
}

export function getSharedSoundMenuEntriesForSurface(surface: SharedSoundSurface) {
  const ids = surface === 'wave_starter' ? WAVE_STARTER_MENU_IDS : MELODIC_MENU_IDS;
  const minimum = surface === 'wave_starter' ? 'full' : 'full';
  return getSharedSoundEntriesForSurface(surface, minimum).filter((entry) => ids.has(entry.id));
}
