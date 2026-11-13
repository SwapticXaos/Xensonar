

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
      if(destination===r.start)return doc;
      const channels=doc.channels.slice();
      for(const c of chosen){
        const source=doc.channels[c];
        const snapshot=source.slice(r.start,r.end);
        const output=source.slice();
        output.fill(0,r.start,r.end);
        for(let i=0;i<n;i++){
          const sum=output[destination+i]+snapshot[i];
          if(!Number.isFinite(sum)||Math.abs(sum)>3.4028234663852886e38)
            fail('Golden Move would overflow Float32; audio was not changed.');
          output[destination+i]=sum;
        }
        channels[c]=output;
      }
      const begin=Math.min(r.start,destination),end=Math.max(r.end,destination+n);
      // A move can cover a large temporal gap. Storing that gap in the undo
      // payload would reject even a one-second move on a long timeline.
      // Merge overlapping spans; keep separated spans sparse and exact.
      const spans=destination<=r.end&&destination+n>=r.start
        ? [[begin,end]]
        : [[r.start,r.end],[destination,destination+n]].sort((a,b)=>a[0]-b[0]);
      const patches=chosen.map(c=>({channel:c,segments:spans.map(([a,b])=>({
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
    const format=options.format||'pcm16';if(!['pcm16','float32'].includes(format))fail('WAV format must be pcm16 or float32.');
    const floating=format==='float32',bytes=floating?4:2,dataBytes=n*count*bytes;
    const header=floating?56:44;
    if(dataBytes+header-8>0xffffffff)fail('WAV exceeds the RIFF 4 GiB limit.');
    const buffer=new ArrayBuffer(header+dataBytes),v=new DataView(buffer);
    const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
    str(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,floating?3:1,true);v.setUint16(22,count,true);v.setUint32(24,doc.sampleRate,true);v.setUint32(28,doc.sampleRate*count*bytes,true);v.setUint16(32,count*bytes,true);v.setUint16(34,bytes*8,true);
    if(floating){str(36,'fact');v.setUint32(40,4,true);v.setUint32(44,n,true);}
    const dataAt=floating?48:36;str(dataAt,'data');v.setUint32(dataAt+4,dataBytes,true);
    let at=header,seed=Math.round(finite(options.seed,0x13579bdf))>>>0;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    for(let i=r.start;i<r.end;i++)for(const c of doc.channels) {
      let x=c[i];
      if(floating)v.setFloat32(at,x,true);
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
  root.__XenWaveCoreW01=Object.freeze({version:VERSION,operationTypes:OPERATION_TYPES,create,createDocument:create,edit,applyEdit:edit,copy,undo,redo,setSelection,setViewport,materialize,assetFromDocument:(doc,source)=>materialize(doc,source).source,encodeWav,exportWav,commitRender,commitRendered:commitRender,peaks,analyze,resampleChannel,mapClipboard,encodeProject,decodeProject,serializeProject:encodeProject,deserializeProject:decodeProject,exportProject:doc=>new Blob([encodeProject(doc)],{type:'application/x-xensonar-wave-project'}),setPersistenceAdapter,persist,restore});
})(typeof globalThis!=='undefined'?globalThis:window);

/* XenSonar Wave Editor W01: deterministic offline DSP. No live-audio hooks. */
(function installWaveDSP(global) {
  'use strict';
  function makeRegistry() {
    const p = (label, unit, min, max, value, neutral, log) => ({type:'number', label, unit, min, max, default:value, neutral:neutral === undefined ? null : neutral, log:!!log, scale:log?'log':'linear', automateAllowed:true, smoothingMs:5});
    const frequency = () => p('Frequenz','Hz',20,20000,1000,null,true);
    const q = () => p('Resonanz Q','',0.1,30,0.70710678118);
    const wet = (value) => p('Effektanteil','',0,1,value,0);
    const rate = () => p('LFO-Frequenz','Hz',0.01,20,0.5,null,true);
    const effect = (label, category, params, description) => ({label,category,params,description,version:1,available:true});
    return {
      gain:effect('Verstärkung','Lautstärke & Dynamik',{gainDb:p('Verstärkung','dB',-96,36,0,0)},'Pegelautomation in dB; 0 dB ist bitidentisch.'),
      fadeIn:effect('Einblenden','Lautstärke & Dynamik',{curve:p('Kurvenexponent','',0.1,8,1)},'Auswahl von null bis zum ursprünglichen Pegel.'),
      fadeOut:effect('Ausblenden','Lautstärke & Dynamik',{curve:p('Kurvenexponent','',0.1,8,1)},'Auswahl vom ursprünglichen Pegel bis null.'),
      lowpass:effect('Tiefpass','Filter & EQ',{frequency:frequency(),q:q()},'Zweipoliger RBJ-Biquad.'),
      highpass:effect('Hochpass','Filter & EQ',{frequency:frequency(),q:q()},'Zweipoliger RBJ-Biquad.'),
      bandpass:effect('Bandpass','Filter & EQ',{frequency:frequency(),q:q()},'Bandpass mit konstantem Spitzenpegel.'),
      notch:effect('Kerbfilter','Filter & EQ',{frequency:frequency(),q:q()},'Zweipolige Bandsperre.'),
      peaking:effect('Parametrischer EQ','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Parametrisches Bell-Band; 0 dB ist bitidentisch.'),
      lowshelf:effect('Low Shelf','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Tiefen-Shelving; Q steuert den Übergang.'),
      highshelf:effect('High Shelf','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Höhen-Shelving; Q steuert den Übergang.'),
      compressor:effect('Kompressor','Lautstärke & Dynamik',{thresholdDb:p('Schwelle','dB',-72,0,-18),ratio:p('Verhältnis',':1',1,30,4,1),kneeDb:p('Knie','dB',0,24,6),attackMs:p('Attack','ms',0.1,200,10,null,true),releaseMs:p('Release','ms',5,3000,150,null,true),makeupDb:p('Aufholverstärkung','dB',-24,24,0,0)},'Stereo-gekoppelter Peak-Kompressor mit weichem Knie.'),
      limiter:effect('Lookahead-Limiter','Lautstärke & Dynamik',{ceilingDb:p('Ceiling','dB',-24,0,-1),releaseMs:p('Release','ms',5,2000,80,null,true),lookaheadMs:Object.assign(p('Vorausschau','ms',0,20,3),{automateAllowed:false})},'Stereo-gekoppelte Peak-Begrenzung mit vorausberechnetem Fenster; keine Zeitverschiebung. Vorausschau ist pro Render fest.'),
      gate:effect('Gate / Expander','Lautstärke & Dynamik',{thresholdDb:p('Schwelle','dB',-96,-3,-45),ratio:p('Expansionsverhältnis',':1',1,20,4,1),attackMs:p('Attack','ms',0.1,200,2,null,true),releaseMs:p('Release','ms',5,3000,120,null,true)},'Stereo-gekoppelte Abwärts-Expansion mit geglätteter Verstärkung.'),
      delay:effect('Delay / Echo','Delay & Raum',{delayMs:p('Delayzeit','ms',1,2000,250,null,true),feedback:p('Rückkopplung','',-0.95,0.95,0.35),wet:wet(0.3)},'Fraktionales Stereo-Delay, Dry = 1 − Wet; explizite Tail-Behandlung.'),
      reverb:effect('Algorithmischer Hall','Delay & Raum',{roomSize:p('Raumgröße','',0,1,0.65),damping:p('Höhendämpfung','',0,0.95,0.45),wet:wet(0.25)},'Vier gedämpfte parallele Kammfilter plus zwei Allpässe pro Kanal.'),
      phaser:effect('Phaser','Modulation',{rateHz:rate(),depth:p('Modulationstiefe','',0,1,0.65),feedback:p('Rückkopplung','',-0.9,0.9,0.25),wet:wet(0.5)},'Sechs zeitvariable Allpass-Stufen mit Rückkopplung.'),
      flanger:effect('Flanger','Modulation',{rateHz:rate(),depthMs:p('Modulationstiefe','ms',0,8,2),delayMs:p('Basisdelay','ms',0.2,15,3),feedback:p('Rückkopplung','',-0.9,0.9,0.4),wet:wet(0.5)},'Fraktionales moduliertes Delay mit Stereo-LFO-Offset.'),
      chorus:effect('Chorus','Modulation',{rateHz:rate(),depthMs:p('Modulationstiefe','ms',0,15,5),delayMs:p('Basisdelay','ms',5,40,18),feedback:p('Rückkopplung','',-0.7,0.7,0.1),wet:wet(0.35)},'Zwei fraktionale modulierte Stimmen je Kanal.'),
      tremolo:effect('Tremolo','Modulation',{rateHz:rate(),depth:p('Modulationstiefe','',0,1,0.5,0)},'Sinusförmige, kanalgekoppelte Amplitudenmodulation.'),
      pan:effect('Stereo-Balance','Stereo & Kanäle',{pan:p('Balance','',-1,1,0,0)},'Mitte ist unverändert; Links/Rechts dämpft den gegenüberliegenden Kanal. Mono bleibt mono.'),
      width:effect('Stereobreite','Stereo & Kanäle',{width:p('Stereobreite','',0,3,1,1)},'Mid bleibt konstant, Side wird skaliert; 1 ist bitidentisch. Mono bleibt mono.'),
      distortion:effect('Sättigung / Distortion','Lautstärke & Dynamik',{driveDb:p('Drive','dB',0,36,0,0),wet:wet(0.5)},'tanh-Sättigung mit Drive-Überblendung und zweifach abgetasteter Differenzkorrektur; keine aliasfreie Mastering-Sättigung.'),
      overdrive:effect('Overdrive · Soft Diode','Verzerrung & Amp',{driveDb:p('Drive','dB',0,40,14,0),tone:p('Tone','',0,1,0.5),outputDb:p('Output','dB',-24,12,0,0),wet:wet(1)},'Frequenzgeformter asymmetrischer Softclip: warm, anschlagdynamisch, 4× Oversampling plus FIR-Rückfilterung.'),
      hardDistortion:effect('Distortion · Hard Clip','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,19,0),tone:p('Tone','',0,1,0.6),outputDb:p('Output','dB',-24,12,-3,0),wet:wet(1)},'Asymmetrische harte Begrenzung mit dichter Obertonstruktur, Pre-/Postfilter und 8×-Antialiasing.'),
      fuzz:effect('Fuzz · Dynamic Bias','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,24,0),tone:p('Tone','',0,1,0.65),gate:p('Gate','',0,1,0.16,0),outputDb:p('Output','dB',-24,12,-3,0),wet:wet(1)},'Dynamischer Arbeitspunkt, hochverstärkte Begrenzung und einstellbares Gate: rauer Transistor-Fuzz-Charakter.'),
      ampCrunch:effect('Amp Crunch · Cascaded','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,16,0),tone:p('Tone','',0,1,0.50),bias:p('Bias','',-1,1,0.22,0),outputDb:p('Output','dB',-24,12,-1,0),wet:wet(1)},'Kaskadierte asymmetrische Sättigungsstufen, Eingangshochpass und Ausgangstonfilter, mit 4×-Antialiasing.')
    };
  }

  /* This function is serialized into the Blob worker. It deliberately closes over nothing. */
  function workerEngine(registry) {
    'use strict';
    const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
    const db = value => Math.pow(10,value/20);
    const TAU = Math.PI*2;
    const MAX_TAIL_SECONDS = 20;
    let sampleRate = 48000;
    function fail(message) { throw new Error(message); }
    function selectedIndices(node, count) {
      if (node.channels === 'L') return [0];
      if (node.channels === 'R') { if (count < 2) fail('Rechter Kanal ist in dieser Monoquelle nicht vorhanden.'); return [1]; }
      return Array.from({length:count},(_,i)=>i);
    }
    function prepare(node) {
      const spec=registry[node.type];
      if (!spec) fail('Unbekannter Effekt: '+node.type);
      const params={}, automation={};
      Object.keys(node.params||{}).forEach(k=>{if (!spec.params[k]) fail('Unbekannter Parameter: '+node.type+'.'+k);});
      Object.keys(node.automation||{}).forEach(k=>{if (!spec.params[k]) fail('Unbekannte Automationsspur: '+node.type+'.'+k);});
      for (const key of Object.keys(spec.params)) {
        const desc=spec.params[key], raw=node.params && node.params[key];
        if (raw !== undefined && !Number.isFinite(raw)) fail('Nicht endlicher Effektparameter: '+key);
        params[key]=clamp(raw===undefined?desc.default:raw,desc.min,desc.max);
        const lane=node.automation && node.automation[key];
        if (!lane) continue;
        if (!desc.automateAllowed && lane.points && lane.points.length) fail('Parameter ist pro Render fest: '+key);
        if (!Array.isArray(lane.points)) fail('Automation benötigt points: '+key);
        if (lane.interpolation && !['linear','hold'].includes(lane.interpolation)) fail('Unbekannte Automationsinterpolation.');
        const sorted=lane.points.map(point=>{
          if (!Number.isSafeInteger(point.frame)||point.frame<0||!Number.isFinite(point.value)) fail('Ungültiger Automationspunkt: '+key);
          return {frame:point.frame,value:clamp(point.value,desc.min,desc.max)};
        }).sort((a,b)=>a.frame-b.frame);
        const points=[];
        for (const point of sorted) {if(points.length&&points[points.length-1].frame===point.frame) points[points.length-1]=point;else points.push(point);}
        if(points.length) automation[key]={points,interpolation:lane.interpolation||'linear'};
      }
      return Object.assign({},node,{params,automation});
    }
    function isConstant(node,key,value) {
      const lane=node.automation[key];
      return lane ? lane.points.every(p=>p.value===value) : node.params[key]===value;
    }
    function neutral(node,count) {
      if(node.enabled===false||node.bypass===true) return true;
      switch(node.type) {
        case 'gain':return isConstant(node,'gainDb',0);
        case 'peaking':case 'lowshelf':case 'highshelf':return isConstant(node,'gainDb',0);
        case 'compressor':return isConstant(node,'ratio',1)&&isConstant(node,'makeupDb',0);
        case 'gate':return isConstant(node,'ratio',1);
        case 'delay':case 'reverb':case 'phaser':case 'flanger':case 'chorus':return isConstant(node,'wet',0);
        case 'tremolo':return isConstant(node,'depth',0);
        case 'pan':return count<2||isConstant(node,'pan',0);
        case 'width':return count<2||isConstant(node,'width',1);
        case 'distortion':case 'overdrive':case 'hardDistortion':case 'fuzz':case 'ampCrunch':return isConstant(node,'driveDb',0)||isConstant(node,'wet',0);
        default:return false;
      }
    }
    function evaluators(node,start) {
      const result={};
      for (const key of Object.keys(registry[node.type].params)) {
        const lane=node.automation[key], desc=registry[node.type].params[key];
        if (!lane) {const value=node.params[key];result[key]=()=>value;continue;}
        const points=lane.points;
        let index=0, lastFrame=start, smooth;
        const alpha=1-Math.exp(-1/(sampleRate*desc.smoothingMs/1000));
        result[key]=frame=>{
          if(frame<lastFrame) index=0;
          while(index+1<points.length&&points[index+1].frame<=frame) index++;
          const a=points[index], b=points[index+1];
          let value;
          if(frame<=points[0].frame) value=points[0].value;
          else if(!b||lane.interpolation==='hold') value=a.value;
          else {const t=clamp((frame-a.frame)/(b.frame-a.frame),0,1);value=desc.log&&a.value>0&&b.value>0?Math.exp(Math.log(a.value)+(Math.log(b.value)-Math.log(a.value))*t):a.value+(b.value-a.value)*t;}
          if(lane.interpolation==='hold'&&smooth!==undefined) smooth+= (value-smooth)*(1-Math.pow(1-alpha,Math.max(1,frame-lastFrame)));
          else smooth=value;
          lastFrame=frame;return smooth;
        };
      }
      return result;
    }
    function bounds(node,key) {
      const lane=node.automation[key];
      return lane?lane.points.reduce((b,p)=>[Math.min(b[0],p.value),Math.max(b[1],p.value)],[Infinity,-Infinity]):[node.params[key],node.params[key]];
    }
    function tailFrames(node) {
      let seconds=0;
      if(node.type==='delay'||node.type==='flanger'||node.type==='chorus') {
        const feedback=Math.max(...bounds(node,'feedback').map(Math.abs));
        const repeats=feedback>0?Math.max(1,Math.ceil(Math.log(0.00001)/Math.log(feedback))):1;
        const maxMs=bounds(node,'delayMs')[1]+(node.type==='delay'?0:bounds(node,'depthMs')[1]);
        seconds=maxMs/1000*(repeats+1);
      } else if(node.type==='reverb') seconds=1.5+8*bounds(node,'roomSize')[1];
      // Phaser is a selection-bounded phase effect, not an echo/reverb.
      // Its internal all-pass feedback is processed within selection only.
      return Math.ceil(Math.min(MAX_TAIL_SECONDS,seconds)*sampleRate);
    }
    function biquad(type,frequency,q,gain) {
      const w=TAU*clamp(frequency,5,sampleRate*0.49)/sampleRate, c=Math.cos(w), s=Math.sin(w), alpha=s/(2*q), A=Math.pow(10,gain/40);
      let b0,b1,b2,a0,a1,a2;
      if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='bandpass'){b0=alpha;b1=0;b2=-alpha;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='notch'){b0=1;b1=-2*c;b2=1;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='peaking'){b0=1+alpha*A;b1=-2*c;b2=1-alpha*A;a0=1+alpha/A;a1=-2*c;a2=1-alpha/A;}
      else {const z=2*Math.sqrt(A)*alpha;
        if(type==='lowshelf'){b0=A*((A+1)-(A-1)*c+z);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-z);a0=(A+1)+(A-1)*c+z;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-z;}
        else {b0=A*((A+1)+(A-1)*c+z);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-z);a0=(A+1)-(A-1)*c+z;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-z;}
      }
      return [b0/a0,b1/a0,b2/a0,a1/a0,a2/a0];
    }
    // State belongs to each processed channel; a warm-up pass may seed it
    // from untouched *preceding* audio. The warm-up audio is never committed.
    function processFilter(data,node,ev,start,initialStates) {
      const states=initialStates||data.map(()=>[0,0]);
      const n=data[0].length;
      let coeff=biquad(node.type,ev.frequency(start),ev.q(start),ev.gainDb?ev.gainDb(start):0);
      for(let i=0;i<n;) {
        const count=Math.min(16,n-i), at=start+i+count;
        const target=biquad(node.type,ev.frequency(at),ev.q(at),ev.gainDb?ev.gainDb(at):0);
        const step=target.map((v,k)=>(v-coeff[k])/count);
        for(let j=0;j<count;j++,i++) {
          for(let c=0;c<data.length;c++) {
            const x=data[c][i], state=states[c], y=coeff[0]*x+state[0];
            state[0]=coeff[1]*x-coeff[3]*y+state[1];state[1]=coeff[2]*x-coeff[4]*y;
            data[c][i]=y;
          }
          for(let k=0;k<5;k++) coeff[k]+=step[k];
        }
      }
      return states;
    }
    // The render buffer normally starts exactly at the purple range boundary.
    // Warm-up the seven stateful Biquads using a bounded preceding input window
    // (with absolute-frame automation) so they do not start at a false zero.
    function processSelectionFilter(data,node,ev,start,indices,channels,serialContext) {
      const length=data[0].length;
      const minFreq=Math.max(20,Math.min(...bounds(node,'frequency')));
      const maxQ=Math.max(.1,Math.max(...bounds(node,'q')));
      // High-Q resonances retain state far longer than a simple lowpass.
      // About five pole-decay time constants, capped at two seconds.
      const warmSeconds=Math.max(.05,Math.min(2,5*maxQ/(Math.PI*minFreq)));
      const warmFrames=serialContext&&!serialContext.first?0:Math.min(start,Math.ceil(sampleRate*warmSeconds));
      let initialStates;
      if(warmFrames>0) {
        const preStart=start-warmFrames;
        const previous=indices.map(c=>new Float32Array(channels[c].subarray(preStart,start)));
        initialStates=processFilter(previous,node,evaluators(node,preStart),preStart);
      }
      processFilter(data,node,ev,start,initialStates);
      // The input signal outside the purple range is immutable. Smooth only
      // the selected edge samples, crossfading *dry to wet*, never from zero.
      // Document edges have no neighboring sample and need no seam taper.
      if(length<4) {
        // A 1–3 frame selection cannot fit a click-safe filter transition.
        // Preserve the selected samples rather than introducing an impulse.
        for(let c=0;c<indices.length;c++)data[c].set(serialContext?serialContext.input[indices[c]].subarray(0,length):channels[indices[c]].subarray(start,start+length));
        return;
      }
      const transition=Math.max(2,Math.min(Math.round(sampleRate*.003),Math.floor(length/2)));
      const blendAt=(i,x)=>{
        const wet=.5-.5*Math.cos(Math.PI*x);
        for(let c=0;c<indices.length;c++) {
          const dry=serialContext?serialContext.input[indices[c]][i]:channels[indices[c]][start+i],processed=data[c][i];
          data[c][i]=dry+(processed-dry)*wet;
        }
      };
      // Process only the two short transition windows. No extra O(song length)
      // pass over the filtered selection is necessary.
      if(start>0)for(let i=0;i<transition;i++)blendAt(i,i/transition);
      if(start+length<channels[0].length&&(!serialContext||length===serialContext.selectionLength))for(let i=0;i<transition;i++){
        const at=length-1-i;
        blendAt(at,i/transition);
      }
    }
    function dynamics(data,node,ev,start) {
      const n=data[0].length;
      if(node.type==='limiter') {
        const look=Math.round(bounds(node,'lookaheadMs')[1]*sampleRate/1000);
        const peaks=new Float64Array(n), windowPeak=new Float64Array(n), queue=new Int32Array(n);
        for(let i=0;i<n;i++) for(let c=0;c<data.length;c++) peaks[i]=Math.max(peaks[i],Math.abs(data[c][i]));
        let head=0,tail=0;
        for(let i=n-1;i>=0;i--) {
          while(tail>head&&queue[head]>i+look) head++;
          while(tail>head&&peaks[queue[tail-1]]<=peaks[i]) tail--;
          queue[tail++]=i;windowPeak[i]=peaks[queue[head]];
        }
        let gain=1;
        for(let i=0;i<n;i++) {
          const ceiling=db(ev.ceilingDb(start+i));
          const target=Math.min(1,ceiling/Math.max(windowPeak[i],1e-30));
          const release=Math.exp(-1/(sampleRate*ev.releaseMs(start+i)/1000));
          gain=target<gain?target:target+(gain-target)*release;
          gain=Math.min(gain,ceiling/Math.max(peaks[i],1e-30));
          for(let c=0;c<data.length;c++) data[c][i]*=gain;
        }
        return;
      }
      let gain=1, envelope=0;
      for(let i=0;i<n;i++) {
        const frame=start+i, threshold=ev.thresholdDb(frame), ratio=ev.ratio(frame);
        let peak=0;for(let c=0;c<data.length;c++) peak=Math.max(peak,Math.abs(data[c][i]));
        // A peak follower avoids opening/closing repeatedly at every waveform zero crossing.
        const detectorRelease=Math.exp(-1/(sampleRate*Math.max(10,ev.releaseMs(frame))/1000));
        envelope=Math.max(peak,envelope*detectorRelease);
        const level=20*Math.log10(Math.max(envelope,1e-20)), over=level-threshold;
        let reduction=0;
        if(node.type==='gate') reduction=over<0?Math.max(-120,over*(ratio-1)):0;
        else {
          const knee=ev.kneeDb(frame), slope=1/ratio-1;
          if(knee>0&&Math.abs(over)<knee/2) reduction=slope*Math.pow(over+knee/2,2)/(2*knee);
          else if(over>=knee/2) reduction=slope*over;
        }
        const target=db(reduction);
        const opening=node.type==='gate'?target>gain:target<gain;
        const ms=opening?ev.attackMs(frame):ev.releaseMs(frame);
        const coeff=Math.exp(-1/(sampleRate*ms/1000));gain=target+(gain-target)*coeff;
        const makeup=node.type==='compressor'?db(ev.makeupDb(frame)):1;
        for(let c=0;c<data.length;c++) data[c][i]*=gain*makeup;
      }
    }
    function fractional(buffer,position) {
      const n=buffer.length;
      position=((position%n)+n)%n;
      const a=Math.floor(position), t=position-a;
      return buffer[a]*(1-t)+buffer[(a+1)%n]*t;
    }
    function delay(data,node,ev,start) {
      const n=data[0].length, mod=node.type!=='delay', chorus=node.type==='chorus';
      const maxMs=bounds(node,'delayMs')[1]+(mod?bounds(node,'depthMs')[1]:0);
      const buffers=data.map(()=>new Float64Array(Math.ceil(maxMs*sampleRate/1000)+4));
      let phase=0;
      for(let i=0;i<n;i++) {
        const frame=start+i, base=ev.delayMs(frame)*sampleRate/1000, depth=mod?ev.depthMs(frame)*sampleRate/1000:0, feedback=ev.feedback(frame),wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const ring=buffers[c], cursor=i%ring.length, x=data[c][i];
          const offset=c*0.7;
          const time=Math.max(1,base+depth*Math.sin(phase+offset));
          let y=fractional(ring,cursor-time);
          if(chorus) y=(y+fractional(ring,cursor-Math.max(1,base+depth*Math.sin(phase*1.13+2.1+offset))))*0.5;
          ring[cursor]=x+feedback*y;data[c][i]=x*(1-wet)+y*wet;
        }
        if(mod) phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;
      }
    }
    function reverb(data,node,ev,start) {
      const scale=sampleRate/44100, combTimes=[1116,1277,1422,1557], allTimes=[225,556];
      const state=data.map((_,c)=>({combs:combTimes.map(t=>({ring:new Float64Array(Math.max(2,Math.round((t+c*23)*scale))),pos:0,low:0})),all:allTimes.map(t=>({ring:new Float64Array(Math.max(2,Math.round((t+c*17)*scale))),pos:0}))}));
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i, room=0.65+0.31*ev.roomSize(frame), damp=ev.damping(frame), wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const x=data[c][i], s=state[c];let sum=0;
          for(const comb of s.combs) {const y=comb.ring[comb.pos];comb.low=y*(1-damp)+comb.low*damp;comb.ring[comb.pos]=x+comb.low*room;comb.pos=(comb.pos+1)%comb.ring.length;sum+=y*0.25;}
          for(const all of s.all) {const delayed=all.ring[all.pos], y=delayed-0.5*sum;all.ring[all.pos]=sum+0.5*y;all.pos=(all.pos+1)%all.ring.length;sum=y;}
          data[c][i]=x*(1-wet)+sum*wet;
        }
      }
    }
    function phaser(data,node,ev,start) {
      const state=data.map(()=>({x:new Float64Array(6),y:new Float64Array(6),feedback:0}));let phase=0;
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i, depth=ev.depth(frame), feedback=ev.feedback(frame), wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const s=state[c], dry=data[c][i];let x=dry+feedback*s.feedback;
          for(let stage=0;stage<6;stage++) {
            const freq=clamp(350*Math.pow(1.7,stage)*Math.pow(6,depth*Math.sin(phase+c*0.15)),20,sampleRate*0.45);
            const tangent=Math.tan(Math.PI*freq/sampleRate), a=(tangent-1)/(tangent+1);
            const y=a*x+s.x[stage]-a*s.y[stage];s.x[stage]=x;s.y[stage]=y;x=y;
          }
          s.feedback=x;data[c][i]=dry*(1-wet)+x*wet;
        }
        phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;
      }
    }
    // W13 offline nonlinear pedals: prefilter -> nonlinear stage -> postfilter.
    // 4x/8x oversampling and matched 65/129-tap windowed-sinc FIR are kept
    // entirely in the existing Worker. This is alias REDUCTION, not an assertion
    // of alias-free clipping or an exact analog circuit emulation.
    const distortionFIR=(factor)=>{
      const count=factor===8?129:65,center=(count-1)/2,cutoff=0.42/factor,taps=new Float64Array(count);
      let total=0;
      for(let i=0;i<count;i++){
        const x=i-center;
        const sinc=x===0?2*cutoff:Math.sin(2*Math.PI*cutoff*x)/(Math.PI*x);
        const window=0.42+0.5*Math.cos(Math.PI*x/center)+0.08*Math.cos(2*Math.PI*x/center);
        taps[i]=sinc*window;total+=taps[i];
      }
      for(let i=0;i<count;i++)taps[i]/=total;
      return taps;
    };
    const distortionFIR4=distortionFIR(4),distortionFIR8=distortionFIR(8);
    function processGuitarDistortion(data,node,ev,start){
      const factor=(node.type==='hardDistortion'||node.type==='fuzz')?8:4;
      const taps=factor===8?distortionFIR8:distortionFIR4;
      const rate=sampleRate*factor,delay=(taps.length-1)/2,F=taps.length;
      // Polyphase windowed-sinc upsampling. A cubic interpolator is cheaper,
      // but leaves input images near 4× Nyquist which intermodulate in a hard
      // clipper and create low-frequency aliases. This 25-tap windowed-sinc
      // interpolation suppresses those images before the nonlinearity.
      const phases=[null];
      for(let q=1;q<factor;q++){
        const weights=new Float64Array(25),t=q/factor;
        let sum=0;
        for(let j=-12;j<=12;j++){
          const d=t-j,window=0.42+0.5*Math.cos(Math.PI*d/12.5)+0.08*Math.cos(2*Math.PI*d/12.5);
          const w=Math.abs(d)<1e-9?1:Math.sin(Math.PI*d)/(Math.PI*d);
          weights[j+12]=w*window;sum+=weights[j+12];
        }
        for(let j=0;j<25;j++)weights[j]/=sum;
        phases[q]=weights;
      }
      for(const channel of data){
        const length=channel.length,ring=new Float64Array(F);
        // The sinc input interpolation looks 12 frames into the past, while
        // the aligned decimator writes only 8 original frames behind. Keep
        // an O(1) circular archive of overwritten original input samples so
        // later interpolation never reads processed output as dry input.
        const originalArchive=new Float64Array(32);
        let lastWritten=-1;
        let hp=0,previousIn=0,post=0,post2=0,dc=0,envelope=0,sag=0;
        // The 32-highrate-frame FIR delay is compensated before writing to
        // the project frame. The input lookahead is safe: outIdx always trails
        // the samples used by the interpolator by at least 8 original frames.
        const raw=(idx)=>idx<0||idx>=length?0:idx<=lastWritten?originalArchive[idx%32]:channel[idx];
        const hpHz=node.type==='overdrive'?155:node.type==='fuzz'?35:node.type==='ampCrunch'?95:85;
        const hpCoeff=Math.exp(-2*Math.PI*hpHz/rate),dcAlpha=1-Math.exp(-2*Math.PI*12/rate);
        const base=node.type==='overdrive'?1900:node.type==='hardDistortion'?2400:node.type==='fuzz'?2600:1600;
        const bandwidth=node.type==='fuzz'?10300:node.type==='hardDistortion'?10200:8200;
        let cachedFrame=-1,drive=1,lpAlpha=1,gate=0,biasParameter=0;
        for(let high=0;high<length*factor+delay;high++){
          const i=Math.floor(high/factor),phase=high%factor,frame=start+Math.min(i,length-1);
          let sample;
          if(phase===0)sample=raw(i);
          else{
            sample=0;
            const weights=phases[phase];
            for(let j=-12;j<=12;j++)sample+=raw(i+j)*weights[j+12];
          }
          if(frame!==cachedFrame){
            cachedFrame=frame;
            drive=db(ev.driveDb(frame));
            const tone=ev.tone(frame);
            const fc=clamp(base+Math.pow(tone,1.15)*bandwidth,250,Math.min(15500,sampleRate*.47));
            lpAlpha=1-Math.exp(-2*Math.PI*fc/rate);
            if(node.type==='fuzz')gate=ev.gate(frame);
            if(node.type==='ampCrunch')biasParameter=ev.bias(frame);
          }
          hp=hpCoeff*(hp+sample-previousIn);previousIn=sample;
          let shaped=0;
          if(node.type==='overdrive'){
            const g=1.65*drive,b=0.075;
            shaped=(Math.tanh(hp*g+b)-Math.tanh(b))/Math.max(.4,Math.tanh(g));
          }else if(node.type==='hardDistortion'){
            const v=hp*drive*3.1;
            shaped=clamp(v,-.66,.54)*1.55;
          }else if(node.type==='fuzz'){
            const speed=Math.abs(hp)>envelope?0.00042:0.00006;
            envelope+=(Math.abs(hp)-envelope)*speed;
            const bias=clamp((envelope-.12)*.47,-.09,.17),g=5.2*drive;
            const u=clamp((hp*g+bias)*1.3,-1,1);
            const zero=clamp(bias*1.3,-1,1);
            shaped=Math.sign(u)*Math.pow(Math.abs(u),.76)-Math.sign(zero)*Math.pow(Math.abs(zero),.76);
            const threshold=gate*.05;
            const gateMultiplier=threshold>0?clamp((Math.abs(hp)-threshold)/Math.max(1e-6,threshold*2),0,1):1;
            shaped*=gateMultiplier;
          }else{ // ampCrunch: two dynamically coupled asymmetric gain stages
            const bias=biasParameter*.16,g=drive*.36;
            sag+=(Math.abs(hp)-sag)*0.00018;
            const compression=1/(1+1.5*sag);
            const stage1=Math.tanh(hp*g*compression+bias)-Math.tanh(bias);
            shaped=Math.tanh(stage1*1.34-bias*.7)+Math.tanh(bias*.7);
          }
          post+=lpAlpha*(shaped-post);
          if(node.type==='ampCrunch'||node.type==='hardDistortion'){
            post2+=lpAlpha*(post-post2);
          }else post2=post;
          // Preserve the original signal's DC-free silence and counteract
          // asymmetric clipping bias, without coupling stereo channel states.
          dc+=(post2-dc)*dcAlpha;
          const processed=(post2-dc);
          ring[high%F]=processed;
          if(high<delay||(high-delay)%factor!==0)continue;
          const index=(high-delay)/factor;
          if(index>=length)break;
          let filtered=0;
          for(let k=0;k<F;k++)filtered+=taps[k]*ring[(high-k+F*2)%F];
          const wet=ev.wet(start+index),outputGain=db(ev.outputDb(start+index)),dry=channel[index];
          originalArchive[index%32]=dry;lastWritten=index;
          // Aligned in-place overwrite; original lookbehind is now protected.
          channel[index]=wet<=0?dry:dry*(1-wet)+filtered*outputGain*wet;
        }
      }
    }
    function processSimple(data,node,ev,start,originalLength,channelIndices,allChannels,channelOrigin=0) {
      let phase=0;
      const previous=data.map(()=>0);
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i;
        if(node.type==='gain') {const gain=db(ev.gainDb(frame));for(const channel of data) channel[i]*=gain;}
        else if(node.type==='fadeIn'||node.type==='fadeOut') {const t=originalLength<=1?1:i/(originalLength-1);const gain=Math.pow(node.type==='fadeIn'?t:1-t,ev.curve(frame));for(const channel of data) channel[i]*=gain;}
        else if(node.type==='tremolo') {const gain=1-ev.depth(frame)*(0.5-0.5*Math.cos(phase));for(const channel of data) channel[i]*=gain;phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;}
        else if(node.type==='pan') {const pan=ev.pan(frame);for(let c=0;c<data.length;c++) {const index=channelIndices[c];data[c][i]*=index===0&&pan>0?Math.cos(pan*Math.PI/2):index===1&&pan<0?Math.cos(pan*Math.PI/2):1;}}
        else if(node.type==='width') {const left=allChannels[0][frame-channelOrigin],right=allChannels[1][frame-channelOrigin],mid=(left+right)*0.5,side=(left-right)*0.5*ev.width(frame);for(let c=0;c<data.length;c++) data[c][i]=channelIndices[c]===0?mid+side:mid-side;}
        else if(node.type==='distortion') {
          const drive=db(ev.driveDb(frame)),wet=ev.wet(frame),normal=Math.tanh(drive),amount=1-1/drive;
          // Filter the nonlinear difference only: drive=0 dB is exactly neutral,
          // including inside an automation lane, without delaying the dry signal.
          for(let c=0;c<data.length;c++) {const x=data[c][i],prior=previous[c],middle=(x+prior)*0.5;const a=Math.tanh(prior*drive)/normal-prior,b=Math.tanh(middle*drive)/normal-middle,d=Math.tanh(x*drive)/normal-x;const delta=(a+2*b+d)*0.25*amount;previous[c]=x;data[c][i]=x+wet*delta;}
        }
      }
    }
    function metrics(channels) {
      return channels.map(channel=>{
        let peak=0,sum=0,clippedCount=0;
        for(let i=0;i<channel.length;i++) {const value=channel[i];if(!Number.isFinite(value)) fail('DSP erzeugte nicht endliche Samples; Ergebnis wird verworfen.');peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>1) clippedCount++;}
        return {peak,rms:channel.length?Math.sqrt(sum/channel.length):0,clippedCount};
      });
    }
    // W27/P4: serial wet processing is deliberately enabled only for nodes
    // sharing one explicit source range. Distinct targets retain W26 semantics.
    // The purple selection is always the source; it is never expanded.
    function serialWetRange(job) {
      if(job.tailMode==='truncate'||job.nodes.length<2)return null;
      const active=job.nodes.filter(node=>node.enabled!==false&&node.bypass!==true);
      if(active.length<2)return null;
      const source=active[0].targetRange||job.range;
      if(!source||!Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end)||source.start<0||source.end<=source.start||source.end>job.channels[0].length)return null;
      for(const node of active){const range=node.targetRange||job.range;if(!range||range.start!==source.start||range.end!==source.end)return null;}
      // Only routes which can generate a tail need the separate wet lane.
      if(!active.some(node=>['delay','reverb','flanger','chorus'].includes(node.type)))return null;
      return source;
    }
    function executeSerialWet(job,onProgress,source) {
      sampleRate=job.sampleRate;
      const original=job.channels,originalFrames=original[0].length;
      const start=source.start,selectionLength=source.end-start;
      let wet=original.map(ch=>new Float32Array(ch.subarray(start,source.end)));
      let wetFrames=selectionLength,processedStages=0;
      const reports=[];
      onProgress(0);
      for(let index=0;index<job.nodes.length;index++) {
        const raw=job.nodes[index];
        if(raw.enabled===false||raw.bypass===true){reports.push({id:raw.id,type:raw.type,bypassed:true});onProgress((index+1)/job.nodes.length);continue;}
        const node=prepare(raw),indices=selectedIndices(node,original.length);
        if(neutral(node,original.length)){reports.push({id:node.id,type:node.type,neutral:true});onProgress((index+1)/job.nodes.length);continue;}
        const tail=tailFrames(node),size=wetFrames+tail;
        // Bound the entire serial working set, not merely one node's scratch.
        const scratchBytes=(size+wetFrames)*original.length*4+(node.type==='limiter'?wetFrames*20:0);
        if(!Number.isSafeInteger(size)||scratchBytes>512*1024*1024||start+size>268435456)
          fail('Serielle Effektkette überschreitet das W01-Arbeitsspeicherlimit (512 MiB temporäre DSP-Daten). Bitte kleineren Bereich bearbeiten.');
        const data=indices.map(c=>{const result=new Float32Array(size);result.set(wet[c].subarray(0,wetFrames));return result;});
        const ev=evaluators(node,start);
        if(['lowpass','highpass','bandpass','notch','peaking','lowshelf','highshelf'].includes(node.type))
          processSelectionFilter(data,node,ev,start,indices,original,{input:wet,first:processedStages===0,selectionLength});
        else if(['compressor','limiter','gate'].includes(node.type)) dynamics(data,node,ev,start);
        else if(['delay','flanger','chorus'].includes(node.type)) delay(data,node,ev,start);
        else if(node.type==='reverb') reverb(data,node,ev,start);
        else if(node.type==='phaser') phaser(data,node,ev,start);
        else if(['overdrive','hardDistortion','fuzz','ampCrunch'].includes(node.type)) processGuitarDistortion(data,node,ev,start);
        else processSimple(data,node,ev,start,wetFrames,indices,wet,start);
        if(tail) {
          const fade=Math.min(tail,Math.ceil(sampleRate*0.02));
          for(const channel of data)for(let i=0;i<fade;i++)channel[size-fade+i]*=(fade-1-i)/Math.max(1,fade-1);
        }
        const selected=new Map(indices.map((c,i)=>[c,data[i]]));
        wet=wet.map((channel,c)=>{
          if(selected.has(c))return selected.get(c);
          if(size===wetFrames)return channel;
          const expanded=new Float32Array(size);expanded.set(channel);return expanded;
        });
        wetFrames=size;processedStages++;
        reports.push({id:node.id,type:node.type,start,end:source.end,wetFrames,tailFrames:tail,tailCapped:tail>=MAX_TAIL_SECONDS*sampleRate});
        onProgress((index+1)/job.nodes.length);
      }
      // Only now mix the processed wet lane back with *original* outside dry.
      // This prevents downstream nonlinear processors touching unrelated audio.
      const outputFrames=job.tailMode==='extend'?Math.max(originalFrames,start+wetFrames):originalFrames;
      const channels=original.map((sourceChannel,c)=>{
        const output=outputFrames>originalFrames?new Float32Array(outputFrames):sourceChannel;
        if(output!==sourceChannel)output.set(sourceChannel);
        const copied=Math.min(selectionLength,outputFrames-start);
        if(copied>0)output.set(wet[c].subarray(0,copied),start);
        const available=Math.max(0,Math.min(wetFrames,outputFrames-start));
        for(let i=selectionLength;i<available;i++)output[start+i]+=wet[c][i];
        return output;
      });
      const channelMetrics=metrics(channels);
      onProgress(1);
      return {jobId:job.jobId,documentId:job.documentId,revision:job.revision,sampleRate,channels,frames:channels[0].length,metrics:{channels:channelMetrics,peak:Math.max(...channelMetrics.map(c=>c.peak)),clippedCount:channelMetrics.reduce((s,c)=>s+c.clippedCount,0),originalFrames,tailMode:job.tailMode,effects:reports}};
    }
    function execute(job,onProgress) {
      const serialRange=serialWetRange(job);
      if(serialRange)return executeSerialWet(job,onProgress,serialRange);
      sampleRate=job.sampleRate;
      let channels=job.channels;
      const originalFrames=channels[0].length, originalRange=job.range;
      const reports=[];
      onProgress(0);
      for(let index=0;index<job.nodes.length;index++) {
        const raw=job.nodes[index];
        if(raw.enabled===false||raw.bypass===true) {reports.push({id:raw.id,type:raw.type,bypassed:true});onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const node=prepare(raw), indices=selectedIndices(node,channels.length);
        if(neutral(node,channels.length)) {reports.push({id:node.id,type:node.type,neutral:true});onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const range=node.targetRange||originalRange;
        const start=clamp(range.start,0,channels[0].length), end=clamp(range.end,start,channels[0].length), length=end-start;
        if(!length) {onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const tail=job.tailMode==='truncate'?0:tailFrames(node), size=length+tail;
        const scratchBytes=size*indices.length*4+(node.type==='limiter'?length*20:0);
        if(scratchBytes>512*1024*1024) fail('Effektauswahl überschreitet das W01-Arbeitsspeicherlimit (512 MiB temporäre DSP-Daten). Bitte kleineren Bereich bearbeiten.');
        const data=indices.map(c=>{const result=new Float32Array(size);result.set(channels[c].subarray(start,end));return result;});
        const ev=evaluators(node,start);
        if(['lowpass','highpass','bandpass','notch','peaking','lowshelf','highshelf'].includes(node.type)) processSelectionFilter(data,node,ev,start,indices,channels);
        else if(['compressor','limiter','gate'].includes(node.type)) dynamics(data,node,ev,start);
        else if(['delay','flanger','chorus'].includes(node.type)) delay(data,node,ev,start);
        else if(node.type==='reverb') reverb(data,node,ev,start);
        else if(node.type==='phaser') phaser(data,node,ev,start);
        else if(['overdrive','hardDistortion','fuzz','ampCrunch'].includes(node.type))processGuitarDistortion(data,node,ev,start);
        else processSimple(data,node,ev,start,length,indices,channels);
        if(tail) {
          const fade=Math.min(tail,Math.ceil(sampleRate*0.02));
          for(const channel of data) for(let i=0;i<fade;i++) channel[size-fade+i]*=(fade-1-i)/Math.max(1,fade-1);
        }
        const resultFrames=job.tailMode==='extend'?Math.max(channels[0].length,start+size):channels[0].length;
        if(resultFrames>channels[0].length) channels=channels.map(channel=>{const expanded=new Float32Array(resultFrames);expanded.set(channel);return expanded;});
        for(let c=0;c<indices.length;c++) {
          const target=channels[indices[c]], processed=data[c];target.set(processed.subarray(0,length),start);
          for(let i=length;i<size&&start+i<target.length;i++) target[start+i]+=processed[i];
        }
        reports.push({id:node.id,type:node.type,start,end,tailFrames:tail,tailCapped:tail>=MAX_TAIL_SECONDS*sampleRate});
        onProgress((index+1)/Math.max(1,job.nodes.length));
      }
      const channelMetrics=metrics(channels);
      onProgress(1);
      return {jobId:job.jobId,documentId:job.documentId,revision:job.revision,sampleRate,channels,frames:channels[0].length,metrics:{channels:channelMetrics,peak:Math.max(...channelMetrics.map(c=>c.peak)),clippedCount:channelMetrics.reduce((s,c)=>s+c.clippedCount,0),originalFrames,tailMode:job.tailMode,effects:reports}};
    }
    return {execute};
  }

  const registry=makeRegistry();
  function deepFreeze(value) {Object.freeze(value);Object.values(value).forEach(item=>{if(item&&typeof item==='object'&&!Object.isFrozen(item)) deepFreeze(item);});return value;}
  deepFreeze(registry);
  const jobs=new Map();
  let workerURL=null,serial=0;
  function abortError(message) {const error=new Error(message||'Render abgebrochen.');error.name='AbortError';return error;}
  function validateRange(range,frames) {
    if(!range||!Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||range.start<0||range.end<range.start||range.end>frames) throw new RangeError('Ungültiger Framebereich.');
  }
  function render(request,options) {
    options=options||{};
    return new Promise((resolve,reject)=>{
      let job;
      try {
        if(!request||typeof request!=='object') throw new TypeError('Renderauftrag fehlt.');
        if(!Number.isFinite(request.sampleRate)||request.sampleRate<8000||request.sampleRate>384000) throw new RangeError('Sample-Rate außerhalb 8000–384000 Hz.');
        if(!Array.isArray(request.channels)||request.channels.length<1||request.channels.length>2) throw new TypeError('W01 benötigt ein oder zwei PCM-Kanäle.');
        const frames=request.channels[0].length;
        request.channels.forEach(channel=>{if(!(channel instanceof Float32Array)||channel.length!==frames) throw new TypeError('PCM-Kanäle müssen gleich lange Float32Arrays sein.');});
        if(frames*request.channels.length*4>512*1024*1024) throw new RangeError('Projekt überschreitet das W01-Renderlimit von 512 MiB PCM.');
        validateRange(request.range,frames);
        if(!Array.isArray(request.nodes)) throw new TypeError('Effektkette muss ein Array sein.');
        if(!['truncate','overlay','extend'].includes(request.tailMode||'truncate')) throw new TypeError('Unbekannter Tail-Modus.');
        request.nodes.forEach(node=>{if(!node||typeof node!=='object') throw new TypeError('Ungültiger Effektknoten.');if(node.targetRange)validateRange(node.targetRange,frames);if(node.channels!==undefined&&!['all','L','R'].includes(node.channels))throw new TypeError('Ungültige Kanalauswahl.');});
        if(options.signal&&options.signal.aborted) throw abortError();
        if(typeof Worker==='undefined'||typeof Blob==='undefined'||!global.URL||!global.URL.createObjectURL) throw new Error('Dieser Browser unterstützt keine lokalen Blob-Worker. DSP ist nicht im Audio-Hotpath verfügbar.');
        job={jobId:request.jobId===undefined?'w01-'+(++serial):request.jobId,documentId:request.documentId,revision:request.revision,sampleRate:request.sampleRate,range:{start:request.range.start,end:request.range.end},tailMode:request.tailMode||'truncate',nodes:request.nodes.map(node=>JSON.parse(JSON.stringify(node))),channels:request.channels.map(channel=>new Float32Array(channel))};
      } catch(error) {reject(error);return;}
      if(jobs.has(job.jobId)) jobs.get(job.jobId).cancel('Gleichnamiger Renderauftrag ersetzt.');
      if(!workerURL) {
        const source="'use strict';const registry=("+makeRegistry.toString()+")();const engine=("+workerEngine.toString()+")(registry);self.onmessage=function(event){try{const result=engine.execute(event.data,function(progress){self.postMessage({kind:'progress',progress:progress});});self.postMessage({kind:'result',result:result},result.channels.map(function(c){return c.buffer;}));}catch(error){self.postMessage({kind:'error',name:error.name,message:error.message,stack:error.stack});}};";
        workerURL=global.URL.createObjectURL(new Blob([source],{type:'application/javascript'}));
      }
      let worker;
      try {worker=new Worker(workerURL);}catch(error){reject(error);return;}
      let settled=false;
      function cleanup(){worker.terminate();jobs.delete(job.jobId);if(options.signal)options.signal.removeEventListener('abort',onAbort);}
      function finish(error,result){if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(result);}
      function onAbort(){finish(abortError());}
      jobs.set(job.jobId,{documentId:job.documentId,revision:job.revision,cancel:message=>finish(abortError(message))});
      if(options.signal)options.signal.addEventListener('abort',onAbort,{once:true});
      worker.onmessage=event=>{
        if(settled)return;
        const message=event.data;
        if(message.kind==='progress'){if(options.onProgress){try{options.onProgress({jobId:job.jobId,documentId:job.documentId,revision:job.revision,progress:message.progress});}catch(error){/* Observer errors do not corrupt PCM work. */}}}
        else if(message.kind==='error'){const error=new Error(message.message);error.name=message.name||'Error';finish(error);}
        else if(message.kind==='result')finish(null,message.result);
      };
      worker.onerror=event=>finish(new Error(event.message||'DSP-Worker konnte nicht ausgeführt werden.'));
      try {worker.postMessage(job,job.channels.map(channel=>channel.buffer));}catch(error){finish(error);}
    });
  }
  function cancel(jobId){const job=jobs.get(jobId);if(job){job.cancel();return true;}return false;}
  function cancelDocument(documentId){for(const job of Array.from(jobs.values()))if(job.documentId===documentId)job.cancel();}
  function dispose(){for(const job of Array.from(jobs.values()))job.cancel();if(workerURL){global.URL.revokeObjectURL(workerURL);workerURL=null;}}
  global.__XenWaveDSPW01=Object.freeze({version:'W01.1',registry,getRegistry:()=>registry,render,cancel,cancelDocument,dispose,capabilities:Object.freeze({worker:true,stereo:true,automation:true,tailModes:['truncate','overlay','extend'],pitchShift:false,timeStretch:false,noiseReduction:false,declip:false})});
})(typeof window!=='undefined'?window:globalThis);

/* W01 UI: native DOM overlay; source owner remains lGe, PCM authority remains Core. */
(function(root){'use strict';
const instances=new WeakMap(),canvasOwners=new WeakMap(),peakCache=new WeakMap();let serial=0,clipboard=null,laneClipboard=null;
const $=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v)}if(text!=null)e.textContent=text;return e};
const button=(text,fn,attrs={})=>$('button',{type:'button',...attrs,onclick:fn},text);
// W20: styling and SVGs are exactly Chromatic Contour's static design assets.
// Event owners remain the original Wave Editor edit commands; this is not a second editor.
const CHROMATIC_EDIT_ASSETS=Object.freeze({"copy":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><rect height=\"14\" rx=\"1.6\" width=\"11\" x=\"8\" y=\"7\"></rect><path d=\"M16 7V5.1A2.1 2.1 0 0 0 13.9 3H6.2A2.2 2.2 0 0 0 4 5.2v11.7A2.1 2.1 0 0 0 6.1 19H8\"></path><path d=\"M11 11h5M11 14h5\"></path></svg>","accent":"#64caff","mid":"#203753","tip":"#2a4d6c"},"cut":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><circle cx=\"5.5\" cy=\"6\" r=\"2.5\"></circle><circle cx=\"5.5\" cy=\"18\" r=\"2.5\"></circle><path d=\"M7.5 8l11 10M7.5 16l11-10M18 6l2-2M18 18l2 2\"></path><circle cx=\"11.5\" cy=\"12\" fill=\"currentColor\" r=\".7\" stroke=\"none\"></circle></svg>","accent":"#ff8ca6","mid":"#342f47","tip":"#533d55"},"insert":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M5 13v7h14v-7M12 3v12M8 11l4 4 4-4M7 20v-3h10v3\"></path></svg>","accent":"#69ddab","mid":"#213948","tip":"#2c5257"},"overwrite":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><rect height=\"14\" rx=\"2\" width=\"15\" x=\"4.5\" y=\"5\"></rect><path d=\"M7.5 10h9M7.5 13h9\" opacity=\".6\"></path><path d=\"M9 16l3-3 3 3M12 13v5\"></path></svg>","accent":"#ffba70","mid":"#343540","tip":"#534947"},"mix":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2.5 9c3-9 5 9 8 0s5 9 8 0 3-2 3-2M2.5 15c3-9 5 9 8 0s5 9 8 0 3-2 3-2\"></path><path d=\"M12 3v18\" opacity=\".52\"></path></svg>","accent":"#bca1ff","mid":"#2c3253","tip":"#41426c"},"delete":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 12h4l2-5 3.2 10 2.5-5h2.3M17 7l5 10M22 7l-5 10\"></path><path d=\"M4 5v3M4 16v3\" opacity=\".55\"></path></svg>","accent":"#ff6b89","mid":"#342b43","tip":"#53344e"},"trim":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 7V4h4M21 7V4h-4M3 17v3h4M21 17v3h-4\"></path><path d=\"M6 12h2l1.5-4 2.5 8 2-6 1 2h3\"></path><path d=\"M7 3v18M17 3v18\" opacity=\".4\"></path></svg>","accent":"#65e5d6","mid":"#203a4d","tip":"#2b5462"},"split":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 12h2l1.8-5 2.2 10 1.4-5h1.1M15 12h1l1.3-5 2.3 10 1.6-5H22\"></path><path d=\"M13 3v18\" stroke-dasharray=\"2 2\"></path></svg>","accent":"#ffd47c","mid":"#343842","tip":"#53504a"},"silence":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 9v6h4l5 4V5L7 9H3Z\"></path><path d=\"M16 8l6 8M22 8l-6 8\"></path></svg>","accent":"#9eaddc","mid":"#28334e","tip":"#394563"},"reverse":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M9 7 4 12l5 5M4 12h12a4 4 0 0 0 0-8h-3\"></path><path d=\"M17.5 15 12 19v-8z\" stroke-linejoin=\"round\"></path></svg>","accent":"#879bff","mid":"#253153","tip":"#33416c"},"invert":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 7h5M4.5 4.5v5M2 17h5M10 7h2l2-4 3 8 2-4h3M10 17h2l2 4 3-8 2 4h3\"></path></svg>","accent":"#e98de6","mid":"#312f4f","tip":"#4d3d66"},"normalize":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 5h18M3 19h18M3 12h2l1.5-3 2 6L11 4l2.5 16L16 8l1.5 7 1.5-3h2\"></path><path d=\"M20 3v4M20 17v4\"></path></svg>","accent":"#68d7e9","mid":"#213950","tip":"#2b5067"},"dcRemove":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 12h20\" opacity=\".5\" stroke-dasharray=\"2 2\"></path><path d=\"M3 8h2l1.5-4 2.5 8 3-7 2.5 7 2-4H21\"></path><path d=\"M12 14v7m-3-3 3 3 3-3\"></path></svg>","accent":"#b7e174","mid":"#2b3a41","tip":"#405348"},"envelope":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 20h20M3 18 7 8l5 5 4-8 5 7\"></path><circle cx=\"3\" cy=\"18\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"7\" cy=\"8\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"12\" cy=\"13\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"5\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"21\" cy=\"12\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle></svg>","accent":"#ff9ed7","mid":"#34314e","tip":"#534262"},"gain":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 20h18M5 17v-4M9 17V9M13 17V6M17 17V3\"></path><path d=\"M18 9h5M20.5 6.5v5\"></path></svg>","accent":"#ffb673","mid":"#343441","tip":"#534848"},"insertSilence":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 7v10M21 7v10M9 6v12M15 6v12\"></path><path d=\"M5 12h3M16 12h3\" opacity=\".45\"></path></svg>","accent":"#8dbce9","mid":"#253550","tip":"#354967"},"analyze":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><circle cx=\"10\" cy=\"10\" r=\"6.4\"></circle><path d=\"M14.5 14.5 21 21M5.5 10h2l1.2-2.5 2.2 5 1.3-2.5h2.2\"></path></svg>","accent":"#73dbc5","mid":"#22394b","tip":"#2e515d"}});
const chromaticButton=(key,label,fn,attrs={})=>{
 const asset=CHROMATIC_EDIT_ASSETS[key];if(!asset)return button(label,fn,attrs);
 const control=button(label,fn,{...attrs,class:'xwe-chromatic-action','data-xwe-chromatic-action':key,'aria-label':label});
 control.style.setProperty('--xwe-accent',asset.accent);control.style.setProperty('--xwe-mid',asset.mid);control.style.setProperty('--xwe-tip',asset.tip);
 const icon=$('span',{class:'xwe-chromatic-mark','aria-hidden':'true'});icon.innerHTML=asset.svg;
 const name=$('span',{class:'xwe-chromatic-label'},label);control.replaceChildren(icon,name);
 return control;
};

const core=()=>root.__XenWaveCoreW01,dsp=()=>root.__XenWaveDSPW01;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),fmt=(v,n=3)=>Number(v||0).toFixed(n);
function channels(asset){return asset?.channelCount>1&&asset.leftSamples?.length&&asset.rightSamples?.length?[asset.leftSamples,asset.rightSamples]:[asset?.monoSamples||asset?.leftSamples||new Float32Array()]}
function peaks(asset,range,width){let cache=peakCache.get(asset);if(!cache){cache=new Map();peakCache.set(asset,cache)}const key=[range.startSec,range.durationSec,width].join(':');if(cache.has(key))return cache.get(key);const sr=asset.sampleRate,cs=channels(asset),start=Math.max(0,Math.floor(range.startSec*sr)),end=Math.min(cs[0].length,Math.ceil((range.startSec+range.durationSec)*sr)),span=Math.max(1,end-start);const result=cs.map(samples=>{const out=new Float32Array(width*2);for(let x=0;x<width;x++){let lo=0,hi=0;const a=start+Math.floor(x/width*span),b=Math.min(end,Math.max(a+1,start+Math.floor((x+1)/width*span)));for(let i=a;i<b;i++){const y=samples[i]||0;if(y<lo)lo=y;if(y>hi)hi=y}out[x*2]=lo;out[x*2+1]=hi}return out});if(cache.size>8)cache.clear();cache.set(key,result);return result}
function drawStereo(ctx,asset,range,width,height,gain=1){
 if(!asset)return false;
 const ps=peaks(asset,range,width),lane=height/ps.length;
 const editor=canvasOwners.get(ctx.canvas),hover=editor?.hoverChannelLabel;
 ctx.save();ctx.fillStyle='#030817';ctx.fillRect(0,0,width,height);
 for(let c=0;c<ps.length;c++){
  const middle=lane*(c+.5),p=ps[c];
  ctx.strokeStyle=c?'#c4a7ff':'#7dd3fc';ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<width;x++){ctx.moveTo(x+.5,middle-clamp(p[x*2+1]*gain,-1,1)*lane*.41);ctx.lineTo(x+.5,middle-clamp(p[x*2]*gain,-1,1)*lane*.41)}ctx.stroke();
  ctx.strokeStyle='#33405a';ctx.beginPath();ctx.moveTo(0,middle+.5);ctx.lineTo(width,middle+.5);ctx.stroke();
  const ch=ps.length===1?'MONO':c?'R':'L',isHover=hover?.canvas===ctx.canvas&&hover?.channel===ch;
  const selected=editor?.channel==='all'||editor?.channel===ch;
  ctx.fillStyle=isHover?'#ffffff':selected?(c?'#e5cfff':'#b5f0ff'):'#72809a';
  ctx.font=`700 ${isHover?16:11}px system-ui`;
  ctx.fillText(ch,24,lane*c+18);
 }
 ctx.restore();return true;
}
function registry(){const r=dsp()?.getRegistry?.()||dsp()?.registry||[];return Array.isArray(r)?r:Object.entries(r).map(([type,v])=>({type,...v}))}
function selectableEffects(){return registry().filter(e=>e.type!=='fadeIn'&&e.type!=='fadeOut')}
function definitions(effect){const p=effect?.params||effect?.parameters||{};return Array.isArray(p)?p.map(x=>[x.key||x.id,x]):Object.entries(p).map(([key,value])=>[key,typeof value==='object'?value:{default:value}])}
const ENGLISH_EFFECT_TEXT=Object.freeze({
 'Effekte':'Effects','Lautstärke & Dynamik':'Gain & Dynamics','Delay & Raum':'Delay & Space','Verzerrung & Amp':'Distortion & Amp','Stereo & Kanäle':'Stereo & Channels',
 'Verstärkung':'Gain','Einblenden':'Fade In','Ausblenden':'Fade Out','Tiefpass':'Low-Pass Filter','Hochpass':'High-Pass Filter','Bandpass':'Band-Pass Filter','Kerbfilter':'Notch Filter','Parametrischer EQ':'Parametric EQ',
 'Kompressor':'Compressor','Algorithmischer Hall':'Reverb','Sättigung / Distortion':'Saturation / Distortion','Stereobreite':'Stereo Width',
 'Frequenz':'Frequency','Resonanz Q':'Resonance Q','Effektanteil':'Wet Mix','LFO-Frequenz':'LFO Rate','Bandverstärkung':'Band Gain','Schwelle':'Threshold','Verhältnis':'Ratio','Knie':'Knee','Aufholverstärkung':'Makeup Gain','Vorausschau':'Lookahead','Expansionsverhältnis':'Expansion Ratio','Delayzeit':'Delay Time','Rückkopplung':'Feedback','Raumgröße':'Room Size','Höhendämpfung':'High-Frequency Damping','Modulationstiefe':'Modulation Depth','Basisdelay':'Base Delay','Balance':'Balance','Kurvenexponent':'Curve Exponent'
});
function displayText(t){return ENGLISH_EFFECT_TEXT[t]||t}
function displayEffect(effect){return displayText(effect?.label||effect?.type||'Effect')}
function category(effect){return displayText(effect.category||'Effects')}

function attach(options){const canvas=options.detailCanvas;if(!canvas)return()=>{};let inst=instances.get(canvas);if(inst){inst.update(options);return()=>{}}try{inst=new Editor(options)}catch(error){console.warn('[Wave Editor W01] source unsupported:',error);return()=>{}}instances.set(canvas,inst);return()=>{inst.dispose();instances.delete(canvas)}}
class Editor{
 constructor(options){this.options=options;this.bluePanFrame=null;this.bluePanHeld=null;this.bluePanStopOnBlur=()=>this.stopBluePan();this.bluePanStopOnVisibility=()=>{if(document.hidden)this.stopBluePan()};root.addEventListener('blur',this.bluePanStopOnBlur);document.addEventListener('visibilitychange',this.bluePanStopOnVisibility);this.enabled=false;this.goldenMoveArmed=false;this.goldenGesture=null;this.doc=null;this.source=null;this.nodes=[];this.activeNode=null;this.eqVisible=false;this.channel='all';this.maskVertical={top:0,bottom:1};this.activeWorkspace='project';this.fxFocus='morph';this.scratchContext=null;this.projectContext=null;this.renderToken=0;this.lastResult=null;this.computeJob=null;this.computeNoticeTimer=null;this.status='Ready · Right-click either waveform for editing and effects.';this.update(options);this.context=e=>this.contextMenu(e);options.detailCanvas.addEventListener('contextmenu',this.context);options.overviewCanvas?.addEventListener('contextmenu',this.context);const region=options.detailCanvas.closest('[data-material-intake-gateway="true"]')||document;this.launchHost=region.querySelector('[data-xwe-launch-slot="true"]');this.launch=button('Wave Editor',()=>this.open(),{class:'xwe-launch',title:'Open stereo Wave Editor · right-click the waveform','aria-label':'Open Wave Editor'});this.launchHost?.append(this.launch);this.editPointerDown=e=>this.beginEditPointer(e);this.goldenDoubleClick=e=>this.toggleGoldenMove(e);this.channelPointerDown=e=>this.handleChannelPointerDown(e);
 this.hoverPointerMove=e=>this.onWavePointerMove(e);
 this.hoverPointerLeave=e=>this.onWavePointerLeave(e);
 for(const canvas of [options.overviewCanvas,options.detailCanvas])if(canvas){canvasOwners.set(canvas,this);canvas.addEventListener('pointerdown',this.channelPointerDown,true);canvas.addEventListener('pointermove',this.hoverPointerMove,true);canvas.addEventListener('pointerleave',this.hoverPointerLeave,true)}
 this.attachLoopMaskResize();
 options.detailCanvas.addEventListener('pointerdown',this.editPointerDown,true);options.detailCanvas.addEventListener('dblclick',this.goldenDoubleClick,true);this.key=e=>this.handleKey(e);document.addEventListener('keydown',this.key,true);this.eqLastConfigs=new Map();this.eqUnsubscribe=root.__XenWaveOfflineEQ?.subscribe(()=>{let changed=false;for(const n of this.nodes){if(n.type!=='liveRoomEQ')continue;const cfg=root.__XenWaveOfflineEQ.get(n.eqSourceKey);if(this.eqLastConfigs.get(n.eqSourceKey)!==cfg){this.eqLastConfigs.set(n.eqSourceKey,cfg);changed=true}}if(changed)this.invalidate()})}
 handleKey(e){if(!this.overlay||this.menu?.contains(e.target)||!(this.dialog?.contains(e.target)||e.target===this.options.detailCanvas||e.target===this.options.overviewCanvas))return;if(e.target.closest?.('[data-xwe-view-controls]'))return;if(e.key==='Tab')return;const input=/INPUT|SELECT|TEXTAREA/.test(e.target.tagName),mod=e.ctrlKey||e.metaKey;
  // Hotkeys only when editor or waveform owns focus; other XenSonar instruments keep their keyboard events.
  e.stopImmediatePropagation();
  if(e.key==='Escape'){e.preventDefault();if(this.goldenMoveArmed&&!this.goldenGesture){this.goldenMoveArmed=false;this.options.onViewChange?.();this.setStatus('Golden Move cancelled.');return}if(this.mixPopover)this.closeMixPane();else this.close();return}

  if(input)return;
  if(mod){const key=e.key.toLowerCase();if(['z','y','c','x','v','a'].includes(key)){e.preventDefault();if(key==='z')this.runEdit(e.shiftKey?'redo':'undo');if(key==='y')this.runEdit('redo');if(key==='c')this.runEdit('copy');if(key==='x')this.runEdit('cut');if(key==='v'){if(e.shiftKey)this.openMixPane();else this.runEdit(e.altKey?'overwrite':'insert')}if(key==='a'){this.doc=core().setSelection(this.doc,0,this.doc.frames);this.applySelection();this.refresh(false)}}return}
  if(e.code==='Space'){e.preventDefault();this.preview('chain');return}
  if(['Delete','Backspace'].includes(e.key)){e.preventDefault();this.runEdit('delete');return}
  if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let f=this.doc.selection.start;if(e.key==='Home')f=0;else if(e.key==='End')f=this.doc.frames;else f=clamp(f+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?Math.round(this.doc.sampleRate*.01):1),0,this.doc.frames);this.doc=core().setSelection(this.doc,f,f);this.applySelection();this.refresh(false)}
 }


 setFxFocus(target){
  if(target!=='morph'&&target!=='scratch')return;
  this.fxFocus=target;
  this.fxLayout?.setAttribute('data-xwe-fx-focus',target);
  this.morphFocusButton?.setAttribute('aria-pressed',String(target==='morph'));
  this.scratchFocusButton?.setAttribute('aria-pressed',String(target==='scratch'));
  if(target==='scratch')this.drawScratchpad();
  else this.requestMorphRefresh();
  this.scheduleFxLayout();
 }
 retainExpandedScratchHeight(){
  if(this.fxFocus!=='scratch'||!this.fxLayout||!this.scratchRoot||!this.scratchRoot.isConnected)return;
  const previous=parseFloat(this.fxLayout.style.getPropertyValue('--xwe-scratch-retained-height'))||0;
  const current=this.scratchRoot.getBoundingClientRect().height;
  if(current>previous+1)this.fxLayout.style.setProperty('--xwe-scratch-retained-height',Math.ceil(current)+'px');
 }
 scheduleFxLayout(){
  if(this.fxMeasureFrame)root.cancelAnimationFrame(this.fxMeasureFrame);
  this.fxMeasureFrame=root.requestAnimationFrame(()=>{
   this.fxMeasureFrame=null;
   if(!this.fxLayout||!this.morphArea||!this.scratchRoot||!this.fxLayout.isConnected)return;
   if(this.fxFocus!=='morph'&&root.innerWidth>900){
    this.fxLayout.style.removeProperty('--xwe-morph-reserve');
    return;
   }
   // Determine the free top-right band before the full-width native morph editor.
   // Avoid cyclic layout growth by subtracting the previous reserved margin.
   const pane=this.fxLayout.getBoundingClientRect();
   const morph=this.morphArea.getBoundingClientRect();
   const old=Number.parseFloat(this.fxLayout.style.getPropertyValue('--xwe-morph-reserve'))||0;
   const naturalTop=morph.top-pane.top-old;
   const scratchTop=35;
   const available=naturalTop-scratchTop-8;
   const extra=Math.max(0,163-available);
   this.fxLayout.style.setProperty('--xwe-morph-reserve',extra.toFixed(1)+'px');
   const height=Math.max(163,Math.min(258,available+extra));
   this.fxLayout.style.setProperty('--xwe-scratch-compact-height',height.toFixed(1)+'px');
  });
 }
 workspaceSnapshot(){return {doc:this.doc,nodes:this.nodes,activeNode:this.activeNode,channel:this.channel,maskVertical:{...this.maskVertical},bypass:this.bypass||false,lastResult:null,activeParam:this.activeParam,curveHistory:this.curveHistory}}
 restoreWorkspace(snapshot){this.doc=snapshot.doc;this.nodes=snapshot.nodes;this.activeNode=snapshot.activeNode;this.channel=snapshot.channel;this.maskVertical={...snapshot.maskVertical};this.bypass=!!snapshot.bypass;this.activeParam=snapshot.activeParam;this.curveHistory=snapshot.curveHistory;this.lastResult=null}
 changeWorkspace(which){
  if(which===this.activeWorkspace){this.drawScratchpad();return true}
  if(which==='scratch'&&!this.scratchContext){this.setStatus('Copy audio in the project and choose Paste to Scratchpad first.');return false}
  this.abort('choice');this.stopAudio();this.cancelEditGesture?.();this.goldenMoveArmed=false;this.goldenGesture=null;this.closeMixPane();
  if(this.activeWorkspace==='project')this.projectContext=this.workspaceSnapshot();
  else this.scratchContext=this.workspaceSnapshot();
  const next=which==='project'?this.projectContext:this.scratchContext;
  if(!next)return false;
  this.activeWorkspace=which;this.restoreWorkspace(next);
  // A parent navigator can change the project's range while Scratchpad owns
  // the active document. On return, no old FX target may become active again.
  if(which==='project')this.syncFxTargetsToSelection();
  this.dialog?.setAttribute('data-xwe-active-workspace',which);
  this.scratchRoot?.setAttribute('data-active',String(which==='scratch'));
  this.projectSwitch?.setAttribute('aria-pressed',String(which==='project'));
  this.scratchModeLabel&&(this.scratchModeLabel.textContent=which==='scratch'?'Editing: Scratchpad':'Editing: Project');
  if(this.previewTargetButton)this.previewTargetButton.textContent=which==='scratch'?'B · Scratchpad':'B · Project';
  if(this.scratchCanvas){this.scratchCanvas.style.cursor=which==='scratch'?'crosshair':'pointer'}
  if(this.overlay){this.refresh();this.drawScratchpad()}
  this.options.onViewChange?.();this.setStatus(which==='scratch'?'Scratchpad active · changes stay local until copied into Project.':'Project active · use Insert or Mix Paste to place your edited Scratchpad audio.');
  return true;
 }
 ensureScratchSelection(){
  if(this.activeWorkspace!=='scratch'||!this.doc)return false;
  if(this.doc.selection.start===this.doc.selection.end){
   this.doc=core().setSelection(this.doc,0,this.doc.frames);
   this.maskVertical={top:0,bottom:1};
   if(this.channel!=='all')this.setChannel('all',true);
   this.refresh(false);this.drawScratchpad();
   return true;
  }
  return false;
 }
 pasteToScratchpad(){
  if(!clipboard?.frames){this.setStatus('Copy a selection from the project first.');return}
  if(!this.scratchContext){
   const doc=core().create({sampleRate:clipboard.sampleRate,channels:clipboard.channels,label:'Scratchpad'});
   this.scratchContext={doc,nodes:[],activeNode:null,channel:'all',maskVertical:{top:0,bottom:1},bypass:false,lastResult:null,activeParam:null,curveHistory:null};
   this.changeWorkspace('scratch');
   this.setStatus('Copied clipboard into independent Scratchpad PCM.');return;
  }
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  // Existing region stays a region. Only an empty selection means ALL.
  // runEdit performs the visual promotion and uses the canonical core editor.
  this.runEdit('replace');
 }
 scratchAction(type){
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  return this.runEdit(type);
 }
 copyFromScratchpad(){
  if(!this.scratchContext&&this.activeWorkspace!=='scratch'){this.setStatus('Scratchpad is empty.');return}
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  this.runEdit('copy');
  this.setStatus('Scratchpad selection copied · click the upper waveform and Insert or Mix Paste.');
 }
 drawScratchpad(){
  const canvas=this.scratchCanvas;
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#050a14';ctx.fillRect(0,0,w,h);
  const d=this.activeWorkspace==='scratch'?this.doc:this.scratchContext?.doc;
  this.scratchRoot?.setAttribute('data-has-audio',String(!!d));
  if(!d){ctx.fillStyle='#9ca3bb';ctx.font='12px system-ui';ctx.fillText('Copy above → Paste here → edit → Copy → place above',12,43);return}
  // Draw through the already shared stereo waveform renderer's canonical asset contract.
  // Using {channels:...} silently rendered MONO and no waveform.
  // W29/P6: cache the *asset identity*, not the changing selection/document wrapper.
  // drawStereo's existing WeakMap key is an asset object. A new wrapper on each
  // pointer redraw invalidated it even when every PCM frame was identical.
  // Revision AND channel references guard against a revised source (including
  // reloaded sources with reused document IDs). Only one Scratchpad asset is held.
  const prior=this.scratchPeakAsset;
  const samePCM=prior&&prior.revision===d.revision&&prior.frames===d.frames&&
   prior.sampleRate===d.sampleRate&&prior.left===d.channels[0]&&prior.right===(d.channels[1]||null);
  if(!samePCM){
   const asset={channelCount:d.channels.length,leftSamples:d.channels[0],rightSamples:d.channels[1],monoSamples:d.channels[0],sampleRate:d.sampleRate};
   this.scratchPeakAsset={revision:d.revision,frames:d.frames,sampleRate:d.sampleRate,left:d.channels[0],right:d.channels[1]||null,asset};
  }
  drawStereo(ctx,this.scratchPeakAsset.asset,{startSec:0,durationSec:d.frames/Math.max(1,d.sampleRate)},w,h);
  const range=d.selection,from=Math.max(0,Math.min(w,range.start/Math.max(1,d.frames)*w)),to=Math.max(0,Math.min(w,range.end/Math.max(1,d.frames)*w));
  const vertical=(this.activeWorkspace==='scratch'?this.maskVertical:this.scratchContext?.maskVertical)||{top:0,bottom:1};
  const top=vertical.top*h,height=(vertical.bottom-vertical.top)*h;
  if(range.end>range.start){
   ctx.fillStyle='rgba(170,104,237,.26)';ctx.fillRect(from,top,Math.max(1,to-from),height);
   ctx.strokeStyle='#be9ffa';ctx.lineWidth=1.5;ctx.strokeRect(from+.5,top+.5,Math.max(1,to-from-1),Math.max(1,height-1));
  }
  this.scratchInfo&&(this.scratchInfo.textContent=`${(d.frames/d.sampleRate).toFixed(3)} s · ${d.channels.length===2?'Stereo':'Mono'} · ${d.frames} frames`);
 }
 onScratchPointerMove(event){
  if(this.activeWorkspace!=='scratch'||!this.doc){this.scratchCanvas.style.cursor='pointer';return}
  const gesture=this.selectionPointerRegion(event,this.scratchCanvas,this.doc,this.maskVertical,{start:0,end:this.doc.frames});
  this.scratchCanvas.style.cursor=gesture==='move'?'grab':gesture==='resize-left'||gesture==='resize-right'?'ew-resize':'crosshair';
 }
 beginScratchPointer(event){
  if(event.button!==0||!this.scratchContext)return;
  if(!this.changeWorkspace('scratch'))return;
  event.preventDefault();event.stopPropagation();
  const canvas=this.scratchCanvas,rect=canvas.getBoundingClientRect();if(!rect.width)return;
  const full={start:0,end:this.doc.frames},at=e=>Math.round(clamp((e.clientX-rect.left)/rect.width,0,1)*this.doc.frames);
  const mode=this.selectionPointerRegion(event,canvas,this.doc,this.maskVertical,full);
  if(mode==='select'&&this.doc.channels.length===2){
   const y=event.clientY-rect.top,requested=y<rect.height*.25?'L':y>rect.height*.75?'R':'all';
   if(this.channel!==requested)this.setChannel(requested);
  }
  const origin=at(event),prior={...this.doc.selection},vertical={...this.maskVertical},priorChannel=this.channel,id=event.pointerId;
  this.invalidate();
  const redraw=()=>{this.refresh(false);this.drawScratchpad()};
  const move=e=>{
   if(e.pointerId!==id)return;e.stopPropagation();
   if(mode==='move'){
    const span=prior.end-prior.start,shifted=clamp(prior.start+at(e)-origin,0,this.doc.frames-span);
    this.doc=core().setSelection(this.doc,shifted,shifted+span);
   }else if(mode==='resize-left')this.doc=core().setSelection(this.doc,at(e),prior.end);
   else if(mode==='resize-right')this.doc=core().setSelection(this.doc,prior.start,at(e));
   else this.doc=core().setSelection(this.doc,origin,at(e));
   redraw();
  };
  const clear=()=>{root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',finish,true);root.removeEventListener('pointercancel',cancel,true);root.removeEventListener('blur',cancel,true)};
  const finish=e=>{if(e?.pointerId!=null&&e.pointerId!==id)return;move(e);clear()};
  const cancel=e=>{if(e?.pointerId!=null&&e.pointerId!==id)return;clear();this.doc=core().setSelection(this.doc,prior.start,prior.end);this.maskVertical=vertical;if(this.channel!==priorChannel)this.setChannel(priorChannel,true);redraw()};
  root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',finish,true);root.addEventListener('pointercancel',cancel,true);root.addEventListener('blur',cancel,true);
 }
 setChannel(channel,preserveMask=false){
  if(this.doc?.channels.length<2&&channel!=='all')return;
  if(channel!==this.channel){this.lastResult=null;this.abort('choice')}
  this.channel=channel;
  this.syncFxTargetsToSelection();
  if(!preserveMask)this.maskVertical=channel==='L'?{top:0,bottom:.5}:channel==='R'?{top:.5,bottom:1}:{top:0,bottom:1};
  this.channelModes?.querySelectorAll('[data-xwe-channel-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.xweChannelMode===channel)));
  this.syncMixPaneTarget();
  this.options.onViewChange?.();this.setStatus(channel==='all'?'L+R linked · both channels selected.':`Channel ${channel} · editing the ${channel==='L'?'upper':'lower'} waveform.`);
 }
 toggleGoldenMove(event){
  if(!this.overlay||event.button!==0||!this.doc||this.activeWorkspace!=='project')return;
  if(this.selectionPointerRegion(event)!=='move')return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(!this.goldenMoveArmed&&this.nodes.length){this.warnUnappliedFx('Golden Move');return}
  this.goldenMoveArmed=!this.goldenMoveArmed;
  this.goldenGesture=null;
  this.setStatus(this.goldenMoveArmed
    ?'Golden Move armed · drag the top border to move and mix original PCM; double-click again to cancel.'
    :'Golden Move cancelled · purple selection moves normally.');
  this.options.onViewChange?.();
 }
 async applyGoldenMove(sourceRange,destination,channel){
  if(!this.doc||!this.goldenMoveArmed||this.activeWorkspace!=='project')return false;
  if(this.warnUnappliedFx('Golden Move'))return false;
  if(destination===sourceRange.start)return false;
  try{
   const next=core().edit(this.doc,{type:'moveMix',range:sourceRange,position:destination,channels:channel});
   if(next===this.doc)return false;
   await this.publish(next,'Golden Move & Mix');
   return true;
  }catch(error){this.setStatus(error.message||String(error));return false}
 }
 beginEditPointer(event){
  if(!this.overlay||event.button!==0||!this.doc)return;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  const target=this.options.detailCanvas,rect=target.getBoundingClientRect();
  if(!rect.width)return;
  // While the Wave Editor is expanded, the existing lower waveform is the edit surface.
  // Closed editor: keep the original P10 donor resize / nested selection gestures.
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  this.cancelEditGesture?.();
  const rate=this.doc.sampleRate,view=this.doc.viewport;
  const at=e=>clamp(Math.round(view.start+clamp((e.clientX-rect.left)/rect.width,0,1)*(view.end-view.start)),0,this.doc.frames);
  const prior={...this.doc.selection};
  const localY=event.clientY-rect.top;
  const stereo=this.doc.channels.length===2,half=rect.height/2;
  const laneTop=stereo&&this.channel==='R'?half:0;
  const laneBottom=stereo&&this.channel!=='all'?laneTop+half:rect.height;
  const inLane=localY>=laneTop&&localY<=laneBottom;
  const viewSpan=Math.max(1,view.end-view.start);
  const frameX=f=>rect.left+(f-view.start)/viewSpan*rect.width;
  const px=event.clientX;
  const hasRange=prior.start<prior.end;
  // Same region classifier drives cursor feedback and actual pointer gesture.
  const mode=this.selectionPointerRegion(event);
  // The two native stereo zero-lines are at height/4 and 3*height/4.
  // A fresh range/caret begins in L (above first line), L+R (between
  // lines), or R (below second line), regardless of the previous mode.
  // Edge resize and upper-border move retain their existing lane owner.
  if(mode==='select'&&stereo){
   const requested=localY<rect.height*.25?'L':localY>rect.height*.75?'R':'all';
   if(requested!==this.channel)this.setChannel(requested);
  }
  if(mode!=='move'&&this.goldenMoveArmed){this.goldenMoveArmed=false;this.goldenGesture=null;this.options.onViewChange?.()}
  const golden=mode==='move'&&this.goldenMoveArmed;
  const gesture={start:at(event),clientX:event.clientX,clientY:event.clientY,prior,vertical:{...this.maskVertical},priorChannel:this.channel,pointerId:event.pointerId,active:false,mode,golden};
  if(golden){
   if(this.nodes.length){this.warnUnappliedFx('Golden Move');return}
   this.goldenGesture={sourceStart:prior.start,sourceEnd:prior.end,channels:this.doc.channels};
  }
  this.selectionGestureActive=true;
  const move=e=>{
   if(e.pointerId!==gesture.pointerId)return;
   e.stopPropagation();
   if(!gesture.active&&Math.max(Math.abs(e.clientX-gesture.clientX),Math.abs(e.clientY-gesture.clientY))<4)return;
   if(!gesture.active)this.invalidate();gesture.active=true;
   if(gesture.mode==='move'){
    const span=gesture.prior.end-gesture.prior.start;
    const shifted=clamp(gesture.prior.start+at(e)-gesture.start,0,this.doc.frames-span);
    this.doc=core().setSelection(this.doc,shifted,shifted+span);
   }else if(gesture.mode==='resize-left'){
    this.doc=core().setSelection(this.doc,at(e),gesture.prior.end);
   }else if(gesture.mode==='resize-right'){
    this.doc=core().setSelection(this.doc,gesture.prior.start,at(e));
   }else this.doc=core().setSelection(this.doc,gesture.start,at(e));
   this.refresh(false);this.options.onViewChange?.();
  };
  const clear=()=>{root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',up,true);root.removeEventListener('pointercancel',cancel,true);root.removeEventListener('blur',cancel,true);this.cancelEditGesture=null;this.selectionGestureActive=false};
  const up=e=>{if(e.pointerId!==gesture.pointerId)return;e.stopPropagation();clear();
   if(gesture.golden){
    const destination=this.doc.selection.start;
    this.doc=core().setSelection(this.doc,gesture.prior.start,gesture.prior.end);
    this.goldenGesture=null;
    this.refresh(false);this.options.onViewChange?.();
    if(gesture.active&&destination!==gesture.prior.start)void this.applyGoldenMove(gesture.prior,destination,gesture.priorChannel);
    return;
   }
   if(gesture.active)this.applySelection();else if(gesture.mode==='select')this.setCursor(gesture.start);else {this.refresh(false);this.options.onViewChange?.()}
  };
  const cancel=e=>{if(e?.pointerId!=null&&e.pointerId!==gesture.pointerId)return;clear();this.goldenGesture=null;this.doc=core().setSelection(this.doc,gesture.prior.start,gesture.prior.end);this.maskVertical=gesture.vertical;if(this.channel!==gesture.priorChannel)this.setChannel(gesture.priorChannel,true);this.refresh(false);this.options.onViewChange?.()};
  this.cancelEditGesture=cancel;
  root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',up,true);root.addEventListener('pointercancel',cancel,true);root.addEventListener('blur',cancel,true);
 }

 // The visible L/R letters painted by drawStereo are the sole channel controls.
 // Never create a duplicate toolbar control, square badge, or a second pointer overlay.
 waveformChannelHit(event){
  if(!this.overlay||this.doc.channels.length!==2)return null;
  const canvas=event.currentTarget,rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const x=event.clientX-rect.left,y=event.clientY-rect.top,half=rect.height/2;
  const ch=y<25?'L':y>=half&&y<half+25?'R':null;
  if(x<18||x>48||!ch)return null;
  // The blue viewport's left/right resize handles ALWAYS win over channel labels.
  if(canvas===this.options.overviewCanvas){
   const view=this.doc.viewport,scale=rect.width/Math.max(1,this.doc.frames);
   if([view.start,view.end].some(frame=>Math.abs(x-frame*scale)<12))return null;
  }else{
   const view=this.doc.viewport,span=Math.max(1,view.end-view.start);
   if([this.doc.selection.start,this.doc.selection.end].some(frame=>Math.abs(x-(frame-view.start)/span*rect.width)<10))return null;
  }
  return ch;
 }
 handleChannelPointerDown(event){
  if(event.button!==0)return;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  const ch=this.waveformChannelHit(event);
  if(!ch)return;
  event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
  this.setChannel(ch);
 }
 attachLoopMaskResize(){
  const canvas=this.options.detailCanvas;
  canvas.dataset.xweWorkspaceResize='true';
  this.detailResizeMove=e=>{
   const r=canvas.getBoundingClientRect();
   const near=e.clientY>=r.bottom-11&&e.clientY<=r.bottom+3;
   canvas.dataset.xweWorkspaceEdge=String(near);
  };
  this.detailResizeDown=e=>{
   if(e.button!==0)return;
   const r=canvas.getBoundingClientRect();
   if(e.clientY<r.bottom-11||e.clientY>r.bottom+3)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   const initial=canvas.getBoundingClientRect().height,top=e.clientY,id=e.pointerId;
   let scheduled=0,pending=Math.round(initial);
   const queueHeight=y=>{
    pending=Math.round(clamp(initial+(y-top),124,500));
    if(scheduled)return;
    scheduled=root.requestAnimationFrame(()=>{scheduled=0;canvas.style.height=pending+'px'});
   };
   const finish=y=>{
    if(scheduled){root.cancelAnimationFrame(scheduled);scheduled=0}
    pending=Math.round(clamp(initial+(y-top),124,500));
    canvas.style.height=pending+'px';
    // Reallocate the bitmap ONCE at pointer release. Doing this on every
    // pointermove cleared the waveform each time and caused visible flashes.
    const pixels=Math.max(124,Math.round(pending*canvas.width/Math.max(1,r.width)));
    if(canvas.height!==pixels)canvas.height=pixels;
    this.options.onViewChange?.();
   };
   const move=ev=>{if(ev.pointerId===id)queueHeight(ev.clientY)};
   const up=ev=>{if(ev.pointerId!==id)return;finish(ev.clientY);clean()};
   const cancel=()=>{if(scheduled){root.cancelAnimationFrame(scheduled);scheduled=0}clean()};
   const clean=()=>{root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',up,true);root.removeEventListener('pointercancel',cancel,true)};
   root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',up,true);root.addEventListener('pointercancel',cancel,true);
  };
  canvas.addEventListener('pointermove',this.detailResizeMove,true);
  canvas.addEventListener('pointerdown',this.detailResizeDown,true);
 }
 onWavePointerMove(event){
  const canvas=event.currentTarget,ch=this.waveformChannelHit(event);
  const old=this.hoverChannelLabel;
  if(ch){
   canvas.dataset.xweHoverHit='channel';
   if(!old||old.canvas!==canvas||old.channel!==ch){this.hoverChannelLabel={canvas,channel:ch};this.options.onViewChange?.()}
   return;
  }
  if(old?.canvas===canvas){this.hoverChannelLabel=null;this.options.onViewChange?.()}
  if(canvas!==this.options.detailCanvas||!this.overlay){delete canvas.dataset.xweHoverHit;return}
  const region=this.selectionPointerRegion(event);
  if(region==='move'||region==='resize-left'||region==='resize-right')canvas.dataset.xweHoverHit=region;
  else delete canvas.dataset.xweHoverHit;
 }
 onWavePointerLeave(event){
  const canvas=event.currentTarget;
  delete canvas.dataset.xweHoverHit;
  if(this.hoverChannelLabel?.canvas===canvas){this.hoverChannelLabel=null;this.options.onViewChange?.()}
 }
 selectionPointerRegion(event,canvas=this.options.detailCanvas,doc=this.doc,mask=this.maskVertical,view=doc?.viewport){
  if(!this.overlay||!doc)return 'select';
  const rect=canvas.getBoundingClientRect();
  const selection=doc.selection;
  if(selection.end<=selection.start)return 'select';
  const y=event.clientY-rect.top,x=event.clientX-rect.left;
  const vertical=mask||{top:0,bottom:1};
  const laneTop=rect.height*vertical.top,laneBottom=rect.height*vertical.bottom;
  if(y<laneTop||y>laneBottom)return 'select';
  const span=Math.max(1,view.end-view.start);
  const left=(selection.start-view.start)/span*rect.width,right=(selection.end-view.start)/span*rect.width;
  if(left>=0&&left<=rect.width&&Math.abs(x-left)<=9)return 'resize-left';
  if(right>=0&&right<=rect.width&&Math.abs(x-right)<=9)return 'resize-right';
  if(x>left&&x<right&&Math.abs(y-laneTop)<=Math.max(5,Math.min(8,rect.height*.07)))return 'move';
  // W17: no bottom edge on the purple mask; resize belongs to the entire
  // Loop Mask waveform's outer lower border (separate workflow).
  return 'select';
 }
 drawEditOverlay(ctx,view,w,h){
  if(!this.overlay||!this.doc||!view?.durationSec)return;
  if(this.activeWorkspace==='scratch')return;
  if(this.doc.markers?.length){
   ctx.save();ctx.fillStyle='rgba(107,241,210,.95)';ctx.strokeStyle='#6bf1d2';ctx.lineWidth=1.5;
   const visibleStart=view.startSec,visibleEnd=view.startSec+view.durationSec;
   for(const frame of this.doc.markers){
    const sec=frame/this.doc.sampleRate;
    if(sec<visibleStart||sec>visibleEnd)continue;
    const mx=Math.round((sec-visibleStart)/view.durationSec*w)+.5;
    ctx.beginPath();ctx.moveTo(mx-5,.5);ctx.lineTo(mx+5,.5);ctx.lineTo(mx,9);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(mx,9);ctx.lineTo(mx,16);ctx.stroke();
   }
   ctx.restore();
  }
  const a=this.doc.selection.start/this.doc.sampleRate,b=this.doc.selection.end/this.doc.sampleRate;
  if(b<view.startSec||a>view.startSec+view.durationSec)return;
  const x=clamp((a-view.startSec)/view.durationSec*w,0,w),end=clamp((b-view.startSec)/view.durationSec*w,0,w);
  const stereo=this.doc.channels.length===2;
  const vertical=this.maskVertical||{top:0,bottom:1};
  const y=h*vertical.top,laneH=h*(vertical.bottom-vertical.top);
  ctx.save();ctx.lineWidth=1;
  if(a===b){ctx.lineWidth=1.35;ctx.strokeStyle='#fbbf24';ctx.beginPath();ctx.moveTo(Math.round(x)+.5,y);ctx.lineTo(Math.round(x)+.5,y+laneH);ctx.stroke()}
  else{
   ctx.fillStyle='rgba(168,85,247,.16)';ctx.fillRect(x,y,end-x,laneH);
   if(this.goldenMoveArmed){
    // The actual edited PCM is unchanged during drag; draw a light ghost
    // from source samples, sampled at a bounded per-pixel cost.
    const ghost=this.goldenGesture;
    if(ghost&&this.selectionGestureActive){
     const frames=ghost.sourceEnd-ghost.sourceStart;
     const columns=Math.min(1200,Math.max(1,Math.round(end-x)));
     const selected=this.channel==='all'?ghost.channels.map((_,i)=>i):[this.channel==='R'?1:0];
     ctx.fillStyle='rgba(255,215,90,.78)';
     for(const c of selected){
      const cy=y+laneH*(ghost.channels.length===2&&this.channel==='all'?(c===0?.25:.75):.5);
      const hh=laneH*(ghost.channels.length===2&&this.channel==='all'?.24:.46);
      const channel=ghost.channels[c];
      for(let col=0;col<columns;col++){
       const lo=Math.floor(frames*col/columns),hi=Math.max(lo+1,Math.ceil(frames*(col+1)/columns));
       let min=0,max=0;
       for(let j=lo;j<hi;j+=Math.max(1,Math.floor((hi-lo)/8))){const v=channel[ghost.sourceStart+j]||0;min=Math.min(min,v);max=Math.max(max,v)}
       const top=cy-Math.min(1,max)*hh,btm=cy-Math.max(-1,min)*hh;
       ctx.fillRect(x+col*(end-x)/columns,top,Math.max(.7,(end-x)/columns),Math.max(1,btm-top));
      }
     }
    }
   }
   ctx.strokeStyle=this.goldenMoveArmed?'#f6c453':'rgba(192,132,252,.85)';
   ctx.lineWidth=this.goldenMoveArmed?2.2:1;
   ctx.strokeRect(x+.5,y+.5,Math.max(1,end-x-1),Math.max(1,laneH-1));
  }
  ctx.restore();
 }


 update(options){
  this.options=options;
  if(!options.source)return;
  let fresh=false;
  if(this.source?.sourceAsset!==options.source.sourceAsset){
   if(this.committedAsset!==options.source.sourceAsset){
    this.abort();if(this.goldenGesture)this.cancelEditGesture?.();this.goldenMoveArmed=false;this.goldenGesture=null;
    this.doc=core().create(options.source,{selection:options.selection,viewport:options.selection?.detailViewport});
    this.scratchContext=null;this.projectContext=null;this.activeWorkspace='project';this.triangleZeroSource=null;
    this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;this.lastResult=null;fresh=true;
    this.stopBluePan();
  if(this.doc.restoreWarning)this.setStatus(this.doc.restoreWarning);
   }
   this.source=options.source;
  }
  let activeSelectionChanged=false;
  if(this.doc&&options.selection){
   // P2: the parent Import Audio navigator is a separate selection owner.
   // When Scratchpad is active, update the dormant *project* document instead
   // of erroneously moving the independent scratch selection.
   const context=this.activeWorkspace==='scratch'&&this.projectContext?this.projectContext:null;
   const owner=context||this;
   const rate=owner.doc.sampleRate,range=options.selection.fineLoopRange,view=options.selection.detailViewport;
   const rangeChanged=range&&(fresh||!this.incomingRange||range.startSec!==this.incomingRange.startSec||range.durationSec!==this.incomingRange.durationSec);
   const viewChanged=view&&(fresh||!this.incomingViewport||view.startSec!==this.incomingViewport.startSec||view.durationSec!==this.incomingViewport.durationSec);
   // Record the parent's new values before requesting any UI refresh: a
   // synchronous React rerender must not see the same update as new again.
   const outgoingEcho=!!(range&&this.pendingOutgoingRange&&range.startSec===this.pendingOutgoingRange.startSec&&range.durationSec===this.pendingOutgoingRange.durationSec);
   if(range){this.incomingRange={startSec:range.startSec,durationSec:range.durationSec};if(outgoingEcho)this.pendingOutgoingRange=null;}
   if(view)this.incomingViewport={startSec:view.startSec,durationSec:view.durationSec};
   // Do not overwrite a live pointer gesture or the editor's local caret with
   // an echo of the last outgoing parent selection.
   if(rangeChanged&&!this.selectionGestureActive&&!outgoingEcho){
    this.goldenMoveArmed=false;this.goldenGesture=null;
    const previous=owner.doc.selection;
    const selected=core().setSelection(owner.doc,Math.round(range.startSec*rate),Math.round((range.startSec+range.durationSec)*rate));
    if(selected.selection.start!==previous.start||selected.selection.end!==previous.end){
     owner.doc=selected;
     if(!context){activeSelectionChanged=true;this.invalidate();if(this.audioNode)this.stopAudio();} // stale preview must not keep playing
     else context.lastResult=null;
     this.syncFxTargetsToSelection(context);
     if(!context&&this.nodes.length&&this.curveHint&&selected.selection.end<=selected.selection.start){
      this.curveHint.textContent='No active time range · select a purple region before Preview FX or Apply.';
     }
    }
   }
   if(viewChanged&&core().setViewport)owner.doc=core().setViewport(owner.doc,Math.round(view.startSec*rate),Math.round((view.startSec+view.durationSec)*rate));
  }
  if(this.overlay){
   this.refresh(false);
   if(activeSelectionChanged&&this.nodes.length){
    this.drawParameters();
    if(this.doc.selection.end<=this.doc.selection.start&&this.curveHint)
     this.curveHint.textContent='No active time range · select a purple region before Preview FX or Apply.';
   }
  }
 }

 dispose(){this.stopBluePan();root.removeEventListener('blur',this.bluePanStopOnBlur);document.removeEventListener('visibilitychange',this.bluePanStopOnVisibility);this.scratchPeakAsset=null;this.clearP5Warning();this.eqUnsubscribe?.();this.releaseOfflineEQState();this.closeMixPane();this.abort();this.stopAudio();this.close();this.closeMenu();this.cancelEditGesture?.();this.launch?.remove();for(const canvas of [this.options.overviewCanvas,this.options.detailCanvas])if(canvas){canvas.removeEventListener('pointerdown',this.channelPointerDown,true);canvas.removeEventListener('pointermove',this.hoverPointerMove,true);canvas.removeEventListener('pointerleave',this.hoverPointerLeave,true);canvasOwners.delete(canvas);delete canvas.dataset.xweHoverHit}
 this.options.detailCanvas.removeEventListener('pointerdown',this.editPointerDown,true);this.options.detailCanvas.removeEventListener('dblclick',this.goldenDoubleClick,true);this.options.detailCanvas.removeEventListener('pointermove',this.detailResizeMove,true);this.options.detailCanvas.removeEventListener('pointerdown',this.detailResizeDown,true);this.options.detailCanvas.removeEventListener('contextmenu',this.context);this.options.overviewCanvas?.removeEventListener('contextmenu',this.context);document.removeEventListener('keydown',this.key,true)}
 setStatus(text){this.clearP5Warning();this.status=text;if(this.statusElement)this.statusElement.textContent=text}
 clearP5Warning(){if(this.p5WarningTimer!=null){root.clearTimeout(this.p5WarningTimer);this.p5WarningTimer=null}this.statusElement?.classList.remove('xwe-p5-warning')}
 warnUnappliedFx(operation='Audio edit'){
  if(!this.nodes?.length)return false;
  this.setStatus(`${operation} not applied · ${this.nodes.length} unapplied effect stage(s) preserved. Use Apply / Bake, or remove the stages (×) first.`);
  // W12 uses an invisible ARIA status. Only a blocked action needs brief visible feedback.
  if(this.statusElement){this.statusElement.classList.add('xwe-p5-warning');this.p5WarningTimer=root.setTimeout(()=>this.clearP5Warning(),5000)}
  return true;
 }
 setEnabled(value){this.enabled=value;this.options.onViewChange?.();this.launch?.setAttribute('aria-pressed',String(value))}
 range(){return {...this.doc.selection}}
 target(){return this.channel==='all'?'all':this.channel}
 // Keep every unapplied chain stage attached to the SINGLE visible purple range.
 // Morph automation is stored in absolute frames, so rebase it relatively whenever
 // the range moves/resizes; all stages and L/R ownership move together.
 syncFxTargetsToSelection(context=null){
  const owner=context||this,doc=owner.doc,nodes=owner.nodes;
  if(!doc||!nodes?.length)return false;
  const target={...doc.selection},channels=owner.channel==='all'?'all':owner.channel;
  if(!(target.end>target.start))return false; // A caret is not a valid FX range.
  let changed=false;
  for(const node of nodes){
   const old=node.targetRange||target;
   if(old.start===target.start&&old.end===target.end&&node.channels===channels)continue;
   const oldSpan=Math.max(1,old.end-old.start-1),newSpan=Math.max(1,target.end-target.start-1);
   if(old.start!==target.start||old.end!==target.end){
    const remap=points=>points.map(point=>({...point,frame:Math.round(target.start+clamp((point.frame-old.start)/oldSpan,0,1)*newSpan)}));
    for(const lane of Object.values(node.automation||{})){
     if(Array.isArray(lane?.points))lane.points=remap(lane.points);
    }
    // Undo snapshots are absolute too. Otherwise a later Morph Undo resurrects
    // automation from the old, now invisible location.
    for(const history of owner.curveHistory||[]){
     if(history.id===node.id&&Array.isArray(history.lane?.points))history.lane.points=remap(history.lane.points);
    }
   }
   node.targetRange={...target};node.channels=channels;changed=true;
  }
  if(changed&&!context){this.invalidate();this.requestMorphRefresh()}
  return changed;
 }
 // A cursor-only selection used to silently create a zero-frame FX stage
 // (and therefore no Morph). Honor the whole-audio default visibly.
 ensureEffectSelection(){
  if(!this.doc||this.doc.selection.end>this.doc.selection.start)return;
  this.doc=core().setSelection(this.doc,0,this.doc.frames);
  this.applySelection();this.refresh(false);
  this.setStatus('No range selected · the entire audio is now selected for the effect.');
 }
 abort(reason='replace'){
  this.renderToken++;
  const controller=this.controller;
  const job=this.computeJob;
  this.controller=null;
  if(controller&&!controller.signal.aborted)controller.abort();
  if(job)this.finishComputeFeedback(job.token,reason==='choice'||reason==='manual');
 }
 beginComputeFeedback(token){
  this.clearComputeNotice();
  const job={token,startedAt:root.performance.now(),showTimer:null,longTimer:null};
  this.computeJob=job;
  if(this.computeStrip){this.computeStrip.hidden=true;this.progressElement.hidden=false;this.progressElement.removeAttribute('value');this.computeCancel.hidden=true;this.computeMessage.textContent='Processing…';}
  job.showTimer=root.setTimeout(()=>{
   if(this.computeJob!==job||!this.controller||this.controller.signal.aborted)return;
   this.computeStrip.hidden=false;
  },700);
  job.longTimer=root.setTimeout(()=>{
   if(this.computeJob!==job||!this.controller||this.controller.signal.aborted)return;
   this.computeStrip.hidden=false;this.computeCancel.hidden=false;
  },20000);
 }
 clearComputeNotice(){
  if(this.computeNoticeTimer!=null){root.clearTimeout(this.computeNoticeTimer);this.computeNoticeTimer=null;}
 }
 finishComputeFeedback(token,interrupted=false){
  const job=this.computeJob;
  if(!job||job.token!==token)return;
  root.clearTimeout(job.showTimer);root.clearTimeout(job.longTimer);
  this.computeJob=null;
  if(!this.computeStrip)return;
  this.computeCancel.hidden=true;
  // Don't flash for subsecond invisible work; explicitly stopping stale long work
  // is shown briefly, without adding a permanent button or shifting the panel.
  if(interrupted&&(root.performance.now()-job.startedAt>=600||!this.computeStrip.hidden)){
   this.computeStrip.hidden=false;this.progressElement.hidden=true;
   this.computeMessage.textContent='Interrupted';
   this.clearComputeNotice();
   this.computeNoticeTimer=root.setTimeout(()=>{if(!this.computeJob&&this.computeStrip){this.computeStrip.hidden=true;this.progressElement.hidden=false;}this.computeNoticeTimer=null;},1450);
  }else{this.computeStrip.hidden=true;this.progressElement.hidden=false;}
 }
 async publish(next,message,{consumeChain=false}={}){
  if(!next)return false;
  if(next===this.doc){this.setStatus('Nothing changed.');return false;}
  if(this.nodes.length&&!consumeChain)return !this.warnUnappliedFx(message||'Audio edit');
  if(this.activeWorkspace==='scratch'){
   this.retainExpandedScratchHeight();
   this.abort();this.doc=next;this.lastResult=null;this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;
   this.scratchContext=this.workspaceSnapshot();this.refresh();this.drawScratchpad();
   this.setStatus(message+' · Scratchpad only · revision '+next.revision);return;
  }
  this.goldenMoveArmed=false;this.goldenGesture=null;this.abort();this.doc=next;
  if(next.channels.length===1&&this.channel==='R')this.channel='all';
  this.lastResult=null;this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;
  const result=core().materialize(next,this.source);
  if(next.selection.start===next.selection.end&&result.selection?.fineLoopRange){
   const prior=this.options.selection?.fineLoopRange;
   // The Wave caret is local. Loop/Donor consumers must not receive a zero-duration region.
   const sr=next.sampleRate,min=next.frames?1/sr:0;
   const originalFrames=Math.round((prior?.durationSec||min)*sr);
   const length=Math.min(next.frames,Math.max(next.frames?1:0,originalFrames));
   const start=Math.min(Math.max(0,next.frames-length),Math.round((prior?.startSec||0)*sr));
   result.selection.fineLoopRange={startSec:start/sr,durationSec:length/sr};
   this.pendingOutgoingRange={...result.selection.fineLoopRange};
  }
  this.committedAsset=result.source.sourceAsset;this.source=result.source;
  if(!this.triangleGainPending){this.triangleZeroSource=null;globalThis.__XenForgeRawGain?.resetEditorGain()}
  globalThis.__XenForgeRawGain?.rebindCommitted(result.source);
  this.options.onCommit(result);
  this.options.onViewChange?.();
  this.drawScratchpad();this.setStatus(message+' · revision '+next.revision+(next.history.lastWarning?' · '+next.history.lastWarning:''));
  this.refresh();
 }

 async applyTriangleGain(next,prior){
  if(!this.overlay||this.activeWorkspace!=='project'||!this.doc)return false;
  if(this.warnUnappliedFx('Triangle Gain'))return false;
  if(!Number.isFinite(next)||next<0||next>4||!Number.isFinite(prior)||prior<0||prior>4)return false;
  if(next===prior)return true;
  const current=this.doc;
  let reference=current,factor;
  if(prior===0){
   const zero=this.triangleZeroSource;
   if(!zero||zero.doc.frames!==current.frames||zero.doc.channels.length!==current.channels.length){
    this.setStatus('Gain from mute needs an unchanged audio document; Undo restores the earlier audio.');return false;
   }
   reference=zero.doc;factor=next/zero.gain;
  }else{
   factor=next/prior;
   if(next===0)this.triangleZeroSource={doc:current,gain:prior};
  }
  try{
   // Compute from frozen source channels, then publish one atomic render. Never
   // modify the clipboard or rescale later Insert / Mix Paste operations.
   const channels=reference.channels.map(input=>{
    const output=new Float32Array(input.length);
    for(let i=0;i<input.length;i++){
     const sample=input[i]*factor;
     if(!Number.isFinite(sample)||Math.abs(sample)>3.4028234663852886e38)
       throw Error('Gain would exceed the supported Float32 amplitude; audio unchanged.');
     output[i]=sample;
    }
    return output;
   });
   const result={documentId:current.id,revision:current.revision,
     channels,sampleRate:current.sampleRate,selection:{...current.selection}};
   const edited=core().commitRender(current,result);
   if(edited===current)return true;
   this.triangleGainPending=true;
   try{await this.publish(edited,'Triangle Gain '+(next===0?'mute':(20*Math.log10(next)).toFixed(1)+' dB'))}
   finally{this.triangleGainPending=false}
   if(prior===0||next>0)this.triangleZeroSource=null;
   return true;
  }catch(error){
   if(next===0)this.triangleZeroSource=null;
   this.setStatus(error.message||String(error));return false;
  }
 }

 async runEdit(type,extra={}){try{if(!this.doc)return;
  // P5: no destructive edit, document undo or redo may silently clear a draft FX chain.
  // Copy/navigation and the separate Morph-curve undo remain independent.
  if(type!=='copy'&&this.nodes.length){
   if(type==='undo'&&!this.doc.history.past.length)return;
   if(type==='redo'&&!this.doc.history.future.length)return;
   this.warnUnappliedFx(this.operationLabel(type));return;
  }
  const autoWhole=this.activeWorkspace==='scratch'&&!['undo','redo'].includes(type)?this.ensureScratchSelection():false;
  if(type==='copy'){clipboard=core().copy(this.doc,this.range(),this.target());this.setStatus(`${clipboard.frames} frames copied across ${clipboard.channels.length} channel(s).`);return}if(type==='undo'||type==='redo'){if(!(type==='undo'?this.doc.history.past.length:this.doc.history.future.length))return;await this.publish(core()[type](this.doc),type==='undo'?'Edit undone':'Edit redone');return}const selection=this.range();const op={type:type==='insert'&&selection.start<selection.end?'replace':type,range:selection,channels:this.target(),...extra};if(['insert','overwrite','replace','mix'].includes(type)){if(!clipboard?.frames)throw Error('Copy an audio selection first.');op.clipboard=clipboard}if(type==='cut')clipboard=core().copy(this.doc,this.range(),this.target());if(type==='insertSilence'){op.frames=Math.max(1,Math.round(Number(this.silenceInput?.value||1)*this.doc.sampleRate));op.durationFrames=op.frames;op.durationSec=op.frames/this.doc.sampleRate}if(type==='gain')op.db=Number(this.gainInput?.value||0);if(type==='normalize')op.targetDb=-1;if(type==='mix'){op.limitToSelection=true;op.existingGain=1;op.insertGain=1;op.crossfadeFrames=0;op.clip=false}await this.publish(core().edit(this.doc,op),this.operationLabel(type)+' applied');
  if(this.activeWorkspace==='scratch'&&this.doc?.frames>0&&type!=='cut'&&autoWhole){
   // A whole-pad action stays visibly whole; never expand a deliberate subset.
   this.doc=core().setSelection(this.doc,0,this.doc.frames);
   this.refresh(false);this.drawScratchpad();
  }
 }catch(error){this.setStatus(error.message||String(error))}}
 operationLabel(type){return({copy:'Copy',cut:'Cut',insert:'Insert',overwrite:'Overwrite',replace:'Replace Selection',mix:'Mix Paste',delete:'Ripple Delete',trim:'Trim to Selection',silence:'Mute Selection',reverse:'Reverse',invert:'Invert Polarity',normalize:'Normalize −1 dB',dcRemove:'Remove DC',gain:'Amplify',fadeIn:'Fade-in',fadeOut:'Fade-out',insertSilence:'Insert Silence',split:'Add Split Marker',toMono:'Convert to Mono',toStereo:'Convert to Stereo',undo:'Undo',redo:'Redo'})[type]||type}
 contextMenu(event){
  if(!this.doc)return;
  const surface=event.currentTarget;
  const scratch=surface===this.scratchCanvas;
  if(scratch){if(this.activeWorkspace!=='scratch')this.changeWorkspace('scratch')}
  else if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  if(!scratch&&surface!==this.options.overviewCanvas&&surface!==this.options.detailCanvas)return;
  const bounds=surface.getBoundingClientRect();
  if(!bounds.width)return;
  const sec=this.doc.sampleRate,full={start:0,end:this.doc.frames},zoom=this.doc.viewport;
  const display=scratch?full:surface===this.options.overviewCanvas?full:zoom;
  const fraction=clamp((event.clientX-bounds.left)/bounds.width,0,1);
  const at=clamp(Math.round(display.start+fraction*(display.end-display.start)),0,this.doc.frames);
  event.preventDefault();event.stopPropagation();
  // Scratch context preserves empty selection: choosing a command will visibly
  // promote the entire pad. The project keeps its original caret semantics.
  if(!scratch&&(at<this.doc.selection.start||at>this.doc.selection.end||this.doc.selection.start===this.doc.selection.end)){
   this.invalidate();this.doc=core().setSelection(this.doc,at,at);
   this.refresh(false);this.options.onViewChange?.();
  }
  this.contextTarget=surface;
  // A context menu is NOT an opened Wave Editor. The Import Audio owner
  // must continue drawing the purple mask until the editor is actually mounted.
  if(this.overlay)this.setEnabled(true);
  this.menuX=event.clientX;this.menuY=event.clientY;
  this.menuPage('root');
 }

 closeMenu(){this.menu?.remove();this.menu=null;if(this.menuOutside)document.removeEventListener('pointerdown',this.menuOutside,true);if(this.menuKey)document.removeEventListener('keydown',this.menuKey,true)}
 menuPage(page){this.closeMenu();const menu=$('div',{class:'xwe-menu',role:'menu','aria-label':'Wave Editor Context Menu'});this.menu=menu;const row=(label,action)=>menu.append(button(label,()=>{this.closeMenu();action()},{role:'menuitem'}));if(page!=='root')row('‹ Back',()=>this.menuPage('root'));menu.append($('div',{class:'xwe-menu-title'},page==='root'?'Wave Editor · Selection':page));if(page==='root'){row('Open Editor & Effect Chain',()=>this.open());row('Edit ›',()=>this.menuPage('Edit'));for(const c of [...new Set(selectableEffects().map(category))])if(c!=='Stereo & Channels')row(c+' ›',()=>this.menuPage(c));row('Stereo & Channels ›',()=>this.menuPage('Stereo & Channels'));row('Analyze · Peaks / RMS',()=>{this.open();this.analyze()});row('Export WAV',()=>{this.open();this.downloadWav()})}else if(page==='Edit'){for(const key of ['undo','redo','copy','cut','insert','overwrite','mix','delete','trim','split','insertSilence','silence','reverse','invert','normalize','dcRemove'])row(this.operationLabel(key),()=>{if(key==='insertSilence'){this.open();this.runEdit('insertSilence')}else if(key==='mix'){this.open();this.openMixPane()}else this.runEdit(key)});row('Envelope',()=>this.openVolumeEnvelope())}else if(page==='Stereo & Channels'){row('Both Channels Linked',()=>{this.open();this.setChannel('all')});row('Edit L Only',()=>{this.open();this.setChannel('L')});if(this.doc.channels.length>1)row('Edit R Only',()=>{this.open();this.setChannel('R')});row('Convert to Mono',()=>this.runEdit('toMono'));row('Convert to Stereo',()=>this.runEdit('toStereo'));for(const effect of selectableEffects().filter(x=>category(x)===page))row(displayEffect(effect),()=>{this.open();this.addNode(effect.type)})}else for(const effect of selectableEffects().filter(x=>category(x)===page))row(displayEffect(effect),()=>{this.open();this.addNode(effect.type)});document.body.append(menu);const box=menu.getBoundingClientRect();menu.style.left=clamp(this.menuX,8,Math.max(8,innerWidth-box.width-8))+'px';menu.style.top=clamp(this.menuY,8,Math.max(8,innerHeight-box.height-8))+'px';this.menuOutside=e=>{if(!menu.contains(e.target))this.closeMenu()};this.menuKey=e=>{const items=[...menu.querySelectorAll('button')],index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();this.closeMenu();this.contextTarget?.focus?.()}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}if(e.key==='ArrowLeft'&&page!=='root'){e.preventDefault();this.menuPage('root')}};document.addEventListener('pointerdown',this.menuOutside,true);document.addEventListener('keydown',this.menuKey,true);menu.querySelector('button')?.focus()}
 open(){
  if(!this.doc)return;
  this.closeMenu();
  if(this.overlay){this.dialog.querySelector('button')?.focus({preventScroll:true});return}
  const region=this.options.detailCanvas.closest('[data-material-intake-gateway="true"]')||document;
  const host=region.querySelector('[data-xwe-inline-slot="true"]');
  if(!host){this.setEnabled(false);this.setStatus('Wave Editor mount point not found next to the material timeline.');return}
  this.setEnabled(true);
  this.previousFocus=document.activeElement;
  this.overlay=$('div',{class:'xwe-inline','data-xwe-editor':'open'});
  this.dialog=$('section',{class:'xwe-dialog',role:'region','aria-label':'XenSonar Stereo Wave Editor'});
  this.overlay.append(this.dialog);host.append(this.overlay);
  this.build();globalThis.__XenForgeRawGain?.setMode('gain',this);this.refresh();
  root.dispatchEvent(new CustomEvent('xensonar:wave-editor-visibility',{detail:{open:true}}));
  this.dialog.querySelector('button')?.focus({preventScroll:true});
 }
 close(){
  if(globalThis.__XenMultitrackRoundTrip?.bound(this)){globalThis.__XenMultitrackRoundTrip.cancel('Wave Editor closed without applying the linked Multitrack edit.');window.dispatchEvent(new CustomEvent('xensonar:multitrack:roundtrip-navigate',{detail:{room:'MULTITRACK'}}));}
   this.goldenMoveArmed=false;this.goldenGesture=null;this.stopBluePan();this.clearP5Warning();this.abort();this.stopAudio();this.cancelEditGesture?.();this.closeMixPane();
  const wasOpen=!!this.overlay;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  this.overlay?.remove();this.overlay=null;this.dialog=null;for(const canvas of [this.options.overviewCanvas,this.options.detailCanvas])if(canvas)delete canvas.dataset.xweHoverHit;this.hoverChannelLabel=null;
  if(wasOpen)root.dispatchEvent(new CustomEvent('xensonar:wave-editor-visibility',{detail:{open:false}}));
  if(wasOpen){globalThis.__XenForgeRawGain?.setMode('volume');this.setEnabled(false);this.previousFocus?.focus?.({preventScroll:true})}
 }

 closeMixPane(){this.mixPopover?.remove();this.mixPopover=null}
 // Mix Paste has no independent target snapshot: the Wave Editor document and
 // channel owner remain authoritative while the popup is open.
 syncMixPaneTarget(){
  const pane=this.mixPopover,doc=this.doc;
  if(!pane||!doc)return;
  const selected=doc.channels.length===1?'all':this.channel;
  for(const input of pane.querySelectorAll('[data-xwe-mix-channel]')){
   const ch=input.dataset.xweMixChannel;
   input.disabled=doc.channels.length===1?ch==='R':selected!=='all'&&selected!==ch;
  }
  const target=pane.querySelector('[data-xwe-mix-target]');
  if(target){
   const {start,end}=doc.selection;
   const lane=doc.channels.length===1?'Mono':selected==='all'?'L+R':selected;
   const location=start===end?`caret at frame ${start}`:`selection ${start}–${end}`;
   const label=`Target: ${lane} · ${location} · ${fmt(start/doc.sampleRate,6)} s`;
   if(target.textContent!==label)target.textContent=label;
  }
 }
 openMixPane(){
  if(!this.doc)return;
  if(this.warnUnappliedFx('Mix Paste'))return;
  if(!this.overlay){this.open();if(!this.overlay)return}
  this.closeMixPane();
  if(!clipboard){this.setStatus('Mix Paste: copy audio first.');return}
  const pane=$('div',{class:'xwe-mix-popup',role:'dialog','aria-label':'Mix Paste – Stereo','data-xwe-mix-dialog':'true'});
  this.mixPopover=pane;
  pane.append($('h3',{},'Mix Paste · Added Audio'),$('p',{class:'xwe-small'},'7% added = 0.07× the clipboard signal. Existing audio stays at 100% unless you change it below.'));
  // Accessible confirmation of the live editor target; never an error or lock.
  pane.append($('p',{class:'xwe-small','data-xwe-mix-target':'true'}));
  const fields=$('div',{class:'xwe-mix-fields'}),values=this.mixPrefs||{existingL:100,insertL:100,existingR:100,insertR:100};
  const inputs={};
  for(const [key,label,ch] of [['insertL','Added audio L (%)','L'],['insertR','Added audio R (%)','R'],['existingL','Existing audio L (%)','L'],['existingR','Existing audio R (%)','R']]){
   const row=$('label',{class:'xwe-mix-field'},label);
   const input=$('input',{type:'number',min:0,max:400,step:1,'aria-label':label,'data-xwe-mix-channel':ch});
   input.value=String(values[key]);
   row.append(input);fields.append(row);inputs[key]=input;
  }
  const linkRow=$('label',{class:'xwe-mix-link'},'Link added L/R levels');
  const link=$('input',{type:'checkbox','aria-label':'Link added L/R levels'});
  link.checked=this.mixLinkChannels!==false;
  linkRow.prepend(link);
  link.addEventListener('change',()=>{
   if(!link.checked)return;
   const from=this.channel==='R'?'insertR':'insertL',to=from==='insertR'?'insertL':'insertR';
   inputs[to].value=inputs[from].value;
  });
  for(const [which,other] of [['insertL','insertR'],['insertR','insertL']]){
   inputs[which].addEventListener('input',()=>{if(link.checked)inputs[other].value=inputs[which].value});
  }
  pane.append(fields,linkRow);
  const actions=$('div',{class:'xwe-mix-actions'});
  actions.append(button('Cancel',()=>this.closeMixPane()),button('Mix',()=>{
   const next={};
   for(const [key,input] of Object.entries(inputs)){
    const n=Number(input.value);
    if(!Number.isFinite(n)||n<0||n>400){input.focus();this.setStatus('Mix Paste: enter percentages from 0 to 400.');return}
    next[key]=n;
   }
   this.mixPrefs=next;this.mixLinkChannels=link.checked;this.closeMixPane();
   this.runEdit('mix',{existingGainPerChannel:[next.existingL/100,next.existingR/100],insertGainPerChannel:[next.insertL/100,next.insertR/100]});
  },{class:'xwe-primary'}));
  pane.append(actions);this.dialog.append(pane);
  this.syncMixPaneTarget();
  const btn=this.dialog.querySelector('[data-xwe-mix-trigger]');
  const rect=btn?.getBoundingClientRect()||this.dialog.getBoundingClientRect(),box=pane.getBoundingClientRect();
  pane.style.left=clamp(rect.left,8,Math.max(8,innerWidth-box.width-8))+'px';
  pane.style.top=clamp(rect.bottom+5,8,Math.max(8,innerHeight-box.height-8))+'px';
  inputs.existingL?.focus({preventScroll:true});
 }

 build(){const dialog=this.dialog;dialog.replaceChildren();const head=$('header',{class:'xwe-head'}),title=$('div',{class:'xwe-title-with-channels'});title.append($('h2',{},'Wave Editor'));
 this.channelConvertButton=button(this.doc?.channels?.length===1?'Mono':'Stereo',()=>{
  if(this.doc?.channels.length===1)void this.runEdit('toStereo');
 },{'data-xwe-mono-stereo-toggle':'true','aria-label':this.doc?.channels?.length===1?'Convert Mono to Stereo':'Stereo source',title:'Mono: click to convert to stereo · Stereo: source already has two channels'});
 title.append(this.channelConvertButton);
 const actions=$('div',{class:'xwe-header-workflow'}),headActions=$('div',{class:'xwe-head-actions'});
 this.statusElement=$('output',{class:'xwe-status xwe-sr-only','aria-live':'polite'},this.status);
 this.progressElement=$('progress',{class:'xwe-progress',max:1});
 this.computeMessage=$('span',{class:'xwe-compute-message'},'Processing…');
 this.computeCancel=button('×',()=>{this.abort('manual');this.setStatus('Processing interrupted.')},{'aria-label':'Cancel long-running process',title:'Cancel this long-running job only',class:'xwe-compute-cancel',hidden:true});
 this.computeStrip=$('div',{class:'xwe-compute-strip','data-xwe-compute-status':'true',hidden:true});
 this.computeStrip.append(this.computeMessage,this.progressElement,this.computeCancel);
 this.previewButton=button('▶ Preview FX',()=>this.preview('chain'));
 this.applyButton=button('Apply / Bake',()=>this.applyChain(),{class:'xwe-primary'});
 this.undoApplyButton=button('↶ Undo',()=>this.undoDocument(),{'aria-label':'Undo',title:'Undo the last audio edit or applied effect · Ctrl+Z',class:'xwe-apply-undo'});
 this.formatSelect=$('select',{'aria-label':'WAV Format'});
 this.formatSelect.append($('option',{value:'float32'},'WAV Float32'),$('option',{value:'pcm16'},'WAV PCM16'));
 this.previewTargetButton=button('B · Project',()=>this.preview('document'));
 actions.append(this.buildBlueViewControls(),button('A · Original',()=>this.preview('original')),this.previewTargetButton,this.previewButton,this.applyButton,this.undoApplyButton,this.formatSelect,button('WAV ↓',()=>this.downloadWav()));
 this.playButton=button('▶ Play',()=>this.playSelection(),{'aria-label':'Play Audio','aria-pressed':'false',title:'Play the selection · from caret to project end when no range is selected'});
 headActions.append(this.playButton,button('Close ×',()=>this.close()));
 head.append(title,actions,headActions,this.statusElement,this.computeStrip);dialog.append(head);
 const tool=$('div',{class:'xwe-toolbar'});this.redoButton=button('↷ Redo',()=>this.runEdit('redo'),{'data-xwe-document-redo':'true',title:'Redo · Ctrl+Shift+Z'});tool.append(this.redoButton);
 this.channelModes=$('div',{class:'xwe-channel-modes',role:'group','aria-label':'Channel Selection'});
 for(const [value,label] of [['L','L'],['R','R'],['all','L+R · Both']])this.channelModes.append(button(label,()=>this.setChannel(value),{'data-xwe-channel-mode':value,'aria-pressed':String(this.channel===value),title:value==='all'?'Edit Both Channels':`Channel ${value} bearbeiten`}));
 if(this.doc.channels.length>1)tool.append(this.channelModes);
 for(const [key,label] of [['start','Start s'],['end','End s']]){const l=$('label',{},label),input=$('input',{type:'number',step:1/this.doc.sampleRate,min:0,'aria-label':label,onchange:()=>this.setRangeFromFields()});this[key+'Input']=input;l.append(input);tool.append(l)}for(const [key,label] of [['start','Start Frame'],['end','End Frame']]){const l=$('label',{},label),input=$('input',{type:'number',step:1,min:0,'aria-label':label,onchange:()=>this.setRangeFromFrames()});this[key+'FrameInput']=input;l.append(input);tool.append(l)}tool.append(button('Cursor ← Start',()=>this.setCursor(this.doc.selection.start)),button('Cursor → End',()=>this.setCursor(this.doc.selection.end)));tool.append(button('Zoom to Selection',()=>{if(this.doc.selection.start===this.doc.selection.end){this.setStatus('Select an audio range before zooming.');return}this.setEditorViewport(this.doc.selection.start,this.doc.selection.end)}),button('Full View',()=>this.setEditorViewport(0,this.doc.frames)));dialog.append(tool);

 const body=$('div',{class:'xwe-body'}),edits=$('div',{class:'xwe-panel','data-xwe-edit-panel':'true'});edits.append($('h3',{},'Edit Audio'));const grid=$('div',{class:'xwe-edit-grid'});for(const key of ['copy','cut','insert','overwrite','mix','delete','trim','split','silence','reverse','invert','normalize','dcRemove'])grid.append(chromaticButton(key,this.operationLabel(key),()=>key==='mix'?this.openMixPane():this.runEdit(key),key==='mix'?{'data-xwe-mix-trigger':'true'}:{}));grid.append(chromaticButton('envelope','Envelope',()=>this.openVolumeEnvelope(),{title:'Draw a gain envelope with the original XenSonar Morph/Paint tool.'}));edits.append(grid);this.gainInput=this.field(edits,'Gain dB','number',0,{step:.5,min:-96,max:36});edits.append(chromaticButton('gain','Apply Gain',()=>this.runEdit('gain')));this.silenceInput=this.field(edits,'Silence duration (seconds)','number',1,{step:.1,min:.001,max:3600});edits.append(chromaticButton('insertSilence','Insert Silence',()=>this.runEdit('insertSilence')));edits.append($('p',{class:'xwe-small'},'Click to place the gold insertion caret; drag to select. Ctrl+C/X/V: Copy/Cut/Insert. Ctrl+Alt+V: Overwrite. Ctrl+Shift+V: Mix. Stereo timeline stays synchronized; Float32 preserves levels above 0 dBFS. Normalize or limit before PCM16.'),chromaticButton('analyze','Analyze Selection',()=>this.analyze()));this.analysisElement=$('div',{class:'xwe-analysis xwe-hidden'});edits.append(this.analysisElement);body.append(edits);
 const fx=$('div',{class:'xwe-panel xwe-fx-layout','data-xwe-fx-focus':this.fxFocus});this.fxLayout=fx;
 const fxHeader=$('div',{class:'xwe-fx-header','data-xwe-fx-header':'true'});
 fxHeader.append($('h3',{},'Offline Effect Chain'));
 // W21: native per-effect Morph button is the sole focus control.
 this.morphFocusButton=null;
 fx.append(fxHeader);
 const fxControls=$('div',{class:'xwe-fx-controls'});const add=$('div',{class:'xwe-toolbar',style:'padding:0 0 9px;border:0'});this.fxSelect=$('select',{'aria-label':'Add effect'});for(const effect of selectableEffects())this.fxSelect.append($('option',{value:effect.type},displayEffect(effect)));add.append(this.fxSelect,button('+ Effect',()=>this.addNode(this.fxSelect.value)),button('Live-Room EQ · Offline',()=>this.addOfflineEQ(),{'aria-label':'Live-Room EQ · Offline',title:'Process offline PCM with the existing Live-Room EQ'}));this.bypassInput=$('input',{type:'checkbox',onchange:()=>{this.bypass=this.bypassInput.checked;this.invalidate()}});const bypass=$('label',{},'Bypass Chain ');bypass.append(this.bypassInput);add.append(bypass);fxControls.append(add);this.chainElement=$('div',{class:'xwe-chain'});fxControls.append(this.chainElement);this.parametersElement=$('div',{class:'xwe-parameters'});fxControls.append(this.parametersElement);const laneHead=$('div',{class:'xwe-lane-head'});this.laneHead=laneHead;
 this.laneSelect=$('select',{'aria-label':'Automation Parameter',onchange:()=>{this.activeParam=this.laneSelect.value;this.requestMorphRefresh()}});
 this.interpolation=$('select',{'aria-label':'Interpolation',onchange:()=>{const lane=this.activeLane();if(lane){lane.interpolation=this.interpolation.value;this.invalidate();this.requestMorphRefresh()}}});
 this.interpolation.append($('option',{value:'linear'},'Linear'),$('option',{value:'hold'},'Steps'));
 laneHead.append(this.laneSelect,this.interpolation,
  button('Copy Curve',()=>{laneClipboard=this.activeLane()?JSON.parse(JSON.stringify(this.activeLane())):null;this.setStatus('Automation curve copied.')}),
  button('Paste Curve',()=>this.lanePaste()));
 this.morphArea=$('div',{class:'xwe-morph-area','data-xwe-morph-area':'true'});this.morphArea.append(laneHead);
 this.morphArea.addEventListener('click',event=>{
  if(this.fxFocus==='morph'||event.target.closest('button,input,select,textarea,.xwe-morph-mount,.xwe-offline-eq-host'))return;
  this.setFxFocus('morph');
 });
 this.nativeMorphHost=$('div',{class:'xwe-morph-mount','data-xwe-morph-host':'true'});
 this.nativeMorphHost.addEventListener('click',event=>{
  const target=event.target;
  if(target?.nodeType===1&&target.matches?.('div.font-semibold.text-pink-100')&&/· Morph\s*$/.test(target.textContent||''))this.setFxFocus('morph');
 });
 this.morphArea.append(this.nativeMorphHost);
 this.offlineEQHost=$('div',{class:'xwe-offline-eq-host','data-xwe-offline-eq-host':'true'});
 this.morphArea.append(this.offlineEQHost);
 this.curveHint=$('div',{class:'xwe-hint xwe-small'},'XenSonar Morph tools directly control the selected effect parameter.');
 this.morphArea.append(this.curveHint);fxControls.append(this.morphArea);fx.append(fxControls);

 this.scratchRoot=$('section',{class:'xwe-scratchpad','data-xwe-scratchpad':'true','data-active':String(this.activeWorkspace==='scratch'),'data-has-audio':String(!!this.scratchContext)});
 const scratchHeader=$('div',{class:'xwe-scratch-head'});
 this.scratchFocusButton=button('Audio Scratchpad',()=>{
  if(this.scratchContext&&this.activeWorkspace!=='scratch')this.changeWorkspace('scratch');
  this.setFxFocus('scratch');
 },{'aria-label':'Audio Scratchpad','aria-pressed':String(this.fxFocus==='scratch'),class:'xwe-fx-focus-button xwe-scratch-focus-button',title:'Expand the Audio Scratchpad and fold Frequency Morph'});
 scratchHeader.append(this.scratchFocusButton);
 this.scratchModeLabel=$('span',{class:'xwe-scratch-active'},'Editing: '+(this.activeWorkspace==='scratch'?'Scratchpad':'Project'));
 this.scratchInfo=$('span',{class:'xwe-scratch-info'},'Empty');
 scratchHeader.prepend(this.scratchModeLabel,this.scratchInfo);
 const scratchWorkspace=$('div',{class:'xwe-scratch-workspace'});
 const scratchActions=$('div',{class:'xwe-scratch-actions'});
 scratchActions.append(
  button('Copy',()=>this.copyFromScratchpad(),{'aria-label':'Copy',title:'Copy selected scratch audio; select entire pad when no range exists'}),
  button('Paste',()=>this.pasteToScratchpad(),{'aria-label':'Paste',title:'Paste shared clipboard into scratch; replace entire pad when no range is selected'}),
  button('Reverse',()=>this.scratchAction('reverse'),{'aria-label':'Reverse',title:'Reverse audio · selected range, or entire pad'}),
  button('Fade In',()=>this.scratchAction('fadeIn'),{'aria-label':'Fade In',title:'Fade from silence · selected range, or entire pad'}),
  button('Fade Out',()=>this.scratchAction('fadeOut'),{'aria-label':'Fade Out',title:'Fade to silence · selected range, or entire pad'})
 );
 this.scratchCanvas=$('canvas',{width:850,height:220,'aria-label':'Scratchpad waveform · left-click to select, right-click for all project editing and effects','data-xwe-scratch-wave':'true'});
 this.scratchCanvas.addEventListener('pointerdown',e=>this.beginScratchPointer(e),true);
 this.scratchCanvas.addEventListener('contextmenu',e=>this.contextMenu(e));
 this.scratchCanvas.addEventListener('pointermove',e=>this.onScratchPointerMove(e));
 scratchWorkspace.append(scratchActions,this.scratchCanvas);
 fxHeader.append(scratchHeader);
 this.scratchRoot.append(scratchWorkspace);
 fx.append(this.scratchRoot);
 this.tailSelect=$('select',{'aria-label':'Effect Tail',onchange:()=>this.invalidate()});for(const [v,l] of [['extend','Tail · Overlay and extend project if needed (default)'],['overlay','Tail · Overlay existing project, truncate at its end'],['truncate','Tail · Truncate at selection end (intentional)']])this.tailSelect.append($('option',{value:v},l));const tail=$('div',{class:'xwe-field'});tail.append($('label',{},'Delay / Reverb'),this.tailSelect);this.tailSelect.style.maxWidth='260px';fx.append(tail);const presets=$('div',{class:'xwe-toolbar',style:'padding:8px 0;border:0'});presets.append(button('Save Chain',()=>this.savePreset()),button('Load Chain',()=>this.loadPreset()));this.presetInput=$('input',{type:'file',accept:'.json,application/json',class:'xwe-hidden',onchange:e=>this.readPreset(e.target.files[0])});presets.append(this.presetInput,button('Save Project',()=>this.saveProject()),button('Load Project',()=>this.projectInput.click()));this.projectInput=$('input',{type:'file',accept:'.xwe,application/x-xensonar-wave-project',class:'xwe-hidden',onchange:e=>this.readProject(e.target.files[0])});presets.append(this.projectInput);/* ROOM4-03: Send to Multitrack sits in the editor's bottom-right corner; the toolbar reserves its width. */this.multitrackButton=button('➜ Send to Multitrack',()=>this.sendToMultitrack(),{class:'xwe-primary','data-xwe-send-multitrack':'true',title:'Create a new track in Room IV from this Wave Editor document (existing behavior).'});
  this.roundTripButton=button('✓ Apply & Return to Multitrack',()=>this.applyAndReturnToMultitrack(),{class:'xwe-primary','data-xwe-apply-return':'true',title:'Bake pending FX, then replace ONLY the selected originating Multitrack clip at the same start position.'});
  const handoffActions=$('div',{class:'xwe-roundtrip-actions',style:'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;padding:6px 0'});
  this.roundTripLabel=$('span',{class:'xwe-roundtrip-label','data-xwe-roundtrip-label':'true',style:'margin-right:auto;align-self:center;font-size:12px;opacity:.85'});handoffActions.append(this.roundTripLabel,this.multitrackButton,this.roundTripButton);fx.style.position='relative';fx.append(presets,handoffActions);this.refreshRoundTripButton();body.append(fx);dialog.append(body);
}
 field(parent,label,type,value,attrs={}){const row=$('label',{class:'xwe-field'},label),input=$('input',{type,'aria-label':label,...attrs});if(type==='checkbox')input.checked=value;else input.value=value;row.append(input);parent.append(row);return input}
 refresh(rebuild=true){if(!this.overlay)return;this.drawScratchpad();
  if(this.channelConvertButton){const mono=this.doc?.channels?.length===1;this.channelConvertButton.textContent=mono?'Mono':'Stereo';this.channelConvertButton.disabled=!mono;this.channelConvertButton.setAttribute('aria-label',mono?'Convert Mono to Stereo':'Stereo source');this.channelConvertButton.title=mono?'Click to convert Mono to Stereo (copy channel; preserve amplitude; Undo supported)':'Already stereo (two original or edited channels)';}
 this.channelModes?.querySelectorAll('[data-xwe-channel-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.xweChannelMode===this.channel)));if(this.undoApplyButton)this.undoApplyButton.disabled=!this.canUndoDocument();if(this.redoButton)this.redoButton.disabled=!this.doc?.history?.future?.length;this.startInput.value=fmt(this.doc.selection.start/this.doc.sampleRate,6);this.endInput.value=fmt(this.doc.selection.end/this.doc.sampleRate,6);this.startInput.max=this.endInput.max=this.doc.frames/this.doc.sampleRate;this.startFrameInput.value=this.doc.selection.start;this.endFrameInput.value=this.doc.selection.end;this.startFrameInput.max=this.endFrameInput.max=this.doc.frames;if(rebuild){this.drawChain();this.drawParameters();this.requestMorphRefresh()}this.syncMixPaneTarget();this.setStatus(this.status);this.scheduleFxLayout()}
 applySelection(){
  this.syncFxTargetsToSelection();
  const selection=this.doc.selection;
  if(selection.start===selection.end){this.options.onViewChange?.();return}
  if(this.activeWorkspace==='scratch'){this.drawScratchpad();return}
  const update={fineLoopRange:{startSec:selection.start/this.doc.sampleRate,durationSec:(selection.end-selection.start)/this.doc.sampleRate},detailViewport:{startSec:this.doc.viewport.start/this.doc.sampleRate,durationSec:(this.doc.viewport.end-this.doc.viewport.start)/this.doc.sampleRate}};
  // Only a real range may update the pre-existing donor selection.
  this.pendingOutgoingRange={...update.fineLoopRange};
  this.options.onSelection?.(update);
  this.drawParameters();
  this.options.onViewChange?.();
 }


 // W30: pure blue-viewport navigation. Never edits purple selection, FX range or PCM.
 navigatorOwner(){return this.activeWorkspace==='scratch'&&this.projectContext?this.projectContext:this}
 navigatorDocument(){return this.navigatorOwner()?.doc||null}
 navigateView(start,end){
  const owner=this.navigatorOwner(),doc=owner?.doc;
  if(!doc)return false;
  const next=core().setViewport(doc,start,end);
  if(next===doc)return false;
  owner.doc=next;
  const v=next.viewport,sr=next.sampleRate,viewport={startSec:v.start/sr,durationSec:(v.end-v.start)/sr};
  this.incomingViewport={...viewport};
  if(this.options.selection?.fineLoopRange)this.options.onSelection?.({...this.options.selection,detailViewport:viewport});
  this.options.onViewChange?.();
  this.refresh(false);
  return true;
 }
 zoomBlueViewport(direction){
  const doc=this.navigatorDocument();if(!doc||doc.frames<=1)return false;
  const {start,end}=doc.viewport,span=end-start,minimum=Math.min(doc.frames,Math.max(2,Math.round(doc.sampleRate*.002)));
  const nextSpan=Math.max(minimum,Math.min(doc.frames,Math.round(span*(direction>0?.8:1.25))));
  if(nextSpan===span)return false;
  const center=(start+end)/2;
  const nextStart=clamp(Math.round(center-nextSpan/2),0,doc.frames-nextSpan);
  return this.navigateView(nextStart,nextStart+nextSpan);
 }
 panBlueViewport(direction,fraction=.012){
  const doc=this.navigatorDocument();if(!doc||doc.frames<=1)return false;
  const {start,end}=doc.viewport,span=end-start;
  const frames=Math.max(1,Math.round(span*fraction));
  const nextStart=clamp(start+(direction<0?-frames:frames),0,doc.frames-span);
  return this.navigateView(nextStart,nextStart+span);
 }
 stopBluePan(){
  if(this.bluePanFrame!=null){root.cancelAnimationFrame(this.bluePanFrame);this.bluePanFrame=null}
  this.bluePanHeld=null;
  this.dialog?.querySelectorAll('[data-xwe-nav-held]').forEach(b=>delete b.dataset.xweNavHeld);
 }
 startBluePan(direction,control,event){
  if(event.button!==0)return;
  event.preventDefault();this.stopBluePan();
  const doc=this.navigatorDocument();if(!doc||!doc.frames)return;
  this.panBlueViewport(direction,.012);
  this.bluePanHeld={direction,control,pointerId:event.pointerId,last:0,lastCommit:0,elapsed:0,remainder:0,initial:true};
  control.dataset.xweNavHeld='true';
  try{control.setPointerCapture(event.pointerId)}catch{}
  const tick=(now)=>{
   const state=this.bluePanHeld;if(!state||state.control!==control)return;
   if(!state.last){state.last=now;this.bluePanFrame=root.requestAnimationFrame(tick);return}
   const dt=Math.max(0,Math.min(.05,(now-state.last)/1000));state.last=now;state.elapsed+=dt;
   // Very slow start; acceleration is capped at 0.28 viewport widths/second.
   const ramp=Math.min(1,state.elapsed/1.8),speed=.065+.215*ramp*ramp*(3-2*ramp);
   const active=this.navigatorDocument();if(!active)return this.stopBluePan();
   state.remainder+=(active.viewport.end-active.viewport.start)*speed*dt;
   const delta=Math.floor(state.remainder);
   if(delta>0&&now-state.lastCommit>=36){state.lastCommit=now;state.remainder-=delta;const start=active.viewport.start+(direction<0?-delta:delta);this.navigateView(start,start+active.viewport.end-active.viewport.start)}
   this.bluePanFrame=root.requestAnimationFrame(tick);
  };
  this.bluePanFrame=root.requestAnimationFrame(tick);
 }
 buildBlueViewControls(){
  const group=$('div',{class:'xwe-view-controls',role:'group','aria-label':'Blue overview viewport · fine zoom and movement','data-xwe-view-controls':'true'});
  const icon=(kind)=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
   svg.innerHTML=kind.startsWith('zoom')?'<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/>'+(kind==='zoom-in'?'<path d="M10 7v6M7 10h6"/>':'<path d="M7 10h6"/>'):(kind==='pan-left'?'<path d="m15 5-8 7 8 7"/>':'<path d="m9 5 8 7-8 7"/>');
   return svg;
  };
  for(const [kind,label,callback] of [
   ['zoom-in','Zoom in blue viewport · magnifier +',()=>this.zoomBlueViewport(1)],
   ['zoom-out','Zoom out blue viewport · magnifier −',()=>this.zoomBlueViewport(-1)],
   ['pan-left','Move blue viewport left · hold for gentle acceleration',()=>this.panBlueViewport(-1)],
   ['pan-right','Move blue viewport right · hold for gentle acceleration',()=>this.panBlueViewport(1)]
  ]){
   const control=button('',()=>{if(kind.startsWith('zoom'))callback();else if(!control.__navPointerClick)callback();control.__navPointerClick=false},{type:'button',class:'xwe-view-control','data-xwe-view':kind,'aria-label':label,title:label});
   control.append(icon(kind));
   if(kind.startsWith('pan')){
    control.addEventListener('pointerdown',event=>{if(event.button!==0)return;control.__navPointerClick=true;this.startBluePan(kind==='pan-left'?-1:1,control,event)});
    const release=event=>{if(this.bluePanHeld?.pointerId===event.pointerId)this.stopBluePan()};
    control.addEventListener('pointerup',release);control.addEventListener('pointercancel',release);control.addEventListener('lostpointercapture',release);
   }
   group.append(control);
  }
  return group;
 }
 setEditorViewport(start,end){
  this.doc=core().setViewport(this.doc,start,end);
  const v=this.doc.viewport,sr=this.doc.sampleRate;
  const viewport={startSec:v.start/sr,durationSec:(v.end-v.start)/sr};
  if(this.activeWorkspace==='scratch'){this.refresh(false);this.drawScratchpad();return}
  this.incomingViewport={...viewport};
  const fineLoopRange=this.options.selection?.fineLoopRange;
  if(fineLoopRange)this.options.onSelection?.({...this.options.selection,detailViewport:viewport});
  this.options.onViewChange?.();this.refresh(false);
 }

 setCursor(frame){this.invalidate();this.doc=core().setSelection(this.doc,frame,frame);this.applySelection();this.refresh(false);if(this.nodes.length&&this.curveHint)this.curveHint.textContent='No active time range · choose a purple selection before Preview FX or Apply. Existing automation is retained but not rendered.';this.setStatus(`Insertion caret · Frame ${frame} · ${fmt(frame/this.doc.sampleRate,6)} s. Ctrl+V = Insert · Ctrl+Alt+V = Overwrite · Ctrl+Shift+V = Mix.`)}
 setRangeFromFields(){const sr=this.doc.sampleRate,a=clamp(Math.round(Number(this.startInput.value)*sr),0,this.doc.frames),b=clamp(Math.round(Number(this.endInput.value)*sr),0,this.doc.frames);this.invalidate();this.doc=core().setSelection(this.doc,a,b);this.applySelection();this.refresh(false)}
 setRangeFromFrames(){this.invalidate();this.doc=core().setSelection(this.doc,Number(this.startFrameInput.value),Number(this.endFrameInput.value));this.applySelection();this.refresh(false)}
 addNode(type){this.ensureScratchSelection();this.ensureEffectSelection();const effect=registry().find(x=>x.type===type);if(!effect)return;const params=Object.fromEntries(definitions(effect).map(([k,m])=>[k,m.default??m.defaultValue??0]));const node={id:'fx-'+(++serial),type,enabled:true,params,automation:{},targetRange:this.range(),channels:this.target(),version:1};this.nodes.push(node);this.activeNode=node.id;this.activeParam=null;this.eqVisible=false;this.invalidate();this.refresh();this.setStatus(displayEffect(effect)+' added to FX chain · follows visible selection and channel.')}
 addOfflineEQ(){this.ensureScratchSelection();this.ensureEffectSelection();
  const id='eq-'+(++serial),key='waveOffline:'+this.doc.id+':'+id;
  const node={id,type:'liveRoomEQ',enabled:true,eqSourceKey:key,targetRange:this.range(),channels:this.target(),params:{},automation:{},version:1};
  root.__XenWaveOfflineEQ?.registerRate(key,this.doc.sampleRate);
  this.nodes.push(node);this.activeNode=id;this.activeParam=null;this.eqVisible=true;
  this.invalidate();this.refresh();this.setStatus('Live-Room EQ · native EQ UI and Filter Planner, processing offline PCM only.');
 }
 offlineEqBinding(){
  const node=this.currentNode();
  if(!this.overlay||!this.offlineEQHost||!this.eqVisible||node?.type!=='liveRoomEQ')return null;
  return {host:this.offlineEQHost,key:node.eqSourceKey,close:()=>{this.eqVisible=false;this.requestMorphRefresh()}};
 }
 // The __XenEQ planner owns the filter-bank geometry and gain curve. The
 // existing W01 worker owns the PCM bake. This adapter just converts the
 // shared bank into its already-registered peaking and gain effect types.
 offlineDSPNodes(){
  const bridge=root.__XenWaveOfflineEQ;
  return this.nodes.flatMap(node=>{
   if(node.type!=='liveRoomEQ')return [node];
   if(!node.enabled||!bridge)return [];
   const cfg=bridge.get(node.eqSourceKey);
   if(!cfg.enabled)return [];
   const plan=bridge.plan(cfg,this.doc.sampleRate);
   if(!plan||!Array.isArray(plan.filters))throw Error('Live-Room EQ: no valid filter plan.');
   const base={targetRange:node.targetRange,channels:node.channels,enabled:true,automation:{}};
   const expanded=[];
   if(Math.abs(plan.base||0)>1e-8)expanded.push({...base,id:node.id+':gain',type:'gain',params:{gainDb:clamp(plan.base,-96,36)}});
   for(let i=0;i<plan.filters.length;i++){
    const f=plan.filters[i];
    if(f.type!=='peaking')throw Error('Live-Room EQ: unsupported filter type '+f.type);
    if(!Number.isFinite(f.frequency)||!Number.isFinite(f.q)||!Number.isFinite(f.gain))throw Error('Live-Room EQ: non-finite filter parameter.');
    if(Math.abs(f.gain)<1e-8)continue;
    expanded.push({...base,id:node.id+':band'+i,type:'peaking',params:{frequency:clamp(f.frequency,20,20000),q:clamp(f.q,.1,30),gainDb:clamp(f.gain,-36,36)}});
   }
   return expanded;
  });
 }
 releaseOfflineEQState(){for(const n of this.nodes){if(n.type!=='liveRoomEQ')continue;this.eqLastConfigs?.delete(n.eqSourceKey);root.__XenWaveOfflineEQ?.drop(n.eqSourceKey)}this.eqVisible=false}
 currentNode(){return this.nodes.find(x=>x.id===this.activeNode)}
 invalidate(){this.lastResult=null;this.lastResultScope=null;this.abort('choice')}
 // A PCM revision alone does not identify a rendered selection. Keep the
 // target, channel, tail policy, active workspace and render generation together
 // so even a delayed response from an already-invalidated job is rejected.
 renderScope(){const r=this.range();return {documentId:this.doc.id,revision:this.doc.revision,
  workspace:this.activeWorkspace,start:r.start,end:r.end,channel:this.target(),
  tailMode:this.tailSelect?.value||'extend',bypass:!!this.bypass,token:this.renderToken}}
 scopeMatches(scope){if(!scope||!this.doc)return false;const now=this.renderScope();return Object.keys(now).every(key=>Object.is(now[key],scope[key]))}
 cachedRender(){return this.lastResult&&this.scopeMatches(this.lastResultScope)?this.lastResult:null}
 openVolumeEnvelope(){this.open();this.ensureScratchSelection();this.addNode('gain');this.activeParam='gainDb';this.refresh()}
 drawChain(){this.retainExpandedScratchHeight();this.chainElement.replaceChildren();if(!this.nodes.length){this.chainElement.append($('div',{class:'xwe-small'},'No active effect stages. '+(this.activeWorkspace==='scratch'?'Scratchpad unchanged.':'Project unchanged.')));return}for(const [index,node] of this.nodes.entries()){const effect=registry().find(x=>x.type===node.type)||{label:node.type==='liveRoomEQ'?'Live-Room EQ · Offline':node.type},slot=$('div',{class:'xwe-node','data-active':String(node.id===this.activeNode)}),enabled=$('input',{type:'checkbox','aria-label':displayEffect(effect)+' enabled',onchange:()=>{node.enabled=enabled.checked;this.invalidate()}});enabled.checked=node.enabled;slot.append(enabled,button(displayEffect(effect),()=>{this.activeNode=node.id;this.activeParam=null;this.eqVisible=node.type==='liveRoomEQ';this.invalidate();this.refresh()}),button('‹',()=>{if(index){[this.nodes[index-1],this.nodes[index]]=[node,this.nodes[index-1]];this.invalidate();this.refresh() }},{title:'Move effect earlier'}),button('›',()=>{if(index<this.nodes.length-1){[this.nodes[index+1],this.nodes[index]]=[node,this.nodes[index+1]];this.invalidate();this.refresh()}},{title:'Move effect later'}),button('×',()=>{this.nodes.splice(index,1);if(node.type==='liveRoomEQ'){this.eqLastConfigs?.delete(node.eqSourceKey);root.__XenWaveOfflineEQ?.drop(node.eqSourceKey)}this.activeNode=this.nodes[Math.max(0,index-1)]?.id;this.eqVisible=this.currentNode()?.type==='liveRoomEQ';this.invalidate();this.refresh()},{title:'Remove effect'}));this.chainElement.append(slot)}}
 drawParameters(){this.parametersElement.replaceChildren();this.laneSelect.replaceChildren();const node=this.currentNode();if(this.laneHead)this.laneHead.hidden=node?.type==='liveRoomEQ';if(!node)return;if(node.type==='liveRoomEQ'){this.curveHint.textContent='Original XenSonar Live-Room EQ · Offline. Paint in the EQ panel, then Preview FX or Apply / Bake.';return}const effect=registry().find(x=>x.type===node.type);for(const [key,meta] of definitions(effect)){const label=displayText(meta.label||key),row=$('label',{class:'xwe-field'}),input=$('input',{type:'number',min:meta.min,max:meta.max,step:meta.step||(meta.max-meta.min>100?1:.01),'aria-label':label,onchange:()=>{node.params[key]=clamp(Number(input.value),meta.min??-Infinity,meta.max??Infinity);input.value=node.params[key];this.invalidate();this.requestMorphRefresh()}});input.value=node.params[key];row.append($('span',{},label),input,$('span',{class:'xwe-small'},meta.unit||''));this.parametersElement.append(row);if(meta.automatable!==false&&meta.automateAllowed!==false)this.laneSelect.append($('option',{value:key},label+(meta.unit?' · '+meta.unit:'')))}this.activeParam=this.activeParam||this.laneSelect.options[0]?.value;this.laneSelect.value=this.activeParam;this.curveHint.textContent=`Target: ${fmt(node.targetRange.start/this.doc.sampleRate)}–${fmt(node.targetRange.end/this.doc.sampleRate)} s · ${node.channels==='all'?'L/R linked':node.channels} · Drag points; double-click to delete. Untouched automation uses the constant value.`}
 paramMeta(){const node=this.currentNode(),effect=registry().find(x=>x.type===node?.type);return definitions(effect).find(([key])=>key===this.activeParam)?.[1]||{min:0,max:1,default:0}}
 activeLane(create=false){const node=this.currentNode();if(!node||!this.activeParam)return null;if(create&&!node.automation[this.activeParam])node.automation[this.activeParam]={points:[],interpolation:'linear'};return node.automation[this.activeParam]}
 laneHistory(){const node=this.currentNode();if(!node)return;this.curveHistory||=[];this.curveHistory.push({id:node.id,param:this.activeParam,lane:this.activeLane()?JSON.parse(JSON.stringify(this.activeLane())):null});if(this.curveHistory.length>40)this.curveHistory.shift()}
 laneUndo(){const item=this.curveHistory?.pop();if(!item)return;const node=this.nodes.find(x=>x.id===item.id);if(!node)return;if(item.lane)node.automation[item.param]=item.lane;else delete node.automation[item.param];this.activeNode=node.id;this.activeParam=item.param;this.invalidate();this.refresh()}
 lanePaste(){if(!laneClipboard||!this.currentNode())return;this.laneHistory();const node=this.currentNode(),points=laneClipboard.points||[],lo=points[0]?.frame??node.targetRange.start,hi=points[points.length-1]?.frame??node.targetRange.end,meta=this.paramMeta();node.automation[this.activeParam]={interpolation:laneClipboard.interpolation,points:points.map(p=>({frame:Math.round(node.targetRange.start+(p.frame-lo)/Math.max(1,hi-lo)*(node.targetRange.end-node.targetRange.start-1)),value:clamp(p.value,meta.min,meta.max)}))};this.invalidate();this.requestMorphRefresh()}
 normalized(value,meta){const lo=meta.min??0,hi=meta.max??1;return (meta.scale==='log'||meta.log===true)&&lo>0?Math.log(clamp(value,lo,hi)/lo)/Math.log(hi/lo):(value-lo)/Math.max(1e-12,hi-lo)}
 denormalized(value,meta){const lo=meta.min??0,hi=meta.max??1;return (meta.scale==='log'||meta.log===true)&&lo>0?lo*Math.pow(hi/lo,value):lo+(hi-lo)*value}
 requestMorphRefresh(){this.options.onViewChange?.()}
 // W04: small data adapter only. G$ (shared MWCM) owns every curve gesture, brush,
 // warp, visual and undo button. W01 remains the owner of offline PCM automation.
 nativeMorphBinding(){
  const node=this.currentNode(),key=this.activeParam,host=this.nativeMorphHost;
  if(!this.overlay||!host||!node||!key||!this.doc)return null;
  const meta=this.paramMeta(),range=node.targetRange;
  if(range.end<=range.start)return null;
  const base=Number(node.params[key]),center=clamp(this.normalized(base,meta),0,1);
  const min=Math.max(0,Number.isFinite(meta.min)?meta.min:0),max=Number.isFinite(meta.max)?meta.max:1;
  const toSigned=value=>{const n=clamp(this.normalized(value,meta),0,1);return clamp(n>=center?(n-center)/Math.max(1e-7,1-center):(n-center)/Math.max(1e-7,center),-1,1)};
  const toValue=value=>this.denormalized(clamp(center+(value>=0?(1-center)*value:center*value),0,1),meta);
  const lane=node.automation[key],points=lane?.points?.slice().sort((a,b)=>a.frame-b.frame)||[];
  const read=count=>{
   if(!points.length)return new Array(count).fill(0);
   let index=0;
   return Array.from({length:count},(_,j)=>{
    const frame=range.start+(range.end-range.start-1)*j/Math.max(1,count-1);
    while(index+1<points.length&&points[index+1].frame<=frame)index++;
    const a=points[index],b=points[index+1];
    if(frame<=points[0].frame)return toSigned(points[0].value);
    if(!b||lane.interpolation==='hold')return toSigned(a.value);
    const t=clamp((frame-a.frame)/Math.max(1,b.frame-a.frame),0,1);
    return toSigned(this.denormalized(this.normalized(a.value,meta)*(1-t)+this.normalized(b.value,meta)*t,meta));
   });
  };
  return {host,key:this.doc.id+':'+node.id+':'+key,title:(displayText(meta.label||key))+' · Morph',expand:()=>this.setFxFocus('morph'),read,
   capture:()=>this.laneHistory(),undo:()=>this.laneUndo(),canUndo:!!this.curveHistory?.length,
   commit:(signed,message)=>{
    if(!this.nodes.includes(node)||!this.overlay)return;
    const values=Array.from(signed||[]);
    if(values.length<2)return;
    const steps=new Map();
    for(let j=0;j<values.length;j++){
     const frame=Math.round(range.start+(range.end-range.start-1)*j/(values.length-1));
     steps.set(frame,{frame,value:clamp(toValue(clamp(Number(values[j])||0,-1,1)),meta.min,meta.max)});
    }
    if(values.every(v=>Math.abs(Number(v)||0)<1e-7))delete node.automation[key];
    else node.automation[key]={interpolation:lane?.interpolation||'linear',points:[...steps.values()]};
    this.invalidate();this.setStatus('MWCM · '+(message||`${displayText(meta.label||key)} painted`));this.requestMorphRefresh();
   }};
 }
 async render(){
  // A caret is not a purple selection; never render an invisible old target.
  if(this.doc.selection.end<=this.doc.selection.start)throw Error('No active time range · select a purple region before Preview FX or Apply.');
  this.syncFxTargetsToSelection();
  this.abort('replace');
  const token=++this.renderToken,controller=new AbortController();this.controller=controller;
  const doc=this.doc,scope=this.renderScope(),nodes=this.bypass?[]:this.offlineDSPNodes();
  this.beginComputeFeedback(token);this.setStatus('Offline rendering…');
  try{
   const result=await dsp().render({jobId:'w01-'+(++serial),documentId:doc.id,revision:doc.revision,sampleRate:doc.sampleRate,channels:doc.channels,range:this.range(),nodes:JSON.parse(JSON.stringify(nodes)),tailMode:this.tailSelect?.value||'extend'},{signal:controller.signal,onProgress:p=>{
    if(token!==this.renderToken||!this.progressElement||this.computeJob?.token!==token)return;
    const n=typeof p==='number'?p:(p.progress||0);
    this.progressElement.value=Math.max(0,Math.min(1,n));
   }});
   if(controller.signal.aborted||!this.scopeMatches(scope))throw new DOMException('Outdated render discarded.','AbortError');
   this.lastResult=result;this.lastResultScope=scope;this.setStatus('Offline render ready · '+result.frames+' frames.');return result;
  }finally{
   if(this.controller===controller)this.controller=null;
   this.finishComputeFeedback(token);
  }
 }
 canUndoDocument(){return !!this.doc?.history?.past?.length}
 async undoDocument(){if(this.canUndoDocument())await this.runEdit('undo');else this.setStatus('Nothing to undo.')}
 async applyChain(){try{
  const result=this.cachedRender()||await this.render();
  if(!this.cachedRender()||this.cachedRender()!==result)throw new DOMException('Selection or FX changed during rendering.','AbortError');
  const next=core().commitRender(this.doc,result);
  await this.publish(next,this.activeWorkspace==='scratch'?'Effect chain applied to scratchpad':'Effect chain applied to project',{consumeChain:true});
 }catch(error){if(error.name!=='AbortError')this.setStatus(error.message)}}

 ensurePlayheads(){
  const canvases=this.activeWorkspace==='scratch'?[this.scratchCanvas]:[this.options.overviewCanvas,this.options.detailCanvas];
  if(this.playheadElements?.length===canvases.length&&this.playheadElements.every((entry,i)=>entry.canvas===canvases[i]))return;
  for(const entry of this.playheadElements||[])entry.el.remove();
  this.playheadElements=[];
  for(const canvas of canvases){
   if(!canvas?.parentElement)continue;
   const parent=canvas.parentElement;
   if(!parent.classList.contains('xwe-playhead-owner'))parent.classList.add('xwe-playhead-owner');
   const el=$('div',{class:'xwe-playhead','data-active':'false','aria-hidden':'true'});
   parent.append(el);this.playheadElements.push({canvas,parent,el});
  }
 }
 clearPlayheads(){
  if(this.transportRaf!=null){root.cancelAnimationFrame(this.transportRaf);this.transportRaf=null}
  this.transport=null;
  for(const entry of this.playheadElements||[])entry.el.remove();
  this.playheadElements=[];
  if(this.playButton){this.playButton.textContent='▶ Play';this.playButton.setAttribute('aria-pressed','false')}
 }
 updatePlayheads(){
  const t=this.transport;
  if(!t||!this.audioNode||!this.overlay)return;
  const clock=Math.max(0,this.audioContext.currentTime-t.startAudioTime);
  const at=Math.min(t.endFrame,t.startFrame+clock*t.sampleRate);
  const owner=this.doc;
  if(!owner)return;
  for(const entry of this.playheadElements||[]){
   const {canvas,parent,el}=entry;
   const c=canvas.getBoundingClientRect(),p=parent.getBoundingClientRect();
   if(!c.width||!c.height)continue;
   // Upper wave is the entire source; lower wave is the currently zoomed viewport.
   const overview=canvas===this.options.overviewCanvas;
   const scratch=canvas===this.scratchCanvas;
   const min=scratch?0:overview?0:owner.viewport.start,max=scratch?t.sourceFrames:overview?t.sourceFrames:owner.viewport.end;
   const ratio=(at-min)/Math.max(1,max-min);
   const visible=ratio>=0&&ratio<=1;
   el.dataset.active=String(visible);el.style.display=visible?'block':'none';
   el.style.left=(c.left-p.left+parent.scrollLeft+c.width*Math.max(0,Math.min(1,ratio)))+'px';
   el.style.top=(c.top-p.top+parent.scrollTop)+'px';el.style.height=c.height+'px';
  }
  this.transportRaf=root.requestAnimationFrame(()=>this.updatePlayheads());
 }
 startPlayhead(mode,range,sr,frames){
  this.ensurePlayheads();
  this.transport={mode,startAudioTime:this.audioContext.currentTime,startFrame:range.start,endFrame:range.end,sampleRate:sr,sourceFrames:frames};
  if(this.playButton){this.playButton.textContent='■ Stop';this.playButton.setAttribute('aria-pressed','true')}
  this.updatePlayheads();
 }
 stopAudio(){if(this.audioNode){try{this.audioNode.stop()}catch{}this.audioNode.disconnect();this.audioNode=null}this.clearPlayheads();this.audioContext?.suspend?.()}
 playSelection(){if(this.audioNode){this.stopAudio();this.setStatus('Playback stopped.');return}return this.preview('document')}
 /* TAKT-SEEK: restart the running preview at another point (same mode, same end) */
 seekToSec(sec){const t=this.transport;if(!this.audioNode||!t||!Number.isFinite(sec))return false;const from=clamp(Math.round(sec*t.sampleRate),0,Math.max(0,t.sourceFrames-1));void this.preview(t.mode,{from,to:t.endFrame});return true}
 async preview(mode,opts){try{if(mode!=='chain'&&this.controller)this.abort('choice');const token=this.renderToken;this.stopAudio();let cs=this.doc.channels,sr=this.doc.sampleRate,range=this.range();if(range.start===range.end){range=range.start>=this.doc.frames?{start:0,end:this.doc.frames}:{start:range.start,end:this.doc.frames}}if(mode==='chain'){
   const result=this.cachedRender()||await this.render();
   if(this.cachedRender()!==result)throw new DOMException('Selection changed while preparing preview.','AbortError');
   range=this.range();cs=result.channels;
   // The selection names the DRY target, not the end of its wet echo/reverb.
   // Preview all rendered tails without changing the persistent selection.
   const tailEnd=Math.max(range.end,...(result.metrics?.effects||[]).map(effect=>(effect.end??range.end)+(effect.tailFrames||0)));
   range={start:range.start,end:Math.min(result.frames,tailEnd)};
  }else if(mode==='original'){cs=this.doc.original.channels;sr=this.doc.original.sampleRate||sr;range={start:Math.min(range.start,cs[0].length-1),end:Math.min(range.end,cs[0].length)}}if(opts&&Number.isFinite(opts.from)){const total=cs[0].length,from=clamp(Math.round(opts.from),0,Math.max(0,total-1));range={start:from,end:clamp(Math.round(opts.to??range.end),from+1,total)}}this.options.stopSourcePreview?.();const AC=root.AudioContext||root.webkitAudioContext;this.audioContext||=new AC();await this.audioContext.resume();if(!this.overlay)return;const buffer=this.audioContext.createBuffer(cs.length,cs[0].length,sr);cs.forEach((c,i)=>buffer.copyToChannel(c,i));const node=this.audioContext.createBufferSource();node.buffer=buffer;node.connect(this.audioContext.destination);const start=clamp(range.start/sr,0,buffer.duration-.00001),duration=Math.max(1/sr,Math.min(range.end/sr,buffer.duration)-start);node.start(0,start,duration);this.audioNode=node;this.startPlayhead(mode,range,sr,cs[0].length);node.onended=()=>{if(this.audioNode===node){this.audioNode=null;this.clearPlayheads();this.setStatus('Preview finished.')}};this.setStatus((mode==='original'?'A · Original':mode==='document'?(this.activeWorkspace==='scratch'?'B · Scratchpad':'B · Edited Project'):'Effect Chain')+' · real '+cs.length+'-channel preview (original floating-point level).')}catch(error){if(error.name!=='AbortError')this.setStatus(error.message)}}
  refreshRoundTripButton(){if(this.roundTripButton){const linked=!!globalThis.__XenMultitrackRoundTrip?.bound(this);
   this.roundTripButton.hidden=!linked;this.roundTripButton.style.display=linked?'':'none';
   if(this.roundTripLabel){this.roundTripLabel.textContent=linked?(globalThis.__XenMultitrackRoundTrip.status().label||'\u2702 Multitrack Clip'):'';this.roundTripLabel.hidden=!linked}}}
  hasUnsavedWork(){return !!(this.doc&&((this.nodes&&this.nodes.length)||(this.doc.history?.past?.length&&this.cleanRevision!==this.doc.revision)))}
  async applyAndReturnToMultitrack(){const flow=globalThis.__XenMultitrackRoundTrip;
   if(!flow?.bound(this)){this.setStatus('This Wave document is not linked to a Multitrack clip.');return}
   const btn=this.roundTripButton;if(btn)btn.disabled=true;
   this.setStatus('Applying effects and returning to the original Multitrack clip…');
   try{const result=await flow.apply(this);this.setStatus('Clip '+result.clipId+' updated. Returning to Multitrack.');this.close();}
   catch(error){this.setStatus('Return failed: '+String(error?.message||error));}
   finally{if(btn)btn.disabled=false;this.refreshRoundTripButton()}}
 async sendToMultitrack(){const inbox=globalThis.__XenMultitrackInbox;if(!inbox){this.setStatus('Multitrack is not available in this build.');return}if(!this.doc?.frames){this.setStatus('No audio to send.');return}const btn=this.multitrackButton;if(btn)btn.disabled=true;this.setStatus('Sending to Multitrack…');try{const name=(this.activeWorkspace==='scratch'?'Scratchpad':(this.source?.label||'Wave Editor'));const r=await inbox.send({channels:this.doc.channels,sampleRate:this.doc.sampleRate,name,origin:'wave-editor'});this.setStatus('Sent to Multitrack as a new track'+(r.sourceBpm?' · '+r.sourceBpm+' BPM detected':' · original speed')+'. Open Room IV to see it.'+(this.nodes.length?' Unapplied FX chain was not included: use Apply / Bake first.':''))}catch(error){this.setStatus('Send to Multitrack failed: '+error.message)}finally{if(btn)btn.disabled=false}}
 downloadWav(){try{const format=this.formatSelect?.value||'float32',data=core().encodeWav(this.doc,{format}),blob=data instanceof Blob?data:new Blob([data],{type:'audio/wav'});this.download(blob,(this.activeWorkspace==='scratch'?'XenSonar_Scratchpad':(this.source.label||'XenSonar')).replace(/[^\p{L}\p{N}_.-]/gu,'_')+'_W01_'+format+'.wav');this.setStatus('Edited project exported as '+format+' WAV. '+(this.nodes.length?'Unapplied FX chain: use Apply / Bake first.':''))}catch(error){this.setStatus(error.message)}}
 download(blob,name){const url=URL.createObjectURL(blob),a=$('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 analyze(){const range=this.range(),rows=[];for(const [index,samples] of this.doc.channels.entries()){let peak=0,sum=0,dc=0,clips=0;for(let f=range.start;f<range.end;f++){const v=samples[f];peak=Math.max(peak,Math.abs(v));sum+=v*v;dc+=v;if(Math.abs(v)>1)clips++}const count=Math.max(1,range.end-range.start);rows.push(`${this.doc.channels.length>1?index?'R':'L':'Mono'}  Peak ${peak?fmt(20*Math.log10(peak),2):'−∞'} dBFS · RMS ${sum?fmt(10*Math.log10(sum/count),2):'−∞'} dBFS\nDC ${fmt(dc/count,6)} · >0 dBFS ${clips} Frames`)}this.analysisElement.classList.remove('xwe-hidden');this.analysisElement.textContent=`Selection: ${range.end-range.start} Frames\n`+rows.join('\n\n');this.setStatus('Analysis of the edited selection.');this.analysisElement.scrollIntoView({block:'nearest'})}
 saveProject(){try{this.download(core().exportProject(this.doc),'XenSonar_W01_Project.xwe');this.setStatus('Lossless project exported with original audio and bounded undo history. Save unapplied FX separately as a chain preset.')}catch(error){this.setStatus(error.message)}}
 async readProject(file){if(!file)return;if(this.warnUnappliedFx('Load Project'))return;try{const next=core().decodeProject(await file.arrayBuffer());await this.publish(next,'Project file loaded')}catch(error){this.setStatus(error.message)}}
 savePreset(){if(this.nodes.some(n=>n.type==='liveRoomEQ')){this.setStatus('Live-Room EQ: Apply / Bake before saving the chain preset. Offline curves must not be silently omitted.');return}const preset={version:'xen-wave-chain-w01',sampleRate:this.doc.sampleRate,origin:this.doc.selection.start,nodes:this.nodes};this.download(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),'XenSonar_W01_Effect Chain.json');this.setStatus('Effect chain saved with absolute automation frames.')}
 loadPreset(){this.presetInput.click()}
 async readPreset(file){if(!file)return;if(this.warnUnappliedFx('Load Chain Preset'))return;try{const p=JSON.parse(await file.text());if(p.version!=='xen-wave-chain-w01'||!Array.isArray(p.nodes))throw Error('Not a W01 effect-chain preset.');const rate=this.doc.sampleRate/(p.sampleRate||this.doc.sampleRate),offset=this.doc.selection.start-(p.origin||0)*rate,allowed=new Set(registry().map(x=>x.type));this.releaseOfflineEQState();this.nodes=p.nodes.filter(n=>allowed.has(n.type)).map(n=>({...n,id:'fx-'+(++serial),targetRange:{start:clamp(Math.round(n.targetRange.start*rate+offset),0,this.doc.frames-1),end:clamp(Math.round(n.targetRange.end*rate+offset),1,this.doc.frames)},automation:Object.fromEntries(Object.entries(n.automation||{}).map(([key,lane])=>[key,{...lane,points:lane.points.map(q=>({...q,frame:Math.round(q.frame*rate+offset)}))}]))}));this.activeNode=this.nodes[0]?.id;this.invalidate();this.refresh();this.setStatus('Chain preset aligned to the current selection.')}catch(error){this.setStatus(error.message)}}
}
root.__XenWaveUIW01=Object.freeze({attach,drawStereo,enabled(canvas){const e=instances.get(canvas);return !!(e?.enabled&&e?.overlay)},open(canvas){instances.get(canvas)?.open()},getEditor(canvas){return instances.get(canvas)},drawEditSelection(ctx,canvas,view,width,height){instances.get(canvas)?.drawEditOverlay(ctx,view,width,height)},version:'W15-mixpaste-perchannel-percent'});
})(globalThis);


