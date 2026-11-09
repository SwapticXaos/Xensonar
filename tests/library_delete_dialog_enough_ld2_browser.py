from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys
html = Path(sys.argv[1] if len(sys.argv)>1 else 'dist/XenSonar_Standalone.html').read_text()
html=html.replace('// Shared owner boundary: cancelled means no asset, cache, UI or selection changes.',
                  'window.__LD2_confirm=__xenConfirmLibraryDeletion;\n// Shared owner boundary: cancelled means no asset, cache, UI or selection changes.')
with sync_playwright() as pw:
 browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page = browser.new_page(viewport={'width':1280,'height':800},reduced_motion='no-preference')
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''()=>{const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),get length(){return data.size},key:i=>[...data.keys()][i]};
 Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
 Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw Error('fixture IDB disabled')}}});}''')
 page.set_content(html, wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function('typeof window.__LD2_confirm === "function"',timeout=30000)
 def open_dialog():
  page.evaluate('''()=>{
   window.confirm=()=>{throw Error('BROWSER CONFIRM MUST NOT RUN')};
   window.__LD2_answer='pending';
   window.__LD2_promise=window.__LD2_confirm('',{name:'Four on the Floor · Ein komplexes langes Instrumentenlabel'},
    {savedProjectCount:3,draftReferenceCount:2,liveReferenceCount:2,workingReferenceCount:2,quickReferenceCount:1});
   window.__LD2_promise.then(v=>window.__LD2_answer=v);
  }''')
  page.locator('.xen-library-delete-dialog').wait_for()
 open_dialog()
 before=page.evaluate('''()=>{const d=document.querySelector('.xen-library-delete-dialog');const b=d.getBoundingClientRect();
 const a=d.querySelector('.xen-library-delete-actions').getBoundingClientRect();
 return {b:{x:b.x,y:b.y,w:b.width,h:b.height},a:{x:a.x,y:a.y,w:a.width,h:a.height},
 centered:Math.abs((b.x+b.width/2)-document.documentElement.clientWidth/2)<10&&Math.abs((b.y+b.height/2)-innerHeight/2)<3,
 focus:document.activeElement.textContent,text:d.innerText,open:d.open};}''')
 assert before['open'] and before['centered'],before
 assert before['focus']=='Abbrechen',before
 assert 'Session-Undo' in before['text'] and '3 gespeicherte Session-Projekte' in before['text'],before
 page.evaluate("()=>{window.__LD2_hotkeyHits=0;window.addEventListener('keydown',()=>window.__LD2_hotkeyHits++);} ")
 page.keyboard.press('x')
 assert page.evaluate('window.__LD2_hotkeyHits')==0,'Instrument/global keyboard event leaked through modal'
 assert page.locator('.xen-library-delete-dialog').count()==1
 page.screenshot(path='/mnt/data/work/dialog_desktop.png')
 page.keyboard.press('Escape')
 page.wait_for_function('window.__LD2_answer === false')
 assert page.locator('.xen-library-delete-dialog').count()==0
 page.set_viewport_size({'width':360,'height':390})
 open_dialog()
 small=page.evaluate('''()=>{
 const d=document.querySelector('.xen-library-delete-dialog'),b=d.getBoundingClientRect(),
 actions=d.querySelector('.xen-library-delete-actions').getBoundingClientRect(),
 body=d.querySelector('.xen-library-delete-body');
 return {x:b.x,y:b.y,width:b.width,height:b.height,actionsBottom:actions.bottom,
 viewport:innerHeight,bodyHeight:body.clientHeight,bodyScrollHeight:body.scrollHeight,
 overflow:getComputedStyle(body).overflowY,visibleActions:actions.bottom<=innerHeight&&actions.top>=0};}''')
 assert small['visibleActions'] and small['height']<=small['viewport']-20,small
 assert small['bodyScrollHeight']>small['bodyHeight'],small
 page.screenshot(path='/mnt/data/work/dialog_mobile.png')
 page.set_viewport_size({'width':320,'height':260})
 tiny=page.evaluate('''()=>{const d=document.querySelector('.xen-library-delete-dialog'),b=d.getBoundingClientRect(),a=d.querySelector('.xen-library-delete-actions').getBoundingClientRect();
 return {dialogTop:b.top,dialogBottom:b.bottom,actionsBottom:a.bottom,viewport:innerHeight};}''')
 assert tiny['dialogTop']>=0 and tiny['dialogBottom']<=260 and tiny['actionsBottom']<=260,tiny
 page.set_viewport_size({'width':360,'height':390})
 page.get_by_role('button',name='Überall löschen').click()
 page.wait_for_function('window.__LD2_answer === true')
 # Real DOM and stylesheet: ambient color animation AND reduced-motion state.
 animation=page.evaluate('''()=>{
  const d=document.createElement('div');d.className='xen-rack-microphone';d.dataset.forgeMicrophone='recording';
  const b=document.createElement('button');b.className='xen-enough-finish';b.textContent='Enough!';d.append(b);document.body.append(d);
  const style=getComputedStyle(b);return {animation:style.animationName,background:style.backgroundImage};}''')
 assert animation['animation'] in ('xen-enough-halo','xen-enough-aurora-halo'),animation
 page.emulate_media(reduced_motion='reduce')
 reduced=page.evaluate("()=>getComputedStyle(document.querySelector('button.xen-enough-finish')).animationName")
 assert reduced=='none',reduced
 assert not errors,errors[:5]
 print('LD2_BROWSER_PASS',json.dumps({'desktop':before,'mobile':small,'enough':animation,'reduced':reduced},ensure_ascii=False))
 browser.close()
