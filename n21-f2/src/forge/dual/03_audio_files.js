
function __f35636Asset(result,name) {
  const pcm=result.samples, duration=pcm.length/result.sampleRate;
  return {id:'dual-'+result.revision,kind:'audio',fileName:(name||'Hybrid Donor')+'.wav',sampleRate:result.sampleRate,monoSamples:pcm,leftSamples:pcm,rightSamples:pcm,
    midSamples:pcm,sideSamples:new Float32Array(pcm.length),channelCount:1,numberOfChannels:1,
    waveformPreview:E4e(pcm,1024),stereoWidthPreview:new Float32Array(1024),
    durationSec:duration,originalDuration:duration,importStartSec:0,importDurationSec:duration,
    dualDonorManifest:result.manifest,contentRevision:result.revision};
}
function __f35636Wav(source){const samples=source.samples,buffer=new ArrayBuffer(44+samples.length*4),v=new DataView(buffer);const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+samples.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,1,true);
  v.setUint32(24,source.sampleRate,true);v.setUint32(28,source.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,32,true);str(36,'data');v.setUint32(40,samples.length*4,true);
  for(let i=0;i<samples.length;i++)v.setFloat32(44+i*4,samples[i],true);return new Blob([buffer],{type:'audio/wav'});
}
function __f35636Download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-z0-9._ -]/gi,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}