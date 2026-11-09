import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const codexSourceMetricsModuleVersion = '3.2.91-7.7.83';
export const defaultSourceMetricRoots = ['src', 'tools'];
export const defaultExcludedDirectoryNames = new Set(['node_modules', 'dist', '.git']);
export const defaultSourceMetricExtensionPattern = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

export function resolveRepoPath(root, rel) {
  return path.join(root, rel);
}

export function repoPathExists(root, rel) {
  return fs.existsSync(resolveRepoPath(root, rel));
}

export function readRepoText(root, rel) {
  return fs.readFileSync(resolveRepoPath(root, rel), 'utf8');
}

export function readRepoJson(root, rel) {
  return JSON.parse(readRepoText(root, rel));
}

export function walkRepoFiles(root, rel, options = {}, acc = []) {
  const excludedDirectoryNames = options.excludedDirectoryNames || defaultExcludedDirectoryNames;
  const extensionPattern = options.extensionPattern || null;
  const full = resolveRepoPath(root, rel);
  if (!fs.existsSync(full)) return acc;
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    if (!extensionPattern || extensionPattern.test(rel)) acc.push(rel);
    return acc;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) continue;
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) walkRepoFiles(root, child, options, acc);
    else if (!extensionPattern || extensionPattern.test(child)) acc.push(child);
  }
  return acc;
}

export function listSourceMetricFiles(root = process.cwd(), options = {}) {
  const roots = options.roots || defaultSourceMetricRoots;
  const extensionPattern = options.extensionPattern || defaultSourceMetricExtensionPattern;
  return [...new Set(roots.flatMap((rel) => walkRepoFiles(root, rel, { ...options, extensionPattern })))]
    .sort((a, b) => a.localeCompare(b));
}

export function countPattern(text, regex) {
  return (text.match(regex) || []).length;
}

export function buildSourceFileMetrics(root, file) {
  const text = readRepoText(root, file);
  const metrics = {
    file,
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split(/\r?\n/).length,
    importCount: countPattern(text, /^import\s/mg),
    exportCount: countPattern(text, /^export\s/mg),
    functionCount: countPattern(text, /\bfunction\s+|=>\s*\{|=>\s*\(/g),
    browserGlobalCount: countPattern(text, /\b(window|document|navigator|localStorage|indexedDB)\b/g),
    timerCount: countPattern(text, /\b(setTimeout|setInterval|requestAnimationFrame|cancelAnimationFrame)\b/g),
    audioTermCount: countPattern(text, /\b(AudioContext|AudioBuffer|AudioWorklet|GainNode|OscillatorNode|scheduler|quantize|render|playback|voice)\b/gi),
    uiTextSignalCount: countPattern(text, /["'`]([^"'`]{3,80})(Button|Senden|Laden|Start|Stop|Play|Vorhören|Import|Export|Modus|Hörweise|Status|Panel|Dialog)[^"'`]*["'`]/g),
  };
  metrics.tags = tagsForSourceFile(file, metrics, text);
  metrics.sedimentScore = sedimentScoreForSourceFile(metrics);
  return metrics;
}

export function tagsForSourceFile(file, metrics, text = '') {
  const tags = [];
  if (/waveStarter|rootFollow|audio|sound|scheduler|worklet/i.test(file) || metrics.audioTermCount >= 10) tags.push('audio/runtime');
  if (/\.tsx$/.test(file) || /Panel|Control|Dialog|View/.test(file)) tags.push('ui-surface');
  if (/package|storage|indexed|localStorage|persist|export|import/i.test(file) || /localStorage|indexedDB|Blob\(|URL\.createObjectURL/.test(text)) tags.push('persistence/package');
  if (/vite\.config|core|build|singlefile|html|dist/i.test(file)) tags.push('build-profile');
  if (/codex|harness|radar|candidate|impact|metrics/i.test(file)) tags.push('tooling-contract');
  if (metrics.lines >= 1800) tags.push('sediment-knot');
  else if (metrics.lines >= 900) tags.push('large-knot');
  if (metrics.browserGlobalCount >= 20) tags.push('browser-global-heavy');
  if (metrics.timerCount >= 8) tags.push('timer-heavy');
  return tags;
}

export function sedimentScoreForSourceFile(metrics) {
  let score = 0;
  score += Math.min(60, metrics.lines / 35);
  score += Math.min(25, metrics.bytes / 5000);
  score += Math.min(20, metrics.functionCount / 5);
  score += Math.min(18, metrics.browserGlobalCount / 3);
  score += Math.min(18, metrics.timerCount * 2.5);
  score += Math.min(25, metrics.audioTermCount / 4);
  if (metrics.tags.includes('sediment-knot')) score += 35;
  if (metrics.tags.includes('audio/runtime')) score += 20;
  if (metrics.tags.includes('persistence/package')) score += 12;
  if (metrics.tags.includes('tooling-contract')) score -= 8;
  return Math.round(Math.max(0, score) * 10) / 10;
}

export function buildSourceMetrics(root = process.cwd(), options = {}) {
  const files = listSourceMetricFiles(root, options);
  const metrics = files.map((file) => buildSourceFileMetrics(root, file));
  return {
    files,
    metrics,
    byFile: new Map(metrics.map((item) => [item.file, item])),
    summary: summarizeSourceMetrics(metrics),
  };
}

export function summarizeSourceMetrics(metrics) {
  return {
    fileCount: metrics.length,
    totalBytes: metrics.reduce((sum, item) => sum + item.bytes, 0),
    totalLines: metrics.reduce((sum, item) => sum + item.lines, 0),
  };
}

export function sourceMetricHotspots(metrics, limit = 12) {
  return [...metrics]
    .sort((a, b) => b.sedimentScore - a.sedimentScore || b.lines - a.lines || a.file.localeCompare(b.file))
    .slice(0, limit);
}

export function metricFilesForProfile(root, profile) {
  const files = [];
  for (const primary of profile.primaryFiles || []) {
    if (!repoPathExists(root, primary)) continue;
    const stat = fs.statSync(resolveRepoPath(root, primary));
    if (stat.isDirectory()) {
      files.push(...walkRepoFiles(root, primary, { extensionPattern: defaultSourceMetricExtensionPattern }));
    } else if (defaultSourceMetricExtensionPattern.test(primary)) {
      files.push(primary);
    }
  }
  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

export function buildSourceProfileLedger(root, focusNames, focusProfiles, sourceMetricMap) {
  return focusNames.map((focus) => {
    const profile = focusProfiles[focus];
    const files = metricFilesForProfile(root, profile);
    const metrics = files.map((file) => sourceMetricMap.get(file)).filter(Boolean);
    const bytes = metrics.reduce((sum, item) => sum + item.bytes, 0);
    const lines = metrics.reduce((sum, item) => sum + item.lines, 0);
    const hotspot = sourceMetricHotspots(metrics, 1)[0] || null;
    return {
      focus,
      label: profile.label,
      fileCount: files.length,
      missingPrimaryFiles: (profile.primaryFiles || []).filter((file) => !repoPathExists(root, file)),
      aggregate: { bytes, lines },
      hotspot,
      gates: profile.gates,
    };
  });
}

export function buildTagHistogram(metrics) {
  const histogram = new Map();
  for (const metric of metrics) {
    for (const tag of metric.tags || []) histogram.set(tag, (histogram.get(tag) || 0) + 1);
  }
  return [...histogram.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function buildDirectorySummary(metrics, depth = 3) {
  const summary = new Map();
  for (const metric of metrics) {
    const key = metric.file.split('/').slice(0, depth).join('/');
    const current = summary.get(key) || { path: key, fileCount: 0, bytes: 0, lines: 0, maxSedimentScore: 0 };
    current.fileCount += 1;
    current.bytes += metric.bytes;
    current.lines += metric.lines;
    current.maxSedimentScore = Math.max(current.maxSedimentScore, metric.sedimentScore);
    summary.set(key, current);
  }
  return [...summary.values()]
    .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes || a.path.localeCompare(b.path));
}
