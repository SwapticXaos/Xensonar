/* Measured, donor-style turquoise spectrogram of final Fractalia PCM.
   The same Float32 PCM array returned for the actual preview/export is analyzed.
   Neither synthesis nor the drawing source is changed by this display. */
async function fractaliaOutputMantle(samples,sampleRate,check=()=>{}) {
  const width=Math.max(32,Math.min(384,Math.ceil(samples.length/sampleRate*40)));
  const height=192,size=4096,values=new Float32Array(width*height);
  const window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(size-1)));
  const fft=createFractaliaCore().fft;let maximum=0;
  for(let x=0;x<width;x++){
    check();const center=Math.round((x+.5)/width*samples.length),r=new Float64Array(size),im=new Float64Array(size);
    for(let k=0;k<size;k++)r[k]=(samples[center+k-size/2]||0)*window[k];
    fft(r,im);
    for(let y=0;y<height;y++){
      const high=20*1000**(1-y/height),low=20*1000**(1-(y+1)/height);
      const from=Math.max(1,Math.floor(low/sampleRate*size)),to=Math.min(size/2-1,Math.max(from,Math.ceil(high/sampleRate*size)));
      let magnitude=0;
      for(let b=from;b<=to;b++)magnitude=Math.max(magnitude,Math.hypot(r[b],im[b]));
      values[y*width+x]=magnitude;maximum=Math.max(maximum,magnitude);
    }
    if(x%24===23)await new Promise(resolve=>setTimeout(resolve,0));
  }
  return {width,height,values,maximum};
}
function fractaliaMantleCanvas(mantle){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=mantle.width;c.height=mantle.height;
  const ctx=c.getContext('2d');if(!ctx)return null;
  const img=ctx.createImageData(c.width,c.height);
  for(let i=0;i<mantle.values.length;i++){
    const db=20*Math.log10(Math.max(1e-12,mantle.values[i])/Math.max(1e-12,mantle.maximum));
    img.data[i*4]=34;img.data[i*4+1]=203;img.data[i*4+2]=193;
    img.data[i*4+3]=Math.round(Math.max(0,Math.min(1,(db+52)/52))**1.35*207);
  }
  ctx.putImageData(img,0,0);return c;
}
if(typeof module!=='undefined'&&module.exports)module.exports={fractaliaOutputMantle};

