from playwright.sync_api import sync_playwright
from pathlib import Path
import os
import json, traceback
BASE = Path(__file__).resolve().parents[1]
HTML = (BASE/os.environ.get('XENSONAR_TEST_HTML','Xensonar_F3_56_53.html')).read_text()
SCRATCH = 'xensonar:main:rhythm-scratchpad:v1'
# This is a real React render, but the restricted Chromium sandbox has no storage origin.
SEED_SCRIPT = '''seed=>{
 const m=new Map(Object.entries(seed));
 const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
 window.__testStore=m;
}'''

# Same-module isolated PCM probe: no fake Web Audio node events. Samples are decoded
# AudioBuffers, with sample-accurate mixing into the production drum-stem PCM function.
PCM_SCRIPT = '''
window.__f53Probe = (async()=>{
 const sr=8000;const id='drum-raw-test';const output=new AudioBuffer({numberOfChannels:2,length:sr,sampleRate:sr});
 const raw=new AudioBuffer({numberOfChannels:1,length:Math.floor(sr*1.3),sampleRate:sr});
 raw.getChannelData(0).fill(.6);
 const grid={bars:1,segmentsPerBar:4,segmentMarkers:[.25,.5,.75],stepCount:4,
  laneOrder:['sample1','sample2','sample3'],laneSteps:{sample1:[1,0,0,0]},sampleSlots:{sample1:{id,volume:1,pan:0}},stepPrograms:{}};
 const prepared=new Map([[id,raw]]);
 __f52BlendDrumRaw(output,grid,1,prepared,1);
 const left=output.getChannelData(0),right=output.getChannelData(1);
 const vals={begin:left[200],middle:left[4000],end:left[7500],right:right[200]};
 if(!(vals.begin>vals.middle*1.8&&vals.middle>.15&&vals.end>.15))throw Error('long tail wrap failed '+JSON.stringify(vals));
 if(Math.abs(vals.begin-vals.right)>.0001)throw Error('center pan balance failed');
 const silent=new AudioBuffer({numberOfChannels:2,length:sr,sampleRate:sr});
 grid.sampleSlots.sample1.volume=0;
 __f52BlendDrumRaw(silent,grid,1,prepared,1);
 if(silent.getChannelData(0).some(v=>v!==0))throw Error('raw-sample zero volume not silent');
 const delayed=new AudioBuffer({numberOfChannels:2,length:sr,sampleRate:sr});
 const short=new AudioBuffer({numberOfChannels:1,length:100,sampleRate:sr});short.getChannelData(0).fill(.5);
 grid.sampleSlots.sample1.volume=1;grid.sampleSlots.sample1.pan=1;
 grid.laneSteps.sample1=[0,1,0,0];grid.stepPrograms.sample1={1:{microOffsetRatio:.24,layers:[{panOffset:0}]}};
 __f52BlendDrumRaw(delayed,grid,1,new Map([[id,short]]),1);
 const expected=Math.round((.25+.24/4)*sr);
 if(delayed.getChannelData(1)[expected]===0||delayed.getChannelData(1)[expected-8]!==0)throw Error('microtiming incorrect');
 if(Math.abs(delayed.getChannelData(0)[expected])>1e-5)throw Error('step pan incorrect');
 const named=ufe({name:'Stored Beat',drumKit:'dusty_tape',matrix:{pattern:'broken_lilt',bars:1,segmentsPerBar:4,segmentMarkers:[.25,.5,.75],stepCount:4,laneOrder:grid.laneOrder,laneSteps:grid.laneSteps,sampleSlots:grid.sampleSlots},
  stepPrograms:grid.stepPrograms,sampleSlots:grid.sampleSlots});
 if(named.sampleSlots.sample1.id!==id)throw Error('Save As lost sample link');
 return {status:'PASS',wrap:vals,microStartFrame:expected,storedSample:named.sampleSlots.sample1.id};
})().catch(e=>({status:'FAIL',error:String(e.stack||e)}));
'''

def load(browser,seed=None,probe=False):
 page=browser.new_page(viewport={'width':1450,'height':950});errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 page.evaluate(SEED_SCRIPT,seed or {})
 html=HTML.replace('</script>',PCM_SCRIPT+'</script>',1) if probe else HTML
 page.set_content(html,wait_until='domcontentloaded',timeout=50000);page.wait_for_timeout(850)
 assert 'XENSONAR' in page.locator('body').inner_text(),errors
 return page,errors

def paint(page,step='Sample A, step 1'):
 btn=page.get_by_role('button',name=step,exact=True);btn.dispatch_event('pointerdown',{'button':0,'buttons':1,'bubbles':True});page.evaluate('window.dispatchEvent(new PointerEvent("pointerup",{bubbles:true}))')
 return btn.get_attribute('aria-pressed')

def store(page):return page.evaluate('(key)=>window.__testStore.get(key)||null',SCRATCH)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 report={'checks':[],'browser':'restricted Chromium; setContent with emulated localStorage; IndexedDB disabled'}
 try:
  page,errors=load(browser,probe=True)
  pcm=page.evaluate('async()=>await window.__f53Probe')
  assert pcm['status']=='PASS',pcm
  report['pcm']=pcm;report['checks'].append('real AudioBuffer: >one-cycle tail wraps continuously, zero-volume silence, per-hit pan and microtiming, saved sample link')
  page.get_by_role('button').filter(has_text='Broken Lilt').first.evaluate('(el)=>el.click()')
  page.locator('.xen-main-drum-editor').wait_for(timeout=15000)
  editor=page.locator('.xen-main-drum-editor')
  initial_height=editor.evaluate('(el)=>el.getBoundingClientRect().height')
  assert page.get_by_text('Raw Audio · 3 free sample lanes').count()==0
  for lane in ('Sample A','Sample B','Sample C'):
   assert page.get_by_role('button',name='Choose '+lane+' audio sample').count()==1
   assert page.get_by_role('button',name=lane+', step 1',exact=True).count()==1
  assert page.get_by_role('dialog').count()==0
  page.get_by_role('button',name='Choose Sample A audio sample').evaluate('(el)=>el.click()')
  assert page.get_by_role('dialog',name='Sample A selection').count()==1
  assert page.get_by_label('Sample A sample').count()==1
  assert page.get_by_label('Sample A upload').count()==1
  assert abs(editor.evaluate('(el)=>el.getBoundingClientRect().height')-initial_height)<2,'Sample picker shifts rack layout'
  page.get_by_role('button',name='Choose Sample A audio sample').evaluate('(el)=>el.click()')
  assert page.get_by_role('dialog').count()==0
  page.get_by_role('button',name='Choose Sample B audio sample').evaluate('(el)=>el.click()')
  assert page.get_by_role('dialog',name='Sample B selection').count()==1
  page.get_by_role('button',name='Close sample selection').evaluate('(el)=>el.click()')
  assert page.get_by_role('dialog').count()==0
  report['checks'].append('Sample A/B/C labels open/close overlay; upload/database only when expanded; no vertical reflow')
  before=page.get_by_role('button',name='Sample A, step 1',exact=True).get_attribute('aria-pressed')
  after=paint(page);assert after!=before,(before,after)
  page.get_by_role('button',name='Toggle last drum hit details').evaluate('(el)=>el.click()')
  v=page.get_by_role('slider',name='Last Drum Hit Velocity')
  assert v.count()==1
  v.focus();v.press('ArrowRight');page.wait_for_timeout(120)
  saved=json.loads(store(page));grid=saved['drum']['edit']['grid']
  assert len(grid['laneOrder'])==9 and grid['laneSteps']['sample1'][0]>.62,grid['laneSteps']['sample1'][0]
  report['checks'].append('selected hit velocity slider is live and stored in unsaved draft')
  pan=page.get_by_role('slider',name='Last Drum Hit Pan');pan.focus();pan.press('ArrowRight');page.wait_for_timeout(80)
  saved=json.loads(store(page));assert saved['drum']['edit']['grid']['stepPrograms']['sample1']['0']['layers'][0]['panOffset']>0
  report['checks'].append('per-hit pan creates a persistent step program')
  page.get_by_role('button',name='Undo Drum Edit').evaluate('(el)=>el.click()');page.wait_for_timeout(70)
  page.get_by_role('button',name='Redo Drum Edit').evaluate('(el)=>el.click()');page.wait_for_timeout(70)
  saved=json.loads(store(page));assert saved['drum']['edit']['grid']['stepPrograms']['sample1']['0']['layers'][0]['panOffset']>0
  report['checks'].append('Undo/Redo retains per-step fine editor values')
  page.get_by_role('slider',name='Last Drum Hit Chance').evaluate('(el)=>{el.value="0.35";el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}')
  page.get_by_role('slider',name='Last Drum Hit Decay').focus();page.get_by_role('slider',name='Last Drum Hit Decay').press('ArrowLeft')
  page.get_by_role('slider',name='Last Drum Hit Tone').focus();page.get_by_role('slider',name='Last Drum Hit Tone').press('ArrowLeft')
  page.wait_for_timeout(150)
  saved=json.loads(store(page));lock=saved['drum']['edit']['grid']['stepPrograms']['sample1']['0']
  assert lock['toneLock']<1 and lock['decayLock']<1,lock
  report['checks'].append('per-hit parameter locks are edited and saved in drum scratchpad')
  page.get_by_role('button',name='Choose Sample A audio sample').evaluate('(el)=>el.click()')
  volume=page.get_by_role('slider',name='Sample A volume');volume.focus();volume.press('ArrowRight');page.wait_for_timeout(80)
  saved=json.loads(store(page));assert saved['drum']['edit']['grid']['sampleSlots']['sample1']['volume']>1
  report['checks'].append('per-lane sample gain stored in scratch')
  assert not errors,errors
  page.close()
  page2,errors2=load(browser,{SCRATCH:json.dumps(saved)})
  page2.get_by_role('button').filter(has_text='Broken Lilt').first.evaluate('(el)=>el.click()')
  page2.locator('.xen-main-drum-editor').wait_for(timeout=15000)
  assert page2.get_by_role('button',name='Sample A, step 1',exact=True).get_attribute('aria-pressed')=='true'
  page2.get_by_role('button',name='Choose Sample A audio sample').evaluate('(el)=>el.click()')
  assert float(page2.get_by_role('slider',name='Sample A volume').get_attribute('value'))>1
  report['checks'].append('draft survives fresh application and three sample lanes remain')
  assert not errors2,errors2
  report['status']='PASS';(BASE/'results/f353_browser.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
 finally:browser.close()
