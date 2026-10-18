'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');

// A kept-mounted drawing must not request frames while its room is hidden.
{
 const src=load('src/forge/editor/01_display_and_canvas.js');
 const from=src.indexOf('function t4e('),to=src.indexOf('// Horizontal viewport',from);
 assert(from>=0&&to>from,'editor overlay function must exist');
 const code=src.slice(from,to);
 for(const visible of [false,true]) {
  let frames=0,cancelled=0;
  const effects=[];
  const P={useContext:()=>visible,useRef:x=>({current:x}),useEffect:(fn)=>{effects.push(fn);}};
  const context={P,__ForgeWorkspaceVisibility:{},requestAnimationFrame:()=>++frames,cancelAnimationFrame:()=>++cancelled};
  vm.createContext(context);vm.runInContext(code,context);
  context.t4e({mainCanvasRef:{current:{width:100}},spectralWidth:100,viewPort:{zoomX:1,offsetX:0},setViewPort:()=>{},isPlaying:false,playheadPosition:0,renderVersion:0,renderMain:()=>{},renderOverlay:()=>{}});
  const cleanups=effects.map(fn=>fn()).filter(x=>typeof x==='function');
  assert.equal(frames,visible?1:0,`overlay must ${visible?'run':'sleep'} when visibility=${visible}`);
  for(const cleanup of cleanups)cleanup();
  assert.equal(cancelled,visible?1:0);
 }
}

// View-owned offline analysis may be forgotten without losing the imported source.
{
 const src=load('src/forge/analysis/02_analysis_cache.js');
 const context={DOMException};vm.createContext(context);vm.runInContext(src,context);
 let release;
 const cache=context.__createF353AnalysisCache({keyForSource:x=>x.id,prepareSource:()=>new Promise(resolve=>{release=resolve}),sizeOfValue:()=>32});
 const original={id:'source-1',samples:new Float32Array([.25,.5])};
 const pending=cache.prepare(original,()=>false);
 assert.equal(typeof cache.clear,'function','analysis cache needs room-exit release');
 cache.clear();
 release({measured:true});
 pending.then(()=>{assert.equal(cache.diagnostics().entries,0,'late analysis must not re-populate after room exit');assert.equal(cache.diagnostics().bytes,0);assert.equal(original.samples[0],.25);}).catch(e=>{process.nextTick(()=>{throw e});});
}

// Offline preview / rAF depend on actual visibility, not merely mounting.
{
 const transport=load('src/forge/editor/07_composition_and_preview_ui.js');
 assert.match(transport,/const __forgeVisible\s*=\s*P\.useContext\(__ForgeWorkspaceVisibility\)/);
 assert.match(transport,/if\s*\(t === "forge3" && !__forgeVisible\)/,'auto-preview cannot schedule while hidden');
 assert.match(transport,/discardRoomPreview:__f449DropPrepared/,'pre-rendered preview entries need explicit disposal');
 assert.match(transport,/I\.current\.clear\(\);E\.current\.clear\(\)/,'preview results and coalesced jobs must not survive room exit');
 const lifecycle=load('src/forge/editor/07_view_lifecycle.js');
 assert.match(lifecycle,/__f449ReleaseForgeDerivedCaches\(\)/);
 const audio=load('src/forge_and_melodic/10_audition_and_persistence.js');
 assert.match(audio,/function __f449ReleaseForgeDerivedCaches\(/);
 assert.match(audio,/__f333HearingCache\.clear\(\)/);
 const f=audio.indexOf('function __f449ReleaseForgeDerivedCaches(){'),g=audio.indexOf('function __f333Stop()',f);
 assert(f>=0&&g>f,'release function is independently reachable');
 const sourceFile={name:'donor-original.wav',samples:new Float32Array([.5])};
 const mainroomArtifact={pcm:new Float32Array([.8]),source:'exported'};
 let cleared=0,displayReleased=0;
 const hearing=new Map([['hearing-1',{samples:new Float32Array([.25])}]]),jobs=new Map([['job-1',{}]]);
 const env={__f333HearingCache:hearing,__f447HearingJobs:jobs,
  __F353AnalysisCache:{clear(){cleared++}},__f449ReleaseForgeDisplayCache(){displayReleased++}};
 vm.createContext(env);vm.runInContext(audio.slice(f,g),env);
 env.__f449ReleaseForgeDerivedCaches();
 assert.equal(hearing.size,0);assert.equal(jobs.size,0);assert.equal(cleared,1);assert.equal(displayReleased,1);
 assert.equal(sourceFile.samples[0],.5,'imported source must remain intact');
 assert(Math.abs(mainroomArtifact.pcm[0]-.8)<1e-6,'delivered main-room audio remains owned by main room');
}
console.log('F449 Forge sleep: overlay, preview gate, derived-cache release PASS');
