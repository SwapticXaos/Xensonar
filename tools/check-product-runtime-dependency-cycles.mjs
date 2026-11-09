#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const combinedBudgetArg = process.argv.find((arg) => arg.startsWith('--max-combined-sccs='));
const maxCombinedSccs = combinedBudgetArg ? Number(combinedBudgetArg.split('=')[1]) : null;
const srcRoot = path.join(root, 'src');
const productRoot = path.join(srcRoot, 'features');
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const files = walk(productRoot).map((file) => path.resolve(file));
const fileSet = new Set(files);

function resolveInternal(fromFile, specifier) {
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(srcRoot, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;

  const candidates = [base];
  if (!path.extname(base)) {
    for (const ext of extensions) candidates.push(base + ext);
  }
  for (const ext of extensions) candidates.push(path.join(base, `index${ext}`));
  return candidates.map((candidate) => path.resolve(candidate)).find((candidate) => fileSet.has(candidate)) ?? null;
}

function importIsTypeOnly(node) {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return clause.namedBindings.isTypeOnly === true;
  if (ts.isNamedImports(clause.namedBindings)) {
    return clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

function exportIsTypeOnly(node) {
  if (node.isTypeOnly) return true;
  if (!node.exportClause) return false; // export * evaluates the target module
  if (ts.isNamedExports(node.exportClause)) {
    return node.exportClause.elements.length > 0 && node.exportClause.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

const runtime = new Map(files.map((file) => [file, new Set()]));
const typeOnly = new Map(files.map((file) => [file, new Set()]));

for (const file of files) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.jsx') ? ts.ScriptKind.JSX : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, kind);
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const target = resolveInternal(file, statement.moduleSpecifier.text);
      if (!target) continue;
      (importIsTypeOnly(statement) ? typeOnly : runtime).get(file).add(target);
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const target = resolveInternal(file, statement.moduleSpecifier.text);
      if (!target) continue;
      (exportIsTypeOnly(statement) ? typeOnly : runtime).get(file).add(target);
    }
  }
}

function stronglyConnectedComponents(graph) {
  let index = 0;
  const indices = new Map();
  const lowLink = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, index);
    lowLink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(next)));
      } else if (onStack.has(next)) {
        lowLink.set(node, Math.min(lowLink.get(node), indices.get(next)));
      }
    }

    if (lowLink.get(node) === indices.get(node)) {
      const component = [];
      while (stack.length) {
        const current = stack.pop();
        onStack.delete(current);
        component.push(current);
        if (current === node) break;
      }
      if (component.length > 1) components.push(component);
    }
  }

  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return components.sort((a, b) => b.length - a.length);
}

const runtimeSccs = stronglyConnectedComponents(runtime);
const combined = new Map(files.map((file) => [file, new Set([...(runtime.get(file) ?? []), ...(typeOnly.get(file) ?? [])])]));
const combinedSccs = stronglyConnectedComponents(combined);

const relative = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const summary = {
  files: files.length,
  runtimeEdges: [...runtime.values()].reduce((sum, edges) => sum + edges.size, 0),
  typeOnlyEdges: [...typeOnly.values()].reduce((sum, edges) => sum + edges.size, 0),
  runtimeSccCount: runtimeSccs.length,
  combinedSccCount: combinedSccs.length,
};

if (runtimeSccs.length) {
  console.error('[product-runtime-dependency-cycles] FAIL');
  console.error(JSON.stringify(summary, null, 2));
  for (const [idx, component] of runtimeSccs.entries()) {
    console.error(`runtime SCC ${idx + 1} (${component.length} modules):`);
    for (const file of component.sort()) console.error(`  - ${relative(file)}`);
  }
  process.exit(1);
}

if (maxCombinedSccs !== null && (!Number.isFinite(maxCombinedSccs) || maxCombinedSccs < 0)) {
  console.error('[product-runtime-dependency-cycles] FAIL');
  console.error(`invalid --max-combined-sccs value: ${combinedBudgetArg}`);
  process.exit(1);
}

if (maxCombinedSccs !== null && combinedSccs.length > maxCombinedSccs) {
  console.error('[product-runtime-dependency-cycles] FAIL');
  console.error(JSON.stringify(summary, null, 2));
  console.error(`combined runtime+type SCC budget exceeded: ${combinedSccs.length} > ${maxCombinedSccs}`);
  for (const [idx, component] of combinedSccs.entries()) {
    console.error(`combined SCC ${idx + 1} (${component.length} modules):`);
    for (const file of component.sort()) console.error(`  - ${relative(file)}`);
  }
  process.exit(1);
}

console.log('[product-runtime-dependency-cycles] PASS');
console.log(JSON.stringify(summary, null, 2));
if (maxCombinedSccs !== null) console.log(`[product-runtime-dependency-cycles] combined SCC budget: ${combinedSccs.length}/${maxCombinedSccs}`);
if (combinedSccs.length) {
  console.log(`[product-runtime-dependency-cycles] informational: ${combinedSccs.length} combined runtime+type SCC(s) remain; type-only cycles are not a runtime initialization failure.`);
}
