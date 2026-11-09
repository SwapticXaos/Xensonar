import fs from 'node:fs';
import ts from './typescript-runtime.mjs';
import assert from 'node:assert/strict';
const root='src/features/xensonar/rootFollow/';
function inspect(name) {
  const code=fs.readFileSync(root+name+'.ts','utf8');
  const ast=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true);
  const imports=[], calls=[];let awaits=0;
  function visit(node) {
    if(ts.isImportDeclaration(node)) imports.push(node.moduleSpecifier.text);
    if(ts.isCallExpression(node)) calls.push(node.expression.getText(ast));
    if(ts.isAwaitExpression(node)) awaits++;
    ts.forEachChild(node,visit);
  }
  visit(ast);return {imports,calls,awaits};
}
const planner=inspect('rootFollowSampleElasticPlan');
assert.ok(!planner.calls.some(c=>/createBufferSource|createGain|\.start$|\.stop$|loadMelodic/.test(c)), 'planner must be independent of WebAudio allocation and loading');
const resolver=inspect('rootFollowDirectNoteResolve');
assert.equal(resolver.awaits,0,'direct instrument resolution must not await I/O');
assert.ok(!resolver.imports.some(i=>i.includes('melodicSampleLibrary')),'asset loading belongs to preparation');
const sample=inspect('rootFollowSampleVoiceRuntime');
assert.ok(sample.imports.some(i=>i.endsWith('rootFollowSampleElasticPlan')));
assert.ok(!sample.imports.some(i=>i.includes('melodicSampleLibrary')));
const compiler=inspect('rootFollowCarrierCompiler');
assert.equal(compiler.awaits,0);
assert.ok(!compiler.calls.some(c=>/createOscillator|createGain|\.start$/.test(c)));
console.log('[root-follow-infrastructure] PASS: AST dependency boundaries; no browser/audio-quality claim');
