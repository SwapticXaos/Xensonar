// TEST ONLY. Scenario file for tools/probes/live_glitch_probe.js (PROBE build: it needs window.__xenProbe).
// Measures clicks / discontinuities of the Root-Follow-Loop around the playfield gate (cursor leaves / re-enters the playfield) and while playing.
//   node tools/probes/live_glitch_probe.js dist/XenSonar_PROBE.html --scenarios-file tools/probes/rfl_click_scenarios.js \
//        --scenario rflControlLeave,rflSteady,rflLeaveSlow,rflLeaveFast,rflEdgeWiggle --json out.json
// The loop is a synthetic 1-bar test loop made through the Multitrack inbox (library entry) and put into the Root-Follow bank; nothing of the user's data is touched.
// Each scenario prints a line "RFL-COUNTERS {...}": gate transitions (rfl-playfield-gate), pitch-worklet connects/detaches, and how often the loop restarted.
module.exports=({p,canvasBox})=>{
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  let entryId=null;
  async function setup(){
    if(entryId)return;
    entryId=await E(`(async()=>{const sr=48000,n=sr*2,L=new Float32Array(n);for(let i=0;i<n;i++){const t=i/sr;L[i]=.4*(Math.sin(2*Math.PI*220*t)+.5*Math.sin(2*Math.PI*330*t)+.25*Math.sin(2*Math.PI*440*t))*(0.6+0.4*Math.sin(2*Math.PI*2*t))}
      const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'rfl-probe-loop',origin:'probe',bpm:120,bars:1,enqueue:false});return d.entry.id})()`);
    await E(`ri('rootFollowBankMembership',{entryId:'${entryId}',enabled:true,activate:true})`);
    // RFL_VARIANT (ablation): base = old behaviour (no grace, 22 ms, bus only) | hyst = 150 ms grace only | fade = 60 ms fade of bus + parallel paths only | both = the shipped defaults
    const v=process.env.RFL_VARIANT||'both',cfg={base:[0,.022,false],hyst:[150,.022,false],fade:[0,.06,true],both:[150,.06,true],long:[0,.4,true]}[v];
    if(!cfg)throw Error('unknown RFL_VARIANT '+v);
    await E(`__xenRflLeaveGraceMs=()=>${cfg[0]};__xenRflStopFadeSec=()=>${cfg[1]};__xenRflFadeParallel=()=>${cfg[2]}`);
    // experimental overrides of the stop path (PROBE only): nohold = plain setValueAtTime instead of cancelAndHold | instant = no fade, release at once | target = exponential approach instead of the linear ramp
    const x=process.env.RFL_STOPX;
    if(process.env.RFL_SMOOTHX==='value')await E(`__xenSmoothMixParam=(param,value,ctx)=>{if(!param||!Number.isFinite(value)||ctx?.state==='closed'||__XenMixTargets.get(param)===value)return;__XenMixTargets.set(param,value);const at=ctx.currentTime,held=param.value;param.cancelScheduledValues(at);param.setValueAtTime(held,at);param.setTargetAtTime(value,at,.03)}`);
    if(x==='nohold')await E(`__f49HoldParam=(p,t)=>{const v=p.value;p.cancelScheduledValues(t);p.setValueAtTime(v,t)}`);
    if(x==='instant')await E(`__f49FadeAndRelease=(bus,sec,rel)=>rel()`);
    if(x==='target')await E(`__f49FadeAndRelease=(bus,sec,rel)=>{const ctx=bus?.context;if(!bus||ctx.state!=='running'){rel();return}const at=ctx.currentTime;bus.gain.cancelScheduledValues(at);bus.gain.setTargetAtTime(0,at,.012);setTimeout(rel,Math.ceil((sec+.05)*1000))}`);
    console.log('RFL-VARIANT '+v+' '+JSON.stringify(cfg)+' stopx='+(x||''));
  }
  const rfl=async on=>{await setup();await E(`__NodalBallGrid.update({rootFollowLoopActive:${on?'true':'false'},rootFollowLoopId:'${on?entryId:''}'})`);await p.waitForTimeout(1200)};
  const mark=l=>p.evaluate(l=>{try{__glitch.mark(l)}catch{}},l);
  const inside=async(bx,fx=.5,fy=.5,steps=1)=>{await mark('enter');return p.mouse.move(bx.x+bx.width*fx,bx.y+bx.height*fy,{steps})};
  const outside=async(bx,steps=1)=>{await mark('leave');return p.mouse.move(bx.x-60,bx.y+bx.height*.5,{steps})};
  const counters=async(label,t0)=>{const r=await E(`(()=>{const d=__XenRFLPitchReentryProbe.read();const c={};for(const e of d.events)c[e.type]=(c[e.type]||0)+1;return{gate:d.events.filter(e=>e.type==='rfl-playfield-gate').length,counts:c}})()`);console.log('RFL-COUNTERS '+JSON.stringify({scenario:label,...r}));const tl=await p.evaluate(()=>({f0:__glitch.chunks.length?__glitch.chunks[0].f:null,sr:__glitch.sampleRate,marks:__glitch.marks.map(m=>[m.l,m.frame])}));console.log('RFL-TIMELINE '+JSON.stringify({scenario:label,...tl}))};
  const begin=async(on)=>{await rfl(on);if(process.env.RFL_QUIET){await E(`__NodalBallGrid.update({drumVolume:0,bassVolume:0})`);await p.waitForTimeout(600)}await p.evaluate(()=>{__glitch.marks.length=0});await E(`__XenRFLPitchReentryProbe.setEnabled(false);__XenRFLPitchReentryProbe.setEnabled(true)`);const bx=await canvasBox();await inside(bx);await p.waitForTimeout(1500);return bx};
  const S={};
  // control: the same leaving pattern with the loop OFF (what else clicks when the cursor leaves?)
  S.rflControlLeave=async()=>{const bx=await begin(false);for(let k=0;k<6;k++){await inside(bx,.5,.5,30);await p.waitForTimeout(900);await outside(bx,30);await p.waitForTimeout(900)}await inside(bx);await p.waitForTimeout(800);await counters('rflControlLeave')};
  // steady: playing inside the field, loop on
  S.rflSteady=async()=>{const bx=await begin(true);const t0=Date.now();while(Date.now()-t0<12000){const t=(Date.now()-t0)/1000;await inside(bx,.5+.4*Math.sin(t*1.3),.5+.4*Math.sin(t*1.9+1));if(Math.floor(t/1.5)!==Math.floor((t-.05)/1.5)){await p.mouse.down();await p.mouse.up()}await p.waitForTimeout(16)}await p.waitForTimeout(800);await counters('rflSteady')};
  // long steady play inside the field (sporadic clicks): the cursor wanders slowly for RFL_SEC seconds
  S.rflLong=async()=>{const bx=await begin(true);const sec=+(process.env.RFL_SEC||90),t0=Date.now();while(Date.now()-t0<sec*1000){const t=(Date.now()-t0)/1000;await p.mouse.move(bx.x+bx.width*(.5+.38*Math.sin(t*.7)),bx.y+bx.height*(.5+.38*Math.sin(t*.45+1)));await p.waitForTimeout(30)}await counters('rflLong')};
  // leave slowly / re-enter slowly (6 cycles)
  S.rflLeaveSlow=async()=>{const bx=await begin(true);for(let k=0;k<6;k++){await inside(bx,.5,.5,30);await p.waitForTimeout(1500);await outside(bx,40);await p.waitForTimeout(1200);}await inside(bx,.5,.5,40);await p.waitForTimeout(1500);await counters('rflLeaveSlow')};
  // jump out and in at once (10 cycles)
  S.rflLeaveFast=async()=>{const bx=await begin(true);for(let k=0;k<10;k++){await inside(bx,.3+.04*k,.5,1);await p.waitForTimeout(900);await outside(bx,1);await p.waitForTimeout(500)}await inside(bx);await p.waitForTimeout(1500);await counters('rflLeaveFast')};
  // wiggle across the border at ~7 Hz (the 150 ms in/out pattern of the field diagnostic)
  S.rflEdgeWiggle=async()=>{const bx=await begin(true);const t0=Date.now();let k=0;while(Date.now()-t0<6000){await p.mouse.move(bx.x+(k%2?10:-10),bx.y+bx.height*.5,{steps:1});k++;await p.waitForTimeout(70)}await inside(bx);await p.waitForTimeout(1500);await counters('rflEdgeWiggle')};

  // ---- attribution: which bus role carries the click? (stem recorder taps main / drone / rhythm / space before the master chain; premaster = their sum) ----
  const detect=(f32,sr)=>{const n=f32.length,out=[];const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[i]-2*f32[i-1]+f32[i-2]);const W=384,G=6;let i=W+2;
    while(i<n-W){if(d[i]>0.012){let mx=0,sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++;if(d[k]>mx)mx=d[k]}let s2=sb,c2=cb;for(let k=i+G+1;k<=i+W;k++){s2+=d[k];c2++}const ratio=d[i]/(s2/c2+1e-7);if(ratio>25&&d[i]>8*mx){out.push({at:i/sr,step:Math.abs(f32[i]-f32[i-1])});i+=W;continue}}i++}return out};
  S.rflAttrib=async()=>{
    const cycles=+(process.env.RFL_CYCLES||8);const bx=await begin(true);
    await p.evaluate(async()=>{window.__att={marks:[]};await __XenStemRecorder.start({keep:true,extra:['premaster']});window.__att.t0=__XenLiveStemSource.get().ctx.currentTime});
    const m=l=>p.evaluate(l=>{__att.marks.push([l,__XenLiveStemSource.get().ctx.currentTime-__att.t0])},l);
    for(let k=0;k<cycles;k++){await m('enter');await inside(bx,.5,.5,30);await p.waitForTimeout(1500);await m('leave');await outside(bx,40);await p.waitForTimeout(1200)}
    await m('enter');await inside(bx,.5,.5,40);await p.waitForTimeout(1200);
    const r=await E(`(async()=>{const detect=${detect.toString()};const r=await __XenStemRecorder.stop();const out={sr:r.session.ctx.sampleRate,clicks:{}};for(const s of r.stems){const m=s.meta;const inter=await __xenLongMasterPCM.readFrames(m,0,m.frames),mono=new Float32Array(inter.length>>1);for(let k=0;k<mono.length;k++)mono[k]=inter[2*k];out.clicks[s.id]=detect(mono,out.sr)}for(const s of r.stems)await __xenLongMasterPCM.remove(s.meta.id,s.meta.parts);return out})()`);
    const marks=await p.evaluate(()=>__att.marks);const res={};
    for(const [id,cl] of Object.entries(r.clicks)){res[id]=cl.map(c=>{const prev=marks.filter(x=>x[1]<=c.at+.17).pop();const lv=marks.filter(x=>x[0]==='leave').map(x=>c.at-x[1]).sort((a,b)=>Math.abs(a)-Math.abs(b))[0];return{at:+c.at.toFixed(3),step:+c.step.toFixed(3),after:prev?prev[0]:null,dt:prev?+(c.at-prev[1]).toFixed(2):null,toNearestLeave:lv==null?null:+lv.toFixed(2)}})}
    console.log('RFL-ATTRIB '+JSON.stringify({recSec:+(marks.length?marks[marks.length-1][1]:0).toFixed(1),cycles,leaves:marks.filter(x=>x[0]==='leave').length,variant:process.env.RFL_VARIANT||'both',clicks:res}));
    await counters('rflAttrib')};
  // ---- localisation of the sporadic clicks while playing (RFL-TAP): three sample-aligned taps inside the RFL path ----
  //  bus   = RFL bus gain output (all grains/voices/residents summed, before DC guard)       pan = StereoPanner 'rootFollow' output (after DC guard + pan, before pitch worklet)
  //  pitch = output of the RFL pitch worklet (__XenTimeStablePitch) when it is in the chain, i.e. what goes into EQ -> Rhythm bus
  // plus every AudioBufferSourceNode.start / stop with the audio-clock time, and the bus gain automation calls; clicks are related to the nearest grain edge.
  S.rflTap=async()=>{
    await E(`(()=>{if(window.__rflTap)return;const T=window.__rflTap={chunks:{},grains:[],stops:[],busCalls:[],taps:{},ready:{},buses:0};
      const src="class P extends AudioWorkletProcessor{constructor(o){super();this.l=o.processorOptions.l;this.n=0;this.b=new Float32Array(128*64);this.f0=currentFrame}process(i){const a=i[0]&&i[0][0];const o=this.n*128;if(a)this.b.set(a,o);else this.b.fill(0,o,o+128);if(++this.n===64){this.port.postMessage({l:this.l,f:this.f0,b:this.b},[this.b.buffer]);this.b=new Float32Array(128*64);this.n=0;this.f0=currentFrame+128}return true}}registerProcessor('xen-rfl-tap',P)";
      const oc=AudioNode.prototype.connect;
      const tap=(node,label)=>{const ctx=node.context;const go=()=>{const w=new AudioWorkletNode(ctx,'xen-rfl-tap',{numberOfInputs:1,numberOfOutputs:0,channelCount:1,channelCountMode:'explicit',processorOptions:{l:label}});w.port.onmessage=e=>{if(T.on)(T.chunks[label]||(T.chunks[label]=[])).push({f:e.data.f,b:e.data.b})};oc.call(node,w);T.taps[label]=(T.taps[label]||0)+1};
        if(T.ready[ctx.sampleRate])go();else ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src)).then(()=>{T.ready[ctx.sampleRate]=1;go()})};
      // PROBE ONLY: rewrite the resident worklet module on load so that each process() call records currentFrame continuity and whether render ran.
      T.frameLog=[];const OB=window.Blob;
      if(${process.env.RFL_FRAMECHECK?'true':'false'}){window.Blob=function(parts,opt){try{if(Array.isArray(parts))parts=parts.map(x=>typeof x==='string'&&x.includes('xensonar-raw-resident-v1')&&x.includes('process(e, s) {')?(T.patchedResident=(T.patchedResident||0)+1,x.replace('process(e, s) {','process(e, s) { if(this.__pf!==undefined&&currentFrame!==this.__pf+128){(this.__an||(this.__an=[])).push([this.__pf,currentFrame])} this.__pf=currentFrame; this.__calls=(this.__calls||0)+1; if((this.__calls&511)===0&&this.__an&&this.__an.length){this.port.postMessage({type:"probe-frames",an:this.__an.splice(0),calls:this.__calls})}')):x)}catch(e){T.patchErr=String(e)}return new OB(parts,opt)};window.Blob.prototype=OB.prototype}
      let panNode=null;T.feeders={};T.up=new WeakMap();T.wnames=new WeakMap();T.abs=[];
      const OW=window.AudioWorkletNode;window.AudioWorkletNode=function(c,n,o){const w=new OW(c,n,o);T.wnames.set(w,n);
        if(n==='xensonar-raw-resident-v1'){w.port.addEventListener('message',e=>{if(e.data&&e.data.type==='probe-frames')T.frameLog.push(...e.data.an.map(a=>[...a,e.data.calls]))});const pm=w.port.postMessage,cx=c;T.capture=T.capture||[];const rec={sr:cx.sampleRate,msgs:[]};T.capture.push(rec);
          w.port.postMessage=function(m){try{const f=Math.round(cx.currentTime*cx.sampleRate);if(m&&m.type==='load')rec.msgs.push({type:'load',f,sampleRate:m.sampleRate,map:m.map?Object.fromEntries(Object.entries(m.map).map(([k,v])=>[k,ArrayBuffer.isView(v)?{f32:Array.from(v)}:v])):null,channels:m.channels.map(a=>Array.from(a))});
            else if(m&&(m.type==='arm'||m.type==='state'))rec.msgs.push({type:m.type,f,program:m.program,firstWindowSec:m.firstWindowSec,sequence:m.sequence});else if(m)rec.msgs.push({type:m.type,f})}catch(e){rec.err=String(e)}return pm.apply(this,arguments)}}
        return w};window.AudioWorkletNode.prototype=OW.prototype;
      const feederName=T.fname=n=>n.constructor.name+(T.wnames.get(n)?':'+T.wnames.get(n):'');
      T.ops=[];T.opSites=new Map();const site=k=>{if(!T.on||!${process.env.RFL_SITES?'true':'false'})return;const st=(new Error().stack||'').split(String.fromCharCode(10)).slice(3,6).map(x=>{const m=new RegExp('(?:at[ ]+([^ (]+)[ ]+[(])?.*?:([0-9]+):([0-9]+)[)]?$').exec(x.trim());return m?(m[1]||'?')+'@'+m[2]+':'+m[3]:'?'}).join(' < ');const key=k+' '+st;T.opSites.set(key,(T.opSites.get(key)||0)+1)};
      const odc=AudioNode.prototype.disconnect;AudioNode.prototype.disconnect=function(){try{if(T.on){T.ops.push(this.context.currentTime);site('disconnect '+this.constructor.name)}}catch{}return odc.apply(this,arguments)};
      AudioNode.prototype.connect=function(dest){const r=oc.apply(this,arguments);try{if(T.on){T.ops.push(this.context.currentTime);site('connect '+this.constructor.name+'->'+(dest&&dest.constructor?dest.constructor.name:'param'))}
        if(T.bus&&dest===T.bus){const k=feederName(this);T.feeders[k]=(T.feeders[k]||0)+1}
        if(T.wnames.get(this)==='xensonar-raw-resident-v1'&&!this.__rflTapped){this.__rflTapped=1;tap(this,'resident');const port=this.port,pm=port.postMessage,cx=this.context;T.msgs=[];
          port.postMessage=function(m){try{if(T.on)T.msgs.push([+cx.currentTime.toFixed(4),m&&(m.type||m.kind||m.op||Object.keys(m).slice(0,3).join('+'))])}catch{}return pm.apply(this,arguments)}}
        if(dest instanceof DynamicsCompressorNode&&!dest.__rflTapped){dest.__rflTapped=1;tap(dest,'comp')}
        if(dest instanceof AudioNode){let l=T.up.get(dest);if(!l)T.up.set(dest,l=new Set());l.add(this)}
        if(this.__f49DCGuard&&this.__f49DCGuard===dest&&!this.__rflTapped){this.__rflTapped=1;T.buses++;tap(this,'bus');T.bus=this;
          const g=this.gain;for(const m of['setValueAtTime','linearRampToValueAtTime','setTargetAtTime','cancelScheduledValues']){const o=g[m];g[m]=function(){T.busCalls.push([m,this.context?.currentTime??0,...[...arguments].map(x=>+(+x).toFixed(4))]);return o.apply(this,arguments)}}}
        else if(this.__rflTapped&&dest instanceof BiquadFilterNode){}
        else if(dest instanceof StereoPannerNode&&this instanceof BiquadFilterNode&&this.type==='highpass'&&this.frequency.value===3&&!dest.__rflTapped){dest.__rflTapped=1;panNode=dest;tap(dest,'pan')}
        else if(this===panNode&&dest instanceof AudioWorkletNode&&!dest.__rflTapped){dest.__rflTapped=1;tap(dest,'pitch')}
      }catch(e){}return r};
      const os=AudioBufferSourceNode.prototype.start,ot=AudioBufferSourceNode.prototype.stop;
      AudioBufferSourceNode.prototype.start=function(when,off,dur){try{if(T.on&&this.buffer){const w=when||this.context.currentTime,o=off||0,r=this.playbackRate.value||1,d=dur==null?this.buffer.duration-o:dur;T.abs.push([+w.toFixed(4),+this.buffer.duration.toFixed(3)]);T.grains.push([+w.toFixed(5),+o.toFixed(5),+d.toFixed(5),+r.toFixed(4),+this.context.currentTime.toFixed(4),this.loop?1:0]);this.__rflT=T.grains.length-1}}catch{}return os.apply(this,arguments)};
      AudioBufferSourceNode.prototype.stop=function(when){try{if(T.on&&this.__rflT!=null)T.stops.push([+(when||this.context.currentTime).toFixed(5),+this.context.currentTime.toFixed(4)])}catch{}return ot.apply(this,arguments)};
    })()`);
    const bx=await begin(true);
    await E(`__rflTap.on=true;__rflTap.t0=(__rflTap.bus&&__rflTap.bus.context.currentTime)||0`);
    const sec=+(process.env.RFL_SEC||60),t0=Date.now();
    while(Date.now()-t0<sec*1000){const t=process.env.RFL_STILL?0:(Date.now()-t0)/1000;await p.mouse.move(bx.x+bx.width*(.5+.38*Math.sin(t*.7)),bx.y+bx.height*(.5+.38*Math.sin(t*.45+1)));await p.waitForTimeout(30)}
    await E(`__rflTap.on=false`);await p.waitForTimeout(300);
    const r=await E(`(()=>{const T=__rflTap,detect=${detect.toString()},sr=T.bus?T.bus.context.sampleRate:48000,out={sr,taps:T.taps,buses:T.buses,grains:T.grains.length,stops:T.stops.length,clicks:{},late:0};
      for(const [l,cs] of Object.entries(T.chunks)){cs.sort((a,b)=>a.f-b.f);const f0=cs[0].f,n=cs[cs.length-1].f+cs[cs.length-1].b.length-f0,m=new Float32Array(n);for(const c of cs)m.set(c.b,c.f-f0);
        out.clicks[l]=detect(m,sr).map(c=>({t:+(f0/sr+c.at).toFixed(4),step:+c.step.toFixed(3)}))}
      for(const g of T.grains)if(g[0]<g[4])out.late++;
      const edges=[];for(const g of T.grains){edges.push(['start',g[0],g[1]]);if(g[2]!=null&&!g[5])edges.push(['end',g[0]+g[2]/Math.max(1e-3,g[3]),g[1]+g[2]])}for(const s of T.stops)edges.push(['stop',s[0],null]);
      const near=t=>{let b=null;for(const e of edges){const d=t-e[1];if(!b||Math.abs(d)<Math.abs(b.dt))b={kind:e[0],dt:+d.toFixed(4),off:e[2]}}return b};
      for(const l in out.clicks)for(const c of out.clicks[l])c.nearestGrainEdge=near(c.t);
      out.feeders=T.feeders;
      const feederName=T.fname,tree=(n,d,seen)=>{if(d>6||seen.has(n))return feederName(n)+'…';seen.add(n);const l=[...(T.up.get(n)||[])];return l.length?{[feederName(n)]:l.slice(0,8).map(x=>tree(x,d+1,seen))}:feederName(n)};out.upstream=T.bus?tree(T.bus,0,new Set()):null;out.absStarts=T.abs.length;out.absDur=[...new Set(T.abs.map(a=>a[1]))].slice(0,12);
      if(T.chunks.bus){const cs=T.chunks.bus,f0=cs[0].f,n=cs[cs.length-1].f+cs[cs.length-1].b.length-f0,m=new Float32Array(n);for(const c of cs)m.set(c.b,c.f-f0);
        const rms=(a,b)=>{let q=0;for(let i=Math.max(0,a);i<Math.min(n,b);i++)q+=m[i]*m[i];return +Math.sqrt(q/Math.max(1,b-a)).toFixed(4)};const W=Math.round(sr*.005);
        for(const c of out.clicks.bus){const i=Math.round((c.t-f0/sr)*sr);c.wave=Array.from(m.subarray(i-6,i+6)).map(x=>+x.toFixed(4));c.rmsBefore=rms(i-W,i-1);c.rmsAfter=rms(i+1,i+W);c.zerosAfter=(()=>{let k=0;while(i+k<n&&Math.abs(m[i+k])<1e-5)k++;return k})()}}
      out.patchedResident=T.patchedResident||0;out.patchErr=T.patchErr||null;out.frameAnomalies=T.frameLog.map(a=>({prev:a[0],cur:a[1],delta:a[1]-a[0],tPrev:+(a[0]/sr).toFixed(4)}));
      {const ops=T.ops,dur=ops.length?ops[ops.length-1]-ops[0]:1,rate=ops.length/Math.max(1,dur);out.graphOps={n:ops.length,perSec:+rate.toFixed(1)};
       const cnt=(t,w)=>ops.filter(x=>Math.abs(x-t)<=w).length;if(out.clicks.resident)for(const c of out.clicks.resident){c.opsWithin20ms=cnt(c.t,.02);c.opsWithin50ms=cnt(c.t,.05)}
       out.opSites=[...T.opSites].sort((a,b)=>b[1]-a[1]).slice(0,25);out.graphOps.expectedWithin20ms=+(rate*.04).toFixed(2);out.graphOps.expectedWithin50ms=+(rate*.1).toFixed(2)}
      out.msgTypes={};for(const m of T.msgs||[])out.msgTypes[m[1]]=(out.msgTypes[m[1]]||0)+1;
      if(out.clicks.resident)for(const c of out.clicks.resident){let b=null;for(const m of T.msgs||[]){const d=c.t-m[0];if(d>=-0.05&&(!b||Math.abs(d)<Math.abs(b.dt)))b={type:m[1],dt:+d.toFixed(4)}}c.nearestMsg=b}
      out.busCalls=T.busCalls.length;out.grainSample=T.grains.slice(0,6);out.offsets={min:Math.min(...T.grains.map(g=>g[1])),max:Math.max(...T.grains.map(g=>g[1]+(g[2]||0)))};
      return out})()`);
    if(process.env.RFL_CAPTURE){const cap=await E(`JSON.stringify({capture:__rflTap.capture||[],residentPcm:(()=>{const cs=(__rflTap.chunks.resident||[]).slice().sort((a,b)=>a.f-b.f);return cs.map(c=>({f:c.f,b:Array.from(c.b,x=>Math.round(x*1e6)/1e6)}))})()})`);require('fs').writeFileSync(process.env.RFL_CAPTURE,JSON.stringify({...JSON.parse(cap),clicksResident:r.clicks.resident||[],clicksBus:r.clicks.bus||[]}));console.log('RFL-CAPTURE written '+process.env.RFL_CAPTURE)}
    console.log('RFL-TAP '+JSON.stringify(r));
    await counters('rflTap')};
  return S;
};
