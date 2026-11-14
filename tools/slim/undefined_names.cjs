'use strict';
/* Identifiers that are used but defined nowhere (analysis only): catches a declaration removed while a caller remains.
 * Free names of every script block are checked against all top-level names of all blocks (module + classic scripts share the
 * page), names assigned on window/globalThis, and the browser's own globals (taken from a real Chromium window).
 *   node tools/slim/undefined_names.cjs        exit code 1 if a name outside tools/slim/undefined_baseline.txt is undefined
 *   --write-baseline (record the current set), --refresh-globals (re-read the browser's globals) */
const acorn=require('acorn'),es=require('eslint-scope');const {out,blocks,fileAt}=require('./page.cjs').load();
const {execFileSync}=require('child_process');
/* browser globals: tools/slim/browser_globals.json (Chromium window, regenerate with --refresh-globals) */
const GLOBALS=require('path').join(__dirname,'browser_globals.json');
if(process.argv.includes('--refresh-globals'))require('fs').writeFileSync(GLOBALS,execFileSync(process.execPath,['-e',`const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();const g=await p.evaluate(()=>{const s=new Set();let o=window;while(o){for(const k of Object.getOwnPropertyNames(o))s.add(k);o=Object.getPrototypeOf(o)}return [...s].sort()});console.log(JSON.stringify(g));await b.close()})()`],{encoding:'utf8',maxBuffer:1<<26}));
const browserGlobals=new Set(JSON.parse(require('fs').readFileSync(GLOBALS,'utf8')));
/* names that were already free before the slimming work: guarded at runtime (typeof/try) or provided by room/function payloads */
const KNOWN=require('path').join(__dirname,'undefined_baseline.txt');
const known=new Set(require('fs').existsSync(KNOWN)?require('fs').readFileSync(KNOWN,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
for(const k of ['currentFrame','sampleRate','currentTime','registerProcessor','AudioWorkletProcessor','globalThis','arguments','undefined','eval','Atomics','SharedArrayBuffer'])browserGlobals.add(k);
const defined=new Set(),uses=[];
for(const b of blocks){if(b.kind==='other')continue;let src=out.slice(b.start,b.end),shift=0;if(b.kind==='island'){src='('+src+'\n)';shift=1}
 const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:b.kind==='module'?'module':'script',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true,ranges:true});
 const sm=es.analyze(ast,{ecmaVersion:2022,sourceType:b.kind==='module'?'module':'script',ignoreEval:true});
 const top=b.kind==='module'?sm.globalScope.childScopes[0]:sm.globalScope;
 if(b.kind==='classic'||b.kind==='module')for(const v of (b.kind==='module'?top:sm.globalScope).variables)defined.add(v.name);
 for(const m of src.matchAll(/(?:window|globalThis|self)\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\?\?=)/g))defined.add(m[1]);
 for(const r of sm.globalScope.through){const n=r.identifier.name;uses.push({n,b,pos:b.start+r.identifier.range[0]-shift,typeofGuard:false,node:r.identifier,src})}
}
const bad=new Map();
for(const u of uses){if(defined.has(u.n)||browserGlobals.has(u.n))continue;
 // `typeof X` checks are guards, not uses
 const before=u.src.slice(Math.max(0,u.node.range[0]-7),u.node.range[0]);if(/typeof\s*$/.test(before))continue;
 const k=u.n+'  @ '+(fileAt(u.pos).file||'(template)');bad.set(k,(bad.get(k)||0)+1)}
if(process.argv.includes('--write-baseline')){require('fs').writeFileSync(KNOWN,[...new Set([...bad.keys()].map(k=>k.split('  @')[0]))].sort().join('\n')+'\n');console.log('baseline written');process.exit(0)}
for(const k of [...bad.keys()])if(known.has(k.split('  @')[0]))bad.delete(k);
if(!bad.size){console.log('OK: no undefined name outside the known baseline ('+known.size+' names)');process.exit(0)}
console.log('UNDEFINED names (used but defined nowhere):');for(const [k,c] of [...bad].sort())console.log('  ',k,c>1?'×'+c:'');
process.exit(1);
