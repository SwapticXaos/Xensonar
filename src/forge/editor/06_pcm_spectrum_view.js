/* F4.4.8: passive, view-owned PCM measurement. Nothing is started at module load.
 * The ordinary Forge preview supplies its already completed buffer AFTER playback
 * starts. No synthesis, export, material handoff or live-engine code depends on us.
 */
function observeForgePreviewPCM(engine,receive) {
 const original=engine.playBufferInternal;
 let open=true;
 function observed(...args) {
  const result=Reflect.apply(original,this,args);
  // Return the very same value/promise. A broken display must never fail playback.
  Promise.resolve(result).then(played=>{
   if(open&&played!==false)try{receive(args[0],args[5]||{})}catch{}
  },()=>{});
  return result;
 }
 engine.playBufferInternal=observed;
 return ()=>{open=false;if(engine.playBufferInternal===observed)engine.playBufferInternal=original};
}

// Self-contained worker program. Both the STFT and RGBA conversion stay here.
function forgePCMMeasurementWorker() {
 let audio=null,sr=0,count=0,speed=1;
 function fft(real,imag) {
  const size=real.length;
  for(let i=1,j=0;i<size;i++){
   let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
   if(i<j){let v=real[i];real[i]=real[j];real[j]=v;v=imag[i];imag[i]=imag[j];imag[j]=v;}
  }
  for(let span=2;span<=size;span*=2){
   const angle=-2*Math.PI/span,cos=Math.cos(angle),sin=Math.sin(angle);
   for(let start=0;start<size;start+=span){
    let wr=1,wi=0;
    for(let j=0;j<span/2;j++){
     const a=start+j,b=a+span/2,tr=wr*real[b]-wi*imag[b],ti=wr*imag[b]+wi*real[b];
     real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;
     const next=wr*cos-wi*sin;wi=wr*sin+wi*cos;wr=next;
    }
   }
  }
 }
 function measure() {
  const durationSec=count/(sr*speed),width=Math.max(48,Math.min(512,Math.ceil(durationSec*45))),height=256,size=8192;
  const pixels=new Uint8ClampedArray(width*height*4),values=new Float32Array(width*height),window=new Float64Array(size),real=new Float64Array(size),imag=new Float64Array(size),power=new Float64Array(size/2);
  let total=0,maximum=0;
  for(let i=0;i<size;i++){window[i]=(1-Math.cos(2*Math.PI*i/(size-1)))/2;total+=window[i]}
  const scale=2/total,low=new Int32Array(height),high=new Int32Array(height);
  for(let y=0;y<height;y++){
   low[y]=Math.max(1,Math.floor(20000*Math.exp(-Math.log(1000)*(y+1)/height)/(sr*speed)*size));
   high[y]=Math.min(size/2-1,Math.ceil(20000*Math.exp(-Math.log(1000)*y/height)/(sr*speed)*size));
  }
  for(let x=0;x<width;x++){
   const start=Math.round((x+.5)/width*count)-size/2;power.fill(0);
   for(const samples of audio){
    imag.fill(0);
    for(let j=0;j<size;j++){const i=start+j;real[j]=(i>=0&&i<count?samples[i]:0)*window[j]}
    fft(real,imag);
    for(let k=1;k<size/2;k++)power[k]+=(real[k]*real[k]+imag[k]*imag[k])/audio.length;
   }
   for(let y=0;y<height;y++){
    let energy=0;for(let k=low[y];k<=high[y];k++)energy=Math.max(energy,power[k]);
    const magnitude=Math.sqrt(energy)*scale;
    values[y*width+x]=magnitude;maximum=Math.max(maximum,magnitude);
   }
  }
  // Every listening method uses the same relative scale. A quiet voice must
  // remain legible; this is display normalization, never audio gain processing.
  const reference=Math.max(1e-8,maximum);
  for(let i=0;i<values.length;i++){
   const level=Math.max(0,Math.min(1,(20*Math.log10(Math.max(1e-20,values[i])/reference)+56)/56)),at=i*4;
   pixels[at]=45;pixels[at+1]=225;pixels[at+2]=203;pixels[at+3]=Math.round(235*Math.pow(level,1.1));
  }
  audio=null;
  self.postMessage({type:'image',width,height,pixels,durationSec},[pixels.buffer]);
 }
 self.onmessage=({data:m})=>{
  try{
   if(m.type==='begin'){
    if(!Number.isInteger(m.length)||m.length<1||!Number.isInteger(m.channels)||m.channels<1||m.channels>32||m.length*m.channels>16777216||!(m.sampleRate>0)||!(m.rate>0))throw Error('Unsupported measurement size');
    count=m.length;sr=m.sampleRate;speed=m.rate;audio=Array.from({length:m.channels},()=>new Float32Array(count));
   }else if(m.type==='chunk'){
    if(!audio||!audio[m.channel]||!(m.samples instanceof Float32Array)||m.offset<0||m.offset+m.samples.length>count)throw Error('Invalid PCM chunk');
    audio[m.channel].set(m.samples,m.offset);
   }else if(m.type==='finish'){if(!audio)throw Error('No PCM supplied');measure()}
  }catch(error){audio=null;self.postMessage({type:'error',message:String(error.message||error)})}
 };
}

// Only the visible editor mounts the owner. The main room never owns a worker,
// preview observer, timer, image cache or spectrum store subscription.

/* xen-lazy:lab */


/* xen-lazy:lab */

if(typeof module!=='undefined'&&module.exports)module.exports={forgePCMMeasurementWorker,observeForgePreviewPCM};
