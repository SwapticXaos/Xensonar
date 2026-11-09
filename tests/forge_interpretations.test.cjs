'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
function fixture(){
 let id=0;
 const runtime=require('./helpers/carrier_runtime.cjs').fixture();
 const c={console,Math,Number,JSON,Object,Date,ije:'pink',sje:'#f472b6',
  qB:x=>x,lje:()=> 'glass_ping',uR:x=>x,UB:(p,n)=>n.lineHz??p.baseHz,
  WB:(draft,hz)=>({anchorIndex:0,roundedAnchorHz:hz,roundedAnchorLabel:String(hz)}),Da:x=>x,Li:e=>e.stepsPerBar/4,Mu:e=>e.bars*e.stepsPerBar,
  HK:(e,x)=>x,Fi:(draft,n)=>({id:'note-'+(++id),...n}),pr:(e,n)=>n,QB:x=>x,
  cje:n=>n.startBeat+n.durationBeats,OE:x=>Math.max(-1,Math.min(1,x)),T_:curve=>({edgeHandles:{},deformation:{curve,interior:curve,xOffsets:[]}}),
  wa:(e,n)=>n.channelIndex??0,cn:(e,n)=>n.startUnit??0,yr:(e,n)=>n.durationUnits??1,rR:n=>n.fadeInUnits??0,aR:n=>n.fadeOutUnits??0,
  om:()=>0,h7:x=>x,ai:x=>x,ll:()=>[],qS:e=>e.segmentCount??1,am:()=> 'octave',nodalComposerSourceFields:()=>({}),
  M_:runtime.M_,NE:runtime.NE,Su:line=>line.hz*Math.pow(2,(line.offsetCents||0)/1200)};
 vm.createContext(c);
 vm.runInContext(read('forge/analysis/06_polyphonic_transfer.js'),c);
 let s=read('forge/editor/06_output_routing.js'),a=s.indexOf('function uje(');vm.runInContext(s.slice(a),c);
 a=s.indexOf('function WB(');vm.runInContext(s.slice(a,s.indexOf('/* xen-lazy',a)),c);
 c.ag={carrierPink:'pink'};a=s.indexOf('const ije=');vm.runInContext(s.slice(a,s.indexOf('function uje(',a)),c);
 s=read('forge/editor/07_composition_and_preview_ui.js');vm.runInContext(s.slice(0,s.indexOf('const OR=')),c);
 s=read('app/forge/02_boot_and_workspace_tools.js');
 a=s.indexOf('function cn(');vm.runInContext(s.slice(a,s.indexOf('function _L(',a)),c);
 a=s.indexOf('function QS(');vm.runInContext(s.slice(a,s.indexOf('function g7(',a)),c);
 c.crypto=require('crypto').webcrypto;c.Ra=e=>e.pitchLines.length;
 a=s.indexOf('function Fi(');vm.runInContext(s.slice(a,s.indexOf('function M7(',a)),c);
 a=s.indexOf('function $n(');vm.runInContext(s.slice(a,s.indexOf('function Bo(',a)),c);
 return c;
}
const detail={entryId:'current-material',carrierProjectId:'project-42',carrierRevision:17,prism:'Antonia',machineId:'branch-a-line-traffic',bars:1,
 config:{synthPattern:{baseHz:110,bars:1,beatsPerBar:4,tracks:[{id:'voice',instrumentPreset:'glass_ping',volume:.8}],notes:[{id:'a',trackId:'voice',lineHz:110,startBeat:0,durationBeats:1,velocity:.7},{id:'b',trackId:'voice',lineHz:165,startBeat:2,durationBeats:1,velocity:.8}]}}};
test('existing interpretations retain distinct musical structures, source identity and chosen track color',()=>{
 for(const mode of ['scattered','last-hearing','monotone']){
  const c=fixture(),draft={bars:1,beatsPerBar:4,stepsPerBar:16,pitchLines:[{id:'line-0',hz:110}],pitchSteps:[{id:'step-0'}],tracks:[],notes:[],activeTrackIds:[]};
  const result=c.fje(draft,{...structuredClone(detail),projectionMode:mode},110,{trackId:'import-blue',color:'#22d3ee'});
  assert.equal(result.applied,true);assert.equal(draft.tracks[0].color,'#22d3ee');
  assert.equal(draft.notes.length,mode==='scattered'?2:1);
  if(mode==='last-hearing')assert.equal(draft.notes[0].carrierIntegralField.voices.length,2);
  if(mode==='monotone')assert.ok(draft.notes[0].localField.targetSlots['pitch-elastic']);
  for(const note of draft.notes){assert.equal(note.sourceMaterialId,'current-material');assert.equal(note.carrierTransfer.mode,mode);assert.equal(note.carrierTransfer.projectId,'project-42');}
  const reload=c.$n(JSON.parse(JSON.stringify(draft)));assert.equal(reload.notes[0].carrierTransfer.revision,17);assert.equal(reload.tracks[0].color,'#22d3ee');
 }
});
test('canonical carrier dots retain sub-step gaps through actual Fi/QS/yr and Fretless field timing',()=>{
 const {fixture:runtime,grid}=require('./helpers/carrier_runtime.cjs'),source=runtime(),raster=grid(2048,96);
 raster.set(0,50,.8);raster.set(16,50,.8);
 const geometry=source.__xenCompileCarrierGeometry(raster,{bars:1,beatsPerBar:4,bpm:120,baseHz:110}),c=fixture();
 for(const mode of ['scattered','last-hearing']){
  const draft={bars:1,beatsPerBar:4,stepsPerBar:16,pitchLines:[{id:'line-0',hz:110}],pitchSteps:[{id:'step-0'}],tracks:[],notes:[],activeTrackIds:[]};
  c.fje(draft,{...structuredClone(detail),config:geometry.config,projectionMode:mode,geometry:geometry.summary},110);
  if(mode==='scattered')for(const note of c.$n(draft).notes)assert.ok(Math.abs(note.durationUnits-16/2048)<1e-9);
  else for(const voice of draft.notes[0].carrierIntegralField.voices)assert.ok(Math.abs(voice.durationRatio*4-4/2048)<1e-9);
 }
});
test('Fretless source-frequency ratios cover the whole canonical raster without a hidden 72-semitone clamp',()=>{
 const {fixture:runtime,grid}=require('./helpers/carrier_runtime.cjs'),source=runtime(),raster=grid();
 for(let x=0;x<raster.width;x++)raster.set(x,0,.8);
 const geometry=source.__xenCompileCarrierGeometry(raster,{bars:1,beatsPerBar:4,bpm:120,baseHz:110}),c=fixture();
 const field=c.dje(geometry.config.synthPattern,{...detail,geometry:geometry.summary},4,'last-hearing');
 assert.ok(Math.abs(field.sourceBaseHz*Math.pow(2,field.voices[0].relativeSemitones/12)-20000)<1e-6);
});
test('live Fretless automation plays the canonical high pitch rather than clipping its LocalField to 12 kHz',()=>{
 const {fixture:runtime,grid}=require('./helpers/carrier_runtime.cjs'),c=runtime(),raster=grid();for(let x=0;x<raster.width;x++)raster.set(x,0,.8);
 const geometry=c.__xenCompileCarrierGeometry(raster,{bars:1,beatsPerBar:4,bpm:120,baseHz:110}),projection=fixture();
 const field=projection.dje(geometry.config.synthPattern,{...detail,geometry:geometry.summary},4,'last-hearing'),functions=read('forge_and_melodic/04_render_cache_and_stems.js'),extract=require('./helpers/extract_function.cjs');
 for(const name of ['ZM','ew','B$','D$','M9e','w9e'])vm.runInContext(extract(functions,name),c);
 c.$F=()=>{};const frequencies=[],parameter=(capture=false)=>({setValueAtTime(v){if(capture)frequencies.push(v)},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setValueCurveAtTime(values){if(capture)frequencies.push(...values)}});
 const ctx={sampleRate:48000,createGain:()=>({gain:parameter(),connect(){}}),createOscillator:()=>({frequency:parameter(true),detune:parameter(),connect(){},start(){},stop(){}})};
 c.w9e({ctx,destination:{},note:{carrierIntegralField:field},preset:{oscillators:[{gain:.3,type:'sine',freqMul:1}]},baseFrequency:110,noteStart:0,nominalDur:2,fadeOut:0,trackVolume:1});
 assert.ok(frequencies.length>20);assert.ok(frequencies.every(hz=>Math.abs(hz-20000)<.01));
});
test('Scattered projects each moving voice independently onto the real target pitch grid',()=>{
 const {fixture:runtime,grid}=require('./helpers/carrier_runtime.cjs'),source=runtime(),raster=grid(32,96);
 for(let x=0;x<raster.width;x++){raster.set(x,38+Math.floor(x/4),.8);raster.set(x,70-Math.floor(x/4),.6)}
 const geometry=source.__xenCompileCarrierGeometry(raster,{bars:1,beatsPerBar:4,bpm:120,baseHz:110}),c=fixture();
 const lines=Array.from({length:48},(_,i)=>({id:'line-'+i,hz:source.hs(95-i*2,96),label:'Pitch '+i}));
 const draft={bars:1,beatsPerBar:4,stepsPerBar:16,pitchLines:lines,pitchSteps:lines.map((_,i)=>({id:'step-'+i})),tracks:[],notes:[],activeTrackIds:[]};
 c.fje(draft,{...structuredClone(detail),config:geometry.config,projectionMode:'scattered',geometry:geometry.summary},110,{trackId:'pink',color:'#f472b6'});
 for(let cell=0;cell<16;cell++){
  const sounding=draft.notes.filter(n=>n.startUnit<=cell+.5&&n.startUnit+n.durationUnits>cell+.5);
  assert.equal(sounding.length,2,'both source voices must exist in target cell '+cell);
  assert.equal(new Set(sounding.map(n=>n.carrierSourceVoiceId)).size,2);
 }
 assert.ok(new Set(draft.notes.map(n=>n.channelIndex)).size>2,'glissandi must become changing grid pitches, not one average per contour');
});
test('Fretless splits more than 192 events into existing field clips without silently losing the remainder',()=>{
 const c=fixture(),draft={bars:1,beatsPerBar:4,stepsPerBar:16,pitchLines:[{id:'line-0',hz:110}],pitchSteps:[{id:'step-0'}],tracks:[],notes:[],activeTrackIds:[]};
 const config=structuredClone(detail.config);config.synthPattern.notes=Array.from({length:193},(_,i)=>({...detail.config.synthPattern.notes[0],id:'v-'+i,startBeat:0}));
 c.fje(draft,{...structuredClone(detail),config,projectionMode:'last-hearing'},110);
 assert.equal(draft.notes.length,2);assert.equal(draft.notes.reduce((n,note)=>n+note.carrierIntegralField.voices.length,0),193);
});
test('Raw Audio stays on its existing material path, and first structured import uses Pink',()=>{
 const c=fixture(),draft={bars:1,beatsPerBar:4,stepsPerBar:16,pitchLines:[{id:'line-0',hz:110}],pitchSteps:[{id:'step-0'}],tracks:[],notes:[],activeTrackIds:[]};
 assert.equal(c.fje(draft,{...structuredClone(detail),projectionMode:'grained'},110).applied,false);
 assert.equal(draft.notes.length,0);
 c.fje(draft,{...structuredClone(detail),projectionMode:'last-hearing'},110);
 assert.equal(draft.tracks[0].color,'#f472b6');
});
