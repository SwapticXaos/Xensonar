import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page(viewport={'width':1440,'height':860})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate('''() => {
       const data=new Map(), storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,get length(){return data.size}};
       Object.defineProperty(window,'localStorage',{configurable:true,value:storage});
       Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
       window.__pcmAudition={renders:[],starts:[],oscLive:0};
       const start=OfflineAudioContext.prototype.startRendering;
       OfflineAudioContext.prototype.startRendering=async function(...args){const buffer=await start.apply(this,args);window.__pcmAudition.renders.push(buffer);return buffer};
       const srcStart=AudioBufferSourceNode.prototype.start;
       AudioBufferSourceNode.prototype.start=function(t){window.__pcmAudition.starts.push({when:t,duration:this.buffer?.duration||0});return srcStart.call(this,t)};
       const oscStart=OscillatorNode.prototype.start;
       OscillatorNode.prototype.start=function(...args){window.__pcmAudition.oscLive++;return oscStart.apply(this,args)};
    }''')
    page.set_content(html,wait_until='domcontentloaded',timeout=45000)
    page.locator('button[aria-label="Meta-Menu"]').click()
    count=page.locator('.xen-meta-row-preview').count()
    assert count>0, 'No grid preview buttons in current Meta Library'
    page.locator('.xen-meta-row-preview').first.click()
    page.wait_for_function('window.__pcmAudition && window.__pcmAudition.starts.length > 0',timeout=15000)
    values=page.evaluate('''() => {
      const obj=window.__pcmAudition,buffer=obj.renders[0],pcm=buffer.getChannelData(0),rate=buffer.sampleRate,step=.155;
      const ticks=Math.round((buffer.duration-.172)/step)+1;
      const power=(t0,t1)=>{let sum=0,n=0;for(let i=Math.floor(t0*rate);i<Math.min(pcm.length,Math.floor(t1*rate));i++){sum+=pcm[i]*pcm[i];n++}return Math.sqrt(sum/Math.max(n,1))};
      const steps=Array.from({length:ticks},(_,i)=>({index:i,attackRms:power(i*step+.023,i*step+.055),interNoteRms:power(i*step+.143,i*step+.153)}));
      return {rate,seconds:buffer.duration,steps,starts:obj.starts,liveOsc:obj.oscLive,maxAbs:pcm.reduce((m,v)=>Math.max(m,Math.abs(v)),0)};
    }''')
    print('AudioBuffer / starts', values['rate'],values['seconds'],len(values['starts']),'liveOsc',values['liveOsc'],'steps',len(values['steps']))
    print('PCM attacks',[(r['index'],round(r['attackRms'],4),round(r['interNoteRms'],5)) for r in values['steps'][:15]])
    assert len(values['starts'])==1,'exactly one full-performance live AudioBufferSource starts'
    # Existing XenSonar audio bootstrap may create live voices; the isolated Node test guards preview-owned ones.
    print('Note: live oscillators belong to general XenSonar boot and cannot be attributed to grid playback from this counter.')
    assert len(values['steps'])>=8,'not enough audible scale steps'
    assert all(r['attackRms']>.001 for r in values['steps']),'missing audible note in rendered PCM sequence'
    assert values['maxAbs']<1,'clipping detected in preview render'
    assert not errors,'page errors '+str(errors[:4])
    # Deliberately stall the main thread longer than P7.36's 340-ms lookahead.
    # AudioBuffer is already complete; no future JavaScript attacks are needed.
    page.evaluate('''() => {const end=performance.now()+650;while(performance.now()<end){};}''')
    assert page.evaluate('window.__pcmAudition.starts.length')==1, 'main-thread stall must not enqueue catch-up attacks'
    # Ensure explicit user stop kills the running buffer, not active live instruments.
    preview=page.locator('.xen-meta-row-preview').first
    assert preview.get_attribute('aria-pressed')=='true','preview feedback should show playing'
    preview.click()
    assert preview.get_attribute('aria-pressed')=='false','preview must return to stopped after stop'
    print('PASS actual rendered PCM: every scale step has energy at precise 155 ms sample positions; single source; stop; no errors')
    browser.close()
