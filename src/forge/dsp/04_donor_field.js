// Deterministic donor-state analysis and planning; one membership pass per iteration.
function __f347DonorFieldFactory(){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const reflect=x=>{const p=((x%2)+2)%2;return p<=1?p:2-p;};
  function feature(n,sr) {
    const env=n.formantEnvelope??[], total=env.reduce((s,x)=>s+Math.max(0,x),0)||1;
    let low=0,mid=0,high=0;
    for(let i=0;i<env.length;i++){const x=Math.max(0,env[i])/total;if(i<env.length/3)low+=x;else if(i<env.length*2/3)mid+=x;else high+=x;}
    return [clamp(n.aperiodicity??1,0,1),clamp(Math.log2(Math.max(40,n.centroidHz??400)/40)/Math.log2(sr*.5/40),0,1),
      clamp(n.level??n.relativeLevel??.5,0,1),low,mid,high,clamp(n.pitchConfidence??0,0,1)];
  }
  const featureWeights=Object.freeze([1.5,1,1,.8,.8,.8,.35]);
  const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2*featureWeights[i],0);
  function membersByAssignment(entries,assignments,count){
    const groups=Array.from({length:count},()=>[]);
    for(let i=0;i<entries.length;i++)groups[assignments[i]].push(entries[i]);
    return groups;
  }
  function build(model) {
    const windows=model.sourceIndex.windows, radius=model.sampleRate*.0275;
    let entries=(model.atlas?.nodes??[]).flatMap(n=>{
      const w=windows.find(w=>n.center-radius>=w.startSample&&n.center+radius<=w.endSample);
      return w&&(n.rms??0)>1e-7?[{node:n,window:w.id,features:feature(n,model.sampleRate)}]:[];
    });
    // Bound preparation without preferentially retaining only tonal frames.
    if(entries.length>512){const raw=entries;entries=Array.from({length:512},(_,i)=>raw[Math.round(i*(raw.length-1)/511)]);}
    if(!entries.length)return {version:'donor-state-field-f3.56.41',states:[],transitions:[],entries:[],evidence:'no-contained-analysis-frames'};
    const seeds=[entries[Math.floor(entries.length*.5)].features];
    while(seeds.length<6&&seeds.length<entries.length){let best=-1,at=null;
      for(const e of entries){const d=Math.min(...seeds.map(s=>distance(s,e.features)));if(d>best){best=d;at=e.features;}}
      if(best<.018)break;seeds.push(at);
    }
    let centers=seeds.map(x=>x.slice()), assignments=[];
    for(let pass=0;pass<8;pass++){
      assignments=entries.map(e=>{let id=0,d=Infinity;centers.forEach((x,i)=>{const v=distance(e.features,x);if(v<d){d=v;id=i;}});return id;});
      const grouped=membersByAssignment(entries,assignments,centers.length);
      centers=centers.map((c,i)=>{const members=grouped[i];return members.length?c.map((_,k)=>members.reduce((s,e)=>s+e.features[k],0)/members.length):c;});
    }
    const grouped=membersByAssignment(entries,assignments,centers.length);
    const states=centers.map((features,id)=>{
      const members=grouped[id];let representative=members[0],d=Infinity;
      for(const e of members){const v=distance(e.features,features);if(v<d){d=v;representative=e;}}
      return {id,features,members:members.length,representativeCenter:representative?.node.center??0,windowId:representative?.window??windows[0].id,
        aperiodicity:features[0],brightness:features[1],level:features[2],spread:Math.sqrt(members.reduce((s,e)=>s+distance(e.features,features),0)/Math.max(1,members.length))};
    }).filter(s=>s.members);
    entries.forEach((e,i)=>{e.state=assignments[i];});
    const transitions=Array.from({length:centers.length},()=>new Array(centers.length).fill(0));
    for(let i=1;i<entries.length;i++)if(entries[i].window===entries[i-1].window)transitions[entries[i-1].state][entries[i].state]++;
    return {version:'donor-state-field-f3.56.41',states,transitions,entries,evidence:'observed-level-envelope-aperiodicity'};
  }
  function summary(field){return {version:field.version,evidence:field.evidence,states:field.states,transitions:field.transitions,analyzedFrames:field.entries.length};}
  function plan(material,carrier,model,sr,duration,p){
    const mode=p.gestaltMode, field=mode==='weave'?build(model):null, prior=new Map();
    const windows=model.sourceIndex.windows;
    const stateById=field?new Map(field.states.map(state=>[state.id,state])):null;
    const members=field?membersByAssignment(field.entries,field.entries.map(entry=>entry.state),field.transitions.length):null;
    for(let id=0;id<material.runs.length;id++){
      const run=material.runs[id],band=carrier.bands[run.voice],curve=run.gestalt.sourceCurve,count=run.endSample-run.startSample;
      const durationSec=count/sr,prev=prior.get(run.voice), gesture=clamp(p.gestaltGesture??.6,0,1),motion=clamp(p.gestaltMotion??.6,0,1);
      let chosen=windows.find(w=>w.id===run.windowId)??windows[0],focus=null,stateId=null;
      if(mode==='weave'&&field.states.length){
        const target=[run.gestalt.meanWidth,.2+.65*run.gestalt.meanWidth,run.gestalt.meanGain];let best=Infinity;
        for(const s of field.states){const total=prev!=null?field.transitions[prev]?.reduce((a,b)=>a+b,0)??0:0;
          const transition=prev!=null?-Math.log(((field.transitions[prev]?.[s.id]??0)+1)/(total+field.states.length))*.075:0;
          const score=(s.aperiodicity-target[0])**2*.8+(s.brightness-target[1])**2*.4+(s.level-target[2])**2+transition;
          if(score<best){best=score;stateId=s.id;}}
        const selected=stateById.get(stateId);let d=Infinity;
        for(const e of members[stateId]??[]){const score=Math.abs(e.node.center/model.samples.length-(p.position??0))*.15+distance(e.features,selected.features);
          if(score<d){d=score;focus=e.node;chosen=windows.find(w=>w.id===e.window);}}
      }
      if(mode==='wander')chosen=windows[(id+Math.floor((p.position??0)*windows.length))%windows.length];
      run.windowId=chosen.id;run.sourceStart=chosen.startSample;run.sourceEnd=chosen.endSample;
      const span=run.sourceEnd-run.sourceStart,pad=Math.min(span*.45,model.sampleRate*.028),lo=run.sourceStart+pad,hi=run.sourceEnd-pad,safeSpan=Math.max(0,hi-lo);
      const from=clamp(focus?.center??lo+safeSpan*(p.position??0),lo,hi);
      let accumulated=0,oldHz=0,oldSlope=0,oldGain=0;
      const flow=new Float64Array(curve.length),positions=new Float64Array(curve.length);
      for(let k=0;k<curve.length;k++){
        const t=k/Math.max(1,curve.length-1),cell=(run.firstCell+(run.lastCell-run.firstCell)*t),a=Math.floor(cell),b=Math.min(band.gainCurve.length-1,a+1),f=cell-a;
        const hz=carrier.rootReferenceHz*Math.exp(Math.log(Math.max(1e-5,band.centerRatioCurve[a]))*(1-f)+Math.log(Math.max(1e-5,band.centerRatioCurve[b]))*f);
        const gain=band.gainCurve[a]*(1-f)+band.gainCurve[b]*f,width=clamp(((band.supportSigmaCurve?.[a]??0)*(1-f)+(band.supportSigmaCurve?.[b]??0)*f)/.14,0,1);
        const dt=Math.max(1/sr,durationSec/Math.max(1,curve.length-1)),slope=oldHz?Math.log2(hz/oldHz)/dt:0,curvature=k>1?Math.abs(slope-oldSlope)*dt:0;
        if(k)accumulated+=dt*(.2+Math.min(5,Math.abs(slope)*.55+curvature*3+Math.abs(gain-oldGain)/dt*.08)+width*.35);
        flow[k]=accumulated;
        // Signed pitch and changing stroke width give Motion a bidirectional trajectory.
        positions[k]=Math.log2(hz/Math.max(1e-5,carrier.rootReferenceHz*band.centerRatioCurve[run.firstCell]))*.35+(width-run.gestalt.meanWidth)*.4;
        oldHz=hz;oldSlope=slope;oldGain=gain;
      }
      for(let k=0;k<curve.length;k++){
        const t=k/Math.max(1,curve.length-1),elastic=flow[k]/Math.max(1e-8,accumulated);let at=curve[k];
        if(mode==='imprint')at=lo+safeSpan*clamp((p.position??.2)+(1-(p.position??.2))*motion*smooth(t),0,1);
        if(mode==='motion'||mode==='signature')at=lo+safeSpan*reflect((p.position??0)+motion*((1-gesture)*t+gesture*(elastic*.55+positions[k])));
        if(mode==='weave')at=clamp(from+safeSpan*.25*motion*(smooth(t)-.5),lo,hi);
        if(mode==='freeze')at=from;
        if(mode==='wander')at=lo+safeSpan*reflect((p.position??0)+t*(.65+motion*2.35));
        if(mode==='film'||mode==='air')at=lo+safeSpan*reflect((p.position??0)+motion*(t*.8+elastic*.2));
        curve[k]=clamp(at,run.sourceStart,run.sourceEnd);
      }
      run.gestalt.stateId=stateId;run.gestalt.mode=mode;run.gestalt.from=curve[0];run.gestalt.extent=Math.abs(curve.at(-1)-curve[0]);
      run.workbenchRead.firstSourceCenter=curve[0];run.workbenchRead.lastSourceCenter=curve.at(-1);
      run.workbenchRead.safeLo=lo;run.workbenchRead.safeHi=hi;
      if(stateId!==null)prior.set(run.voice,stateId);
    }
    material.structuralPlan.version='gesture-source-plan-f3.56.41';
    material.structuralPlan.states=field?.states.length??0;
    if(field)material.stateField=summary(field);
    return material;
  }
  return Object.freeze({build,summary,plan,smooth,reflect});
}
const __F35641Field=__f347DonorFieldFactory();
