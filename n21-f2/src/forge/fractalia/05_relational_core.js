/* Immutable F4 revision 1 recipes. F3/F2 dispatch to the untouched historical core. */
function createFractaliaInstrumentCore({resolution='standard'}={}) {
 const f3=typeof createFractaliaCore==='function'?createFractaliaCore({resolution}):require('./01_core.js')({resolution});
 const analyze=typeof analyzeFractaliaRelations==='function'?analyzeFractaliaRelations:require('./04_relations.js');
 const renderer=typeof renderFractaliaRelationalPCM==='function'?renderFractaliaRelationalPCM:require('./06_relational_render.js');
 const ENGINE='fractalia-relational-instrument-f4',REVISION=1,SIZE=2048,LEVELS=f3.LEVELS,TAU=Math.PI*2,fft=f3.fft;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),lerp=(a,b,t)=>a+(b-a)*t;
 function settings(input={}) {
  if(input.version!=null&&input.version!==4||input.material?.version===2)return f3.settings(input);
  if(input.schema&&input.schema!=='xensonar.fractalia')throw Error('Invalid Fractalia recipe');
  if(input.engine&&input.engine!==ENGINE)throw Error('Unsupported Fractalia engine');
  if(input.compilerRevision!=null&&![1,2,3,4].includes(input.compilerRevision))throw Error('Unsupported Fractalia compiler revision');
  if(input.timeModel!=null&&input.timeModel!=='intrinsic')throw Error('Unsupported Fractalia time model');
  if(input.donor){const d=input.donor;
   const pilot=input.compilerRevision===2&&d.mode==='tile'&&d.reading==='material-flow'&&d.revision===1;
   const material=((input.compilerRevision===3&&d.revision===2)||(input.compilerRevision===4&&d.revision===3&&Number.isFinite(d.recombine)&&d.recombine>=0&&d.recombine<=1&&[1,2].includes(d.layers)))&&d.mode==='tile'&&d.reading==='material-relations'&&['energy','absolute','relative'].includes(d.axis)&&['measured','neutral'].includes(d.pitchReference)&&Number.isFinite(d.warp)&&d.warp>=0&&d.warp<=1&&Number.isFinite(d.exchange)&&d.exchange>=0&&d.exchange<=1&&Number.isFinite(d.evolutionSec)&&d.evolutionSec>=.2&&d.evolutionSec<=60;
   if((!pilot&&!material)||!Number.isFinite(d.amount)||d.amount<0||d.amount>1)throw Error('Unsupported Fractalia donor binding');
  }
  const old=f3.settings({name:input.name,instrumentId:input.instrumentId,params:input.params||input,material:input.material});
  return Object.freeze({...old,version:4,engine:ENGINE,compilerRevision:input.compilerRevision??REVISION,timeModel:'intrinsic',...(input.donor?{donor:Object.freeze({...input.donor})}:{})});
 }
 function importInstrument(input) {
  if(input?.version!==4)return f3.importInstrument(input);
  if(input.schema!=='xensonar.fractalia-instrument'||input.recipe?.version!==4||!input.recipe.material)throw Error('Choose a complete Fractalia F4 instrument');
  const r=settings(input.recipe);if(input.engine!==ENGINE)throw Error('Unsupported instrument engine');return r;
 }
 function convert(input,version=4) {
  const old=settings(input);if(old.material?.version===2)throw Error('Capture the original F2 drawing again to create a new instrument');
  const next={schema:'xensonar.fractalia',version,name:old.name,params:old.params,material:old.material,instrumentId:null};return settings(next);
 }
 async function captureAsync({grid,tracks,durationSec,check}) {
  if(!grid?.width)return f3.capture({grid,tracks,durationSec});
  const C=resolution==='fine'?48:24,R=resolution==='fine'?256:128,field=new Float64Array(C*R),w=grid.width,h=grid.height;
  for(let x=0;x<w;x++){check();const column=grid.getColumn(x),x0=x/w*C,x1=(x+1)/w*C;
   for(let y=0;y<h;y++){const v=clamp(column[y]);if(v<=0)continue;const y0=(h-1-y)/h*R,y1=(h-y)/h*R;
    for(let a=Math.floor(x0);a<Math.min(C,Math.ceil(x1));a++)for(let b=Math.floor(y0);b<Math.min(R,Math.ceil(y1));b++)field[a*R+b]+=v*v*(Math.min(a+1,x1)-Math.max(a,x0))*(Math.min(b+1,y1)-Math.max(b,y0));
   }
   if(x%16===15)await new Promise(r=>setTimeout(r,0));
  }
  const maximum=Math.max(...field);if(maximum<=1e-16)throw Error('Draw or import a sound-colour template first');check();
  return f3.material({schema:'xensonar.fractalia-material',version:3,columns:C,rows:R,field:Array.from(field,v=>v/maximum),silent:false});
 }
 function point(points,u) {const pos=clamp(u)*(points.length-1),a=Math.floor(pos),b=Math.min(points.length-1,a+1),t=pos-a;const out={};for(const k of ['center','width','mass','near','branch','bend'])out[k]=lerp(points[a][k],points[b][k],t);return out}
 function sample(w,p){p=(p-Math.floor(p))*w.length;const i=Math.floor(p);return lerp(w[i],w[(i+1)%w.length],p-i)}
 async function compile({grid,tracks,durationSec,instrument={},check=()=>{},onProgress=()=>{},diagnostics={}}={}) {
  const recipe=settings(instrument);if(recipe.version!==4)return f3.compile({grid,tracks,durationSec,instrument:recipe,check,onProgress});
  if(recipe.material&&recipe.material.rows!==(resolution==='fine'?256:128))return createFractaliaInstrumentCore({resolution:recipe.material.rows===256?'fine':'standard'}).compile({grid,tracks,durationSec,instrument:recipe,check,onProgress,diagnostics});
  check();const material=recipe.material||await captureAsync({grid,tracks,durationSec,check}),relations=await analyze(material,{check,onProgress:p=>onProgress(p*.16)}),p=recipe.params;
  if(recipe.donor?.revision>=2){check();onProgress(1);return {engine:ENGINE,compilerRevision:recipe.compilerRevision,recipe,material,relations,bytes:material.field.length*8,key:JSON.stringify({recipe,material}),kind:'material-relations-only'};}
  const R=material.rows,states=[],stateLevels=[],positions=relations.statePositions,count=positions.length,global=f3.describe(material),ratio=y=>Math.pow(2,(y-relations.base)/R*6);
  const signature=diagnostics.signature===false?0:1,relational=diagnostics.relational===false?0:1;
  const modeStrength=p.geometry*(p.body==='prism'?.6:p.body==='hollow'?.5:.36);
  const modes=relations.modes.map(m=>{
   const ratios=m.points.map(q=>{const r=ratio(q.center),nearest=Math.max(1,Math.round(r));return Math.exp(lerp(Math.log(nearest),Math.log(Math.max(.125,r)),p.geometry))});
   const gains=m.points.map(q=>Math.sqrt(q.mass));return {id:m.id,ratios,gains,widths:m.points.map(q=>q.width),signature:m.signature,ratio:ratios[0],decay:.12+Math.max(0,.3-m.signature.width)};
  });
  const curveCount=modes[0].gains.length;
  for(let x=0;x<curveCount;x++){const sum=modes.reduce((a,m)=>a+m.gains[x],0);for(const m of modes)m.gains[x]=m.gains[x]/Math.max(sum,1e-12)*modeStrength*Math.pow(m.ratios[x],-(1-p.brightness)*.9)}
  let peak=0;
  for(let s=0;s<count;s++){
   check();const u=positions[s],profile=new Float64Array(R),left=s?((positions[s-1]+u)/2):0,right=s+1<count?((u+positions[s+1])/2):1;let weight=0;
   // Integrate source cells over the Voronoi interval of this state. Tiny
   // features between knot centres still contribute to the acoustic profile.
   for(let x=relations.first;x<=relations.last;x++){const span=Math.max(1,relations.last-relations.first+1),a=(x-relations.first)/span,b=(x-relations.first+1)/span,w=Math.max(0,Math.min(right,b)-Math.max(left,a));if(w===0)continue;weight+=w;for(let y=0;y<R;y++)profile[y]+=material.field[x*R+y]*w}
   if(weight)for(let y=0;y<R;y++)profile[y]/=weight;
   const amplitudes=new Float64Array(513),re=new Float64Array(SIZE),im=new Float64Array(SIZE);let mass=0;
   for(let y=0;y<R;y++){const v=profile[y],r=clamp(ratio(y),1,256),lo=Math.floor(r),f=r-lo;amplitudes[lo]+=v*(1-f);amplitudes[lo+1]+=v*f;mass+=v}
   const local=relations.modes.map(m=>point(m.points,u));
   for(let h=1;h<=512;h++){
    let shape=0;for(let k=0;k<relations.modes.length;k++){const sig=relations.modes[k].signature,q=local[k],position=(sig.center-relations.base)/R;
     shape+=sig.mass*(signature*(.6*sig.near+.5*sig.branch+2*sig.bend)*Math.sin(h*(.4+position*5)) + relational*(q.near+q.branch*.6)*Math.sin(h*(.3+(q.center-relations.base)/R*4)));
    }
    let a=Math.sqrt(amplitudes[h])*Math.pow(h,-(.12+(1-p.brightness)*.3))*Math.exp(clamp(shape*.28,-.3,.3));if(p.body==='reed')a*=h%2?1.18:.48;if(p.body==='hollow')a*=.3+.7*Math.abs(Math.sin(h*(.23+global.width*.7)));
    const phase=.24*Math.sin(h*.73)+.85*shape;re[h]=re[SIZE-h]=a*Math.sin(phase);im[h]=-a*Math.cos(phase);im[SIZE-h]=-im[h];
   }
   // A restrained periodic anchor supports the Carrier even in dense material.
   im[1]-=Math.sqrt(Math.max(mass,1e-12))*.16;im[SIZE-1]=-im[1];
   fft(re,im,true);const max=Math.max(1e-12,...re.map(Math.abs)),original=Float64Array.from(re,v=>v/max);let wave=original;
   for(let depth=0;depth<p.depth;depth++){
    const next=new Float64Array(SIZE);
    for(let i=0;i<SIZE;i++){
     const phase=i/SIZE;let interaction=0;
     for(let k=0;k<relations.modes.length;k++){const sig=relations.modes[k].signature,q=local[k],h=clamp(Math.round(ratio(q.center)),1,32),amount=(signature*(sig.near+sig.branch)+relational*(q.near+q.branch))*.5;
      interaction+=sig.mass*amount*Math.sin(TAU*h*phase+.7*(k+1));
     }
     const bend=p.fold*(.035+.045*interaction)/(depth+1),v=wave[i],wet=sample(wave,phase+bend*v+interaction*.018*p.fold);
     next[i]=lerp(v,wet+.15*sample(original,phase*(depth+2)),clamp(p.fold*.18/(1+depth*.3),0,.26));
    }
    wave=next;check();
   }
   for(let i=0;i<SIZE;i++){let v=wave[i];if(p.body==='reed')v=lerp(v,Math.tanh(v*1.9)-.1*v*v,.35);if(p.body==='hollow')v=lerp(v,v-.55*sample(wave,i/SIZE+.08+global.width*.18),.45);re[i]=v;im[i]=0}
   fft(re,im);re[0]=im[0]=0;
   for(let h=1;h<SIZE/2;h++){const shade=Math.pow(h,-(1-p.brightness)*1.25);re[h]*=shade;im[h]*=shade;re[SIZE-h]=re[h];im[SIZE-h]=-im[h]}
   const banks=[];for(const limit of LEVELS){const r=new Float64Array(SIZE),q=new Float64Array(SIZE);for(let h=1;h<=limit;h++){r[h]=r[SIZE-h]=re[h];q[h]=im[h];q[SIZE-h]=-im[h]}fft(r,q,true);const table=Float32Array.from(r);for(const v of table)peak=Math.max(peak,Math.abs(v));banks.push(table)}
   states.push(banks);stateLevels.push(Math.sqrt(mass));onProgress(.16+.84*(s+1)/count);await new Promise(r=>setTimeout(r,0));
  }
  const trim=.68/Math.max(peak,1e-12);for(const banks of states)for(const table of banks)for(let i=0;i<SIZE;i++)table[i]*=trim;
  const maxLevel=Math.max(1e-12,...stateLevels);check();
  return {engine:ENGINE,compilerRevision:recipe.compilerRevision,recipe,material,relations,states,statePositions:positions,levels:LEVELS,modes,modeStrength,stateLevels:stateLevels.map(v=>v/maxLevel),evolutionSec:.25+(1-p.motion)*1.2,releaseSec:.012+global.width*.08+(p.body==='prism'?.035:.018),bytes:count*LEVELS.length*SIZE*4,key:JSON.stringify({engine:ENGINE,revision:recipe.compilerRevision,donor:recipe.donor,params:p,material,timeModel:recipe.timeModel})};
 }
 async function renderPCM(args){const r=args.atlas?.recipe||settings(args.instrument);if(r.donor)throw Error('Donor-linked instruments require the donor rendering bridge');return r.version===4?renderer({...args,atlas:args.atlas||await compile(args)}):f3.renderPCM(args)}
 return Object.freeze({...f3,ENGINE,REVISION,f3,settings,importInstrument,convert,compile,renderPCM,analyzeRelations:analyze,example:(kind,version=4)=>convert(f3.example(kind),version)});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFractaliaInstrumentCore;
