

function __F35636Output({body,current,problem,settings,onSettings,job,onRender,onCancel,onListen,audition,onSave,onUse,onHearCarrier,transferReady,actionFeedback,carrierPreviewBusy,onExport,onExportSession,onImportSession,sessionImport,savedFigure,onRestore,audioSaved}) {
 return u.jsxs('section',{className:'f35636-output','aria-label':'Hybrid donor output',children:[
  u.jsx('div',{className:'f35634-overline',children:'04 / SHARED SOUND BODY'}),u.jsx('h3',{children:'Build a donor. Give it a figure.'}),
  u.jsx('p',{children:'Linked time windows follow the same relative progress. Cross finds a spectral middle; Imprint reshapes the target; Interlock bends each structure through the other. The result is one new donor.'}),
  u.jsxs('div',{className:'f35636-controls',children:[
   u.jsxs('label',{children:['Body duration (s)',u.jsx('input',{type:'number','aria-label':'Hybrid duration',min:.1,max:8,step:.1,value:settings.duration,onChange:e=>onSettings({...settings,duration:Number(e.currentTarget.value)})})]}),
   u.jsxs('label',{children:['Relationship strength · '+Math.round(settings.strength*100)+'%',u.jsx('input',{type:'range','aria-label':'Relationship strength',min:0,max:1,step:.01,value:settings.strength,onChange:e=>onSettings({...settings,strength:Number(e.currentTarget.value)})})]})]}),
  problem?u.jsx('p',{className:'f35636-status',children:problem}):null,
  body&&!current?u.jsx('p',{className:'f35636-status',children:'Changes pending. The last completed hybrid remains available to hear or export. Build again for the current recipe.'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',disabled:!!problem||job.busy,onClick:onRender,children:job.busy?job.label:'Build Hybrid Donor'}),job.busy?u.jsx('button',{type:'button',onClick:onCancel,children:'Cancel'}):null]}),
  job.busy?u.jsx('progress',{max:1,value:job.progress,'aria-label':'Hybrid preparation progress'}):null,
  body?u.jsx('p',{role:'status',children:'Ready · '+body.duration.toFixed(2)+' s · '+body.manifest.recipe.links.length+' relationship(s) · one sound body'}):null,
  u.jsxs('div',{className:'f35636-actions',children:[
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onListen,children:audition?.slot==='result'?'■ Stop Hybrid':'▶ Hear Hybrid'}),
   u.jsx('button',{type:'button',disabled:!body||job.busy,onClick:onExport,children:'Export Hybrid WAV'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onSave,children:'Save to Donor Library'}),
   u.jsx('button',{type:'button',disabled:!body||!current||job.busy,onClick:onUse,children:'Use Hybrid in Forge'}),u.jsx('button',{type:'button',disabled:!transferReady||job.busy||carrierPreviewBusy,onClick:onHearCarrier,children:'▶ Hear Hybrid in Carrier'})]}),
  transferReady?u.jsx('p',{className:'f35637-transfer-confirm',role:'status',children:'✓ Hybrid in Forge · Available in Audio Import Rack'}):null,
  actionFeedback?u.jsx('p',{className:'f35637-action-feedback '+actionFeedback.kind,role:'status',children:actionFeedback.text}):null,
  u.jsx('p',{className:'f35636-small',children:'Articulation lets your drawing lead onset, duration, pitch and silence. The donor contributes its observed beginning, body and ending. Carrier transfer is an explicit action.'}),
  u.jsxs('details',{children:[u.jsx('summary',{children:'Keep this experiment · original audio and figure'}),
   u.jsx('p',{children:audioSaved||'A complete session includes original recordings, marks, relationships, settings and the saved carrier. Blueprint JSON contains no audio.'}),
   u.jsxs('div',{className:'f35636-actions',children:[u.jsx('button',{type:'button',onClick:onExportSession,children:'Export complete session'}),u.jsx('button',{type:'button',onClick:()=>sessionImport.current?.click(),children:'Import complete session'}),u.jsx('button',{type:'button',disabled:!savedFigure,onClick:onRestore,children:'Restore saved figure'}),u.jsx('input',{ref:sessionImport,type:'file',accept:'.xds',hidden:true,onChange:e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void onImportSession(file)}})]})]})
 ]});
}


const __F35634Key='xensonar:dual-donor-blueprint:f35635:v2';
const __F35634LegacyKey='xensonar:dual-donor-blueprint:f35634:v1';