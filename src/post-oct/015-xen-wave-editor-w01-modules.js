

/* XenSonar Wave Editor W01 — standalone PCM document and edit kernel.
 * Samples and history payloads are read-only by contract. Edits never mutate inputs.
 * Time is integer sample frames; ranges are half-open [start,end). */
(function (root) {
  'use strict';
  const OPERATION_TYPES=Object.freeze(['cut','delete','rippleDelete','trim','crop','silence','clear','reverse','invert','normalize','gain','amplify','fadeIn','fadeOut','dcRemove','insertSilence','insert','pasteInsert','overwrite','pasteOverwrite','replace','pasteReplace','mix','mixPaste','moveMix','toMono','mono','toStereo','stereo','swapChannels','split']);
  const VERSION = 1, DEFAULT_HISTORY_BYTES = 64 * 1024 * 1024;
  const MAX_FRAMES = 0x1fffffff;
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const frame = (v, lo, hi) => clamp(Math.round(finite(v)), lo, hi);
  const uid = () => 'wave-' + Date.now().toString(36) + '-' + (root.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  const fail = (message, code = 'WAVE_INVALID') => { const e = new Error(message); e.code = code; throw e; };
  function pcm(a) {
    if (!a || typeof a.length !== 'number') fail('PCM channel data is missing.');
    const out = new Float32Array(a.length);
    for (let i = 0; i < out.length; i++) {
      const x = Number(a[i]);
      if (!Number.isFinite(x)) fail('PCM contains a non-finite sample.');
      out[i] = x;
      if (!Number.isFinite(out[i])) fail('PCM sample exceeds Float32 range.');
    }
    return out;
  }
  function validateChannels(channels, clone = true) {
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2) fail('W01 accepts mono or stereo planar PCM.');
    const n = channels[0]?.length;
    if (!Number.isSafeInteger(n) || n < 0 || n > MAX_FRAMES) fail('Audio length exceeds the W01 memory limit.');
    return channels.map(c => {
      if (!c || c.length !== n) fail('Stereo channels must have equal frame counts.');
      if (clone) return pcm(c);
      if (!(c instanceof Float32Array)) fail('Render channels must be Float32Array.');
      for (let i = 0; i < n; i++) if (!Number.isFinite(c[i])) fail('Render contains a non-finite sample.');
      return c;
    });
  }
  function rate(v) {
    const r = Math.round(finite(v, 48000));
    if (r < 1000 || r > 768000) fail('Unsupported sample rate.');
    return r;
  }
  function range(doc, value = doc.selection) {
    if (Array.isArray(value)) value = {start:value[0], end:value[1]};
    const a = frame(value?.start, 0, doc.frames), b = frame(value?.end ?? doc.frames, 0, doc.frames);
    return {start:Math.min(a,b), end:Math.max(a,b)};
  }
  function view(doc, value) {
    const r = range(doc, value || {start:0,end:doc.frames});
    if (r.start === r.end && doc.frames) {
      r.end = Math.min(doc.frames, r.start + 1);
      r.start = Math.min(r.start, r.end - 1);
    }
    return r;
  }
  const equalRange = (a,b) => a.start === b.start && a.end === b.end;
  function create(source, options = {}) {
    if (!source) fail('An imported audio source is required.');
    const wrapper = source.sourceAsset ? source : null;
    source = wrapper?.sourceAsset || source;
    let channels = source.channels;
    if (!channels) {
      const count = source.channelCount;
      if (count > 2) fail('Multichannel audio requires explicit mono/stereo conversion before W01 editing.');
      channels = count === 1 ? [source.monoSamples || source.leftSamples] :
        source.leftSamples?.length && source.rightSamples?.length ? [source.leftSamples,source.rightSamples] : [source.monoSamples || source.leftSamples];
    }
    channels = validateChannels(channels);
    const sr = rate(source.sampleRate), meta = source.__waveEditorW01;
    const doc = {
      id:uid(), revision:0, sampleRate:sr, channels, frames:channels[0].length,
      original:{channels:channels.slice(),sampleRate:sr},
      selection:{start:0,end:channels[0].length}, viewport:{start:0,end:channels[0].length}, markers:[],
      history:{past:[],future:[],bytes:0,maxBytes:Math.max(0,finite(options.maxHistoryBytes,DEFAULT_HISTORY_BYTES)),maxSteps:Math.max(1,Math.round(finite(options.maxHistorySteps,64))),dropped:0},
      label:wrapper?.label || source.label || source.fileName || 'Audio', lastOperation:null
    };
    if (meta?.version === VERSION) {
      try {
        const original = validateChannels(meta.original?.channels);
        doc.id = String(meta.id || doc.id); doc.revision = Math.max(0,Math.round(finite(meta.revision)));
        doc.original = {channels:original,sampleRate:rate(meta.original.sampleRate)};
        doc.selection = range(doc,meta.selection); doc.viewport = view(doc,meta.viewport);
        doc.markers = (meta.markers || []).filter(Number.isFinite).map(x => frame(x,0,doc.frames));
        if (meta.history) doc.history = hydrateHistory(meta.history,doc.history);
      } catch (error) { doc.restoreWarning = 'Edited audio restored; editor history metadata could not be restored: ' + error.message; }
    }
    const legacySelection = options.selection?.fineLoopRange;
    const legacyViewport = options.selection?.detailViewport || options.viewport?.detailViewport;
    if (legacySelection) doc.selection = range(doc,{start:legacySelection.startSec*sr,end:(legacySelection.startSec+legacySelection.durationSec)*sr});
    else if (options.selection) doc.selection = range(doc,options.selection);
    if (legacyViewport) doc.viewport = view(doc,{start:legacyViewport.startSec*sr,end:(legacyViewport.startSec+legacyViewport.durationSec)*sr});
    else if (options.viewport) doc.viewport = view(doc,options.viewport);
    return doc;
  }
  function setSelection(doc, start, end) {
    const selection = range(doc,typeof start === 'object' ? start : {start,end});
    return equalRange(doc.selection,selection) ? doc : {...doc,selection};
  }
  function setViewport(doc, start, end) {
    const viewport = view(doc,typeof start === 'object' ? start : {start,end});
    return equalRange(doc.viewport,viewport) ? doc : {...doc,viewport};
  }
  function selectedChannels(doc, value) {
    if (value == null || value === 'all' || value === 'both' || value === 'linked') return doc.channels.map((_,i) => i);
    const v = value === 'L' || value === 'left' ? [0] : value === 'R' || value === 'right' ? [1] : Array.isArray(value) ? value : [value];
    const indices = [...new Set(v.map(Number))];
    if (!indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= doc.channels.length)) fail('Selected audio channel does not exist.');
    return indices;
  }
  function copy(doc, r = doc.selection, channels = 'all') {
    const area = range(doc,r),chosen=selectedChannels(doc,channels);

    if(area.start===area.end)fail('Select a time range to copy.');
    return {version:VERSION,channels:chosen.map(i => doc.channels[i].slice(area.start,area.end)),sampleRate:doc.sampleRate,frames:area.end-area.start,sourceDocumentId:doc.id};
  }
  function spliceChannel(channel, start, remove, inserted) {
    const size = channel.length - remove + inserted.length;
    if (size > MAX_FRAMES) fail('Edit would exceed the W01 frame limit.');
    const out = new Float32Array(size);
    out.set(channel.subarray(0,start)); out.set(inserted,start); out.set(channel.subarray(start+remove),start+inserted.length);
    return out;
  }
  const payloadBytes = entry => entry.patches.reduce((s,p) => s+
    (p.segments ? p.segments.reduce((n,part)=>n+part.before.byteLength+part.after.byteLength,0)
                : (p.before?.byteLength||0)+(p.after?.byteLength||0)),0);
  function limitedHistory(history, entry) {
    let past = history.past.slice(), dropped = history.dropped;
    const cost = payloadBytes(entry);
    if (cost > history.maxBytes) fail('Die Bearbeitung überschreitet das Undo-Speicherlimit. Bitte einen kleineren Bereich bearbeiten oder das History-Budget erhöhen. Der aktuelle Audiostand bleibt erhalten.','WAVE_HISTORY_LIMIT');
    past.push(entry);
    let bytes = past.reduce((s,e)=>s+payloadBytes(e),0);
    while (past.length > history.maxSteps || bytes > history.maxBytes) { bytes -= payloadBytes(past.shift()); dropped++; }
    return {...history,past,future:[],bytes,dropped,lastWarning:null};
  }
  function changedMetadata(doc, nextFrames, start, removed, inserted) {
    const map = x => x <= start ? x : x >= start+removed ? x + inserted-removed : start+Math.min(inserted,x-start);
    const temp = {...doc,frames:nextFrames};
    const viewport = view(temp,{start:map(doc.viewport.start),end:map(doc.viewport.end)});
    return {viewport,markers:doc.markers.map(map).filter(x=>x>=0&&x<=nextFrames)};
  }
  function commit(doc, nextChannels, start, remove, insert, label, options = {}) {
    const frames = nextChannels[0].length;
    for(const c of nextChannels)if(c.length!==frames)fail('Committed channels have different frame counts.');
    const before = {frames:doc.frames,selection:{...doc.selection},viewport:{...doc.viewport},markers:doc.markers.slice(),channelCount:doc.channels.length};
    // A render may use narrow PCM history patches while retaining the prior
    // full-document viewport/marker mapping contract (notably appended tails).
    const mapped = options.metadataMapping === 'fullRender'
      ? changedMetadata(doc,frames,0,doc.frames,frames)
      : changedMetadata(doc,frames,start,remove,insert);
    const next = {...doc,channels:nextChannels,frames,revision:doc.revision+1,selection:range({frames},options.selection || {start,end:start+insert}),viewport:mapped.viewport,markers:mapped.markers,lastOperation:label};
    if (options.markers) next.markers = options.markers;
    const after = {frames,selection:{...next.selection},viewport:{...next.viewport},markers:next.markers.slice(),channelCount:nextChannels.length};
    const patches = [];
    for (let c = 0; c < Math.max(doc.channels.length,nextChannels.length); c++) {
      if (doc.channels[c] === nextChannels[c] && remove === insert) continue;
      patches.push({channel:c,before:doc.channels[c]?.slice(start,start+remove) ?? null,after:nextChannels[c]?.slice(start,start+insert) ?? null});
    }
    const entry = {label,start,remove,insert,before,after,patches};
    next.history = limitedHistory(doc.history,entry);
    return next;
  }
  function splice(doc, start, remove, inserts, label, options) {
    const length = inserts[0].length;
    const channels = doc.channels.map((c,i) => spliceChannel(c,start,remove,inserts[i]));
    return commit(doc,channels,start,remove,length,label,options);
  }
  // Windowed-sinc conversion, with anti-alias cutoff on downsampling.
  function resampleChannel(input, fromRate, toRate) {
    if (fromRate === toRate) return input.slice();
    const length = Math.round(input.length*toRate/fromRate);
    if (length > MAX_FRAMES) fail('Resampled clipboard is too large.');
    const output = new Float32Array(length), ratio=fromRate/toRate, cutoff=Math.min(1,toRate/fromRate), radius=16/cutoff;
    for (let i=0;i<length;i++) {
      const p=i*ratio; let sum=0,weight=0;
      for (let j=Math.ceil(p-radius);j<=Math.floor(p+radius);j++) {
        if(j<0||j>=input.length) continue;
        const x=(p-j)*cutoff, w=Math.abs(x)<1e-12 ? 1 : Math.sin(Math.PI*x)/(Math.PI*x);
        const k=w*(.5+.5*Math.cos(Math.PI*x/16));
        sum+=input[j]*k; weight+=k;
      }
      output[i]=weight ? sum/weight : 0;
    }
    return output;
  }
  function mapClipboard(doc, clip) {
    if (!clip) fail('The audio clipboard is empty.');
    const sr=rate(clip.sampleRate), input=validateChannels(clip.channels), converted=input.map(c=>resampleChannel(c,sr,doc.sampleRate));
    if (doc.channels.length===converted.length) return converted;
    if (doc.channels.length===2) return [converted[0],converted[0].slice()];
    const mono=new Float32Array(converted[0].length);
    for(let i=0;i<mono.length;i++) mono[i]=.5*(converted[0][i]+converted[1][i]);
    return [mono];
  }
  function edit(doc, operation) {
    if (!operation || typeof operation.type !== 'string') fail('Edit operation is missing a type.');
    const aliases={pasteInsert:'insert',pasteOverwrite:'overwrite',pasteReplace:'replace',mixPaste:'mix',swapChannels:'swap'};
    const op=operation,type=aliases[op.type]||op.type, r=range(doc,op.range), n=r.end-r.start;
    const chosen=selectedChannels(doc,op.channels), all=doc.channels.map((_,i)=>i);
    const silent = count => doc.channels.map(()=>new Float32Array(count));
    // GM01: ONE atomic cut-and-mix, with a pre-edit source snapshot. Keep
    // the document clock, untouched channels, existing levels and redo/undo.
    if(type==='moveMix'){
      if(!n)return doc;
      const destination=Number(op.position);
      if(!Number.isInteger(destination)||destination<0||destination+n>doc.frames)
        fail('Golden Move target is outside the audio timeline; audio was not changed.');
      // GM02: optional targetChannels = where the cut audio is mixed (vertical drag). One source
      // channel fans out to every target; equal counts pair in order; otherwise each stays in its own.
      const targets=op.targetChannels==null?chosen:selectedChannels(doc,op.targetChannels);
      const pairs=chosen.length===targets.length?chosen.map((c,i)=>[c,targets[i]]):chosen.length===1?targets.map(t=>[chosen[0],t]):chosen.map(c=>[c,c]);
      const touched=[...new Set([...chosen,...pairs.map(x=>x[1])])];
      if(destination===r.start&&pairs.every(([a,b])=>a===b))return doc;
      const channels=doc.channels.slice();
      const outputs=new Map(touched.map(c=>[c,doc.channels[c].slice()]));
      const snapshots=new Map(chosen.map(c=>[c,doc.channels[c].slice(r.start,r.end)]));
      for(const c of chosen)outputs.get(c).fill(0,r.start,r.end);
      for(const [c,t] of pairs){
        const output=outputs.get(t),snapshot=snapshots.get(c);
        for(let i=0;i<n;i++){
          const sum=output[destination+i]+snapshot[i];
          if(!Number.isFinite(sum)||Math.abs(sum)>3.4028234663852886e38)
            fail('Golden Move would overflow Float32; audio was not changed.');
          output[destination+i]=sum;
        }
      }
      for(const [c,output] of outputs)channels[c]=output;
      const begin=Math.min(r.start,destination),end=Math.max(r.end,destination+n);
      // A move can cover a large temporal gap. Storing that gap in the undo
      // payload would reject even a one-second move on a long timeline.
      // Merge overlapping spans; keep separated spans sparse and exact.
      const spans=destination<=r.end&&destination+n>=r.start
        ? [[begin,end]]
        : [[r.start,r.end],[destination,destination+n]].sort((a,b)=>a[0]-b[0]);
      const patches=touched.map(c=>({channel:c,segments:spans.map(([a,b])=>({
        start:a,before:doc.channels[c].slice(a,b),after:channels[c].slice(a,b)
      }))}));
      const before={frames:doc.frames,selection:{...doc.selection},viewport:{...doc.viewport},
        markers:doc.markers.slice(),channelCount:doc.channels.length};
      const next={...doc,channels,revision:doc.revision+1,
        selection:{start:destination,end:destination+n},lastOperation:'moveMix'};
      const after={frames:next.frames,selection:{...next.selection},viewport:{...next.viewport},
        markers:next.markers.slice(),channelCount:next.channels.length};
      next.history=limitedHistory(doc.history,{sparse:true,label:'moveMix',before,after,patches});
      return next;
    }
    if (['cut','delete','rippleDelete','ripple-delete'].includes(type)) {
      if(!n)return doc;
      // Cutting just L or R must not desynchronize the stereo clock or move the other channel.
      if(chosen.length!==all.length){
        const channels=doc.channels.slice();
        for(const c of chosen){channels[c]=doc.channels[c].slice();channels[c].fill(0,r.start,r.end)}
        return commit(doc,channels,r.start,n,n,'cutChannel',{selection:{start:r.start,end:r.start}});
      }
      return splice(doc,r.start,n,silent(0),type,{selection:{start:r.start,end:r.start}});
    }
    if(type==='trim'||type==='crop') {
      if(!n)fail('Select a time range to trim.');
      if(r.start===0&&r.end===doc.frames)return doc;
      const channels=doc.channels.map(c=>c.slice(r.start,r.end));
      return commit(doc,channels,0,doc.frames,n,type,{selection:{start:0,end:n},markers:doc.markers.filter(x=>x>=r.start&&x<=r.end).map(x=>x-r.start)});
    }
    if(type==='split') {
      const at=frame(op.position??r.start,0,doc.frames);
      if(doc.markers.includes(at))return doc;
      return commit(doc,doc.channels.slice(),at,0,0,'split',{selection:doc.selection,markers:[...doc.markers,at].sort((a,b)=>a-b)});
    }
    if(type==='insertSilence'||type==='insert-silence') {
      const count=Math.max(0,Math.round(finite(op.frames,finite(op.durationSec??op.seconds)*doc.sampleRate)));
      if(!count)return doc;
      if(!Number.isSafeInteger(count)||count+doc.frames>MAX_FRAMES)fail('Silence insertion exceeds the W01 frame limit.');
      return splice(doc,frame(op.position??r.start,0,doc.frames),0,silent(count),'insertSilence');
    }
    if(['insert','paste','overwrite','replace','mix','mixPaste'].includes(type)) {
      const inserted=mapClipboard(doc,op.clipboard||op.payload), m=inserted[0].length;
      if(!m)return doc;
      const at=frame(op.position??r.start,0,doc.frames);
      if((type==='insert'||type==='paste')&&chosen.length===all.length) return splice(doc,at,0,inserted,'insert');
      // Paste to one stereo lane: overwrite that lane; preserve the other lane's timing and samples.
      const channelPaste=chosen.length!==all.length&&(type==='insert'||type==='paste'||type==='replace');
      if(type==='replace'&&chosen.length===all.length)return splice(doc,r.start,n,inserted,'replace');
      const used=type==='mix'&&op.limitToSelection===true&&n>0?Math.min(m,n):m;
      const end=Math.max(doc.frames,at+used), channels=doc.channels.map(c=>{const x=new Float32Array(end);x.set(c);return x;});
      if(type==='overwrite'||channelPaste) {
        for(const c of chosen)channels[c].set(inserted[c],at);
      } else {
        const fade=clamp(Math.round(finite(op.crossfadeFrames)),0,Math.floor(used/2));
        for(const c of chosen){
          // Gain factors are constant for this output channel. Resolve them once
          // rather than once per sample, including when editing long recordings.
          const oldGain=finite(op.existingGainPerChannel?.[c]??op.existingGain,1);
          const newGain=finite(op.insertGainPerChannel?.[c]??op.insertGain??op.clipboardGain,1)*((op.invert||op.invertClipboard)?-1:1);
          for(let i=0;i<used;i++) {
          const envelope=fade ? Math.min(1,i/fade,(used-1-i)/fade) : 1;
          let v=(doc.channels[c][at+i]||0)*oldGain + inserted[c][i]*newGain*envelope;
          if(op.clip===true)v=clamp(v,-1,1);
          channels[c][at+i]=v;
          if(!Number.isFinite(channels[c][at+i]))fail('Mix produced a sample outside Float32 range.');
          }
        }
      }
      // Extension is coupled: every channel receives zero padding even for a single-channel paste.
      const span=end===doc.frames ? Math.min(used,doc.frames-at) : end-at;
      return commit(doc,channels,at,doc.frames-at < span ? doc.frames-at : span,span,type,{selection:{start:at,end:at+used}});
    }
    if(type==='swap') {
      if(doc.channels.length!==2)fail('Channel swap requires stereo audio.');
      return commit(doc,[doc.channels[1].slice(),doc.channels[0].slice()],0,doc.frames,doc.frames,'swapChannels',{selection:doc.selection});
    }
    if(type==='toMono'||type==='mono') {
      if(doc.channels.length===1)return doc;
      const c=new Float32Array(doc.frames);
      for(let i=0;i<c.length;i++)c[i]=.5*(doc.channels[0][i]+doc.channels[1][i]);
      return commit(doc,[c],0,doc.frames,doc.frames,'toMono',{selection:doc.selection});
    }
    if(type==='toStereo'||type==='stereo') {
      if(doc.channels.length===2)return doc;
      return commit(doc,[doc.channels[0],doc.channels[0].slice()],0,doc.frames,doc.frames,'toStereo',{selection:doc.selection});
    }
    if(!['silence','clear','reverse','invert','normalize','gain','amplify','fadeIn','fadeOut','dcRemove','removeDC'].includes(type)) fail('Unsupported edit operation: '+type);
    if(!n)return doc;
    if((type==='gain'||type==='amplify')&&(op.db!=null?finite(op.db)===0:finite(op.gain,1)===1)&&op.clip!==true)return doc;
    const channels=doc.channels.slice();
    let sharedPeak=0;
    if(type==='normalize')for(const c of chosen)for(let i=r.start;i<r.end;i++)sharedPeak=Math.max(sharedPeak,Math.abs(doc.channels[c][i]));
    for(const c of chosen) {
      const input=doc.channels[c], output=input.slice();
      let gain=op.db!=null ? Math.pow(10,finite(op.db)/20) : finite(op.gain,1), mean=0,peak=sharedPeak;
      if(!Number.isFinite(gain))fail('Gain is outside the supported range.');
      if(type==='normalize') {
        if(op.independent===true) {peak=0;for(let i=r.start;i<r.end;i++)peak=Math.max(peak,Math.abs(input[i]));}
        const target=op.targetDb!=null?Math.pow(10,finite(op.targetDb,-1)/20):finite(op.targetPeak,Math.pow(10,-1/20));
        gain=peak>0?Math.max(0,target)/peak:1;
      }
      if(type==='dcRemove'||type==='removeDC') {for(let i=r.start;i<r.end;i++)mean+=input[i];mean/=n;}
      for(let i=0;i<n;i++) {
        const at=r.start+i;
        let x=input[at];
        if(type==='silence'||type==='clear')x=0;
        else if(type==='reverse')x=input[r.end-1-i];
        else if(type==='invert')x=-x;
        else if(type==='dcRemove'||type==='removeDC')x-=mean;
        else if(type==='fadeIn'||type==='fadeOut') {
          let u=n===1?1:i/(n-1);if(type==='fadeOut')u=1-u;
          if(op.curve==='equalPower')u=Math.sin(u*Math.PI/2);
          x*=u;
        } else x*=gain;
        if(op.clip===true)x=clamp(x,-1,1);
        if(!Number.isFinite(x))fail('Edit produced a non-finite sample.');
        output[at]=x;
        if(!Number.isFinite(output[at]))fail('Edit produced a sample outside Float32 range.');
      }
      channels[c]=output;
    }
    return commit(doc,channels,r.start,n,n,type,{selection:r});
  }
  function applyHistory(doc, entry, backwards) {
    if(entry.sparse===true){
      const to=backwards?entry.before:entry.after,channels=doc.channels.slice();
      for(const patch of entry.patches){
        const out=channels[patch.channel].slice();
        for(const part of patch.segments)out.set(part[backwards?'before':'after'],part.start);
        channels[patch.channel]=out;
      }
      return {...doc,channels,frames:to.frames,selection:{...to.selection},viewport:{...to.viewport},
        markers:to.markers.slice(),revision:doc.revision+1,
        lastOperation:(backwards?'undo:':'redo:')+entry.label};
    }
    const from=backwards?entry.after:entry.before, to=backwards?entry.before:entry.after;
    const remove=backwards?entry.insert:entry.remove, insert=backwards?entry.remove:entry.insert;
    const patches=new Map(entry.patches.map(p=>[p.channel,p]));
    const channels=[];
    for(let c=0;c<to.channelCount;c++) {
      const patch=patches.get(c), data=patch?.[backwards?'before':'after'];
      const current=doc.channels[c];
      if(!patch) {if(!current)fail('History is missing an audio channel.');channels.push(current);}
      else if(!current) {
        if(entry.start!==0||insert!==to.frames||!data)fail('History channel reconstruction failed.');
        channels.push(data.slice());
      } else channels.push(spliceChannel(current,entry.start,remove,data||new Float32Array(0)));
    }
    if(channels.some(c=>c.length!==to.frames))fail('History frame count is inconsistent.');
    return {...doc,channels,frames:to.frames,selection:{...to.selection},viewport:{...to.viewport},markers:to.markers.slice(),revision:doc.revision+1,lastOperation:(backwards?'undo:':'redo:')+entry.label};
  }
  function undo(doc) {
    if(!doc.history.past.length)return doc;
    const entry=doc.history.past[doc.history.past.length-1], next=applyHistory(doc,entry,true);
    next.history={...doc.history,past:doc.history.past.slice(0,-1),future:[...doc.history.future,entry]};return next;
  }
  function redo(doc) {
    if(!doc.history.future.length)return doc;
    const entry=doc.history.future[doc.history.future.length-1], next=applyHistory(doc,entry,false);
    next.history={...doc.history,past:[...doc.history.past,entry],future:doc.history.future.slice(0,-1)};return next;
  }
  function commitRender(doc, result, options = {}) {
    if(!result||result.documentId!==doc.id||result.revision!==doc.revision)fail('This render belongs to an older audio revision.','WAVE_STALE_RENDER');
    // W29/P6: validate borrowed Worker Float32Arrays before allocating output.
    // Previously even a byte-identical, neutral render copied the WHOLE document
    // in pcm(), then scanned it again. Keep non-Float32 API inputs compatible.
    const borrowed=Array.isArray(result.channels)&&result.channels.every(c=>c instanceof Float32Array);
    const channels=validateChannels(result.channels,!borrowed);
    if(channels.length!==doc.channels.length&&!options.allowChannelChange)fail('Render changed the channel count without explicit conversion.');
    if(result.sampleRate!=null&&rate(result.sampleRate)!==doc.sampleRate)fail('Render sample rate differs from the project.');

    // Compare Float32 bit patterns exactly: distinguishes +0 from -0 like
    // Object.is; both sides have already been validated as finite PCM.
    // No per-frame .every() closure or unnecessary full-document clone.
    const sameChannels=channels.length===doc.channels.length;
    const oldFrames=doc.frames,newFrames=channels[0].length;
    let start=0,oldEnd=oldFrames,newEnd=newFrames;
    if(sameChannels){
      const oldBits=doc.channels.map(ch=>new Uint32Array(ch.buffer,ch.byteOffset,ch.length));
      const newBits=channels.map(ch=>new Uint32Array(ch.buffer,ch.byteOffset,ch.length));
      const sampleEqual=(a,b)=>{
        for(let c=0;c<oldBits.length;c++)if(oldBits[c][a]!==newBits[c][b])return false;
        return true;
      };
      const shared=Math.min(oldFrames,newFrames);
      while(start<shared&&sampleEqual(start,start))start++;
      while(oldEnd>start&&newEnd>start&&sampleEqual(oldEnd-1,newEnd-1)){oldEnd--;newEnd--;}
      if(start===oldEnd&&start===newEnd){
        // No-op preserves redo, source arrays, revision and history budget.
        const selected=range(doc,result.selection||doc.selection);
        return equalRange(selected,doc.selection)?doc:{...doc,selection:selected};
      }
      if(oldFrames===newFrames){
        for(let c=0;c<channels.length;c++){
          let identical=true;
          for(let i=start;i<oldEnd;i++)if(oldBits[c][i]!==newBits[c][i]){identical=false;break;}
          if(identical)channels[c]=doc.channels[c];
        }
      }
    }
    // The caller (or Worker result cache) retains ownership of its buffers.
    // Copy ONLY changed channels before attaching to the immutable document.
    // Non-Float32 input was already cloned by validateChannels above.
    if(borrowed)for(let c=0;c<channels.length;c++)if(channels[c]!==doc.channels[c])channels[c]=channels[c].slice();
    return commit(doc,channels,start,oldEnd-start,newEnd-start,options.label||result.label||'effect chain',
      {selection:result.selection||doc.selection,metadataMapping:'fullRender'});
  }
  function peaks(channels, bins = 1024) {
    const count=Math.max(1,Math.min(16384,Math.round(bins))), frames=channels[0].length;
    return channels.map(channel=>{
      const min=new Float32Array(count),max=new Float32Array(count);
      for(let b=0;b<count;b++) {
        const a=Math.floor(b*frames/count),z=Math.floor((b+1)*frames/count);let lo=0,hi=0;
        for(let i=a;i<z;i++){lo=Math.min(lo,channel[i]);hi=Math.max(hi,channel[i]);}
        min[b]=lo;max[b]=hi;
      }
      return {min,max};
    });
  }
  function analyze(doc, inputRange = doc.selection) {
    const r=range(doc,inputRange), n=r.end-r.start;
    return {frames:n,duration:n/doc.sampleRate,channels:doc.channels.map(c=>{
      let peak=0,power=0,sum=0,clipped=0;
      for(let i=r.start;i<r.end;i++){const v=c[i];peak=Math.max(peak,Math.abs(v));power+=v*v;sum+=v;if(Math.abs(v)>=1)clipped++;}
      return {peak,peakDb:peak?20*Math.log10(peak):-Infinity,rms:n?Math.sqrt(power/n):0,dc:n?sum/n:0,clipped};
    })};
  }
  /* MTW-01 · one measuring owner for the Wave Editor analysis and the Multitrack mixdown (cold, pure PCM in, numbers out).
     Programme loudness after ITU-R BS.1770-4 / EBU R128: K-weighting (shelf + high-pass, coefficients derived for the given sample rate),
     400 ms blocks every 100 ms, absolute gate -70 LUFS, relative gate -10 LU. Loudness range after EBU Tech 3342 (3 s blocks, -20 LU gate,
     10th to 95th percentile). True peak: 4x oversampled with 12 taps per phase (the positions that cannot carry the peak are skipped).
     A mono signal counts as ONE channel (a mono file played on two speakers is 3 dB louder than this number). */
  function kWeighting(fs) {
    const shelf=(()=>{const f0=1681.974450955533,G=3.999843853973347,Q=.7071752369554196,K=Math.tan(Math.PI*f0/fs),Vh=Math.pow(10,G/20),Vb=Math.pow(Vh,.4996667741545416),a0=1+K/Q+K*K;
      return [(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0,2*(K*K-1)/a0,(1-K/Q+K*K)/a0];})();
    const high=(()=>{const f0=38.13547087602444,Q=.5003270373238773,K=Math.tan(Math.PI*f0/fs),a0=1+K/Q+K*K;return [1,-2,1,2*(K*K-1)/a0,(1-K/Q+K*K)/a0];})();
    return {shelf,high};
  }
  const LUFS=energy=>energy>0?-.691+10*Math.log10(energy):-Infinity;
  function loudness(channelsIn, sampleRate, inputRange) {
    const channels=Array.isArray(channelsIn)?channelsIn:[channelsIn],fs=rate(sampleRate),count=channels.length,total=channels[0]?.length||0;
    const start=inputRange?clamp(Math.round(finite(inputRange.start)),0,total):0,end=inputRange?clamp(Math.round(finite(inputRange.end,total)),start,total):total,n=end-start;
    const empty={frames:n,duration:n/fs,integrated:-Infinity,momentaryMax:-Infinity,shortTermMax:-Infinity,range:0,samplePeak:0,samplePeakDb:-Infinity,truePeak:0,truePeakDb:-Infinity,correlation:null,gated:false};
    if(!n)return empty;
    const hop=Math.max(1,Math.round(.1*fs)),subs=Math.floor(n/hop),energy=new Float64Array(Math.max(1,subs)),{shelf,high}=kWeighting(fs);
    let whole=0,samplePeak=0;
    for(const c of channels) {
      let x1=0,x2=0,y1=0,y2=0,u1=0,u2=0,v1=0,v2=0,acc=0,at=0,k=0;
      for(let i=start;i<end;i++) {
        const x=c[i],a=x<0?-x:x;if(a>samplePeak)samplePeak=a;
        const y=shelf[0]*x+shelf[1]*x1+shelf[2]*x2-shelf[3]*y1-shelf[4]*y2;x2=x1;x1=x;y2=y1;y1=y;
        const v=y-2*u1+u2-high[3]*v1-high[4]*v2;u2=u1;u1=y;v2=v1;v1=v;
        acc+=v*v;whole+=v*v;
        if(++at===hop){if(k<subs)energy[k++]+=acc;acc=0;at=0;}
      }
    }
    const windowed=size=>{const out=[];if(subs<size)return out;let sum=0;for(let i=0;i<size;i++)sum+=energy[i];out.push(sum/(size*hop));for(let i=size;i<subs;i++){sum+=energy[i]-energy[i-size];out.push(Math.max(0,sum)/(size*hop));}return out;};
    const momentary=windowed(4),short=windowed(30),ABS=Math.pow(10,(-70+.691)/10);
    let integrated=LUFS(whole/n),gated=false;
    if(momentary.length) {
      let sum=0,m=0;for(const e of momentary)if(e>ABS){sum+=e;m++;}
      if(m){const rel=sum/m*.1;let s2=0,m2=0;for(const e of momentary)if(e>ABS&&e>rel){s2+=e;m2++;}integrated=m2?LUFS(s2/m2):-Infinity;gated=true;}
      else {integrated=-Infinity;gated=true;}
    }
    let range=0;
    if(short.length) {
      let sum=0,m=0;for(const e of short)if(e>ABS){sum+=e;m++;}
      if(m){const rel=sum/m*.01,kept=[];for(const e of short)if(e>ABS&&e>rel)kept.push(LUFS(e));kept.sort((a,b)=>a-b);
        if(kept.length>1){const q=f=>kept[Math.min(kept.length-1,Math.max(0,Math.round(f*(kept.length-1))))];range=q(.95)-q(.1);}}
    }
    const maxOf=list=>{let m=0;for(const e of list)if(e>m)m=e;return LUFS(m);};
    // true peak: phase 0 of the 4x filter is the sample itself, phases 1-3 lie between sample i and i+1
    let truePeak=samplePeak;
    if(samplePeak>0) {
      if(!loudness.fir){const taps=12,fir=new Float64Array(3*taps);for(let p=1;p<4;p++){let norm=0;for(let m=0;m<taps;m++){const x=m-5-p/4,w=.5+.5*Math.cos(Math.PI*x/6.5),v=(Math.abs(x)<1e-12?1:Math.sin(Math.PI*x)/(Math.PI*x))*w;fir[(p-1)*taps+m]=v;norm+=v;}for(let m=0;m<taps;m++)fir[(p-1)*taps+m]/=norm;}loudness.fir=fir;}
      const fir=loudness.fir,floor=samplePeak*.5;
      for(const c of channels)for(let i=start;i<end-1;i++) {
        const a=c[i]<0?-c[i]:c[i],b=c[i+1]<0?-c[i+1]:c[i+1];if(a<floor&&b<floor)continue;
        for(let p=0;p<3;p++){let sum=0;const off=p*12;for(let m=0;m<12;m++){const j=i-5+m;if(j>=start&&j<end)sum+=c[j]*fir[off+m];}if(sum<0)sum=-sum;if(sum>truePeak)truePeak=sum;}
      }
    }
    let correlation=null;
    if(count>1){let lr=0,ll=0,rr=0;const L=channels[0],R=channels[1];for(let i=start;i<end;i++){lr+=L[i]*R[i];ll+=L[i]*L[i];rr+=R[i]*R[i];}correlation=ll>0&&rr>0?lr/Math.sqrt(ll*rr):null;}
    const dB=v=>v>0?20*Math.log10(v):-Infinity;
    return {frames:n,duration:n/fs,integrated,momentaryMax:momentary.length?maxOf(momentary):integrated,shortTermMax:short.length?maxOf(short):null,range,samplePeak,samplePeakDb:dB(samplePeak),truePeak,truePeakDb:dB(truePeak),correlation,gated};
  }
  /* MTW-03: the cut point nearest to `at` where the signal (sum of the given channels) crosses zero: a boundary index i means "between sample i-1 and i".
     The ends of the audio always count. Without a crossing in reach, the quietest boundary is taken. */
  function zeroCrossing(channelsIn, at, radius) {
    const channels=Array.isArray(channelsIn)?channelsIn:[channelsIn],n=channels[0]?.length||0,f=clamp(Math.round(finite(at)),0,n),r=Math.max(1,Math.round(finite(radius,256)));
    if(f===0||f===n||!n)return f;
    const mid=i=>{let s=0;for(const c of channels)s+=c[i];return s;};
    let quiet=f,quietCost=Infinity;
    for(let d=0;d<=r;d++)for(const i of d?[f-d,f+d]:[f]) {
      if(i<=0||i>=n){if(i===0||i===n)return i;continue;}
      const a=mid(i-1),b=mid(i);if(a===0||b===0||(a<0)!==(b<0))return i;
      const cost=Math.abs(a)+Math.abs(b);if(cost<quietCost){quietCost=cost;quiet=i;}
    }
    return quiet;
  }
  function metadata(doc) {
    return {version:VERSION,id:doc.id,revision:doc.revision,original:doc.original,selection:doc.selection,viewport:doc.viewport,markers:doc.markers,history:doc.history};
  }
  function materialize(doc, priorSource = {}) {
    const wrapper=priorSource.sourceAsset ? priorSource : null;
    const priorAsset=wrapper?.sourceAsset || priorSource;
    const left=doc.channels[0],right=doc.channels[1], mono=right?new Float32Array(doc.frames):left, side=new Float32Array(doc.frames);
    if(right)for(let i=0;i<doc.frames;i++){mono[i]=.5*(left[i]+right[i]);side[i]=.5*(left[i]-right[i]);}
    const bins=1024,waveformPreview=new Float32Array(bins),stereoWidthPreview=new Float32Array(bins);
    // Overview envelope uses max L/R as well as mono to keep antiphase audio visible.
    for(let b=0;b<bins;b++) {
      const a=Math.floor(b*doc.frames/bins),z=Math.floor((b+1)*doc.frames/bins);let peak=0,midEnergy=0,sideEnergy=0;
      for(let i=a;i<z;i++){peak=Math.max(peak,Math.abs(left[i]),right?Math.abs(right[i]):0);midEnergy+=mono[i]*mono[i];sideEnergy+=side[i]*side[i];}
      waveformPreview[b]=peak;stereoWidthPreview[b]=sideEnergy>0?Math.sqrt(sideEnergy/(midEnergy+sideEnergy+1e-24)):0;
    }
    const base=String(doc.label||priorSource.fileName||'Audio').replace(/\.[a-z0-9]{1,8}$/i,'').replace(/\s*\[W01 .*\]$/,'');
    const source={kind:'audio',label:priorSource.label||doc.label,fileName:base+' [W01 '+doc.id+' r'+doc.revision+'].wav',sampleRate:doc.sampleRate,channelCount:doc.channels.length,originalDuration:doc.frames/doc.sampleRate,leftSamples:left,rightSamples:right||left,monoSamples:mono,midSamples:mono,sideSamples:side,waveformPreview,stereoWidthPreview,importStartSec:doc.viewport.start/doc.sampleRate,importDurationSec:(doc.viewport.end-doc.viewport.start)/doc.sampleRate,__waveEditorW01:metadata(doc),projectionReadMode:priorAsset.projectionReadMode};
    for(const key of ['analysisCache','__melodicSampleId','__materialIntakeAssetRef','audioIdentityKey','assetId','contentHash','sourceAssetId','__xenAssetDescriptor','__assetRef'])delete source[key];
    if(wrapper) {
      const result={id:doc.id+':r'+doc.revision,label:wrapper.label||doc.label,durationSec:doc.frames/doc.sampleRate,sampleRate:doc.sampleRate,channelCount:doc.channels.length,waveformPreview,stereoWidthPreview,sourceAsset:source};
      for(const key of ['adapterId','sourceAdapterId','kind','origin','description'])if(wrapper[key]!=null)result[key]=wrapper[key];
      return {source:result,selection:{detailViewport:{startSec:doc.viewport.start/doc.sampleRate,durationSec:(doc.viewport.end-doc.viewport.start)/doc.sampleRate},fineLoopRange:{startSec:doc.selection.start/doc.sampleRate,durationSec:(doc.selection.end-doc.selection.start)/doc.sampleRate}}};
    }
    source.durationSec=doc.frames/doc.sampleRate;
    return {source,selection:{...doc.selection}};
  }
  function encodeWav(doc, options = {}) {
    const r=range(doc,options.range||{start:0,end:doc.frames}), n=r.end-r.start, count=doc.channels.length;
    const format=options.format||'pcm16';if(!['pcm16','pcm24','float32'].includes(format))fail('WAV format must be pcm16, pcm24 or float32.');
    const floating=format==='float32',bytes=floating?4:format==='pcm24'?3:2,dataBytes=n*count*bytes;
    const header=floating?56:44;
    if(dataBytes+header-8>0xffffffff)fail('WAV exceeds the RIFF 4 GiB limit.');
    const buffer=new ArrayBuffer(header+dataBytes+(dataBytes&1)),v=new DataView(buffer);/* a RIFF chunk is word aligned: odd 24-bit data gets one pad byte */
    const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
    str(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,floating?3:1,true);v.setUint16(22,count,true);v.setUint32(24,doc.sampleRate,true);v.setUint32(28,doc.sampleRate*count*bytes,true);v.setUint16(32,count*bytes,true);v.setUint16(34,bytes*8,true);
    if(floating){str(36,'fact');v.setUint32(40,4,true);v.setUint32(44,n,true);}
    const dataAt=floating?48:36;str(dataAt,'data');v.setUint32(dataAt+4,dataBytes,true);
    let at=header,seed=Math.round(finite(options.seed,0x13579bdf))>>>0;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    for(let i=r.start;i<r.end;i++)for(const c of doc.channels) {
      let x=c[i];
      if(floating)v.setFloat32(at,x,true);
      else if(bytes===3) {/* MTW-01: 24-bit PCM (little endian, three bytes); TPDF dither of one 24-bit step when asked for */
        if(options.dither)x+=(random()-random())/8388608;x=clamp(x,-1,1);const q=Math.round(x<0?x*8388608:x*8388607);v.setUint8(at,q&255);v.setUint8(at+1,(q>>8)&255);v.setUint8(at+2,(q>>16)&255);}
      else {if(options.dither)x+=(random()-random())/32768;x=clamp(x,-1,1);v.setInt16(at,Math.round(x<0?x*32768:x*32767),true);}
      at+=bytes;
    }
    return buffer;
  }
  function exportWav(doc,options){return new Blob([encodeWav(doc,options)],{type:'audio/wav'});}
  function hydrateHistory(input, defaults) {
    const history={...defaults,maxBytes:Math.max(0,finite(input.maxBytes,defaults.maxBytes)),maxSteps:Math.max(1,Math.round(finite(input.maxSteps,64))),dropped:Math.max(0,Math.round(finite(input.dropped))),past:[],future:[]};
    const parse=e=>{
      if(!e||!Array.isArray(e.patches)||!e.before||!e.after)fail('Invalid history entry.');
      const sparse=e.sparse===true;
      const clone={...e,before:{...e.before},after:{...e.after},patches:e.patches.map(p=>sparse
        ? {...p,segments:(p.segments||[]).map(part=>({...part,before:pcm(part.before),after:pcm(part.after)}))}
        : {...p,before:p.before==null?null:pcm(p.before),after:p.after==null?null:pcm(p.after)})};
      for(const state of [clone.before,clone.after]) {
        if(!Number.isSafeInteger(state.frames)||state.frames<0||state.frames>MAX_FRAMES||![1,2].includes(state.channelCount))fail('Invalid history frame metadata.');
        state.selection=range(state,state.selection);state.viewport=view(state,state.viewport);state.markers=(state.markers||[]).map(x=>frame(x,0,state.frames));
      }
      if(sparse){
        if(clone.before.frames!==clone.after.frames||clone.before.channelCount!==clone.after.channelCount)
          fail('Invalid sparse history clock.');
        for(const patch of clone.patches){
          if(!Number.isInteger(patch.channel)||patch.channel<0||patch.channel>=clone.before.channelCount||
             !Array.isArray(patch.segments)||patch.segments.length<1||patch.segments.length>2)
            fail('Invalid sparse history channel.');
          for(const part of patch.segments){
            if(!Number.isSafeInteger(part.start)||part.start<0||part.before.length!==part.after.length||
               !part.before.length||part.start+part.before.length>clone.before.frames)
              fail('Invalid sparse history segment.');
          }
        }
      }else if(!Number.isSafeInteger(clone.start)||clone.start<0||!Number.isSafeInteger(clone.remove)||clone.remove<0||!Number.isSafeInteger(clone.insert)||clone.insert<0)
        fail('Invalid history region.');
      return clone;
    };
    history.past=(input.past||[]).map(parse);history.future=(input.future||[]).map(parse);
    history.bytes=[...history.past,...history.future].reduce((s,e)=>s+payloadBytes(e),0);
    while(history.bytes>history.maxBytes&&history.past.length){history.bytes-=payloadBytes(history.past.shift());history.dropped++;}
    if(history.bytes>history.maxBytes){history.future=[];history.bytes=history.past.reduce((s,e)=>s+payloadBytes(e),0);}
    return history;
  }
  // Portable, lossless recovery container. JSON index + little-endian Float32 payloads.
  function encodeProject(doc) {
    const arrays=[],seen=new Map();
    function pack(value) {
      if(value instanceof Float32Array) {
        if(!seen.has(value)){seen.set(value,arrays.length);arrays.push(value);}
        return {$pcm:seen.get(value),length:value.length};
      }
      if(Array.isArray(value))return value.map(pack);
      if(value&&typeof value==='object'){const o=Object.create(null);for(const [k,v]of Object.entries(value))o[k]=pack(v);return o;}
      return value;
    }
    const record=pack({format:'XenSonarWaveProject',version:VERSION,sampleRate:doc.sampleRate,channels:doc.channels,label:doc.label,metadata:metadata(doc)});
    const encoded=new TextEncoder().encode(JSON.stringify(record)), indexBytes=(encoded.length+3)&~3;
    const total=16+indexBytes+arrays.reduce((s,a)=>s+a.byteLength,0);
    const buffer=new ArrayBuffer(total),v=new DataView(buffer),u=new Uint8Array(buffer);
    u.set([88,87,48,49],0);v.setUint32(4,VERSION,true);v.setUint32(8,encoded.length,true);v.setUint32(12,arrays.length,true);u.set(encoded,16);
    let at=16+indexBytes;
    for(const a of arrays)for(let i=0;i<a.length;i++){v.setFloat32(at,a[i],true);at+=4;}
    return buffer;
  }
  function decodeProject(input) {
    const buffer=input instanceof ArrayBuffer?input:ArrayBuffer.isView(input)?input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength):null;
    if(!buffer||buffer.byteLength<16)fail('This is not a W01 project file.');
    const v=new DataView(buffer),u=new Uint8Array(buffer);
    if(String.fromCharCode(...u.subarray(0,4))!=='XW01'||v.getUint32(4,true)!==VERSION)fail('Unsupported W01 project version.');
    const jsonBytes=v.getUint32(8,true),count=v.getUint32(12,true);
    if(jsonBytes>buffer.byteLength-16)fail('Project index is truncated.');
    let record;try{record=JSON.parse(new TextDecoder().decode(u.subarray(16,16+jsonBytes)));}catch(_){fail('Project index is invalid.');}
    if(record.format!=='XenSonarWaveProject'||record.version!==VERSION)fail('Unsupported project schema.');
    const descriptors=new Map();
    function collect(x) {
      if(!x||typeof x!=='object')return;
      if(Object.hasOwn(x,'$pcm')) {
        if(!Number.isSafeInteger(x.$pcm)||x.$pcm<0||x.$pcm>=count||!Number.isSafeInteger(x.length)||x.length<0||x.length>MAX_FRAMES)fail('Invalid project PCM descriptor.');
        if(descriptors.has(x.$pcm)&&descriptors.get(x.$pcm)!==x.length)fail('Inconsistent project PCM descriptor.');
        descriptors.set(x.$pcm,x.length);return;
      }
      for(const value of Object.values(x))collect(value);
    }
    collect(record);
    if(descriptors.size!==count)fail('Project PCM index is incomplete.');
    let at=16+((jsonBytes+3)&~3);const arrays=[];
    for(let j=0;j<count;j++) {
      const n=descriptors.get(j);if(at+n*4>buffer.byteLength)fail('Project PCM is truncated.');
      const a=new Float32Array(n);for(let i=0;i<n;i++){a[i]=v.getFloat32(at,true);at+=4;if(!Number.isFinite(a[i]))fail('Project PCM contains non-finite samples.');}arrays.push(a);
    }
    if(at!==buffer.byteLength)fail('Unexpected trailing project data.');
    function unpack(x){if(!x||typeof x!=='object')return x;if(Object.hasOwn(x,'$pcm'))return arrays[x.$pcm];if(Array.isArray(x))return x.map(unpack);const o=Object.create(null);for(const[k,z]of Object.entries(x))o[k]=unpack(z);return o;}
    record=unpack(record);
    return create({channels:record.channels,sampleRate:record.sampleRate,label:record.label,__waveEditorW01:record.metadata});
  }
  let persistenceAdapter=null;
  function setPersistenceAdapter(adapter) {persistenceAdapter=adapter;}
  async function persist(doc,priorSource) {
    if(!persistenceAdapter?.save)fail('The existing Forge persistence adapter is not connected. Use project export for recovery.','WAVE_NO_PERSISTENCE');
    const value=materialize(doc,priorSource);await persistenceAdapter.save(value.source,metadata(doc));return value;
  }
  async function restore(key) {
    if(!persistenceAdapter?.load)fail('The existing Forge persistence adapter is not connected.','WAVE_NO_PERSISTENCE');
    const source=await persistenceAdapter.load(key);return create(source);
  }
  root.__XenWaveCoreW01=Object.freeze({version:VERSION,operationTypes:OPERATION_TYPES,create,createDocument:create,edit,applyEdit:edit,copy,undo,redo,setSelection,setViewport,materialize,assetFromDocument:(doc,source)=>materialize(doc,source).source,encodeWav,exportWav,commitRender,commitRendered:commitRender,peaks,analyze,loudness,kWeighting,zeroCrossing,resampleChannel,mapClipboard,encodeProject,decodeProject,serializeProject:encodeProject,deserializeProject:decodeProject,exportProject:doc=>new Blob([encodeProject(doc)],{type:'application/x-xensonar-wave-project'}),setPersistenceAdapter,persist,restore});
})(typeof globalThis!=='undefined'?globalThis:window);
