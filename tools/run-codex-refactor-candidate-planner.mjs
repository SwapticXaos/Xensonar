#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  agentsInstructionsPath,
  candidatePlannerPaths,
  codexRefactorHarnessVersion,
  focusProfileNames,
  focusProfiles,
  forbiddenRuntimeClaims,
  isKnownFocusProfile,
} from './codex-refactor-harness-contract.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = { focus: 'core-refactor', all: false, runGates: false, limit: 6 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--focus') args.focus = argv[++i] || args.focus;
    else if (arg === '--all') args.all = true;
    else if (arg === '--run-gates') args.runGates = true;
    else if (arg === '--limit') args.limit = Number(argv[++i] || args.limit);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/run-codex-refactor-candidate-planner.mjs [--focus <profile>|--all] [--run-gates] [--limit <n>]\n\nProfiles: ${focusProfileNames().join(', ')}`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) args.limit = 6;
  if (!args.all && !isKnownFocusProfile(args.focus)) {
    throw new Error(`Unknown focus profile ${args.focus}. Known profiles: ${focusProfileNames().join(', ')}`);
  }
  return args;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readOptional(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(rel, acc = []) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return acc;
  const stat = fs.statSync(full);
  if (stat.isFile()) return acc.concat(rel);
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) walk(child, acc);
    else acc.push(child);
  }
  return acc;
}

function allCodeFiles() {
  return [...walk('src'), ...walk('tools')]
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
    .filter(exists);
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function fileMetrics(file) {
  const text = read(file);
  const lines = text.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(text, 'utf8');
  const metrics = {
    file,
    lines,
    bytes,
    importCount: countMatches(text, /^import\s/mg),
    exportCount: countMatches(text, /^export\s/mg),
    functionCount: countMatches(text, /\bfunction\s+|=>\s*\{|=>\s*\(/g),
    hookCount: countMatches(text, /\buse(State|Effect|Memo|Callback|Ref|Reducer)\b/g),
    browserGlobalCount: countMatches(text, /\b(window|document|navigator|localStorage|indexedDB)\b/g),
    timerCount: countMatches(text, /\b(setTimeout|setInterval|requestAnimationFrame|cancelAnimationFrame)\b/g),
    audioTermCount: countMatches(text, /\b(AudioContext|AudioBuffer|AudioWorklet|GainNode|OscillatorNode|scheduler|quantize|render|playback|voice)\b/gi),
    uiTextSignalCount: countMatches(text, /["'`]([^"'`]{3,80})(Button|Senden|Laden|Start|Stop|Play|Vorhören|Import|Export|Modus|Hörweise|Status|Panel|Dialog)[^"'`]*["'`]/g),
  };
  metrics.riskTags = riskTagsFor(file, text, metrics);
  metrics.refactorWeight = scoreMetrics(metrics);
  metrics.recommendedSlice = recommendedSlice(metrics);
  return metrics;
}

function riskTagsFor(file, text, metrics) {
  const tags = [];
  if (/waveStarter|rootFollow|audio|sound|scheduler|worklet/i.test(file) || metrics.audioTermCount >= 10) tags.push('audio/runtime');
  if (/\.tsx$/.test(file) || /Panel|Control|Dialog|View/.test(file)) tags.push('ui-surface');
  if (/package|storage|indexed|localStorage|persist|export|import/i.test(file) || /localStorage|indexedDB|Blob\(|URL\.createObjectURL/.test(text)) tags.push('persistence/package');
  if (/vite\.config|core|build|singlefile|html|dist/i.test(file)) tags.push('build-profile');
  if (metrics.lines >= 1800) tags.push('sediment-knot');
  else if (metrics.lines >= 900) tags.push('large-knot');
  if (metrics.browserGlobalCount >= 20) tags.push('browser-global-heavy');
  if (metrics.timerCount >= 8) tags.push('timer-heavy');
  if (/AGENTS\.md|codex|harness|radar|candidate/i.test(file)) tags.push('tooling-contract');
  return tags;
}

function scoreMetrics(metrics) {
  let score = 0;
  score += Math.min(50, metrics.lines / 40);
  score += Math.min(20, metrics.importCount / 2);
  score += Math.min(20, metrics.functionCount / 8);
  score += Math.min(15, metrics.browserGlobalCount / 4);
  score += Math.min(15, metrics.timerCount * 2);
  score += Math.min(20, metrics.audioTermCount / 6);
  if (metrics.riskTags.includes('sediment-knot')) score += 25;
  if (metrics.riskTags.includes('audio/runtime')) score += 15;
  if (metrics.riskTags.includes('persistence/package')) score += 10;
  return Math.round(score * 10) / 10;
}

function recommendedSlice(metrics) {
  if (metrics.riskTags.includes('audio/runtime')) {
    return 'Zuerst nur Vertrags-/Adapter-Grenze lesen; Hotpath nicht verändern. Thin slice: Typen, Report, Gate oder Callsite-Shape isolieren.';
  }
  if (metrics.riskTags.includes('persistence/package')) {
    return 'Thin slice: Payload-Ledger oder Roundtrip-Gate erweitern; keine Import-/Export-Datenform still ändern.';
  }
  if (metrics.riskTags.includes('ui-surface')) {
    return 'Thin slice: Props-/Handler-Zuständigkeit klären; UI-Text nur ändern, wenn Verhalten dadurch wahrer wird und Gate existiert.';
  }
  if (metrics.riskTags.includes('build-profile') || metrics.riskTags.includes('tooling-contract')) {
    return 'Thin slice: gemeinsame Vertragsquelle oder Alias-/Profilcheck; Core/Full-Grenze explizit beweisen.';
  }
  return 'Thin slice: reinen Helper/Typvertrag extrahieren und Callsite-Zahl klein halten.';
}

function shellCommand(commandText) {
  const started = Date.now();
  const proc = spawnSync('/bin/bash', ['-lc', commandText], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 1024 * 1024 * 16,
  });
  return {
    command: commandText,
    status: proc.status === 0 ? 'pass' : 'fail',
    exitCode: proc.status,
    durationMs: Date.now() - started,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-12).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-12).join('\n').trim(),
  };
}

function filesForProfile(profile, sourceFiles) {
  const primary = [];
  for (const candidate of profile.primaryFiles) {
    const full = path.join(root, candidate);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) primary.push(...walk(candidate).filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(candidate)) primary.push(candidate);
  }
  const primarySet = new Set(primary);
  const largest = sourceFiles
    .filter((file) => !primarySet.has(file))
    .map(fileMetrics)
    .sort((a, b) => b.refactorWeight - a.refactorWeight)
    .slice(0, 4)
    .map((metrics) => ({ ...metrics, candidateRole: 'global-sediment-context' }));
  return [...primarySet].map(fileMetrics).map((metrics) => ({ ...metrics, candidateRole: 'profile-primary' })).concat(largest);
}

function buildProfilePlan(focus, args, sourceFiles) {
  const profile = focusProfiles[focus];
  const gateResults = [];
  if (args.runGates) {
    gateResults.push(shellCommand('node tools/check-codex-refactor-harness-contract.mjs'));
    gateResults.push(shellCommand('node tools/check-codex-refactor-radar-suite.mjs'));
    for (const gate of profile.gates) gateResults.push(shellCommand(gate));
  }
  const candidates = filesForProfile(profile, sourceFiles)
    .sort((a, b) => {
      if (a.candidateRole !== b.candidateRole) return a.candidateRole === 'profile-primary' ? -1 : 1;
      return b.refactorWeight - a.refactorWeight;
    })
    .slice(0, args.limit);
  const top = candidates[0] || null;
  return {
    focus,
    label: profile.label,
    intent: profile.intent,
    primaryFiles: profile.primaryFiles,
    recommendedFirstSlice: top ? {
      file: top.file,
      reason: `${top.candidateRole}; Gewicht ${top.refactorWeight}; Tags: ${top.riskTags.join(', ') || 'keine'}`,
      slice: top.recommendedSlice,
      falsificationQuestion: falsificationQuestionFor(focus, top),
    } : null,
    candidates,
    gates: profile.gates,
    gateResults,
  };
}

function falsificationQuestionFor(focus, candidate) {
  if (candidate.riskTags.includes('audio/runtime')) {
    return 'Könnte dieser Slice Event-Reihenfolge, Klangkörper, Quantisierung, Zufallsinterleaving oder Scheduling-Verhalten verändern, obwohl er als Refactor erscheint?';
  }
  if (focus === 'spectralforge-routing') {
    return 'Könnte ein Sendepfad danach nicht mehr den hörbaren Carrier-/Hörweisen-Körper weitergeben, sondern wieder einen Fallback oder globalen Reglerzustand?';
  }
  if (focus === 'package-station') {
    return 'Könnte ein Projekt nach Export/Import musikalisch unvollständiger zurückkommen, obwohl der Check formal grün bleibt?';
  }
  if (focus === 'core-refactor') {
    return 'Könnte der Core kleiner wirken, aber durch einen Alias Full-/Archiv-Funktionalität verlieren oder Forensik unbemerkt zurückziehen?';
  }
  return 'Könnte der Slice eine lebendige relationale/musikalische Varianz in technische Gleichheit umdeuten?';
}

function writeReports(plans, args) {
  const pkg = JSON.parse(read('package.json'));
  const agents = readOptional(agentsInstructionsPath);
  const report = {
    ok: plans.every((plan) => plan.gateResults.every((gate) => gate.status === 'pass')),
    reportKind: 'xensonar-codex-refactor-candidate-planner',
    harnessVersion: codexRefactorHarnessVersion,
    generatedAt: new Date().toISOString(),
    package: { name: pkg.name, version: pkg.version },
    agentsInstructionsPath,
    agentsPresent: agents.trim().length > 0,
    mode: args.all ? 'all' : 'single',
    profileCount: plans.length,
    forbiddenRuntimeClaims,
    plans,
  };
  fs.mkdirSync(path.dirname(path.join(root, candidatePlannerPaths.json)), { recursive: true });
  fs.writeFileSync(path.join(root, candidatePlannerPaths.json), JSON.stringify(report, null, 2));
  const md = [
    '# Xensonar Codex Refactor Candidate Planner',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- package: ${pkg.name}`,
    `- version: ${pkg.version}`,
    `- profiles: ${plans.length}`,
    `- AGENTS.md: ${report.agentsPresent ? 'present' : 'missing'}`,
    '',
    '## Lesart',
    '',
    'Der Candidate Planner ist die konkrete Vorstufe vor Codex-Patching: Er wählt nicht automatisch den Patch, sondern benennt pro Profil die wahrscheinlich dünnste sichere Eintrittsstelle, die Falsifikationsfrage und die passenden Gates. Er ist kein Klang-/UI-Beweis.',
    '',
  ];
  for (const plan of plans) {
    md.push(`## ${plan.focus} — ${plan.label}`, '');
    if (plan.recommendedFirstSlice) {
      md.push(`**Empfohlener erster dünner Slice:** \`${plan.recommendedFirstSlice.file}\``);
      md.push('', `- Grund: ${plan.recommendedFirstSlice.reason}`);
      md.push(`- Slice: ${plan.recommendedFirstSlice.slice}`);
      md.push(`- Falsifikationsfrage: ${plan.recommendedFirstSlice.falsificationQuestion}`, '');
    }
    md.push('| Rolle | Datei | Zeilen | Gewicht | Tags | Slice |');
    md.push('|---|---|---:|---:|---|---|');
    for (const c of plan.candidates) {
      md.push(`| ${c.candidateRole} | ${c.file} | ${c.lines} | ${c.refactorWeight} | ${c.riskTags.join(', ')} | ${c.recommendedSlice.replace(/\|/g, '/')} |`);
    }
    md.push('', '### Gates', '');
    if (plan.gateResults.length) {
      for (const gate of plan.gateResults) md.push(`- ${gate.status.toUpperCase()} · ${gate.command} · ${gate.durationMs}ms`);
    } else {
      for (const gate of plan.gates) md.push(`- ${gate}`);
    }
    md.push('');
  }
  fs.writeFileSync(path.join(root, candidatePlannerPaths.markdown), md.join('\n'));
  return report;
}

const args = parseArgs(process.argv);
const sourceFiles = allCodeFiles();
const focuses = args.all ? focusProfileNames() : [args.focus];
const plans = focuses.map((focus) => buildProfilePlan(focus, args, sourceFiles));
const report = writeReports(plans, args);
console.log(JSON.stringify({ ok: report.ok, report: candidatePlannerPaths.json, markdown: candidatePlannerPaths.markdown, profiles: plans.length }, null, 2));
process.exit(report.ok ? 0 : 1);
