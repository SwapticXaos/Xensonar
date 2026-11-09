export type XensonarBurstStressScenarioId =
  | 'manual-unlabeled'
  | 'idle-baseline'
  | 'root-follow-solo'
  | 'root-follow-glissando'
  | 'particles-ringwaves'
  | 'wavestarter-firework'
  | 'combo-root-particle-wave'
  | 'full-lane-max-stress';

export type XensonarBurstStressScenario = {
  id: XensonarBurstStressScenarioId;
  label: string;
  recommendedMeasureMs: number;
  warmupMs: number;
  intent: string;
  setup: readonly string[];
  compareFor: readonly string[];
  musicalPreservationFocus: readonly string[];
};

export type XensonarBrowserStressProfile = {
  version: 1;
  browserId: 'firefox-gecko' | 'chromium' | 'webkit' | 'unknown';
  label: string;
  userAgentHint: string;
  frameBudgetMs: number;
  burstWindowMs: readonly [16, 50, 100];
  targetRiskBand: {
    calmMax: number;
    playableMax: number;
    criticalMin: number;
  };
  weights: {
    events16: number;
    events50: number;
    rootFollow16: number;
    particle16: number;
    waveStarter16: number;
    primaryMute: number;
    workletReadyBonus: number;
    preservationPenalty: number;
  };
  note: string;
};

export const XENSONAR_BURST_STRESS_SCENARIOS: readonly XensonarBurstStressScenario[] = [
  {
    id: 'manual-unlabeled',
    label: 'Manuell / nicht etikettiert',
    recommendedMeasureMs: 30000,
    warmupMs: 5000,
    intent: 'Freier Lauf ohne Szenario-Zusage; nicht als belastbarer Vergleichswert lesen.',
    setup: ['Audio aktivieren', 'Recorder starten', 'frei spielen oder Diagnosepunkt markieren'],
    compareFor: ['spontane Knackmarker', 'nicht-reproduzierbare Auffälligkeiten'],
    musicalPreservationFocus: ['nicht bewerten, nur Fundstelle sichern'],
  },
  {
    id: 'idle-baseline',
    label: 'Idle-Baseline',
    recommendedMeasureMs: 30000,
    warmupMs: 8000,
    intent: 'Messrauschen und Browser-Grunddruck ohne musikalischen Stress sichtbar machen.',
    setup: ['Hauptraum öffnen', 'Audio aktivieren', 'keine neuen Gesten auslösen'],
    compareFor: ['LongTask-/Lag-Grundrauschen', 'fälschlich erhöhte Burstfenster'],
    musicalPreservationFocus: ['keine künstliche Aktivität'],
  },
  {
    id: 'root-follow-solo',
    label: 'Root Follow solo',
    recommendedMeasureMs: 45000,
    warmupMs: 10000,
    intent: 'Root-Follow-Kontinuität ohne Partikel-/Wellenstarter-Störlast messen.',
    setup: ['Root Follow Loop aktivieren', 'Partikel/Wellenstarter ruhig lassen', 'Cursor langsam führen'],
    compareFor: ['Root-Follow-Fenster', 'Worklet-Health', 'Legacy-vs-Pilot-Grundlast'],
    musicalPreservationFocus: ['Loop läuft weiter', 'kein unnötiges Primary-Muting'],
  },
  {
    id: 'root-follow-glissando',
    label: 'Root Follow + Glissando',
    recommendedMeasureMs: 60000,
    warmupMs: 10000,
    intent: 'Schnelle Cursor-/Pitch-Aktualisierung als alter 6.8.7-vs-Nachfolger-Burstfall.',
    setup: ['Root Follow aktivieren', 'schnelle Keyboard-/Cursor-Glissandi spielen', 'stationäre Lanes möglichst unverändert lassen'],
    compareFor: ['Hold-last-valid', 'quantisiertes Einholen', 'Catch-up-Vermeidung', 'Root-Follow-16ms-Spitzen'],
    musicalPreservationFocus: ['Root Follow darf Aktualität verlieren, aber nicht sterben'],
  },
  {
    id: 'particles-ringwaves',
    label: 'Partikel + Ringwellen',
    recommendedMeasureMs: 60000,
    warmupMs: 10000,
    intent: 'Partikel-Krisenmodi isolieren: erst glätten, dann senken.',
    setup: ['Partikel aktivieren', 'Ring-/Sektorwellen dicht anspielen', 'Root Follow möglichst aus oder stabil halten'],
    compareFor: ['Partikel-16ms-Spitzen', 'Quantized Traffic', 'Dichtekurve', 'Motion-Dämpfung'],
    musicalPreservationFocus: ['Ringwellen bleiben Zeitwahrheit', 'Stoß/Schub bleibt direkt', 'Partikel werden nicht unnötig früh amputiert'],
  },
  {
    id: 'wavestarter-firework',
    label: 'Wellenstarter-Firework',
    recommendedMeasureMs: 45000,
    warmupMs: 8000,
    intent: 'Prüfen, ob Wellenstarter im Verhältnis zur Gesamtlast zu früh restriktiv behandelt wird.',
    setup: ['Wellenstarter dicht spielen', 'Obertöne/Arp aktivieren', 'Root Follow/Partikel separat ruhig halten'],
    compareFor: ['Wellenstarter-16ms-Spitzen', 'Deferred/Stale-Hinweise', 'latest-intent Verhalten'],
    musicalPreservationFocus: ['bounded defer statt frühem Blockieren', 'keine lange Catch-up-Queue'],
  },
  {
    id: 'combo-root-particle-wave',
    label: 'Kombi: Root + Partikel + Wellenstarter',
    recommendedMeasureMs: 60000,
    warmupMs: 12000,
    intent: 'Realistische Drucklage mit drei beweglichen Systemen vergleichen.',
    setup: ['Root Follow aktiv', 'Partikel aktiv', 'Wellenstarter dicht anspielen', 'kurze Glissando-Phasen einstreuen'],
    compareFor: ['dominantes Subsystem', 'Burstfenster', 'Worklet-Health', 'Preservation-vs-Restriction'],
    musicalPreservationFocus: ['Root Follow kontinuierlich', 'Wellenstarter nicht vorschnell strangulieren', 'Partikel zuerst glätten'],
  },
  {
    id: 'full-lane-max-stress',
    label: 'Maximalstress mit tragenden Lanes',
    recommendedMeasureMs: 60000,
    warmupMs: 15000,
    intent: 'Drum/Bass/Material als tragende Lanes gegen expressive Druckereignisse schützen.',
    setup: ['Drum Pattern aktiv', 'Bass Pattern aktiv', 'Materialspur aktiv', 'Root Follow + Partikel + Wellenstarter stressen'],
    compareFor: ['stationäre Lane-Stabilität', 'Root-Follow-Kontinuität', 'Eventspitzen', 'Restriktionskosten'],
    musicalPreservationFocus: ['Material/Drum/Bass reißen nicht', 'Root Follow lebt weiter', 'Partikel sind frühere Opfer als tragende Lanes'],
  },
] as const;

export const XENSONAR_DEFAULT_BURST_STRESS_SCENARIO_ID: XensonarBurstStressScenarioId = 'manual-unlabeled';

export function resolveBurstStressScenario(id: string | null | undefined): XensonarBurstStressScenario {
  return XENSONAR_BURST_STRESS_SCENARIOS.find((scenario) => scenario.id === id) ?? XENSONAR_BURST_STRESS_SCENARIOS[0];
}

export function detectXensonarBrowserStressProfile(userAgentInput?: string): XensonarBrowserStressProfile {
  const userAgent = userAgentInput
    ?? (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string' ? navigator.userAgent : '');
  const lower = userAgent.toLowerCase();
  if (lower.includes('firefox/')) {
    return {
      version: 1,
      browserId: 'firefox-gecko',
      label: 'Firefox/Gecko Browserprofil',
      userAgentHint: userAgent.slice(0, 96),
      frameBudgetMs: 16.7,
      burstWindowMs: [16, 50, 100],
      targetRiskBand: { calmMax: 60, playableMax: 180, criticalMin: 260 },
      weights: { events16: 10, events50: 2, rootFollow16: 5, particle16: 3, waveStarter16: 2, primaryMute: 4, workletReadyBonus: -12, preservationPenalty: 7 },
      note: 'Profil für aktuelle Firefox/Gecko-nahe Xensonar-Tests: 16-ms-Fenster bleibt der harte Burst-Proxy; 50/100 ms zeigen Stau und Nachlieferung.',
    };
  }
  if (lower.includes('chrome/') || lower.includes('chromium/') || lower.includes('edg/')) {
    return {
      version: 1,
      browserId: 'chromium',
      label: 'Chromium Browserprofil',
      userAgentHint: userAgent.slice(0, 96),
      frameBudgetMs: 16.7,
      burstWindowMs: [16, 50, 100],
      targetRiskBand: { calmMax: 55, playableMax: 170, criticalMin: 250 },
      weights: { events16: 10, events50: 2, rootFollow16: 5, particle16: 3, waveStarter16: 2, primaryMute: 4, workletReadyBonus: -10, preservationPenalty: 7 },
      note: 'Chromium-Profil: Worklet-Path ist meist verfügbar, trotzdem entscheidet Xensonar nach Eventfenstern und musikalischem Erhalt, nicht nach Engine-Label.',
    };
  }
  if (lower.includes('safari/') || lower.includes('applewebkit/')) {
    return {
      version: 1,
      browserId: 'webkit',
      label: 'WebKit Browserprofil',
      userAgentHint: userAgent.slice(0, 96),
      frameBudgetMs: 16.7,
      burstWindowMs: [16, 50, 100],
      targetRiskBand: { calmMax: 50, playableMax: 150, criticalMin: 230 },
      weights: { events16: 10, events50: 2, rootFollow16: 5, particle16: 3, waveStarter16: 2, primaryMute: 5, workletReadyBonus: -8, preservationPenalty: 8 },
      note: 'WebKit-Profil konservativer lesen; Worklet-Verfügbarkeit und Blob-URL-Verhalten müssen fail-open bleiben.',
    };
  }
  return {
    version: 1,
    browserId: 'unknown',
    label: 'Unbekanntes Browserprofil',
    userAgentHint: userAgent.slice(0, 96),
    frameBudgetMs: 16.7,
    burstWindowMs: [16, 50, 100],
    targetRiskBand: { calmMax: 55, playableMax: 165, criticalMin: 240 },
    weights: { events16: 10, events50: 2, rootFollow16: 5, particle16: 3, waveStarter16: 2, primaryMute: 5, workletReadyBonus: -6, preservationPenalty: 8 },
    note: 'Fallback-Profil: Werte nur als lokale Annäherung lesen und nach manuellen Läufen neu eingrenzen.',
  };
}

export function buildBurstStressExportSlug(args: {
  version: string;
  scenarioId: XensonarBurstStressScenarioId | string | null | undefined;
  engineMode: string | null | undefined;
  browserId: string | null | undefined;
  timestampIso?: string;
}) {
  const safe = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'unknown';
  const timestamp = (args.timestampIso ?? new Date().toISOString()).replace(/[:.]/g, '-');
  return `xensonar-burst-log-${safe(args.version)}-${safe(args.browserId ?? 'browser')}-${safe(args.engineMode ?? 'engine')}-${safe(args.scenarioId ?? 'scenario')}-${timestamp}.json`;
}
