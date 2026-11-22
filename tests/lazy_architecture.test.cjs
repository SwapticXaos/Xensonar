'use strict';
// Contract & runtime verification for XenSonar's unified offline lazy-loading architecture
// (rooms, chunks, function islands, declarative data-xen-deps, lazy proxies, DOM heap release, and syntax/graph checks).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('../tools/slim/node_modules/acorn');

const ROOT = path.resolve(__dirname, '..');

// 1. Runtime test of src/startup/00_room_and_function_dispatch.js in an isolated DOM mock
{
 const src = fs.readFileSync(path.join(ROOT, 'src/startup/00_room_and_function_dispatch.js'), 'utf8');
 const elements = new Map();
 const mkEl = (id, type, code, deps = '') => {
  const el = {
   id,
   type,
   textContent: code,
   getAttribute(name) { return name === 'data-xen-deps' ? (deps || null) : null; }
  };
  elements.set(id, el);
  return el;
 };
 mkEl('xen-chunk-base', 'application/x-xensonar-chunk', 'globalThis.__calls.push("base"); ({ baseVal: 41 })');
 mkEl('xen-chunk-mid', 'application/x-xensonar-chunk', 'globalThis.__calls.push("mid"); ({ getVal(){ return __xenLoadChunk("base").baseVal + 1; } })', 'base');
 mkEl('xen-room-lab', 'application/x-xensonar-room', 'globalThis.__calls.push("lab"); ({ answer: __xenLoadChunk("mid").getVal() })', 'mid');
 mkEl('xen-function-demo', 'application/x-xensonar-function', '() => { globalThis.__calls.push("fn"); return 99; }');
 mkEl('xen-chunk-bad', 'application/x-xensonar-chunk', 'throw new Error("boom");');
 mkEl('xen-chunk-cycA', 'application/x-xensonar-chunk', '({})', 'cycB');
 mkEl('xen-chunk-cycB', 'application/x-xensonar-chunk', '({})', 'cycA');

 const doc = {
  getElementById: id => elements.get(id) || null,
  querySelectorAll: sel => {
   const m = sel.match(/script\[type="([^"]+)"\]/);
   if (!m) return [];
   return [...elements.values()].filter(e => e.type === m[1]);
  }
 };
 const sandbox = {
  window: {},
  document: doc,
  localStorage: {},
  performance: { now: () => 10 },
  __calls: [],
  Object, Set, Map, Proxy, Reflect, Error, RegExp, Math, Number, String, Array, Date
 };
 sandbox.globalThis = sandbox;
 sandbox.window = sandbox;
 vm.createContext(sandbox);
 vm.runInContext(src + '\nglobalThis.__testLazyObj = __xenLazyObject;', sandbox);

 // Initially cold
 assert.equal(sandbox.__XenRoomChunks.status().lab, false);
 assert.equal(sandbox.__XenLazyLoader.isLoaded('chunk', 'base'), false);
 assert.equal(sandbox.__XenLazyLoader.isLoaded('chunk', 'mid'), false);

 // Lazy proxy stays cold until first property access
 const proxy = sandbox.__testLazyObj('mid');
 assert.equal(sandbox.__XenLazyLoader.isLoaded('chunk', 'mid'), false, 'creating lazy proxy must not compile chunk');
 assert.equal(proxy.getVal(), 42);
 assert.deepEqual(sandbox.__calls, ['base', 'mid'], 'transitive dependency loads once before target');
 assert.equal(elements.get('xen-chunk-base').textContent, '', 'DOM textContent cleared after compile');
 assert.equal(elements.get('xen-chunk-mid').textContent, '', 'DOM textContent cleared after compile');

 // Room load reuses already-loaded deps and compiles room once
 assert.equal(sandbox.__XenRoomChunks.load('lab').answer, 42);
 assert.equal(sandbox.__XenRoomChunks.load('lab').answer, 42);
 assert.deepEqual(sandbox.__calls, ['base', 'mid', 'lab'], 'idempotent load: each payload compiles once');
 assert.equal(sandbox.__XenRoomChunks.status().lab, true);

 // Function island
 assert.equal(sandbox.__XenLazyLoader.loadFunction('demo')(), 99);
 assert.deepEqual(Array.from(sandbox.__XenDeferredFunctionStatus()), ['demo']);

 // Failure preserves textContent for diagnostics/retry
 assert.throws(() => sandbox.__XenLazyLoader.loadChunk('bad'), /boom/);
 assert.equal(elements.get('xen-chunk-bad').textContent, 'throw new Error("boom");');
 assert.equal(sandbox.__XenLazyLoader.isLoaded('chunk', 'bad'), false);

 // Cycle detection
 assert.throws(() => sandbox.__XenLazyLoader.loadChunk('cycA'), /Cyclic deferred XenSonar dependency/);

 // Introspection report
 const rep = sandbox.__XenLazyLoader.report();
 assert(rep.totals.count >= 6);
 assert(rep.totals.loadedCount === 4);
 assert(rep.totals.totalBytes > 0);
 assert.equal(rep.rooms.lab.loaded, true);
 assert.deepEqual(Array.from(rep.rooms.lab.deps), ['mid']);
}

// 2. Structural & AST validation of all lazy script blocks in the real page
{
 const { out, blocks } = require('../tools/slim/page.cjs').load();
 const tpl = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8');
 const lazyBlocks = blocks.filter(b => b.kind === 'room' || b.kind === 'chunk' || b.kind === 'island');
 assert(lazyBlocks.length >= 16, 'expected at least 16 lazy blocks, found ' + lazyBlocks.length);

 const prefixOf = { room: 'xen-room-', chunk: 'xen-chunk-', island: 'xen-function-' };
 const knownIds = new Set();
 const depsByTag = new Map();

 for (const b of lazyBlocks) {
  assert(b.id.startsWith(prefixOf[b.kind]), `lazy ${b.kind} id must start with ${prefixOf[b.kind]}: ${b.id}`);
  const key = b.id.slice(prefixOf[b.kind].length);
  const tag = (b.kind === 'island' ? 'fn' : b.kind) + ':' + key;
  assert(!knownIds.has(tag), 'duplicate lazy id: ' + tag);
  knownIds.add(tag);

  // Parse body with Acorn
  const src = b.kind === 'island' ? '(' + out.slice(b.start, b.end) + '\n)' : out.slice(b.start, b.end);
  acorn.parse(src, {
   ecmaVersion: 'latest',
   sourceType: 'script',
   allowReturnOutsideFunction: b.kind !== 'island',
   allowAwaitOutsideFunction: b.kind !== 'island'
  });

  // Check data-xen-deps on the template tag
  const tagRe = new RegExp('<script\\b[^>]*id="' + b.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>');
  const m = tpl.match(tagRe);
  assert(m, 'lazy script tag missing in template: ' + b.id);
  const dm = m[0].match(/data-xen-deps="([^"]*)"/);
  const deps = dm ? dm[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  depsByTag.set(tag, deps.map(d => d.includes(':') ? d : 'chunk:' + d));
 }

 // Validate all dependency targets exist & no cycles
 for (const [tag, deps] of depsByTag) {
  for (const dep of deps) {
   assert(knownIds.has(dep), `lazy dependency "${dep}" referenced by "${tag}" does not exist`);
  }
 }
 const visiting = new Set(), visited = new Set();
 const dfs = tag => {
  if (visited.has(tag)) return;
  assert(!visiting.has(tag), 'cyclic lazy dependency involving ' + tag);
  visiting.add(tag);
  for (const dep of depsByTag.get(tag) || []) dfs(dep);
  visiting.delete(tag);
  visited.add(tag);
 };
 for (const tag of depsByTag.keys()) dfs(tag);

 // 3. Static AST boot-safety guard: no top-level boot statement (including IIFEs) in eager
 // scripts may touch a __xenLazyObject proxy or eagerly call __xenLoadChunk during module boot.
 const eagerBlocks = blocks.filter(b => b.kind === 'module' || b.kind === 'classic');
 const lazyProxies = new Map(); // name -> chunkName
 const eagerViolations = [];

 for (const b of eagerBlocks) {
  const src = out.slice(b.start, b.end);
  const ast = acorn.parse(src, {
   ecmaVersion: 'latest',
   sourceType: b.kind === 'module' ? 'module' : 'script',
   allowReturnOutsideFunction: false
  });
  for (const stmt of ast.body) {
   if (stmt.type !== 'VariableDeclaration') continue;
   for (const d of stmt.declarations) {
    if (
     d.id && d.id.type === 'Identifier' &&
     d.init && d.init.type === 'CallExpression' &&
     d.init.callee && d.init.callee.type === 'Identifier' &&
     d.init.callee.name === '__xenLazyObject' &&
     d.init.arguments[0] && d.init.arguments[0].type === 'Literal'
    ) {
     lazyProxies.set(d.id.name, String(d.init.arguments[0].value));
    }
   }
  }
 }
 assert(lazyProxies.size >= 20, 'expected >=20 lazy proxies declared in eager bundle, found ' + lazyProxies.size);

 const walkTopLevel = (node, blockId) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) walkTopLevel(x, blockId); return; }
  // Skip non-IIFE function/method bodies — they do not execute synchronously during module boot.
  if (
   node.type === 'FunctionDeclaration' ||
   node.type === 'FunctionExpression' ||
   node.type === 'ArrowFunctionExpression' ||
   node.type === 'ClassBody'
  ) return;
  // Skip the proxy declaration initializer itself (`const X = __xenLazyObject(...)`).
  if (
   node.type === 'VariableDeclarator' &&
   node.id && node.id.type === 'Identifier' && lazyProxies.has(node.id.name) &&
   node.init && node.init.type === 'CallExpression' &&
   node.init.callee && node.init.callee.type === 'Identifier' &&
   node.init.callee.name === '__xenLazyObject'
  ) return;
  // Unwrap IIFEs: `(function(){ ... })()` or `(() => { ... })()` execute synchronously at boot!
  if (
   node.type === 'CallExpression' &&
   (node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression')
  ) {
   walkTopLevel(node.arguments, blockId);
   walkTopLevel(node.callee.body, blockId);
   return;
  }
  // Check eager calls to __xenLoadChunk / __xenLoadDeferred('chunk', ...)
  if (
   node.type === 'CallExpression' &&
   node.callee && node.callee.type === 'Identifier' &&
   (node.callee.name === '__xenLoadChunk' || node.callee.name === '__xenLoadDeferred')
  ) {
   eagerViolations.push(`${blockId}: eager top-level ${node.callee.name}()`);
  }
  // Check any property access / call / spread on a lazy proxy identifier at top-level boot
  if (
   node.type === 'MemberExpression' &&
   node.object && node.object.type === 'Identifier' &&
   lazyProxies.has(node.object.name)
  ) {
   eagerViolations.push(`${blockId}: eager top-level access to lazy proxy ${node.object.name} (chunk "${lazyProxies.get(node.object.name)}")`);
  }
  if (
   node.type === 'CallExpression' &&
   node.callee && node.callee.type === 'Identifier' &&
   lazyProxies.has(node.callee.name)
  ) {
   eagerViolations.push(`${blockId}: eager top-level call to lazy proxy ${node.callee.name} (chunk "${lazyProxies.get(node.callee.name)}")`);
  }
  if (
   node.type === 'SpreadElement' &&
   node.argument && node.argument.type === 'Identifier' &&
   lazyProxies.has(node.argument.name)
  ) {
   eagerViolations.push(`${blockId}: eager top-level spread of lazy proxy ${node.argument.name} (chunk "${lazyProxies.get(node.argument.name)}")`);
  }
  for (const k of Object.keys(node)) {
   if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
   const v = node[k];
   if (v && typeof v === 'object') walkTopLevel(v, blockId);
  }
 };

 for (const b of eagerBlocks) {
  const src = out.slice(b.start, b.end);
  const ast = acorn.parse(src, {
   ecmaVersion: 'latest',
   sourceType: b.kind === 'module' ? 'module' : 'script',
   allowReturnOutsideFunction: false
  });
  walkTopLevel(ast.body, b.id || b.kind);
 }
 assert.deepEqual(eagerViolations, [], 'Eager top-level boot statements must not wake lazy proxies/chunks:\n' + eagerViolations.join('\n'));

 console.log(`PASS lazy_architecture: ${lazyBlocks.length} lazy blocks + ${lazyProxies.size} lazy proxies verified (syntax, IDs, deps DAG, zero eager boot wakeups, runtime loader)`);
}
