'use strict';
// VARIANTE-ROOM-01: the committed room chunk is exactly what tools/port_variante.cjs generates from tools/variante/ (no hand edits in the generated file),
// it is a valid expression, evaluates against a React stand-in and exports the room. The chunk id is wired in manifest, template and loader.
const {test}=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('generated chunk is current',()=>{execFileSync(process.execPath,[path.join(root,'tools/port_variante.cjs'),'--check'],{stdio:'pipe'})});
test('chunk evaluates against a React stand-in and exports the room; nothing runs at evaluation',()=>{
 const calls=[];const P=new Proxy({},{get:(_,k)=>(...a)=>{calls.push(String(k));return {}}});
 const out=vm.runInNewContext(read('src/post-oct/035-xen-room-xenpolar.js'),{P,console,window:{},document:{},navigator:{},requestAnimationFrame:()=>0,__xenMultitrackBridge:{current:null}});
 assert.equal(typeof out.XenpolarRoom,'function');assert.deepEqual(calls.filter(c=>c!=='memo'),[],'only React.memo is touched at evaluation (cold chunk)');
});
test('wiring: manifest section, template script element, loader kind, lazy room for XENPOLAR',()=>{
 assert.ok(read('source-manifest.json').includes('"js-020d-xen-room-xenpolar"'));
 assert.ok(read('src/index.template.html').includes('id="xen-room-xenpolar"'));
 assert.ok(read('src/startup/00_room_and_function_dispatch.js').includes('kind!=="xenpolar"'));
 assert.ok(/e==="XENPOLAR"&&u\.jsx\(P\.Suspense/.test(read('src/myzel/01_effect_mapping.js')),'XENPOLAR renders the lazy room, not the archive placeholder');
});
