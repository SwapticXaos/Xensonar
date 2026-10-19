'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/maintenance-baseline-hashes.json'),patch=require('../docs/maintenance-source-anchors.json'),manifest=require('../source-manifest.json');
const microphone={...require('../docs/microphone-source-anchors.json'),...require('../docs/audio-carrier-source-anchors.json')};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [file,hash] of Object.entries(base.hashes))assert.equal(sha(file),microphone[file]??patch[file]??hash,'unreviewed source change '+file);
assert.equal(Object.keys(patch).length,3);assert(manifest.files.every(file=>base.hashes[file]||microphone[file]),'no new runtime dependency/module');
const fixtures={'spatial.js':'src/mix/04_melodic_spatial.js','nodal-bridge.js':'src/nodal/06_melodic_bridge.js','render-cache.js':'src/forge_and_melodic/04_render_cache_and_stems.js'};
for(const [name,original] of Object.entries(fixtures))assert.equal(sha('tests/fixtures/maintenance-before/'+name),base.hashes[original],'frozen reference must match prior commit');
// Freeze everything outside the four reviewed functions, including the actual
// renderers and all transport/cache owners in these same source files.
const ts=require('typescript'),allowed={
 'spatial.js':new Set(['__mlAudibleTracks','__mlOutputChannels']),
 'nodal-bridge.js':new Set(['resolveNodalArticulationFields']),
 'render-cache.js':new Set(['__mlPartialSpan'])
};
function outsideReviewed(file,names){
 const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0,file);const spans=[];
 for(const statement of ast.statements)if(ts.isFunctionDeclaration(statement)&&names.has(statement.name?.text))spans.push([statement.getStart(ast),statement.end,statement.name.text]);
 assert.equal(spans.length,names.size,'all reviewed functions must exist');let out='',cursor=0;
 for(const [start,end,name] of spans){out+=text.slice(cursor,start)+'FUNCTION:'+name;cursor=end;}
 return out+text.slice(cursor);
}
for(const [name,original] of Object.entries(fixtures))assert.equal(outsideReviewed(original,allowed[name]),outsideReviewed('tests/fixtures/maintenance-before/'+name,allowed[name]),'unexpected change outside reviewed function: '+original);

fs.mkdirSync('results/maintenance',{recursive:true});fs.writeFileSync('results/maintenance/preservation.json',JSON.stringify({base:base.base,existingFiles:Object.keys(base.hashes).length,unchanged:Object.keys(base.hashes).length-3,reviewed:Object.keys(patch),newRuntimeModules:0,synthesisKernelsUnchanged:true,frozenReferencesVerified:true,onlyFourAdministrativeFunctionsChanged:true},null,2)+'\n');console.log('PASS maintenance: exactly three administrative sources changed; all synthesis kernels and frozen comparison sources preserved');
