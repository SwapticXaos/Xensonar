#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import ts from './typescript-runtime.mjs';

const root = process.cwd();
const registryPath = path.join(root, 'tools', 'xensonar-contract-boundary-registry.json');
const failures = [];
const warnings = [];
const norm = (p) => p.replaceAll('\\', '/');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

if (!fs.existsSync(registryPath)) {
  console.error('[xensonar][contract-boundary-registry] missing registry');
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
if (registry.schemaVersion !== 1 || !Array.isArray(registry.boundaries)) {
  console.error('[xensonar][contract-boundary-registry] invalid registry schema');
  process.exit(1);
}

function parse(rel) {
  const source = read(rel);
  return ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function hasExportModifier(statement) {
  return !!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function contractExportNames(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) names.add(statement.name.text);
  }
  return names;
}

function runtimeValueExportNames(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
  }
  return names;
}

function importDeclarationIsTypeOnly(statement) {
  const clause = statement.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false;
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    return clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

function exportDeclarationIsTypeOnly(statement) {
  if (statement.isTypeOnly) return true;
  if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
    return statement.exportClause.elements.length > 0 && statement.exportClause.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

function validatePureContract(rel, sourceFile) {
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!importDeclarationIsTypeOnly(statement)) failures.push(`${rel}: non-type import in contract module`);
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEmptyStatement(statement)) continue;
    if (ts.isExportDeclaration(statement)) {
      if (!exportDeclarationIsTypeOnly(statement)) failures.push(`${rel}: non-type export declaration in contract module`);
      continue;
    }
    failures.push(`${rel}: runtime-capable top-level statement ${ts.SyntaxKind[statement.kind]}`);
  }
}

function resolveRelativeModule(fromRel, specifier) {
  if (!specifier.startsWith('.')) return null;
  const fromAbs = path.join(root, fromRel);
  const base = path.resolve(path.dirname(fromAbs), specifier);
  const candidates = [
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return norm(path.relative(root, candidate));
  }
  return null;
}

function runtimeReferencesContract(runtimeRel, contractRel, sourceFile) {
  for (const statement of sourceFile.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      if (resolveRelativeModule(runtimeRel, statement.moduleSpecifier.text) === contractRel) return true;
    }
  }
  return false;
}

const runtimeToBoundary = new Map();
const seenIds = new Set();
for (const boundary of registry.boundaries) {
  if (!boundary?.id || !boundary.runtime || !boundary.contract) {
    failures.push('registry boundary missing id/runtime/contract');
    continue;
  }
  if (seenIds.has(boundary.id)) failures.push(`duplicate boundary id: ${boundary.id}`);
  seenIds.add(boundary.id);
  if (runtimeToBoundary.has(boundary.runtime)) failures.push(`duplicate runtime facade: ${boundary.runtime}`);
  runtimeToBoundary.set(boundary.runtime, boundary);

  if (!exists(boundary.runtime)) { failures.push(`${boundary.id}: missing runtime ${boundary.runtime}`); continue; }
  if (!exists(boundary.contract)) { failures.push(`${boundary.id}: missing contract ${boundary.contract}`); continue; }

  const contractSf = parse(boundary.contract);
  const runtimeSf = parse(boundary.runtime);
  validatePureContract(boundary.contract, contractSf);

  const contractExports = contractExportNames(contractSf);
  for (const name of boundary.requiredContractExports ?? []) {
    if (!contractExports.has(name)) failures.push(`${boundary.id}: contract export disappeared: ${name}`);
  }
  const runtimeExports = runtimeValueExportNames(runtimeSf);
  for (const name of boundary.requiredRuntimeValueExports ?? []) {
    if (!runtimeExports.has(name)) failures.push(`${boundary.id}: runtime value export disappeared: ${name}`);
  }
  if (!runtimeReferencesContract(boundary.runtime, boundary.contract, runtimeSf)) {
    failures.push(`${boundary.id}: runtime facade no longer references contract module`);
  }
  if (boundary.requireCompatibilityReexport) {
    const hasCompatibilityReexport = runtimeSf.statements.some((statement) =>
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) &&
      resolveRelativeModule(boundary.runtime, statement.moduleSpecifier.text) === boundary.contract &&
      exportDeclarationIsTypeOnly(statement)
    );
    if (!hasCompatibilityReexport) failures.push(`${boundary.id}: compatibility type re-export disappeared`);
  }
}

function walkSource(dirRel, out = []) {
  const dirAbs = path.join(root, dirRel);
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const rel = norm(path.join(dirRel, entry.name));
    if (entry.isDirectory()) walkSource(rel, out);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

let staleFacadeTypeImports = 0;
for (const fileRel of walkSource('src')) {
  const sourceFile = parse(fileRel);
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = resolveRelativeModule(fileRel, statement.moduleSpecifier.text);
    const boundary = runtimeToBoundary.get(target);
    if (!boundary || target === fileRel) continue;
    const contractNames = new Set(boundary.requiredContractExports ?? []);
    const clause = statement.importClause;
    if (!clause) continue;
    const stale = [];
    if (clause.isTypeOnly) {
      if (clause.name && contractNames.has(clause.name.text)) stale.push(clause.name.text);
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          if (contractNames.has(imported)) stale.push(imported);
        }
      }
    } else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if (!element.isTypeOnly) continue;
        const imported = element.propertyName?.text ?? element.name.text;
        if (contractNames.has(imported)) stale.push(imported);
      }
    }
    if (stale.length) {
      staleFacadeTypeImports += stale.length;
      failures.push(`${fileRel}: type-only import ${stale.join(', ')} still routes through runtime facade ${target}; import from ${boundary.contract}`);
    }
  }
}

for (const assertion of registry.globalAssertions?.forbiddenText ?? []) {
  if (!exists(assertion.file)) {
    failures.push(`global assertion missing file: ${assertion.file}`);
    continue;
  }
  if (read(assertion.file).includes(assertion.text)) {
    failures.push(`${assertion.file}: forbidden stale text remains: ${assertion.text}${assertion.reason ? ` (${assertion.reason})` : ''}`);
  }
}

if (failures.length) {
  console.error('[xensonar][contract-boundary-registry] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length) for (const warning of warnings) console.warn(`warning: ${warning}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  boundaries: registry.boundaries.length,
  staleFacadeTypeImports,
  globalAssertions: registry.globalAssertions?.forbiddenText?.length ?? 0,
}, null, 2));
