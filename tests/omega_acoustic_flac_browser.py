#!/usr/bin/env python3
"""End-to-end PCM copy -> native XenSonar FLAC worker -> decode -> fingerprint check."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, numpy as np, soundfile as sf
root=Path(__file__).resolve().parents[1]
ac=(root/'src/audio/03_acoustic_sync.js').read_text()
flac=(root/'src/audio/03_flac_encoder.js').read_text()
# Test exact product encoder, not a reimplementation.
harness='''
function TW(buffer, range) {
 let left=buffer.getChannelData(0),right=buffer.getChannelData(1);
 if(range){const a=Math.floor(range.startMs*buffer.sampleRate/1000),b=Math.ceil(range.endMs*buffer.sampleRate/1000);
   left=left.slice(a,b);right=right.slice(a,b);}
 return {left,right};
}
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page()
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><body><script>'+harness+'\n'+ac+'\n'+flac+'\n</script></body></html>')
 result=page.evaluate('''async ()=>{
 const sr=48000, len=48000;
 const left=new Float32Array(len),right=new Float32Array(len);
 for(let i=0;i<len;i++){left[i]=.15*Math.sin(2*Math.PI*220*i/sr);right[i]=.12*Math.sin(2*Math.PI*330*i/sr)}
 const savedL=new Float32Array(left),savedR=new Float32Array(right);
 const buffer={length:len,sampleRate:sr,duration:len/sr,getChannelData(i){return i===0?left:right}};
 const plan=f319AcousticPlan(buffer,null,[{id:'diag-marker',timeMs:300}]);
 const file=await f319RecorderFlacEncode(buffer,null,null,plan);
 let unchanged=savedL.every((v,i)=>v===left[i])&&savedR.every((v,i)=>v===right[i]);
 const arr=new Uint8Array(await file.arrayBuffer());
 let binary='';for(const item of arr)binary+=String.fromCharCode(item);
 return {base64:btoa(binary),unchanged,plan};
}''')
 assert not errors,errors[:6]
 assert result['unchanged'],'Source audio was modified during FLAC export'
 path=root/'dist/_omega_acoustic_browser_test.flac'
 path.write_bytes(base64.b64decode(result['base64']))
 browser.close()
audio,sr=sf.read(path,always_2d=True,dtype='float32');assert sr==48000 and len(audio)==48000
# Re-create only reference watermark, not the FLAC writer.
start=result['plan']['stamps'][0]['sampleIndex']
code=[]
for sample in range(1536):
 block=sample//512; pos=sample%512
 if block>2 or pos>=320:code.append(0.);continue
 def u32(x):return x&0xffffffff
 def mult(a,b):return u32(a*b)
 v=u32((pos//4+1)*0x9e3779b9)^0x6a09e667
 v=u32(v^(v>>16));v=mult(v,0x7feb352d);v=u32(v^(v>>15));v=mult(v,0x846ca68b);v=u32(v^(v>>16))
 code.append((-1 if block==1 else 1)*(1 if v&1 else -1)*(np.sin(np.pi*(pos+0.5)/320)**2)*.075)
code=np.array(code)
# Isolate against the SAME track encoded without watermark? Synthetic clean sine can be subtracted at sample precision.
idx=np.arange(start,start+1536)
clean_difference=(audio[idx,0]-0.15*np.sin(2*np.pi*220*idx/sr))-(audio[idx,1]-0.12*np.sin(2*np.pi*330*idx/sr))
correlation=np.corrcoef(clean_difference,code*2)[0,1]
assert correlation>.9995,f'FLAC watermark mismatch {correlation}'
assert np.max(np.abs(audio))<1
from sys import path as syspath
syspath.insert(0,str(root/'tools'))
from find_acoustic_markers import find
hits=find(path,.18)['markers']
assert len(hits)==1 and abs(hits[0]['sample']-start)<=2, hits
print('OMEGA ACOUSTIC FLAC CHROMIUM PASS',len(audio),'frames',len(path.read_bytes()),'bytes', 'correlation',round(correlation,6),'source-unchanged')
path.unlink()
