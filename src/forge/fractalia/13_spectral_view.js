/* This is a measurement of the rendered PCM, not a predicted harmonic drawing.
   Output and neutral reference share time/frequency bins and one display scale. */
async function measureFractaliaSpectrum({samples,sampleRate},{check=()=>{},onProgress=()=>{}}={}) {
 const width=Math.max(48,Math.min(512,Math.ceil(samples.length/sampleRate*45))),height=256,size=8192;
 const values=new Float32Array(width*height),{complexFFT:fft}=__forgeMaterialToolsFactory(),re=new Float64Array(size),im=new Float64Array(size);
 const window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(size-1))),scale=2/window.reduce((s,v)=>s+v,0);
 let maximum=0;
 for(let x=0;x<width;x++){
  check();const center=Math.round((x+.5)/width*samples.length);re.fill(0);im.fill(0);
  for(let j=0;j<size;j++){const at=center+j-size/2;re[j]=(at>=0&&at<samples.length?samples[at]:0)*window[j]}
  fft(re,im);
  for(let y=0;y<height;y++){
   const low=20000*.001**((y+1)/height),high=20000*.001**(y/height),a=Math.max(1,Math.floor(low/sampleRate*size)),b=Math.min(size/2-1,Math.ceil(high/sampleRate*size));
   let magnitude=0;for(let k=a;k<=b;k++)magnitude=Math.max(magnitude,Math.hypot(re[k],im[k])*scale);
   values[y*width+x]=magnitude;maximum=Math.max(maximum,magnitude);
  }
  if(x%12===11){onProgress(x/width);await new Promise(r=>setTimeout(r,0))}
 }
 check();onProgress(1);return {width,height,values,maximum,sampleRate,durationSec:samples.length/sampleRate,fftSize:size,source:'rendered-float32-pcm'};
}
function fractaliaSpectrumPixels(output,reference,mode='output',rangeDb=56){
 const w=output.width,h=output.height,pixels=new Uint8ClampedArray(w*h*4);
 const maximum=Math.max(1e-12,output.maximum,reference?.maximum||0),alpha=v=>Math.round(Math.max(0,Math.min(1,(20*Math.log10(Math.max(1e-12,v)/maximum)+rangeDb)/rangeDb))**1.1*235);
 for(let i=0;i<w*h;i++){
  const out=output.values[i],ref=reference?.values[i]||0,at=i*4;
  let color=[45,225,203],value=out;
  if(mode==='reference'){color=[95,144,249];value=ref}
  else if(mode==='changes'){const difference=out-ref;color=difference>=0?[248,111,218]:[250,174,68];value=Math.abs(difference)}
  else if(mode==='compare'){
   // Common scale: unchanged energy cyan; exposed/moved energy magenta;
   // reference-only energy blue. No independent renormalization of pictures.
   const positive=Math.max(0,out-ref),negative=Math.max(0,ref-out),same=Math.min(out,ref),sum=positive+negative+same||1;
   color=[(248*positive+95*negative+45*same)/sum,(111*positive+144*negative+225*same)/sum,(218*positive+249*negative+203*same)/sum];value=Math.max(out,ref);
  }
  pixels[at]=color[0];pixels[at+1]=color[1];pixels[at+2]=color[2];pixels[at+3]=alpha(value);
 }
 return {width:w,height:h,data:pixels,maximum};
}
if(typeof module!=='undefined'&&module.exports)module.exports={measureFractaliaSpectrum,fractaliaSpectrumPixels};
