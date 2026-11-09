
/* Optional runtime export control. No polling, autoplay, storage mutation or network. */
(function(){
 'use strict';
 let dialog=null;
 const css=`
 #xen-sound-recipe-dialog{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(6,9,19,.72);padding:12px;box-sizing:border-box}
 #xen-sound-recipe-dialog *{box-sizing:border-box}
 #xen-sound-recipe-dialog .xsr-panel{width:min(680px,100%);max-height:min(86vh,780px);overflow:auto;color:#f2f0fc;background:#17192b;border:1px solid #958bc6;border-radius:12px;padding:18px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 12px 48px #0009}
 #xen-sound-recipe-dialog h2{font-weight:750;font-size:19px;margin:0 0 4px}
 #xen-sound-recipe-dialog h3{font-size:15px;font-weight:700;margin:12px 0 5px}
 #xen-sound-recipe-dialog p{margin:6px 0 12px;color:#d4d3e6}
 #xen-sound-recipe-dialog select{width:100%;min-width:0;display:block;padding:10px 8px;border:1px solid #77769b;border-radius:6px;background:#22243d;color:#fff;font-size:14px}
 #xen-sound-recipe-dialog button{min-height:36px;padding:7px 12px;background:#30345e;color:#fff;border:1px solid #8a93c5;border-radius:6px;cursor:pointer}
 #xen-sound-recipe-dialog button:disabled{opacity:.5;cursor:not-allowed}
 #xen-sound-recipe-dialog button:focus-visible,#xen-sound-recipe-dialog select:focus-visible{outline:3px solid #c4b5fd;outline-offset:2px}
 #xen-sound-recipe-dialog .xsr-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}
 #xen-sound-recipe-dialog .xsr-meta{color:#bcbdd6;font-size:12px;margin-top:7px;min-height:18px;overflow-wrap:anywhere}
 #xen-sound-recipe-dialog .xsr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
 #xen-sound-recipe-dialog .xsr-note{font-size:12px;background:#272942;border-left:3px solid #b2a6ef;padding:8px;margin-top:12px}
 `;
 function close(){if(!dialog)return;dialog.remove();dialog=null;document.removeEventListener('keydown',esc);}
 function esc(event){if(event.key==='Escape'){event.stopPropagation();close();}}
 function download(payload,filename){
  const blob=new Blob([payload],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;link.hidden=true;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 function open(){
  if(dialog){dialog.querySelector('.xsr-panel')?.focus();return;}
  const bridge=window.__XenSoundRecipeDiagnostics;
  if(!bridge){window.alert('XenSonar sound engine is not ready yet. Reopen Runtime Diagnostics after startup.');return;}
  if(!document.getElementById('xen-sound-recipe-style')){const style=document.createElement('style');style.id='xen-sound-recipe-style';style.textContent=css;document.head.appendChild(style);}
  dialog=document.createElement('div');dialog.id='xen-sound-recipe-dialog';
  dialog.innerHTML=`<section class="xsr-panel" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="xsr-title">
  <div class="xsr-head"><div><h2 id="xsr-title">Sound recipe extraction</h2><p>Export complete Nodal and Entrophon instruments, not a session.</p></div><button type="button" data-xsr-close aria-label="Close sound recipe extraction">✕</button></div>
  <h3><label for="xsr-nodal">Nodal · full instrument</label></h3><select id="xsr-nodal"></select><div class="xsr-meta" id="xsr-nodal-info"></div>
  <div class="xsr-actions"><button type="button" id="xsr-nodal-export">Download Nodal JSON</button></div>
  <h3><label for="xsr-entrophon">Entrophon · full instrument</label></h3><select id="xsr-entrophon"></select><div class="xsr-meta" id="xsr-entrophon-info"></div>
  <div class="xsr-actions"><button type="button" id="xsr-entrophon-export">Download Entrophon JSON</button><button type="button" id="xsr-refresh">Refresh instruments</button></div><h3>Keyboard Nodal sound path (read-only)</h3>
  <p class="xsr-note">After selecting a troodle instrument in Keyboard, use <b>Inspect</b> to compare saved Mode spacing / Low–upper Modes with the selected, prepared and Hold-ready recipes. No presets are switched by this button.</p>
  <div class="xsr-actions"><button type="button" id="xsr-path-inspect">Inspect keyboard sound path</button><button type="button" id="xsr-path-download">Download path report JSON</button></div>
  <p class="xsr-note">For Thunder vs normal Keyboard: click <b>Start note trace</b>, play one normal note, then the same note in Thunder Mode; click <b>Stop note trace</b> and <b>Inspect</b>. Trace records note submissions only; nothing runs continuously while disabled.</p>
  <div class="xsr-actions"><button type="button" id="xsr-trace-toggle">Start note trace</button><button type="button" id="xsr-trace-clear">Clear trace</button></div>
  <pre id="xsr-path-output" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,monospace;color:#e1e4ff;background:#0d1024;border-radius:6px;padding:10px;max-height:220px;overflow-y:auto">Not inspected.</pre>
  <p class="xsr-note">Read-only: these native instrument files contain sound parameters only. No BPM, tuning, Hold patterns, global pan, sessions or diagnostic logs. Editor drafts are available after changes are committed. Nothing is written to your instrument library.</p>
  <p id="xsr-status" role="status" aria-live="polite"></p></section>`;
  document.body.appendChild(dialog);
  const one=id=>dialog.querySelector('#'+id),status=one('xsr-status');let available=[];
  function updateInfo(kind){const select=one('xsr-'+kind),chosen=available.find(x=>x.key===select.value),info=one('xsr-'+kind+'-info');
    info.textContent=chosen?chosen.origin+' · '+chosen.info:'No complete instrument found.';
    one('xsr-'+kind+'-export').disabled=!chosen;
  }
  function refresh(){
   const old={nodal:one('xsr-nodal').value,entrophon:one('xsr-entrophon').value};
   try{
    const result=bridge.list();available=result.items;
    for(const kind of ['nodal','entrophon']){
     const select=one('xsr-'+kind);select.replaceChildren();
     const matching=available.filter(x=>x.kind===kind);
     if(!matching.length){const opt=document.createElement('option');opt.value='';opt.textContent='No complete instrument available';select.appendChild(opt);}
     for(const item of matching){const opt=document.createElement('option');opt.value=item.key;opt.textContent=item.label+' — '+item.origin;select.appendChild(opt);}
     if(matching.some(x=>x.key===old[kind]))select.value=old[kind];
     updateInfo(kind);
    }
    status.textContent=available.length+' complete instrument sources found.'+(result.warnings.length?' Some sources unavailable: '+result.warnings.join('; '):'');
   }catch(error){status.textContent='Could not inspect instruments: '+String(error?.message??error);}
  }
  function exportKind(kind){
   const selected=one('xsr-'+kind).value,item=available.find(x=>x.key===selected);
   if(!item){status.textContent='Choose an instrument first.';return;}
   try{
    const raw=bridge.read(selected),data=JSON.parse(raw);
    if(kind==='nodal'&&(!Array.isArray(data.nodes)||!data.nodes.length))throw Error('Missing complete Nodal node data');
    if(kind==='entrophon'&&(!data.config||!data.surface))throw Error('Missing complete Entrophon config');
    const safe=(data.name||kind).normalize('NFKD').replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,80)||kind;
    const suffix=kind==='nodal'?'xen-nodal.json':'xen-entrophon.json';
    download(raw,safe+'.'+suffix);status.textContent='Exported '+data.name+' · complete '+kind+' recipe.';
   }catch(error){status.textContent='Export failed: '+String(error?.message??error);}
  }
  one('xsr-nodal').addEventListener('change',()=>updateInfo('nodal'));
  one('xsr-entrophon').addEventListener('change',()=>updateInfo('entrophon'));
  one('xsr-nodal-export').addEventListener('click',()=>exportKind('nodal'));
  one('xsr-entrophon-export').addEventListener('click',()=>exportKind('entrophon'));
  one('xsr-refresh').addEventListener('click',refresh);
  let lastReport=null;
  let tracing=false;
  one('xsr-trace-toggle').addEventListener('click',()=>{
    tracing=!tracing;
    bridge.traceControl(tracing?'start':'stop');
    one('xsr-trace-toggle').textContent=tracing?'Stop note trace':'Start note trace';
    one('xsr-trace-toggle').setAttribute('aria-pressed',String(tracing));
    status.textContent=tracing?'Tracing keyboard note submissions (max 96 events).':'Trace stopped; inspect or download the comparison.';
  });
  one('xsr-trace-clear').addEventListener('click',()=>{bridge.traceControl('clear');lastReport=null;one('xsr-path-output').textContent='Trace cleared. Press Inspect for a fresh snapshot.';});
  function inspectSoundPath(){
   try{
    lastReport=bridge.soundPath();
    const lane=lastReport.lanes.keyboard;
    const describe=x=>x?`${x.name} [${x.id??'draft'}] · ${x.kernelVersion} · ${x.nodeCount} nodes · spacing ${x.material?.stretch??'legacy'} · low/upper ${x.material?.balance??'legacy'}`:'(none)';
    const selected=lane.requested,prepared=lane.prepared,hold=lane.holdPrepared;
    const saved=lastReport.saved.map(x=>`${x.name} · ${x.id} · spacing ${x.material?.stretch??'legacy'} · low/upper ${x.material?.balance??'legacy'}`).join('\n');
    one('xsr-path-output').textContent=[`Keyboard requested: ${describe(selected)}`,`Prepared for playback: ${describe(prepared)}`,
     `Prepared Hold recipe: ${describe(hold)}`,
     `Selection matches prepared sound: ${lane.requestedMatchesPrepared??'not available'}`,
     `Selection matches Hold sound: ${lane.requestedMatchesHoldPrepared??'not available'}`,
     `Playback ready: ${lane.preparedProgramReady} · Hold ready: ${lane.holdProgramReady}`,
     `Editor draft: ${describe(lastReport.draft)}`,'Saved Nodal recipes:',saved||'(none)',
     `Note trace: ${lastReport.noteTrace?.events.length??0} captured · ${lastReport.noteTrace?.enabled?'ON':'OFF'}`,
     `Normal Keyboard: ${lastReport.comparison?.single?lastReport.comparison.single.backend+' · '+lastReport.comparison.single.identity?.name:'not captured'}`,
     `Thunder Hold: ${lastReport.comparison?.thunder?lastReport.comparison.thunder.backend+' · '+lastReport.comparison.thunder.identity?.name:'not captured'}`,
     `Same acoustic recipe: ${lastReport.comparison?.sameRecipe??'not comparable'}`,
     `Same prepared program: ${lastReport.comparison?.sameProgram??'not comparable'}`,
     ...((lastReport.noteTrace?.events??[]).slice(-16).map(e=>`${e.playType}: ${e.identity?.name??'?'} · ${e.path} · ${e.backend??'-'} · ${e.programKey??'-'}`))].join('\n');
    status.textContent='Snapshot captured. The JSON report includes exact acoustic keys for comparison (not an audio recording).';
   }catch(error){lastReport=null;status.textContent='Inspection failed: '+String(error?.message??error);}
  }
  one('xsr-path-inspect').addEventListener('click',inspectSoundPath);
  one('xsr-path-download').addEventListener('click',()=>{
    if(!lastReport)inspectSoundPath();
    if(lastReport)download(JSON.stringify(lastReport,null,2),'XenSonar_Nodal_Sound_Path.json');
  });

  dialog.querySelector('[data-xsr-close]').addEventListener('click',close);
  dialog.addEventListener('pointerdown',event=>{if(event.target===dialog)close();});
  document.addEventListener('keydown',esc);
  refresh();one('xsr-nodal').focus();
 }
 window.__XenSoundRecipeExportUI=Object.freeze({open,close});
})();
