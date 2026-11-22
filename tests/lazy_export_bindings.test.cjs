'use strict';
// LAZY-BINDINGS-01: static guard for bindings that cross lazy-block boundaries.
// Every room / chunk / function island is evaluated by __xenEvalInModule inside the main
// module scope. Two classes of bug compile fine and only explode at runtime:
//   1. a block writes to a binding that is `const` in its own scope or in the main module
//      (e.g. a chunk-exported `let` destructured into `const {..}` by a room, then reassigned
//      -> "TypeError: Assignment to constant variable" on room unmount);
//   2. a chunk exports a `let`/`var` binding by value and later reassigns it, so importers
//      silently keep a stale copy.
// Usage: node tests/lazy_export_bindings.test.cjs [index.html]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('../tools/slim/node_modules/acorn');
const eslintScope = require('../tools/slim/node_modules/eslint-scope');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.resolve(process.argv[2] || path.join(ROOT, 'index.html')), 'utf8');

const blocks = [];
const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
for (let m; (m = re.exec(html));) {
 const attrs = m[1];
 const type = (attrs.match(/type="([^"]+)"/) || [])[1] || '';
 const id = (attrs.match(/id="([^"]+)"/) || [])[1] || '';
 if (type === 'module') blocks.push({ id: 'main', kind: 'main', src: m[2] });
 else if (/^application\/x-xensonar-(room|chunk|function)$/.test(type)) blocks.push({ id, kind: type.slice(23), src: m[2] });
}
assert.ok(blocks.some(b => b.kind === 'main'), 'main module found');
assert.ok(blocks.filter(b => b.kind !== 'main').length >= 20, 'lazy blocks found');

const analyze = b => {
 const code = b.kind === 'function' ? '(' + b.src + '\n)' : b.src;
 const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: b.kind === 'main' ? 'module' : 'script', allowHashBang: true, allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, ranges: true });
 const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: b.kind === 'main' ? 'module' : 'script', ignoreEval: true, nodejsScope: b.kind !== 'main' });
 return { ast, sm };
};

const defKind = v => {
 const d = v.defs[0];
 if (!d) return null;
 if (d.type === 'Variable') return d.parent.kind;
 return d.type; // FunctionName, ClassName, Parameter, ...
};
const isInitWrite = ref => ref.init === true;

const failures = [];
const mainConsts = new Set();
const exportedLets = new Map(); // name -> chunk id
const analyzed = new Map();

for (const b of blocks) {
 const r = analyze(b);
 analyzed.set(b.id, r);
 const top = r.sm.globalScope.childScopes[0]; // module scope (main) or nodejs-style function scope (lazy blocks)
 for (const scope of r.sm.scopes) {
  for (const v of scope.variables) {
   if (defKind(v) !== 'const') continue;
   for (const ref of v.references) if (ref.isWrite() && !isInitWrite(ref)) failures.push(`${b.id}: write to const '${v.name}'`);
  }
 }
 if (b.kind === 'main') for (const v of top.variables) if (defKind(v) === 'const') mainConsts.add(v.name);
 if (b.kind === 'chunk') {
  // exported names: the trailing completion-value object expression (Object.freeze({...}) or ({...}))
  const last = r.ast.body[r.ast.body.length - 1];
  let obj = last?.type === 'ExpressionStatement' ? last.expression : null;
  if (obj?.type === 'CallExpression' && obj.arguments.length === 1) obj = obj.arguments[0];
  if (obj?.type !== 'ObjectExpression') continue;
  for (const p of obj.properties) {
   if (p.type !== 'Property' || p.value.type !== 'Identifier') continue;
   const v = top.set.get(p.value.name);
   if (!v) continue;
   const kind = defKind(v);
   if (kind !== 'let' && kind !== 'var') continue;
   exportedLets.set(p.value.name, b.id);
   const writes = v.references.filter(ref => ref.isWrite() && !isInitWrite(ref));
   if (writes.length) failures.push(`${b.id}: exported ${kind} '${v.name}' is reassigned inside its chunk (importers keep a stale copy)`);
  }
 }
}

for (const b of blocks) {
 if (b.kind === 'main') continue;
 const { sm } = analyzed.get(b.id);
 for (const ref of sm.globalScope.through) {
  if (!ref.isWrite()) continue;
  const n = ref.identifier.name;
  if (mainConsts.has(n)) failures.push(`${b.id}: write to main-module const '${n}'`);
  if (exportedLets.has(n)) failures.push(`${b.id}: write to '${n}' exported by value from ${exportedLets.get(n)}`);
 }
}

assert.deepEqual(failures, [], 'lazy-boundary binding violations:\n' + failures.join('\n'));
console.log(`PASS LAZY-BINDINGS-01: ${blocks.length} blocks, ${mainConsts.size} main consts, ${exportedLets.size} exported let/var bindings, 0 cross-boundary writes`);
