'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const {read}=require('./p37_test_tools.cjs');
const hashes=JSON.parse(read('tests/fixtures/stamp_raster_hashes_p36.json'));
const ctx={Float32Array,Uint8Array,Math,Object,Array,Set,Map,atob,Blob,Response,DecompressionStream};
vm.runInNewContext(read('src/forge/stamps/01_atlas_2026_bridge.js'),ctx);
(async()=>{
 const api=vm.runInNewContext('__XenStampAtlas2026',ctx),presets=await api.loadVariants([]);
 assert.equal(presets.length,8);assert.equal(api.soundFor,undefined);
 for(const p of presets)assert.equal(crypto.createHash('sha256').update(p.stamp.data).update(p.stamp.grainData).digest('hex'),hashes[p.id],p.id);
 const lab=read('src/rooms/lab.js'),featured=lab.match(/const __forgeFeaturedStampIds=\[([\s\S]*?)\];/)[1],ids=[...featured.matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.equal(ids.length,16);assert.equal(new Set(ids).size,16);for(const id of api.variantIds)assert(ids.includes(id));
 assert(lab.includes('[...Wb,...atlas,...__forgeRevisedStampPresetsP31]'));
 assert(!read('src/forge/stamps/02_atlas_audition.js').includes('renderSketch'));
 assert(!read('src/forge/stamps/01_atlas_2026_bridge.js').includes('decodeProfile'));
 console.log('P37 DATA PASS: all eight original amplitude/grain hashes, all 16 curated IDs, All/Custom retained, redundant profiles/codecs/sketch renderer removed');
})().catch(e=>{console.error(e);process.exitCode=1});
