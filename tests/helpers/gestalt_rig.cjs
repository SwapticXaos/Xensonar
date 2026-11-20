'use strict';
// AIR-COHERENCE-01 rig: builds the Klanggestalt worker script exactly as src/forge/revised/02_gestalt.js does for its Worker
// (same factories, same order) and renders a captured real worker request (carrier plan, donor model, recipe) in Node.
// `gestaltSource` lets a test render the same request with the parent revision of 02_gestalt.js for a PCM before/after.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),acorn=require('../../tools/slim/node_modules/acorn');
// Function source by AST from its declaration onward (bundle files are fragments of a larger script, and the plain brace
// scanner cannot read every one of them).
const extract=(source,name)=>{const at=source.indexOf('function '+name+'(');if(at<0)throw Error('Missing production function '+name);
  return source.slice(at,acorn.parseExpressionAt(source,at,{ecmaVersion:'latest'}).end);};
const src=p=>fs.readFileSync(path.join(__dirname,'..','..',p),'utf8');
function engine(gestaltSource=src('src/forge/revised/02_gestalt.js')){
  const f=(file,name)=>extract(file.startsWith('src/')?src(file):file,name);
  const code=[f('src/forge/dsp/01_material_tools.js','__forgeMaterialToolsFactory'),f('src/forge/dsp/02_gestalt_tools.js','__forgeGestaltToolsFactory'),
    'const __F35641Field=('+f('src/forge/dsp/04_donor_field.js','__f347DonorFieldFactory')+')();',
    f('src/01_app_runtime.js','__f35636ArticulationFactory'),'const __F35636Articulation=__f35636ArticulationFactory();',
    'const __F356Material=('+f('src/forge/revised/01_material.js','__f347MaterialFactory')+')();',
    'const __F356Gestalt=('+extract(gestaltSource,'__f347GestaltFactory')+')();','return __F356Gestalt;'].join('\n');
  return new Function('setTimeout',code)((fn)=>setImmediate(fn));
}
// Typed arrays travel as {__t:'Float32Array',b64:...} inside gzip JSON.
const revive=v=>Array.isArray(v)?v.map(revive):v&&typeof v==='object'?(v.__t?new globalThis[v.__t](new Uint8Array(Buffer.from(v.b64,'base64')).buffer):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]))):v;
const load=file=>revive(JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString()));
async function render(job,gestalt=engine()){return gestalt.render(job.plan,job.model,job.sampleRate,job.durationSec,{workbench:job.config});}
module.exports={engine,load,render,src};
