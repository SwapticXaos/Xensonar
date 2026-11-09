'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const parents=JSON.parse(read('docs/integration-ui-r2/PARENT_SOURCE_HASHES.json')),lock=JSON.parse(read('docs/patches/UI_R2_INTEGRATION_SOURCE_LOCK.json'));
test('three-way integration preserves every uncontested parent source and admits only reviewed overlaps/repairs',()=>{
 const exceptions=new Set([...lock.repairs,...lock.shared_merge_sources]);
 const names=new Set([...Object.keys(parents.ui),...Object.keys(parents.r2)]);
 assert.equal(names.size,305);
 for(const p of names){
  const current=sha(read(p)),base=parents.common[p],ui=parents.ui[p],r2=parents.r2[p];
  if(exceptions.has(p))continue;
  if(ui!==base&&r2!==base&&ui!==r2&&ui&&r2)assert.fail('unreviewed two-sided source conflict: '+p);
  const expected=ui!==base&&ui!==undefined?ui:r2;
  assert.equal(current,expected,'lost or changed parent source: '+p);
 }
 for(const p of exceptions)assert.ok(names.has(p),'exception must name a real reviewed source');
});
test('Compose V2 and T2 decorations coexist with actual Pink mode availability and original transport buttons',()=>{
 const canonical=read('src/rooms/canonical.js'),html=read('dist/XenSonar_Standalone.html');
 assert.ok(canonical.includes('function __XenComposeWiring('));
 assert.ok(canonical.includes('const fans=[-3,-2,-1,0,1,2,3]'));
 assert.ok(canonical.includes('const L=!A[E.id].ready'));
 assert.ok(canonical.includes('onClick:a,"data-xen-compose-port":"compose"'),'Compose callback remains the original callback');
 for(const id of ['xen-compose-patchbay-v2','xen-shell-geometry-t2-style','xen-shell-geometry-t2-js'])assert.equal(html.split('id="'+id+'"').length-1,1);
 // The actual rack's source file is part of the parent hash test above; also
 // prove the literal user-facing route label survives the distributed build.
 assert.ok(html.includes('Send to Pink Track (Melodic Loop)'));
 for(const p of Object.keys(parents.ui).filter(p=>p.startsWith('styles/')))assert.equal(sha(read(p)),parents.ui[p],'inherited style changed: '+p);
});
test('P1 erase from Morph still selects an erasing hard brush without altering other profiles',()=>{
 const s=read('src/app/forge/05_forge_state_and_analysis.js');const a=s.indexOf('function GDe('),b=s.indexOf('function VDe(',a);
 const c={qr:(_tool,settings)=>({...settings})};vm.createContext(c);vm.runInContext(s.slice(a,b)+';globalThis.erase=HDe;',c);
 const profiles={hardBrush:{brushSize:9,hardness:.4},stamp:{eraseMode:false}},state={activeTool:'morph',toolSettings:{},toolProfiles:profiles};
 const result=c.erase(state);assert.equal(result.activeTool,'hardBrush');assert.equal(result.toolSettings.eraseMode,true);assert.equal(result.toolSettings.brushSize,35);assert.equal(result.toolProfiles.stamp,profiles.stamp);assert.equal(profiles.hardBrush.brushSize,9);
});
