#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildSourceMetrics,
  sourceMetricHotspots,
  readRepoText,
} from './codex-source-metrics.mjs';

const root = process.cwd();
const version = '3.2.91-7.7.90';
const patch = 'refactor_direction_review';
const outJson = 'reports/refactor-direction-review-7790.json';
const outMd = 'reports/refactor-direction-review-7790.md';
const docPath = 'docs/REFACTOR_DIRECTION_AFTER_7.7.89.md';

function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function relStat(rel) { return exists(rel) ? fs.statSync(path.join(root, rel)) : null; }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function listFiles(rel, pattern = /./) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  const acc = [];
  const walk = (abs, prefix) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      const childRel = path.join(prefix, entry.name).replaceAll('\\', '/');
      if (entry.isDirectory()) walk(childAbs, childRel);
      else if (pattern.test(childRel)) acc.push(childRel);
    }
  };
  walk(dir, rel);
  return acc.sort((a, b) => a.localeCompare(b));
}
function fileMetric(metricsByFile, file) { return metricsByFile.get(file) || null; }
function rankDecision(score, options = {}) {
  if (options.stop) return 'stop';
  if (score >= 75) return 'do-next';
  if (score >= 55) return 'prepare';
  if (score >= 35) return 'park';
  return 'stop';
}
function scoreSeries({ manualValue = 0, reductionPotential = 0, risk = 0, saturation = 0, proofNeed = 0 }) {
  return Math.round(Math.max(0, Math.min(100, manualValue + reductionPotential - risk - saturation - proofNeed)));
}

const source = buildSourceMetrics(root);
const byFile = source.byFile;
const hotspots = sourceMetricHotspots(source.metrics, 16);
const pkg = JSON.parse(read('package.json') || '{}');
const scripts = pkg.scripts || {};
const appMetric = fileMetric(byFile, 'src/App.tsx');
const appBoundaryFiles = listFiles('src/features/xensonar', /^src\/features\/xensonar\/.+\/useApp.*Boundary\.ts$/);
const uiModelFiles = listFiles('src/features/l3lab/spectralForge/components', /(?:UiModel|uiModelShared)\.ts$/);
const checkScripts = listFiles('tools', /^tools\/check-.*\.mjs$/);
const codexReports = listFiles('reports', /^reports\/codex-.*\.(json|md)$/);
const spectralBoundaryReports = listFiles('reports', /^reports\/spectralforge-.*boundary.*\.(json|md)$/);
const manualDocs = [
  'docs/SPECTRALFORGE_MANUAL_PATCH_MAP.md',
  'docs/DEVELOPER_HANDOFF.md',
  'docs/MANUAL_PATCH_RECIPES.md',
  'docs/CHECKS_GUIDE.md',
].filter(exists);

const appSeries = {
  id: 'app-shell-boundaries',
  label: 'App.tsx Shell-/Boundary-Schnittserie',
  currentSignal: {
    appLines: appMetric?.lines ?? null,
    appBytes: appMetric?.bytes ?? null,
    boundaryFiles: appBoundaryFiles,
    boundaryFileCount: appBoundaryFiles.length,
  },
  score: scoreSeries({ manualValue: 62, reductionPotential: 18, risk: 18, saturation: 24, proofNeed: 8 }),
  decision: 'pause-mechanical-extraction',
  nextAction: 'Nur fortsetzen, wenn ein ganzer manueller Änderungspunkt aus App.tsx verschwindet; keine 2-Zeilen-Shell-Boundaries mehr.',
  stopRule: 'Kein weiterer useApp*Boundary-Slice ohne vorherigen Satz: welche künftige manuelle Änderung wird auf welche Datei begrenzt?',
};
const uiSeries = {
  id: 'spectralforge-ui-model-boundaries',
  label: 'SpectralForge UI-Model Boundary-Serie',
  currentSignal: {
    uiModelFiles,
    uiModelFileCount: uiModelFiles.length,
    localSanityScript: Boolean(scripts['xensonar:sanity:spectralforge-ui-boundary']),
  },
  score: scoreSeries({ manualValue: 70, reductionPotential: 20, risk: 8, saturation: 28, proofNeed: 10 }),
  decision: 'consolidate-not-expand',
  nextAction: 'Nur noch echte Duplikate zusammenführen oder ersten Browser-DOM-Smoke-Test ergänzen; keine neue UI-Model-Datei ohne Wiederholungsnachweis.',
  stopRule: 'Neue *UiModel.ts nur, wenn mindestens zwei UI-Entscheidungen wiederverwendbar oder eine Produktdatei deutlich entwirrt wird.',
};
const checkSeries = {
  id: 'check-and-report-sediment',
  label: 'Check-/Report-/Tooling-Sediment',
  currentSignal: {
    checkScriptCount: checkScripts.length,
    codexReportCount: codexReports.length,
    spectralBoundaryReportCount: spectralBoundaryReports.length,
  },
  score: scoreSeries({ manualValue: 48, reductionPotential: 54, risk: 8, saturation: 10, proofNeed: 4 }),
  decision: 'do-next-reduction-candidates',
  nextAction: 'Kandidaten für Check-/Report-Eindampfung suchen: redundante One-off-Checks, volatile Reports, alte Harness-Dokus, doppelte markerbasierte Gates.',
  stopRule: 'Keinen neuen Check hinzufügen, wenn ein bestehender Check registriert oder erweitert werden kann.',
};
const largeKnotSeries = {
  id: 'large-runtime-knots',
  label: 'Große Produktknoten: AudioEngine / XensonarRefactorRoom / SpectralCanvas / App.tsx',
  currentSignal: {
    topHotspots: hotspots.slice(0, 8).map((item) => ({ file: item.file, lines: item.lines, bytes: item.bytes, sedimentScore: item.sedimentScore, tags: item.tags })),
  },
  score: scoreSeries({ manualValue: 76, reductionPotential: 46, risk: 54, saturation: 0, proofNeed: 18 }),
  decision: 'map-before-cut',
  nextAction: 'Als nächstes XensonarRefactorRoom oder AudioEngine kartieren, aber nicht direkt schneiden; live/archiv/hotpath/semantic zones zuerst markieren.',
  stopRule: 'Kein großer Produktknoten-Refactor ohne Zonenkarte und spezifische Nicht-Änderungen.',
};
const carrierSeries = {
  id: 'carrier-hearing-pitch-contracts',
  label: 'Carrier-/Hörweisen-/Pitch-Verträge',
  currentSignal: {
    knownRisk: 'Antonia/Bert/Cecilia-Varianz kann durch scheinbar harmlose Vereinheitlichung verloren gehen.',
    manualPatchMapPresent: exists('docs/SPECTRALFORGE_MANUAL_PATCH_MAP.md'),
  },
  score: scoreSeries({ manualValue: 80, reductionPotential: 15, risk: 60, saturation: 0, proofNeed: 35 }),
  decision: 'do-not-refactor-now',
  nextAction: 'Nur mit Klangtest-/Registry-/Pitch-Mapping-Plan anfassen; aktuell kein Refactor-Kandidat.',
  stopRule: 'Keine Vereinheitlichung ähnlicher Klangpfade ohne explizite Entscheidung: technische Redundanz oder musikalische Mutation?',
};

const series = [appSeries, uiSeries, checkSeries, largeKnotSeries, carrierSeries];
const nextPaths = [
  {
    rank: 1,
    id: 'check-report-sediment-reduction-candidates',
    label: 'Check-/Report-Sediment-Kandidaten',
    rationale: 'Sucht echte Reduktionskandidaten, ohne Produktklang oder App-Runtime zu riskieren.',
    suggestedPatch: '3.2.91-7.7.91_check_report_sediment_candidates',
    scope: 'tooling-only',
    acceptance: [
      'Liste konkreter Prune-/Merge-Kandidaten statt sofortigem Löschen.',
      'Klassifikation: redundant, mergeable, stale, keep.',
      'Kein Produktcode.',
      'Keine neue Check-Serie ohne alte Checks zu kuratieren.',
    ],
  },
  {
    rank: 2,
    id: 'xensonar-refactor-room-zone-map',
    label: 'XensonarRefactorRoom-Zonenkarte',
    rationale: 'Großer menschlicher Wartungsknoten; erst live/archiv/refucktor/family-zones trennen, bevor geschnitten wird.',
    suggestedPatch: '3.2.91-7.7.92_xensonar_refactor_room_zone_map',
    scope: 'tooling-only/docs-only first',
    acceptance: [
      'Keine Produktcodeänderung.',
      'Abschnitte und Einstiegspunkte benennen.',
      'Refucktor nicht mit kanonischem Refactor verwechseln.',
      'Erste sichere Mini-Schnitte ableiten.',
    ],
  },
  {
    rank: 3,
    id: 'spectralcanvas-interaction-zone-map',
    label: 'SpectralCanvas Interaction-Zonenkarte',
    rationale: 'Vor einem weiteren Canvas-Schnitt müssen Pointer, Viewport, Painting, Preview und Audio-Invalidierung getrennt verstanden werden.',
    suggestedPatch: '3.2.91-7.7.93_spectralcanvas_interaction_zone_map',
    scope: 'tooling-only/docs-only first',
    acceptance: [
      'Keine audioEngine.previewColumn/invalidateBuffer-Verschiebung.',
      'Pointer-/Navigator-Zone getrennt von Painting-/Preview-Zone beschrieben.',
      'Browser-DOM-Smoke-Test-Kandidat benannt.',
    ],
  },
];

const stopRules = [
  'Kein weiterer Refactor, dessen Begründung nur “Boundary geschaffen” lautet.',
  'Kein weiterer App.tsx-Shell-Slice, wenn er nicht eine ganze manuelle Änderungsabsicht lokalisierbar macht.',
  'Keine neue *UiModel.ts-Datei ohne Wiederholungsnachweis oder klare Produktdatei-Entlastung.',
  'Keine Klangpfad-Vereinheitlichung ohne Falsifikation: technische Redundanz oder musikalische Mutation?',
  'Kein neuer Check, wenn ein bestehender Check erweitert oder ein Report kuratiert werden kann.',
  'Wenn Core-HTML wächst, muss der Patch entweder echten Wartungsnutzen oder echte Risikoreduktion belegen.',
];

const review = {
  ok: true,
  version,
  patch,
  generatedAt: new Date().toISOString(),
  proofClass: 'source-metrics/manual-refactor-direction-review',
  sourceSummary: source.summary,
  manualDocs,
  series,
  nextPaths,
  stopRules,
  recommendation: {
    immediateNext: nextPaths[0].suggestedPatch,
    doNotDoNext: [
      'Mechanische App.tsx-Boundary Nummer sechs.',
      'AudioEngine.ts direkt refaktorisieren.',
      'Carrier-/Pitch-/Antonia-Arbeit ohne Klangtest-Plan.',
      'Neue Guard-Schicht ohne alte Check-/Report-Sedimentprüfung.',
    ],
  },
};

function mdTable(rows) {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}
const md = `# Refactor Direction Review nach 7.7.89

Version: ${version}  
Proof class: ${review.proofClass}

## Zweck

Dieser Review stoppt das mechanische Muster: \"neue Boundary, kein Größengewinn\". Weitere Refactors sollen nur noch weiterlaufen, wenn sie eine konkrete manuelle Wartungsqualität verbessern: Änderungspunkt, Risiko-Grenze, echte Entdopplung oder messbare Reduktion.

## Source-Signal

- Source-Dateien: ${source.summary.fileCount}
- Source-Zeilen: ${source.summary.totalLines}
- Source-Bytes: ${source.summary.totalBytes}
- App.tsx: ${appMetric?.lines ?? 'n/a'} Zeilen / ${appMetric?.bytes ?? 'n/a'} Bytes
- App-Boundary-Dateien: ${appBoundaryFiles.length}
- SpectralForge-UI-Model-Dateien: ${uiModelFiles.length}
- Check-Scripts: ${checkScripts.length}

## Serienbewertung

${mdTable([
  ['Serie', 'Decision', 'Score', 'Nächste Aktion'],
  ...series.map((item) => [item.label, item.decision, String(item.score), item.nextAction]),
])}

## Stop-Regeln ab jetzt

${stopRules.map((item) => `- ${item}`).join('\n')}

## Empfohlene nächste Pfade

${nextPaths.map((item) => `### ${item.rank}. ${item.label}\n\n- Patch-Vorschlag: \`${item.suggestedPatch}\`\n- Scope: ${item.scope}\n- Warum: ${item.rationale}\n\nAkzeptanz:\n${item.acceptance.map((entry) => `- ${entry}`).join('\n')}`).join('\n\n')}

## Nicht als nächstes tun

${review.recommendation.doNotDoNext.map((item) => `- ${item}`).join('\n')}

## Hotspots, aber nicht automatisch nächste Schnitte

${largeKnotSeries.currentSignal.topHotspots.map((item, index) => `${index + 1}. ${item.file} — ${item.lines} Zeilen, Score ${item.sedimentScore}, Tags: ${item.tags.join(', ') || 'none'}`).join('\n')}

## Fazit

Der nächste sinnvolle Schritt ist kein weiterer App.tsx-Mikroschnitt, sondern \`${nextPaths[0].suggestedPatch}\`: echte Reduktionskandidaten im Check-/Report-Sediment suchen, ohne Produktklang zu riskieren.
`;

fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, outJson), `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync(path.join(root, outMd), md);
fs.writeFileSync(path.join(root, docPath), md.replace('# Refactor Direction Review nach 7.7.89', '# Refactor Direction after 7.7.89'));
console.log(`[refactor-direction-review-7790] wrote ${outJson}, ${outMd}, ${docPath}`);
