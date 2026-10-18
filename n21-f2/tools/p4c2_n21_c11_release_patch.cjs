'use strict';
// Reproducible, operation-2-only extension of the embedded N20 C11 binary.
// No render, envelope, filter, tuning or oscillator function is edited.
// Usage: node tools/p4c2_n21_c11_release_patch.cjs [--write]
// Development tool only; requires wabt@1.0.39 (not loaded by the HTML).
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const bytes=fs.readFileSync('tests/fixtures/p4c2-n21/c11-n20.wasm');
 assert.equal(hash(bytes),'ff1731e6ada85cc791ef1462f4fcfb122b6c357bce7ac5d9b3ea0995ad0477ce');
 const w=await require('wabt')(),m=w.readWasm(bytes,{readDebugNames:true});m.generateNames();m.applyNames();
 let wat=m.toText({foldExprs:false,inlineExport:false});
 for(const [func,offsets] of [['f39',[8541964,8543164]],['xen_wasm_control_entrophon',[4334332,4465820]]]){
  const a=wat.indexOf('  (func $'+func+' '),b=wat.indexOf('\n  (func ',a+10);assert(a>=0&&b>a);
  let body=wat.slice(a,b);
  for(const offset of offsets){
   const re=new RegExp('i32.const '+offset+'(\\s+)i32.add(\\s+)i32.load');assert(re.test(body));
   body=body.replace(re,`i32.const ${offset}$1i32.add$2i32.load\n                local.get $p2\n                i32.const 2\n                i32.eq\n                i32.or`);
  }
  if(func==='xen_wasm_control_entrophon')for(const local of ['l20','l12']){
   const re=new RegExp('local.get \\$'+local+'(\\s+)i32.eqz(\\s+)br_if \\$B18');assert(re.test(body));
   body=body.replace(re,`local.get $${local}\n              local.get $p2\n              i32.const 2\n              i32.eq\n              i32.or$1i32.eqz$2br_if $B18`);
  }
  wat=wat.slice(0,a)+body+wat.slice(b);
 }
 const patched=w.parseWat('n21.wat',wat);patched.resolveNames();patched.validate();
 const out=Buffer.from(patched.toBinary({write_debug_names:false}).buffer);
 const asset='src/audio/entrophon/01_wasm_asset.js',source=fs.readFileSync(asset,'utf8');
 const decode=s=>Buffer.from(new Function(s+';return GMe();')());
 if(process.argv.includes('--write'))fs.writeFileSync(asset,source.replace(/(const jMe=)["'][^"']*["']/,(_,prefix)=>prefix+JSON.stringify(out.toString('base64'))));
 else assert.deepEqual(out,decode(source),'embedded binary differs from the reproducible release-only patch');
 console.log('PASS N21 C11 release patch reproduced',hash(out));
})().catch(e=>{console.error(e);process.exitCode=1});
