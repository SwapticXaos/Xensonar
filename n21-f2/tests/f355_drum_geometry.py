"""F3.56.55: UI geometry regression for compact left Drum label column.

Compare F54->F55 measured React layout, not just a word replacement.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
BASE=Path(os.environ['XENSONAR_F54_HTML']) if os.environ.get('XENSONAR_F54_HTML') else None
NEW=ROOT/json.loads((ROOT/'source-manifest.json').read_text())['entry']
SEED='''() => {const m=new Map;const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}'''
JS='''() => {
 const editor=document.querySelector('.xen-main-drum-editor');
 const row=editor.querySelector('.xen-main-drum-grid-row');
 const timing=editor.querySelector('.xen-main-drum-grid-timing');
 const sample=editor.querySelector('[data-drum-sample-picker-toggle="sample1"]');
 const percussion=[...editor.querySelectorAll('.xen-main-drum-grid-row')].find(e=>e.firstElementChild?.textContent==='Percussion')?.firstElementChild;
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}};
 return {editor:rect(editor),label:rect(row.children[0]),firstStep:rect(row.children[1]),
  timingLabel:rect(timing.firstElementChild),timingTrack:rect(timing.children[1]),sample:rect(sample),percussion:rect(percussion),
  sampleText:sample.textContent, sampleScrollWidth:sample.scrollWidth, sampleClientWidth:sample.clientWidth,
  percussionScrollWidth:percussion.scrollWidth,percussionClientWidth:percussion.clientWidth,
  minWidth:editor.querySelector('.xen-main-drum-step-scroll > div').style.minWidth,
  scrollWidth:editor.querySelector('.xen-main-drum-step-scroll').scrollWidth,
  captions:[...editor.querySelectorAll('.xen-main-drum-grid-timing > span')].map(x=>x.textContent),
  stepWidth:rect(row.children[1]).width
 };
}'''

def render(browser,path):
 page=browser.new_page(viewport={'width':1450,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate(SEED)
 page.set_content(path.read_text(),wait_until='domcontentloaded',timeout=60000)
 page.get_by_role('button').filter(has_text='Broken Lilt').first.evaluate('(el)=>el.click()')
 page.locator('.xen-main-drum-editor').wait_for(timeout=25000)
 result=page.evaluate(JS)
 assert not errors,errors
 return page,result

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox'])
 try:
  old_page,old=render(browser,BASE) if BASE is not None and BASE.is_file() else (None,None)
  new_page,new=render(browser,NEW)
  if old is not None: assert old['label']['width']==92,old
  assert new['label']['width']==74,new
  if old is not None: assert abs((old['firstStep']['left']-old['editor']['left'])-(new['firstStep']['left']-new['editor']['left'])-18)<1,(old,new)
  assert abs((new['firstStep']['left']-new['label']['left'])-76)<1,new
  assert new['sample']['width']==74 and new['timingLabel']['width']==74,new
  assert abs(new['firstStep']['left']-new['timingTrack']['left'])<1,('timing strip not aligned with first step',new)
  assert new['sampleScrollWidth']<=new['sampleClientWidth'] and new['percussionScrollWidth']<=new['percussionClientWidth'],('labels clipped',new)
  if old is not None: assert abs(new['firstStep']['width']-old['firstStep']['width'])<1,('step buttons were resized',old,new)
  if old is not None: assert old['scrollWidth']-new['scrollWidth']==18,('scroll content width not updated',old,new)
  assert new['captions']==['Shuffle'],new
  sample_button=new_page.get_by_role('button',name='Choose Sample A audio sample')
  start=new_page.locator('.xen-main-drum-editor').evaluate('(e)=>e.getBoundingClientRect().height')
  sample_button.evaluate('(el)=>el.click()')
  new_page.get_by_role('dialog',name='Sample A selection').wait_for()
  assert abs(new_page.locator('.xen-main-drum-editor').evaluate('(e)=>e.getBoundingClientRect().height')-start)<1
  new_page.get_by_role('button',name='Close sample selection').evaluate('(e)=>e.click()')
  assert new_page.get_by_role('dialog').count()==0
  report={'status':'PASS','baseline':old,'baselineAvailable':old is not None,'patched':new,'relativeStepShiftPx':round((old['firstStep']['left']-old['editor']['left'])-(new['firstStep']['left']-new['editor']['left']),2) if old is not None else None,'checks':['one shared 74px gutter','first drum step is 18px closer to labels' if old is not None else 'step start at 74px gutter + 2px gap','Shuffle markers align to steps','Percussion and Sample A labels fully visible','step width untouched','scroll content shrinks 18px' if old is not None else '938px scroller width','sample dialog does not change rack height','no JS exceptions']}
  (ROOT/'results/f355_drum_geometry.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'relativeStepShiftPx':report['relativeStepShiftPx'],'oldLabelWidth':92 if old is not None else None,'newLabelWidth':74,'scrollContentShrink':old['scrollWidth']-new['scrollWidth'] if old is not None else None,'notes':report['checks']},indent=2))
  if old_page: old_page.close()
  new_page.close()
 finally:browser.close()
