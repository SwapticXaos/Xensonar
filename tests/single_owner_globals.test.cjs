'use strict';
// SINGLE-OWNER-GLOBALS-01: AST guard ensuring every window.__* / globalThis.__*
// global written in the app has exactly one owning source file.
// The only allowed two-file pairs are documented lazy-proxy bootstraps in
// src/startup/00_room_and_function_dispatch.js whose real chunk replaces the proxy.
const test = require('node:test');
const assert = require('node:assert/strict');
const acorn = require('../tools/slim/node_modules/acorn');
const walk = require('../tools/slim/node_modules/acorn-walk');
const { load } = require('../tools/slim/page.cjs');

const LAZY_PROXY_ALLOWLIST = new Map([
 ['__XenSoundRecipeExportUI', new Set(['src/startup/00_room_and_function_dispatch.js', 'src/post-oct/031-xen-sound-recipe-export-ui.js'])],
 ['__xenOpenForgeWorkflow', new Set(['src/startup/00_room_and_function_dispatch.js', 'src/post-oct/014-xen-spectral-workflow-script.js'])]
]);

test('every window.__* / globalThis.__* global has a single owning source file', () => {
 const { out, blocks, fileAt } = load();
 const writers = new Map();

 for (const b of blocks) {
  if (b.kind === 'other') continue;
  const raw = out.slice(b.start, b.end);
  const src = b.kind === 'island' ? '(' + raw + '\n)' : raw;
  const offset = b.kind === 'island' ? b.start - 1 : b.start;
  const ast = acorn.parse(src, {
   ecmaVersion: 'latest',
   sourceType: b.kind === 'module' ? 'module' : 'script',
   allowReturnOutsideFunction: true,
   allowAwaitOutsideFunction: true
  });
  walk.simple(ast, {
   AssignmentExpression(node) {
    const l = node.left;
    if (l.type !== 'MemberExpression' || l.computed) return;
    if (l.object.type !== 'Identifier' || (l.object.name !== 'window' && l.object.name !== 'globalThis')) return;
    if (l.property.type !== 'Identifier' || !l.property.name.startsWith('__')) return;
    const name = l.property.name;
    const file = fileAt(offset + node.start)?.file || '<template>';
    if (!writers.has(name)) writers.set(name, new Set());
    writers.get(name).add(file);
   }
  });
 }

 const violations = [];
 for (const [name, files] of [...writers.entries()].sort()) {
  if (files.size <= 1) continue;
  const allowed = LAZY_PROXY_ALLOWLIST.get(name);
  if (allowed && files.size === allowed.size && [...files].every(f => allowed.has(f))) continue;
  violations.push(`${name}: ${[...files].sort().join(', ')}`);
 }
 assert.deepEqual(violations, [], 'Multi-writer window/globalThis.__* globals:\n' + violations.join('\n'));
 assert.ok(writers.size >= 70, `expected >= 70 tracked globals, got ${writers.size}`);
});
