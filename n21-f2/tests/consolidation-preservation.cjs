'use strict';
const current=require('./history-sharing-compat.cjs');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript'),base=require('../docs/consolidation/baseline.json'),manifest=require('../source-manifest.json');
const reviewed=require('../docs/consolidation/source-anchors.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const [file,expected] of Object.entries(base.hashes)){
 const data=fs.readFileSync(file),contract=base.contracts[file];
 if(current.anchors[file]){assert.equal(sha(data),current.anchors[file],file);continue;}
 if(!contract){assert.equal(sha(data),expected,'unchanged DSP/UI/source: '+file);continue;}
 const ast=ts.createSourceFile(file,data.toString(),99,true);assert.equal(ast.parseDiagnostics.length,0,file);
 const printer=ts.createPrinter({removeComments:true});const outside=ast.statements.filter(n=>!(n.name&&contract.functions.includes(n.name.text))&&!(ts.isVariableStatement(n)&&n.declarationList.declarations.every(d=>contract.functions.includes(d.name?.text)))).map(n=>printer.printNode(ts.EmitHint.Unspecified,n,ast)).join('\n');
 assert.equal(sha(outside),contract.outsideSha256,'code outside reviewed integration functions: '+file);
}
assert.deepEqual(manifest.files.filter(f=>!base.hashes[f]),['src/handoff/00_chat_feature_addons.js','src/storage/05_project_snapshots.js','src/storage/06_history_budget.js',...current.additions.filter(f=>f!=='src/handoff/00_chat_feature_addons.js')]);
for(const [file,hash] of Object.entries(reviewed))assert.equal(sha(fs.readFileSync(file)),current.anchors[file]??hash,'reviewed consolidation source: '+file);
console.log('PASS only archive codec adapters, project loader and history orchestration changed; all other source, DSP, UI and styles preserved');
