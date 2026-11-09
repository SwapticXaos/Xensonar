const fs=require('node:fs'), path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'), sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const expected=require('../../docs/merge/UVO1_UNCHANGED_AUDIO_HASHES.json');
for(const [p,d] of Object.entries(expected)){
 if(p==='src/forge_and_melodic/04_render_cache_and_stems.js'){
   const current=fs.readFileSync(path.join(root,p),'utf8');
   const original=current.replace('if(externalHistory){externalHistory.capture?.();return}const G=l.current.get(t)??[];G.push(lh(I))','if(externalHistory)return;const G=l.current.get(t)??[];G.push(lh(I))');
   assert.notEqual(original,current,'MWCM integration patch missing');
   assert.equal(crypto.createHash('sha256').update(original).digest('hex'),d,'MWCM changes exceed reviewed Undo capture');
 }else assert.equal(sha(p),d,'UVO ownership file changed: '+p);
}
const eq=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-core.js'),'utf8');
assert(eq.includes('function rasterPlan('),'P1.5 raster planner required');
assert(eq.includes('sinHalf:Math.sin(w)/2'),'P1.5 dynamic Q-geometry required');
assert(fs.readFileSync(path.join(root,'src/forge_and_melodic/04_render_cache_and_stems.js'),'utf8').includes('externalHistory.capture?.()'), 'MWCM external Undo history missing');
assert(eq.includes('cancelled'),'P1.4 cooperative worker cancellation required');
const html=fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'),'utf8');
for(const token of ['const __XenEQ','xen-eq-profile','Raster EQ fixed frequency bands'])assert(html.includes(token),'EQ integration missing '+token);
console.log('PASS unchanged UVO-1 audio ownership and merged P1.5 EQ contract');
