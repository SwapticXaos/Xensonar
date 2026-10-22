/* Offline pitch extraction. A worker owns the PCM copy and bounded analysis;
   synthesis continues to consume the established editable carrier document. */
function __audioCarrierAnalysisFactory(tools) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function analyze({samples,sampleRate,options={}},progress=()=>{}) {
    if(!(samples instanceof Float32Array)||!samples.length||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid audio source.');
    const duration=samples.length/sampleRate;
    if(duration<.12||duration>60.01)throw Error('Please select an audio region between 0.12 and 60 seconds.');
    if(["voices","strictness","noiseDb","minimumMs","minHz","maxHz"].some(key=>options[key]!=null&&!Number.isFinite(Number(options[key]))))throw Error("Invalid filter setting.");
    const voices=clamp(Math.round(options.voices??4),1,6),strict=clamp(Number(options.strictness??.5),0,1),gate=Math.pow(10,clamp(Number(options.noiseDb??-46),-80,-15)/20),minimum=clamp(Number(options.minimumMs??90),40,300)/1000;
    const low=clamp(Number(options.minHz??65),35,200),high=clamp(Number(options.maxHz??1600),400,3000),rate=Math.min(12000,sampleRate),step=sampleRate/rate;
    const pcm=new Float32Array(Math.ceil(samples.length/step)),kernel=tools.makeSincKernel(step),model={samples},run={sourceStart:0,sourceEnd:samples.length-1};
    for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i]))throw Error('The source contains invalid audio data.');
    for(let i=0;i<pcm.length;i++){
      pcm[i]=kernel?tools.resample(model,run,i*step,kernel):samples[Math.min(samples.length-1,Math.round(i*step))];
      if(i%16384===0)progress(.12*i/pcm.length);
    }
    const windowSize=low<55?4096:2048,size=8192,hop=Math.round(rate*.02),half=windowSize>>1;
    const hann=Float64Array.from({length:windowSize},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(windowSize-1))),re=new Float64Array(size),im=new Float64Array(size),mag=new Float64Array(size/2),frames=[];
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    function detect(center){
      let mean=0,energy=0,count=0;const radius=Math.round(rate*.02);
      for(let i=Math.max(0,center-radius);i<Math.min(pcm.length,center+radius);i++){mean+=pcm[i];energy+=pcm[i]*pcm[i];count++;}
      if(!count||Math.sqrt(Math.max(0,energy/count-(mean/count)**2))<gate)return [];
      re.fill(0);im.fill(0);mean/=count;
      for(let i=0;i<windowSize;i++)re[i]=((pcm[center-half+i]??0)-mean)*hann[i];
      tools.fft(re,im);
      const lo=Math.max(2,Math.floor(30*size/rate)),hi=Math.min(mag.length-2,Math.ceil(Math.min(5200,rate*.46)*size/rate));
      const floorSamples=[];let maximum=0;
      for(let k=lo;k<hi;k++){mag[k]=Math.hypot(re[k],im[k]);maximum=Math.max(maximum,mag[k]);if(k%4===0)floorSamples.push(mag[k]);}
      floorSamples.sort((a,b)=>a-b);const noise=floorSamples[Math.floor(floorSamples.length*.5)]||0,threshold=Math.max(maximum*.012,noise*(5+strict*11));
      const peaks=[];
      for(let k=lo+1;k<hi-1;k++)if(mag[k]>=threshold&&mag[k]>mag[k-1]&&mag[k]>=mag[k+1]){
        const a=Math.log(mag[k-1]+1e-20),b=Math.log(mag[k]+1e-20),c=Math.log(mag[k+1]+1e-20),delta=clamp(.5*(a-c)/(a-2*b+c||1),-.5,.5);
        peaks.push({hz:(k+delta)*rate/size,amp:mag[k]/Math.max(1e-20,maximum)});
      }
      peaks.sort((a,b)=>b.amp-a.amp);peaks.length=Math.min(peaks.length,96);
      const candidates=new Map();
      for(const p of peaks)for(let h=1;h<=8;h++){const hz=p.hz/h;if(hz<low||hz>high)continue;const key=Math.round(1200*Math.log2(hz)/15);if(!candidates.has(key))candidates.set(key,hz);}
      const residual=peaks.map(p=>p.amp),chosen=[];let first=0;
      for(let voice=0;voice<voices;voice++){
        let best=null;
        for(const hz of candidates.values()){
          let score=0,divisor=0,fund=0,frequencySum=0,weightSum=0;const matched=[];
          for(let i=0;i<peaks.length;i++){
            if(residual[i]<.008)continue;const p=peaks[i],h=Math.round(p.hz/hz);
            if(h<1||h>16||Math.abs(p.hz-h*hz)>Math.max(2.2,p.hz*.012))continue;
            const weight=Math.pow(residual[i],.8)/Math.pow(h,.25);score+=weight;divisor=gcd(divisor,h);if(h===1)fund=residual[i];matched.push(i);frequencySum+=(p.hz/h)*weight;weightSum+=weight;
          }
          if(!matched.length||(!fund&&(matched.length<3||divisor!==1)))continue;
          if(!fund)score*=voices===1?.92:.48;
          if(matched.length===1&&fund<.06+strict*.14)continue;
          score*=1+.025*Math.min(5,matched.length-1);
          if(!best||score>best.score)best={hz:frequencySum/weightSum,score,matched};
        }
        if(!best||best.score<Math.max(.1,first*(.12+strict*.28)))break;
        if(!voice)first=best.score;
        if(chosen.some(p=>Math.abs(1200*Math.log2(p.hz/best.hz))<70))break;
        chosen.push({hz:best.hz,strength:best.score/Math.max(first,1e-8)});
        for(let i=0;i<peaks.length;i++){const h=Math.round(peaks[i].hz/best.hz);if(h>=1&&h<=32&&Math.abs(peaks[i].hz-h*best.hz)<Math.max(2.5,peaks[i].hz*.014))residual[i]=0;}
      }
      return chosen;
    }
    const active=[],finished=[];let serial=0,lastProgress=0;
    function close(track){if(track.points.length*hop/rate>=minimum){if(finished.length>=4096)throw Error("Too many pitch lines. Please select a shorter region or stricter filters.");finished.push(track);}}
    for(let center=Math.floor(hop/2);center<pcm.length;center+=hop){
      const time=center/rate,pitches=detect(center),used=new Set();
      for(const track of active)track.matched=false;
      const pairs=[];for(let t=0;t<active.length;t++)for(let p=0;p<pitches.length;p++){const distance=Math.abs(1200*Math.log2(active[t].points.at(-1).hz/pitches[p].hz));if(distance<85)pairs.push({t,p,distance});}
      pairs.sort((a,b)=>a.distance-b.distance);
      for(const pair of pairs){const track=active[pair.t];if(track.matched||used.has(pair.p))continue;track.points.push({time,hz:pitches[pair.p].hz});track.last=time;track.matched=true;used.add(pair.p);}
      for(let i=active.length-1;i>=0;i--)if(time-active[i].last>.041){close(active[i]);active.splice(i,1);}
      for(let p=0;p<pitches.length;p++)if(!used.has(p)&&active.length<voices)active.push({id:'audio-note-'+serial++,last:time,matched:true,points:[{time,hz:pitches[p].hz}]});
      const fraction=.12+.88*center/pcm.length;
      if(fraction-lastProgress>.02){progress(fraction);lastProgress=fraction;}
      frames.push(pitches.length);
    }
    active.forEach(close);progress(1);
    return {durationSec:duration,hopSec:hop/rate,notes:finished.sort((a,b)=>a.points[0].time-b.points[0].time).map(track=>({id:track.id,startSec:Math.max(0,track.points[0].time-hop/rate/2),endSec:Math.min(duration,track.points.at(-1).time+hop/rate/2),pitchHz:track.points.map(p=>p.hz)})),frames:frames.length,settings:{voices,strictness:strict,noiseDb:20*Math.log10(gate),minimumMs:minimum*1000,minHz:low,maxHz:high}};
  }
  return {analyze};
}
function __audioCarrierWorkerMain(){
  const tools=__forgeGestaltToolsFactory(Math.PI*2,{resamplingPhases:64},(v,a,b)=>Math.max(a,Math.min(b,v)));
  const analyzer=__audioCarrierAnalysisFactory(tools);
  onmessage=({data})=>{try{postMessage({result:analyzer.analyze(data,progress=>postMessage({progress}))});}catch(error){postMessage({error:error?.message||String(error)});}};
}
function __audioCarrierAnalyze(source,range,options,{signal,onProgress=()=>{}}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('Abgebrochen','AbortError'));return;}
    const rate=source?.sampleRate,start=Math.round(range?.startSec*rate),end=Math.min(source?.monoSamples?.length??0,Math.round((range?.startSec+range?.durationSec)*rate));
    if(!Number.isFinite(rate)||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||range.durationSec<.12||range.durationSec>60){reject(Error('Please select an audio region between 0.12 and 60 seconds.'));return;}
    let worker,url,timer,settled=false;
    const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();if(url)URL.revokeObjectURL(url);error?reject(error):resolve(result);};
    const abort=()=>done(new DOMException('Abgebrochen','AbortError'));
    try{
      const code=[__forgeGestaltToolsFactory.toString(),__audioCarrierAnalysisFactory.toString(),'('+__audioCarrierWorkerMain.toString()+')();'].join('\n');
      url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));worker=new Worker(url);
      worker.onmessage=({data})=>{if(data.error)done(Error(data.error));else if(data.result)done(null,data.result);else if(Number.isFinite(data.progress))onProgress(data.progress);};
      worker.onerror=event=>done(Error(event.message||'Audioanalyse fehlgeschlagen.'));
      signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>done(Error('Analysis is taking too long. Please select a shorter region.')),120000);
      const samples=source.monoSamples.slice(start,end);worker.postMessage({samples,sampleRate:rate,options},[samples.buffer]);
    }catch(error){done(error);}
  });
}
function __audioCarrierDocument(result,material){
  const duration=result.durationSec,reference=Math.max(40,material.bpm||108),baseBeats=Math.max(1,material.beatsPerBar||4);
  const beatsPerBar=duration<baseBeats*60/reference?Math.max(1,Math.min(baseBeats,Math.round(duration*reference/60))):baseBeats;
  const bars=Da(Math.round(duration*reference/(60*beatsPerBar))),durationBeats=bars*beatsPerBar,bpm=durationBeats*60/duration;
  return {target:'legacy',transferVersion:3,origin:'audio-to-carrier',name:'Audio Carrier',role:'loop',bars,beatsPerBar,bpm,durationSec:duration,guideSegments:4,guideMarkers:[.25,.5,.75],carrier:{version:'melodic-carrier-v1',origin:'audio-to-carrier',durationBeats,tracks:[{id:'audio-carrier',label:'Audio to Carrier',enabled:true}],notes:result.notes.map(note=>({id:note.id,voiceId:note.id,trackId:'audio-carrier',startBeat:note.startSec*bpm/60,durationBeats:(note.endSec-note.startSec)*bpm/60,pitchHz:note.pitchHz,gainCurve:[.65,.65],fadeInBeats:Math.min(.008,(note.endSec-note.startSec)*.1)*bpm/60,fadeOutBeats:Math.min(.008,(note.endSec-note.startSec)*.1)*bpm/60}))}};
}
