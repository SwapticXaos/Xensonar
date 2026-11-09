from pathlib import Path
from playwright.sync_api import sync_playwright
import sys, json
html=Path(sys.argv[1]).read_text()
anchor='const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);'
assert html.count(anchor)==1
html=html.replace(anchor,anchor+'\nwindow.__SongProbe={session:__XenMetaSessions,quick:__XenQuick,mix:__XenMaterialVoiceMix,eq:__XenEQ,bridge:__XenMainRoomSessionBridge};')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page()
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{const map=new Map([['xensonar.meta-sessions.v2',JSON.stringify({version:2,name:'Scratch',items:[],colors:{},roomSettings:null,saved:[],loadedId:null,activePalette:null,dirty:true})]]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),get length(){return map.size},key:i=>[...map.keys()][i]};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}''')
 print('BROWSER_SETUP',flush=True)
 page.set_content(html,wait_until='domcontentloaded',timeout=85000)
 print('BROWSER_CONTENT_LOADED',flush=True)
 page.wait_for_function('window.__XenBoot?.state().ready===true',timeout=65000)
 results=page.evaluate('''()=>{
  const {session:s,quick:q,mix:m,eq:e}=window.__SongProbe;
  q.replaceItems([{kind:'material',id:'song-p0-browser-sample',name:'Sample'}]);
  const id='song-p0-browser-sample',key='material:'+id;
  m.set(id,'volume',.56);m.set(id,'pan',-.65);m.set(id,'att',1.25);m.setMode(id,'vinyl');
  e.set(key,{a:Array(360).fill(.22),b:Array(360).fill(-.3),morph:.6});
  if(!s.saveFromQuickAsNew('Browser Song A'))throw Error(s.snapshot().error);
  const a=s.snapshot().saved.at(-1);
  m.set(id,'att',-.5);m.set(id,'pan',.75);e.set(key,{a:Array(360).fill(-.45)});
  if(!s.saveFromQuickAsNew('Browser Song B'))throw Error(s.snapshot().error);
  const b=s.snapshot().saved.at(-1);
  if(!s.activateSaved(a.id))throw Error(s.snapshot().error);
  const pa={att:m.get(id).att,pan:m.get(id).pan,eq:e.get(key).a[0]};
  if(!s.activateSaved(b.id))throw Error(s.snapshot().error);
  const pb={att:m.get(id).att,pan:m.get(id).pan,eq:e.get(key).a[0]};
  const stored=JSON.parse(localStorage.getItem('xensonar.meta-sessions.v2'));
  return {pa,pb,sourceKeys:Object.keys(b.songPerformance.sources??{}),stored:stored.saved.find(row=>row.id===a.id)?.songPerformance?.entries?.[0]?.mix?.att,
  drift:JSON.stringify(a.songPerformance)===JSON.stringify(b.songPerformance)};
 }''')
 print('SONG_BROWSER',json.dumps(results))
 assert results['pa']=={'att':1.25,'pan':-.65,'eq':.22}
 assert results['pb']=={'att':-.5,'pan':.75,'eq':-.45}
 assert results['stored']==1.25 and not results['drift']
 assert 'waveStarter' in results['sourceKeys'] and 'particle' in results['sourceKeys'] and 'keyboard' in results['sourceKeys']
 assert errors==[],errors[:5]
 print('SONG_PERFORMANCE_BROWSER_PASS')
 browser.close()
