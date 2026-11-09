import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

function candidatePackageRoots() {
  const roots = [];
  try {
    roots.push(path.dirname(require.resolve('typescript/package.json')));
  } catch {}

  const nodePrefixRoot = path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'typescript');
  roots.push(nodePrefixRoot);
  roots.push('/usr/local/lib/node_modules/typescript');
  roots.push('/usr/lib/node_modules/typescript');

  return [...new Set(roots)];
}

export function resolveTypeScriptPackageRoot() {
  for (const root of candidatePackageRoots()) {
    if (fs.existsSync(path.join(root, 'package.json'))) return root;
  }
  throw new Error('TypeScript compiler not found. Install project dependencies or provide a global TypeScript installation.');
}

export function resolveTypeScriptCliPath() {
  const cliPath = path.join(resolveTypeScriptPackageRoot(), 'bin', 'tsc');
  if (!fs.existsSync(cliPath)) throw new Error(`TypeScript CLI missing at ${cliPath}`);
  return cliPath;
}

export async function loadTypeScript() {
  const modulePath = path.join(resolveTypeScriptPackageRoot(), 'lib', 'typescript.js');
  const loaded = await import(pathToFileURL(modulePath).href);
  return loaded.default ?? loaded;
}

const ts = await loadTypeScript();
export default ts;
