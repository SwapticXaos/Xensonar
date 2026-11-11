// FORGE-ENTRY-SETTLE-01: static regression guards on the built index.html.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
test('automatic Forge preview waits for an entry settle window',()=>{
  assert.ok(html.includes('const __FORGE_ENTRY_SETTLE_MS=2500;'));
  assert.ok(html.includes('s6e(__forgeVisible)'));
  assert.ok(/__settle>0\}/.test(html));
});
test('lab chunk is entered after a paint, not synchronously in the click',()=>{
  assert.ok(html.includes('z4=P.lazy(()=>new Promise(__r=>window.requestAnimationFrame(()=>window.setTimeout(__r,80)))'));
});
test('Clear Workbench keeps the stamp, Reset Main Path does not',()=>{
  assert.ok(html.includes('stampData:keepStamp?e.stampData:null'));
  assert.ok(html.includes('e(n=>reset?RDe(n):wDe(n,!0))')||html.includes('e(n=>reset?RDe(n):wDe(n,true))'));
});
test('listening modes carry the new names; stable ids are unchanged',()=>{
  for(const n of ["label:'Gahjer'","label:'Holgriot'","label:'Ingor'"])assert.ok(html.includes(n),n);
  assert.ok(!/label:'(Gaia|Hildegard|Isolde)'/.test(html));
  for(const id of ["gaia-terrain-carrier","hildegard-mirror-carrier","isolde-spiral-carrier"])assert.ok(html.includes(id),id);
});
test('ML-NOTECLIP-01: copy/paste reuses the pending-group drag',()=>{
  for(const k of ['const __mlNoteClip=','data-ml-noteclip','pendingGroup=group','__mlGK(w)!==g.pitchAnchorTrackId'])assert.ok(html.includes(k),k);
});
