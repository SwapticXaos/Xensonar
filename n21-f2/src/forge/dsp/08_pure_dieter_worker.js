/* Pure Dieter's original four renderers execute off the UI thread.
   Selection starts no render. Stop/change terminates the worker immediately.
   IFFT uses the equivalent FFT inverse instead of the old quadratic IDFT. */
const __PureDieter=(()=>{
 let active=null,url=null;
 function workerURL(){if(url)return url;
  const declarations=[hs,mNe,lx,__fSpeed2OfflineWaveform,r5e,a5e,o5e].map(fn=>fn.toString()).join('\n');
  const code=`const EM=20,cQ=20000,Ar=${Ar},JNe=${JNe},ZNe=${ZNe},e5e=${e5e},t5e=${t5e},n5e=${n5e},TAU=Math.PI*2;
const Hf=()=>Promise.resolve();${declarations}\nconst fft=${__Fractalia.core.fft.toString()};
onmessage=async event=>{try{const {data,grainData,width,height,sampleRate,durationSec,mode,mix}=event.data;
 const grid={width,height,get:(x,y)=>x<0||x>=width||y<0||y>=height?0:data[y*width+x],getGrain:(x,y)=>grainData[y*width+x]};
 const context={sampleRate,createBuffer:(channels,frames)=>{const pcm=new Float32Array(frames);return {getChannelData:()=>pcm}}},renderer=new o5e(()=>context);
 renderer.idft=(real,imag,n)=>{const re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++)if(Math.abs(real[i])>1e-4||Math.abs(imag[i])>1e-4){re[i]=real[i];im[i]=imag[i]}fft(re,im,true);return Float32Array.from(re)};
 const buffer=await renderer.renderToBuffer(grid,mode,mix,p=>postMessage({progress:p}),{durationSec});const pcm=buffer.getChannelData(0);postMessage({pcm},[pcm.buffer]);
 }catch(e){postMessage({error:e.message||String(e)})}};`;
  url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));return url;
 }
 function cancel(){active?.cancel()}
 function render({grid,durationSec,mode,mix,onProgress,context,check=()=>{}}){
  check();cancel();const sampleRate=context.sampleRate,frames=Math.round(durationSec*sampleRate);
  if(!Number.isFinite(frames)||frames<1||frames>24000000)throw Error('Pure Dieter: unsupported figure duration');
  return new Promise((resolve,reject)=>{let worker,timer,deadline,settled=false;const finish=(error,pcm)=>{if(settled)return;settled=true;clearInterval(timer);clearTimeout(deadline);worker?.terminate();if(active===job)active=null;if(error){reject(error);return}try{check();const buffer=context.createBuffer(1,pcm.length,sampleRate);buffer.copyToChannel(pcm,0);resolve(buffer)}catch(e){reject(e)}};
   const job={cancel:()=>finish(new DOMException('Pure Dieter rendering cancelled','AbortError'))};active=job;
   try{worker=new Worker(workerURL());worker.onmessage=e=>{try{check();if(e.data.error)finish(Error(e.data.error));else if(e.data.pcm)finish(null,e.data.pcm);else if(Number.isFinite(e.data.progress))onProgress?.(e.data.progress)}catch(error){finish(error)}};worker.onerror=e=>{e.preventDefault();finish(Error(e.message||'Pure Dieter background renderer failed'))};
    timer=setInterval(()=>{try{check()}catch(error){finish(error)}},50);deadline=setTimeout(()=>finish(Error('Pure Dieter took longer than 30 seconds. Shorten the figure or reduce its density.')),30000);
    const data=grid.data.slice(),grainData=grid.grainData.slice();worker.postMessage({data,grainData,width:grid.width,height:grid.height,sampleRate,durationSec,mode,mix},[data.buffer,grainData.buffer]);
   }catch(error){finish(Error('Pure Dieter background renderer is unavailable: '+error.message))}
  });
 }
 return {render,cancel,pending:()=>!!active};
})();
