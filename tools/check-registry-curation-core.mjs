import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const checkRegistryCurationVersion = '3.2.91-7.7.70';
export const checkRegistryCurationPaths = {
  json: 'reports/check-registry-curation.json',
  markdown: 'reports/check-registry-curation.md',
};

const PROOF_CLASS_ORDER = [
  'browser-dom',
  'build-artifact',
  'source-shape',
  'behavioural-audio-export',
  'marker-static',
  'script-chain',
  'unknown',
];

const proofClassDescriptions = {
  'browser-dom': 'Browser-/DOM-naher Check. Kann UI-Liveness stärker belegen als reine Marker, ist aber noch kein Klangbeweis.',
  'behavioural-audio-export': 'Audio-/Export-naher Behaviour-Check. Stärker als Marker; trotzdem abhängig von Testabdeckung und Eingabefällen.',
  'build-artifact': 'Build-/HTML-/Bundle-Artefakt-Check. Belegt Artefaktform, nicht automatisch Bedien- oder Klangverhalten.',
  'source-shape': 'Quellform-/Import-/Export-/Boundary-Check. Nützlich für Architekturdrift, aber kein Runtime-Beweis.',
  'marker-static': 'String-/Marker-/Regex-Check. Billig und nützlich als Regressionstrichter, aber kein Verhaltensbeweis.',
  'script-chain': 'Script-Verbund ohne eindeutige einzelne Check-Datei. Beweiskraft hängt von den aufgerufenen Teilgates ab.',
  unknown: 'Nicht eindeutig klassifizierbar; manuell prüfen, bevor daraus eine starke Behauptung abgeleitet wird.',
};

function rel(root, file) {
  return path.join(root, file);
}

export function readRepoJson(root, file) {
  return JSON.parse(fs.readFileSync(rel(root, file), 'utf8'));
}

function readIfExists(root, file) {
  const full = rel(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

function extractToolPath(command) {
  const direct = command.match(/(?:^|\s)((?:tools|scripts)\/check-[^\s;&|]+\.mjs)(?:\s|$)/);
  if (direct) return direct[1];
  const node = command.match(/node\s+((?:tools|scripts)\/[^\s;&|]+\.mjs)/);
  if (node) return node[1];
  return null;
}

function detectSignals(text = '', command = '') {
  const combined = `${command}\n${text}`;
  return {
    readsSource: /readFileSync|fs\.readFileSync|createReadStream|glob|readdirSync|walkRepoFiles|src\//.test(combined),
    markerString: /\.includes\(|indexOf\(|missing marker|marker|must include|expected.*marker/i.test(combined),
    regexStatic: /\.match\(|\.test\(|new RegExp|\/\^|regex/i.test(combined),
    importExportShape: /importCount|exportCount|\bimport\s|\bexport\s|callsite|boundary|contract|primaryFiles|named export|default export/i.test(combined),
    browserDom: /playwright|puppeteer|chromium|jsdom|JSDOM|page\.|locator\(|querySelector|getByRole|data-testid|HTMLElement|DOMParser/i.test(combined),
    buildArtifact: /dist\b|\.html\b|inspect:html|assert:html|singlefile|bundle|vite|BUILD_REPORT|Core-HTML|html-budget/i.test(combined),
    audioOrExport: /OfflineAudioContext|AudioContext|AudioBuffer|decodeAudioData|sampleRate|Float32Array|\.wav\b|WAV|rendered audio|audio buffer|Blob\(|URL\.createObjectURL|download|exported file|roundtrip export/i.test(combined),
    persistence: /localStorage|indexedDB|package station|Paketstation|storage|persist|JSON\.parse|JSON\.stringify/i.test(combined),
    scriptChain: /npm run|&&|\|\||;/.test(command) || /\bdelegateCheck\s*\(/.test(text),
  };
}

function classifyProof(signals, hasToolFile) {
  const classes = [];
  if (signals.browserDom) classes.push('browser-dom');
  if (signals.audioOrExport) classes.push('behavioural-audio-export');
  if (signals.buildArtifact) classes.push('build-artifact');
  if (signals.readsSource && (signals.importExportShape || signals.regexStatic || signals.markerString)) classes.push('source-shape');
  if (signals.markerString || signals.regexStatic) classes.push('marker-static');
  if (signals.scriptChain) classes.push('script-chain');
  if (!classes.length) classes.push('unknown');
  const primary = PROOF_CLASS_ORDER.find((proof) => classes.includes(proof)) || 'unknown';
  return { primary, classes: [...new Set(classes)] };
}

function proofLimitation(primary, classes) {
  if (primary === 'marker-static') return 'Nicht als Beweis für klickbares, hörbares, gespeichertes oder exportiertes Verhalten verwenden.';
  if (primary === 'source-shape') return 'Belegt Quell-/Boundary-Form, aber nicht automatisch Runtime-Verhalten.';
  if (primary === 'build-artifact') return 'Belegt Build-/Artefaktform, aber nicht automatisch semantische UI- oder Klangfunktion.';
  if (primary === 'browser-dom') return 'Stärker für UI-Liveness; Klang, Export und Persistenz brauchen ggf. eigene Gates.';
  if (primary === 'behavioural-audio-export') return 'Stärkerer Behaviour-Hinweis; Testfälle und hörbarer Qualitätsraum bleiben begrenzt.';
  if (primary === 'script-chain') return 'Teilbeweise liegen in den aufgerufenen Scripts; Kette manuell auflösen, wenn die Behauptung stark ist.';
  return 'Unklare Beweisklasse; nicht für starke Aussagen verwenden.';
}

function buildHistogram(items, key) {
  const map = new Map();
  for (const item of items) map.set(item[key], (map.get(item[key]) || 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function buildMultiHistogram(items, key) {
  const map = new Map();
  for (const item of items) {
    for (const name of item[key] || []) map.set(name, (map.get(name) || 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function buildCheckRegistryCurationReport(root = process.cwd()) {
  const pkg = readRepoJson(root, 'package.json');
  const scripts = pkg.scripts || {};
  const checkScripts = Object.entries(scripts)
    .filter(([name, command]) => name.startsWith('xensonar:check') || /tools\/check-[^\s;&|]+\.mjs/.test(command))
    .map(([name, command]) => {
      const toolPath = extractToolPath(command);
      const toolText = toolPath ? readIfExists(root, toolPath) : null;
      const signals = detectSignals(toolText || '', command);
      const proof = classifyProof(signals, Boolean(toolText));
      return {
        name,
        command,
        toolPath,
        toolExists: Boolean(toolText),
        primaryProofClass: proof.primary,
        proofClasses: proof.classes,
        signals,
        proofLimitation: proofLimitation(proof.primary, proof.classes),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const staticLike = checkScripts.filter((item) => ['marker-static', 'source-shape'].includes(item.primaryProofClass)).length;
  const behaviourLike = checkScripts.filter((item) => ['browser-dom', 'behavioural-audio-export'].includes(item.primaryProofClass)).length;
  const warnings = [];
  if (checkScripts.length > 500) warnings.push('Very large check registry: curate by proof class before adding more one-off marker checks.');
  if (staticLike > behaviourLike * 20) warnings.push('Static/marker-heavy registry: do not phrase marker gates as behavioural proof.');
  const unknown = checkScripts.filter((item) => item.primaryProofClass === 'unknown').length;
  if (unknown) warnings.push(`${unknown} check scripts could not be classified; inspect before relying on them for strong claims.`);

  const summary = {
    totalCheckScripts: checkScripts.length,
    toolBackedChecks: checkScripts.filter((item) => item.toolExists).length,
    missingToolFiles: checkScripts.filter((item) => item.toolPath && !item.toolExists).length,
    scriptChainChecks: checkScripts.filter((item) => item.primaryProofClass === 'script-chain').length,
    primaryProofClassHistogram: buildHistogram(checkScripts, 'primaryProofClass'),
    proofClassSignalHistogram: buildMultiHistogram(checkScripts, 'proofClasses'),
    staticLikeChecks: staticLike,
    behaviourLikeChecks: behaviourLike,
    browserDomChecks: checkScripts.filter((item) => item.proofClasses.includes('browser-dom')).length,
    audioExportChecks: checkScripts.filter((item) => item.proofClasses.includes('behavioural-audio-export')).length,
  };

  return {
    ok: true,
    reportKind: 'xensonar-check-registry-curation',
    version: checkRegistryCurationVersion,
    generatedAt: new Date().toISOString(),
    proofClassDescriptions,
    summary,
    warnings,
    checks: checkScripts,
    interpretation: {
      commonsRiskAddressed: 'makes the verification cost and proof class of the large check registry visible instead of letting marker checks masquerade as behavioural certainty',
      proofBoundary: 'This report classifies evidence strength; it does not prove individual UI/audio/export behaviours by itself.',
      recommendedUse: 'When a patch claims clickable, audible, persistent or exported behaviour, select gates from browser-dom or behavioural-audio-export classes, or explicitly state that only source shape was checked.',
    },
  };
}

export function writeCheckRegistryCurationReports(root, report) {
  const reportsDir = rel(root, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(rel(root, checkRegistryCurationPaths.json), JSON.stringify(report, null, 2) + '\n');
  const topClasses = report.summary.primaryProofClassHistogram.map((entry) => `- ${entry.name}: ${entry.count}`).join('\n');
  const sampleStatic = report.checks.filter((item) => ['marker-static', 'source-shape'].includes(item.primaryProofClass)).slice(0, 12);
  const sampleBehaviour = report.checks.filter((item) => ['browser-dom', 'behavioural-audio-export'].includes(item.primaryProofClass)).slice(0, 12);
  const md = [
    '# Check Registry Curation',
    '',
    `- ok: ${report.ok}`,
    `- version: ${report.version}`,
    `- generatedAt: ${report.generatedAt}`,
    `- total check scripts: ${report.summary.totalCheckScripts}`,
    `- tool-backed checks: ${report.summary.toolBackedChecks}`,
    '',
    '## Primary proof classes',
    '',
    topClasses || '- —',
    '',
    '## Commons interpretation',
    '',
    report.interpretation.commonsRiskAddressed,
    '',
    '**Proof boundary:** ' + report.interpretation.proofBoundary,
    '',
    '## Warnings',
    '',
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ['- —']),
    '',
    '## Sample static/source-shape checks',
    '',
    ...(sampleStatic.length ? sampleStatic.map((item) => `- ${item.name} — ${item.primaryProofClass} — ${item.proofLimitation}`) : ['- —']),
    '',
    '## Sample behavioural/browser/export-adjacent checks',
    '',
    ...(sampleBehaviour.length ? sampleBehaviour.map((item) => `- ${item.name} — ${item.primaryProofClass} — ${item.proofLimitation}`) : ['- —']),
    '',
    '## Falsifikationsfrage',
    '',
    'Behauptet ein Patch mehr Verhalten, als seine ausgewählten Gates tatsächlich beweisen, und verschiebt er dadurch Prüfkosten wieder auf spätere Commons-Arbeit?',
    '',
  ];
  fs.writeFileSync(rel(root, checkRegistryCurationPaths.markdown), md.join('\n'));
}
