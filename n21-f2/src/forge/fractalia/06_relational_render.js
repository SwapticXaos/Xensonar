/* F4 revision 1: Carrier events, amplitude and material age are independent.
   Phases belong to voices; the shared atlas is never mutated by playback. */
async function renderFractaliaRelationalPCM({tracks=[],durationSec,atlas,sampleRate=48000,check=()=>{},onProgress=()=>{},diagnostics={}}) {
 if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>600||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid Fractalia render bounds');
 const frames=Math.ceil(durationSec*sampleRate);if(frames>24000000)throw Error('Fractalia figure is too long for this sample rate');
 const left=new Float32Array(frames),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),lerp=(a,b,t)=>a+(b-a)*t,wrap=v=>v-Math.floor(v),TAU=2*Math.PI;
 const sample=(table,phase)=>{const pos=wrap(phase)*table.length,i=Math.floor(pos);return lerp(table[i],table[(i+1)%table.length],pos-i)};
 const curve=(array,u,log=false)=>{const pos=clamp(u)*(array.length-1),a=Math.floor(pos),b=Math.min(array.length-1,a+1),t=pos-a;return log?Math.exp(lerp(Math.log(Math.max(1e-8,array[a])),Math.log(Math.max(1e-8,array[b])),t)):lerp(array[a],array[b],t)};
 const p=atlas.recipe.params,positions=atlas.statePositions,levels=atlas.levels;let lastYield=Date.now();
 for(let ti=0;ti<tracks.length;ti++){
  const track=tracks[ti],phases=new Float64Array(atlas.modes.length);
  const explicit=Number.isFinite(track.startSec)&&Number.isFinite(track.endSec),gainAt=typeof track.gainAt==='function'?t=>clamp(track.gainAt(t)):t=>clamp(track.at(t)?.gain);
  let phase=0,age=0,lastHz=220,lastGain=0,releaseAge=0,active=false,started=false,stateIndex=0;
  const audible=hz=>{hz=Number.isFinite(hz)&&hz>0?hz:lastHz;const top=Math.min(12000,sampleRate*.43);if(hz<20)hz*=2**Math.ceil(Math.log2(20/Math.max(1e-20,hz)));if(hz>top)hz*=2**Math.floor(Math.log2(top/hz));return clamp(hz,20,top)};
  for(let start=0;start<frames;start+=64){
   check();if(Date.now()-lastYield>12){onProgress((ti+start/frames)/Math.max(1,tracks.length));await new Promise(r=>setTimeout(r,0));lastYield=Date.now();check()}
   const count=Math.min(64,frames-start),t0=(start+.5)/sampleRate,t1=(start+count-.5)/sampleRate,a=track.at(t0),b=track.at(t1);
   let hz0=audible(a?.gain>0?a.hz:lastHz),hz1=audible(b?.gain>0?b.hz:hz0);if(a?.gain>0||b?.gain>0)lastHz=hz1;
   for(let j=0;j<count;j++){
    const i=start+j,t=(i+.5)/sampleRate,g=gainAt(t),inside=explicit?t>=track.startSec&&t<track.endSec:g>1e-8;
    const onset=explicit?inside&&!started:inside&&(!active||releaseAge>0);
    if(onset){active=true;started=true;age=explicit?Math.max(0,t-track.startSec):0;releaseAge=0;phase=0;phases.fill(0);stateIndex=0;const event=track.at(t);hz0=audible(event?.hz);if(!b?.gain)hz1=hz0;lastHz=hz0}
    if(!active)continue;
    let gain=g;
    if(inside){releaseAge=0;lastGain=g;gain*=Math.min(1,age*sampleRate/24)}
    else {releaseAge+=1/sampleRate;if(releaseAge>=atlas.releaseSec){active=false;continue}gain=lastGain*(1-releaseAge/atlas.releaseSec)**2}
    const u=diagnostics.evolution===false||p.motion===0?0:clamp(age/atlas.evolutionSec);
    // Hold the reached material during release and at end-of-material sustain.
    while(stateIndex+1<positions.length-1&&u>positions[stateIndex+1])stateIndex++;
    const sb=Math.min(positions.length-1,stateIndex+1),mix=clamp((u-positions[stateIndex])/Math.max(1e-8,positions[sb]-positions[stateIndex]));
    const hz=lerp(hz0,hz1,j/Math.max(1,count-1)),available=sampleRate*.44/Math.max(hz,1),level=Math.max(0,Math.min(levels.length-1,Math.floor(Math.log2(available)))),lo=Math.max(0,level-1),blend=level?clamp(Math.log2(available/levels[level])):0;
    const sa=atlas.states[stateIndex],sc=atlas.states[sb];
    let v=lerp(lerp(sample(sa[lo],phase),sample(sa[level],phase),blend),lerp(sample(sc[lo],phase),sample(sc[level],phase),blend),mix)*(1-atlas.modeStrength*.4);
    // Curves have independent dense knots. Frequency is integrated every sample;
    // topology never restarts a mode phase. No graph work runs in this loop.
    for(let k=0;k<phases.length;k++){
     const m=atlas.modes[k],r=diagnostics.moving===false?m.ratios[0]:curve(m.ratios,u,true),frequency=hz*r;
     const roll=clamp((sampleRate*.45-frequency)/(sampleRate*.07)),envelope=p.body==='prism'?.42+.58*Math.exp(-age/m.decay):p.body==='hollow'?.65+.35*Math.exp(-age/(m.decay*1.5)):1;
     const mg=curve(m.gains,u)*roll*envelope;v+=Math.sin(TAU*phases[k])*mg;phases[k]=wrap(phases[k]+frequency/sampleRate);
    }
    const guard=typeof track.guardAt==='function'&&g>0?clamp(track.guardAt(t)):1,stateGain=.82+.18*lerp(atlas.stateLevels[stateIndex],atlas.stateLevels[sb],mix);
    left[i]+=v*gain*guard*stateGain*.58;phase=wrap(phase+hz/sampleRate);if(inside)age+=1/sampleRate;
   }
  }
  check();onProgress((ti+1)/Math.max(1,tracks.length));
 }
 const edge=Math.min(48,frames/2);for(let i=0;i<frames;i++){let v=left[i];if(!Number.isFinite(v))throw Error('Invalid Fractalia audio');if(Math.abs(v)>.9)v=Math.sign(v)*(.9+.08*Math.tanh((Math.abs(v)-.9)/.08));left[i]=v*Math.min(1,i/edge,(frames-1-i)/edge)}
 check();return {left,sampleRate,atlas,engine:atlas.engine};
}
if(typeof module!=='undefined'&&module.exports)module.exports=renderFractaliaRelationalPCM;
