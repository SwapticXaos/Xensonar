from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys

HTML=Path(sys.argv[1]).read_text()
ANCHOR='const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);'
assert HTML.count(ANCHOR)==1
HTML=HTML.replace(ANCHOR,ANCHOR+'\nwindow.__MergeTestProbe={sessions:__XenMetaSessions,quick:__XenQuick,bridge:__XenMainRoomSessionBridge};')
rows=[{'id':f'session-{i}','name':f'Session {i}','items':[],'colors':{},'roomSettings':None} for i in range(50)]
payload={'version':2,'name':'Current draft','items':[],'colors':{},'roomSettings':None,'saved':rows,'loadedId':None,'activePalette':{'id':'session-5','name':'Session 5','items':[],'colors':{}},'dirty':False}
seed={'version':1,'archiveRows':6,'count':50,'activePalette':payload['activePalette'],'name':'Session 5'}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':1400,'height':920})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''([raw,seed])=>{const map=new Map([['xensonar.meta-sessions.v2',raw],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(seed)]]);map.set('xensonar.quick-menu.v2',JSON.stringify([{kind:'bass',id:'bass-pseudo',name:'Synthetic Bass'}]));window.__store=map;window.__reads=[];const storage={getItem:k=>(window.__reads.push(k),map.get(k)??null),setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),get length(){return map.size},key:i=>[...map.keys()][i]};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('synthetic IDB blocked')}}});}''',[json.dumps(payload),seed])
 page.set_content(HTML,wait_until='domcontentloaded',timeout=85000)
 page.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
 stat=page.evaluate('''()=>({boot:window.__XenM13BootStatus(),eq:typeof XenSonarEQ,bridge:!!window.__MergeTestProbe?.bridge&&window.__MergeTestProbe.bridge.available(),meta:!!window.__MergeTestProbe?.sessions,items:window.__MergeTestProbe.quick.getItems().map(x=>({kind:x.kind,id:x.id})).slice(0,10),v2reads:window.__reads.filter(k=>k==='xensonar.meta-sessions.v2').length})''')
 print('START',json.dumps(stat))
 assert stat['boot']['archiveDormant'] is False and stat['v2reads']>=1,'Legacy seed without sources must hydrate canonical archive for correct sound selection'
 assert stat['eq']=='object' and stat['meta']
 assert stat['bridge']
 # Set EQ on an active Quickrack voice; this must not force Session V2 parsing.
 result=page.evaluate('''()=>{
  const entry=window.__MergeTestProbe.quick.getItems().find(x=>['bass','material','rootFollow','drum'].includes(x.kind));if(!entry)throw Error('No EQ-capable Quick Rack entry');
  const key=XenSonarEQ.keyFor(entry.kind,entry.id), cfg=XenSonarEQ.neutral();cfg.a.fill(-0.5);cfg.morph=0.22;XenSonarEQ.set(key,cfg);
  if(window.__XenM13BootStatus().archiveDormant!==false)throw Error('Expected legacy seed to be hydrated on boot');
  if(!window.__MergeTestProbe.sessions.saveFromQuickAsNew('Merged EQ Capture',true))throw Error('Session save refused');
  const state=window.__MergeTestProbe.sessions.snapshot(), rec=state.saved.find(x=>x.name==='Merged EQ Capture');
  if(!rec?.roomSettings?.eq?.[key])throw Error('EQ curves missing from room settings snapshot');
  const stored=rec.roomSettings.eq[key].a[0];
  XenSonarEQ.set(key,{a:Array(360).fill(1),morph:0.99});
  if(!window.__MergeTestProbe.sessions.activateSaved(rec.id))throw Error('Activate saved failed');
  const restored=XenSonarEQ.get(key);
  return {key,recordId:rec.id,stored,after:restored.a[0],morph:restored.morph,archiveDormant:window.__XenM13BootStatus().archiveDormant,v2reads:window.__reads.filter(k=>k==='xensonar.meta-sessions.v2').length}
 }''')
 print('INTEGRATION',json.dumps(result))
 assert result['stored']==-0.5 and result['after']==-0.5 and abs(result['morph']-.22)<1e-6
 assert result['archiveDormant']==False and result['v2reads']>=1
 assert errors==[], errors[:8]
 print('MERGE_LEGACY_SEED_SOURCE_FALLBACK_AND_EQ_SESSION_PASS')
 browser.close()
