'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync(process.env.XEN_HTML||path.join(__dirname,'..','base.html'),'utf8');
function extract(from,to){const a=html.indexOf(from);if(a<0)throw new Error('Missing '+from);const b=html.indexOf(to,a+from.length);if(b<0)throw new Error('Missing end '+to);return html.slice(a,b)}
const chunk=extract('function x6e(e)', 'function M6e(');
const nameFn=extract('function __f333NavigatorTypedName()', 'function __f333NavigatorName(');
const xk=extract('function Xk(e)', 'function Yk(');
function setup({name='',materialName='Original Take with Drums',label='Figure with Donor'}={}){
 const downloads=[],encoded=[],status=[],state={nameDraft:name};
 const sandbox={
  P:{useRef:x=>({current:x}),useCallback:x=>x},
  __ForgeDonorRoutingF317:{guardExport:fn=>fn()},
  __f333ExportCurrent:async()=>{encoded.push('wav');return {kind:'wav-blob'}},
  __f345ExportFlacCurrent:async(_state,opt)=>{encoded.push('flac');opt.onEncodeProgress?.(1);return {kind:'flac-blob'}},
  __ForgeNavigatorSample:{snapshot:()=>state},pe:{getState:()=>({})},
  __f333CurrentLabel:()=>label,
  setTimeout:()=>0,window:{setTimeout:()=>0},
  Yk:(blob,filename,route)=>downloads.push({blob,filename,route}),
  console,Promise,
 };
 vm.createContext(sandbox);vm.runInContext(nameFn+'\n'+xk+'\n'+chunk+'\nthis.x6e_test=x6e;',sandbox);
 const materialExport=Object.freeze({name:materialName,bpm:120});
 const handlers=sandbox.x6e_test({materialExport,forge3AudioMode:'hybrid',previewDurationSec:4,
  setWorkflowProgress:()=>{},setWorkflowBusy:()=>{},setStatusMessage:x=>status.push(x)});
 return {handlers,state,downloads,encoded,status,materialExport};
}
test('WAV download uses exact explicit NAME field without old listening-mode suffix',async()=>{
 const a=setup({name:'  My Soundscape  '});await a.handlers.handleDownloadCurrentPreview('wav');
 assert.equal(a.downloads.length,1);assert.equal(a.downloads[0].filename,'My Soundscape.wav');assert.equal(a.downloads[0].blob.kind,'wav-blob');
});
test('FLAC download uses the same typed NAME, even if different from persisted materialExport.name',async()=>{
 const a=setup({name:'  My Soundscape  ',materialName:'Ignored Song'});await a.handlers.handleDownloadCurrentPreview('flac');
 assert.equal(a.downloads[0].filename,'My Soundscape.flac');assert.equal(a.encoded[0],'flac');
});
test('empty NAME preserves existing automatic source+hearing filename behavior',async()=>{
 const a=setup({name:'   ',materialName:'XenSonar Take with Drums'});await a.handlers.handleDownloadCurrentPreview('wav');
 assert.equal(a.downloads[0].filename,'xensonar-take-with-drums-figure-with-donor.wav');
});
test('re-editing NAME after handler creation is reflected on the very next download',async()=>{
 const a=setup({name:'Before'});a.state.nameDraft='After';await a.handlers.handleDownloadCurrentPreview('flac');
 assert.equal(a.downloads[0].filename,'After.flac');
});
test('explicit name with .wav or .flac avoids doubled or mismatched suffix',async()=>{
 for(const [input,format,expected] of [['Piano.wav','flac','Piano.flac'],['Piano.flac','wav','Piano.wav']]){
  const a=setup({name:input});await a.handlers.handleDownloadCurrentPreview(format);assert.equal(a.downloads[0].filename,expected);
 }
});
test('invalid filesystem characters in NAME use existing shared name sanitizer',async()=>{
 const a=setup({name:'  Live: Take / 04 ?  '});await a.handlers.handleDownloadCurrentPreview('wav');
 assert.equal(a.downloads[0].filename,'Live Take 04.wav');
});
test('new download name leaves saved material title untouched',async()=>{
 const a=setup({name:'Session Export',materialName:'Archived Source'});await a.handlers.handleDownloadCurrentPreview('flac');
 assert.equal(a.materialExport.name,'Archived Source');assert.equal(a.downloads[0].filename,'Session Export.flac');
});
test('filename is explicitly described in existing NAME accessibility tooltip',()=>{
 assert.match(html,/Optional name shared by Save as Sample, Material Track, Root Follow Loop and Pink Track[^']*WAV\/FLAC/);
});
