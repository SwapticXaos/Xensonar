import fs from 'node:fs';
import path from 'node:path';
import ts from './typescript-runtime.mjs';

function resolveRelativeTypeScript(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function importNeedsRuntime(statement) {
  if (ts.isExportDeclaration(statement)) return !statement.isTypeOnly;
  if (!ts.isImportDeclaration(statement)) return false;
  const clause = statement.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return true;
  return bindings.elements.some((element) => !element.isTypeOnly);
}

export function transpileTypeScriptGraph({ root, entry, outRoot }) {
  const absoluteRoot = path.resolve(root);
  const seen = new Set();

  const visit = (inputFile) => {
    const file = path.resolve(inputFile);
    if (seen.has(file)) return;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    for (const statement of sourceFile.statements) {
      if (!importNeedsRuntime(statement)) continue;
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue;
      const dependency = resolveRelativeTypeScript(file, specifier);
      if (dependency) visit(dependency);
    }

    const output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const relative = path.relative(absoluteRoot, file).replace(/\.tsx?$/, '.js');
    const destination = path.join(outRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, output);
  };

  visit(path.resolve(absoluteRoot, entry));
  return { files: [...seen], outRoot };
}
