import fs from 'node:fs';
import path from 'node:path';

export function createGuardContext(root = process.cwd()) {
  const resolve = (rel) => path.join(root, rel);
  const exists = (rel) => fs.existsSync(resolve(rel));
  const read = (rel) => fs.readFileSync(resolve(rel), 'utf8');
  const readIfExists = (rel, fallback = '') => (exists(rel) ? read(rel) : fallback);
  const readJson = (rel, fallback = {}) => (exists(rel) ? JSON.parse(read(rel)) : fallback);
  const lineCount = (content) => content.split(/\r?\n/).length;
  return { root, resolve, exists, read, readIfExists, readJson, lineCount };
}

export const importRegex = /import\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"];?/g;
export const exportFromRegex = /export\s+(?:\{[\s\S]*?\}|\*)\s+from\s+['"]([^'"]+)['"];?/g;
export const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

export function extractImports(content) {
  const imports = [];
  for (const match of content.matchAll(importRegex)) {
    const statement = match[0].replace(/\s+/g, ' ').trim();
    const source = match[1];
    const isTypeOnly = /^import\s+type\b/.test(statement);
    imports.push({ statement, source, isTypeOnly });
  }
  return imports;
}

export function extractExportSources(content) {
  return Array.from(content.matchAll(exportFromRegex), (match) => match[1]);
}

export function extractDynamicImports(content) {
  return Array.from(content.matchAll(dynamicImportRegex), (match) => match[1]);
}

export function compareSources(actualSources, allowedSources = []) {
  return actualSources.filter((source) => !allowedSources.includes(source));
}

export function findForbiddenFragments(text, fragments = []) {
  return fragments.filter((fragment) => text.includes(fragment));
}

export function collectDependencyFindings({
  ctx = createGuardContext(),
  files,
  allowedValueImports = {},
  allowedTypeImports = {},
  allowedExportSources = {},
  allowedDynamicImportSources = {},
  forbiddenImportFragments = [],
  forbiddenTokens = [],
  extraFinding = () => ({}),
}) {
  return Object.fromEntries(
    Object.entries(files).map(([key, rel]) => {
      const content = ctx.readIfExists(rel, '');
      const imports = extractImports(content);
      const valueImports = imports.filter((entry) => !entry.isTypeOnly).map((entry) => entry.source);
      const typeImports = imports.filter((entry) => entry.isTypeOnly).map((entry) => entry.source);
      const exportSources = extractExportSources(content);
      const dynamicImportSources = extractDynamicImports(content);
      const unexpectedValueImports = compareSources(valueImports, allowedValueImports[key] || []);
      const unexpectedTypeImports = compareSources(typeImports, allowedTypeImports[key] || []);
      const unexpectedExportSources = compareSources(exportSources, allowedExportSources[key] || []);
      const unexpectedDynamicImports = compareSources(dynamicImportSources, allowedDynamicImportSources[key] || []);
      const dependencyText = [...valueImports, ...typeImports, ...exportSources, ...dynamicImportSources].join('\n');
      const forbiddenImportHits = findForbiddenFragments(dependencyText, forbiddenImportFragments);
      const forbiddenTokenHits = findForbiddenFragments(content, forbiddenTokens);
      return [key, {
        file: rel,
        exists: ctx.exists(rel),
        valueImports,
        typeImports,
        exportSources,
        dynamicImportSources,
        unexpectedValueImports,
        unexpectedTypeImports,
        unexpectedExportSources,
        unexpectedDynamicImports,
        forbiddenImportHits,
        forbiddenTokenHits,
        ...extraFinding({ key, rel, content, dependencyText }),
      }];
    }),
  );
}

export function dependencyFindingsClean(findings, extraClean = () => true) {
  return Object.values(findings).every((finding) =>
    finding.exists &&
    finding.unexpectedValueImports.length === 0 &&
    finding.unexpectedTypeImports.length === 0 &&
    finding.unexpectedExportSources.length === 0 &&
    finding.unexpectedDynamicImports.length === 0 &&
    finding.forbiddenImportHits.length === 0 &&
    finding.forbiddenTokenHits.length === 0 &&
    extraClean(finding)
  );
}

export function assertAllMarkers(content, markers, fail, label = 'source') {
  for (const marker of markers) {
    if (!content.includes(marker)) fail(`${label} missing marker ${marker}`);
  }
}

export function assertRequiredTokensByKey(sourceByKey, requiredTokensByKey, fail, label = 'source') {
  for (const [key, tokens] of Object.entries(requiredTokensByKey)) {
    for (const token of tokens) {
      if (!sourceByKey[key]?.includes(token)) fail(`${key} missing expected ${label} token ${token}`);
    }
  }
}

export function boolChecksToFailures(checks) {
  return Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
}
