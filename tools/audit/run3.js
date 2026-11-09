const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
await p.addInitScript({path:__dirname+'/probe3.js'});await p.goto('file://'+process.argv[2]);await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
const a=await p.evaluate(()=>__a3.snap());await p.waitForTimeout(20000);const z=await p.evaluate(()=>__a3.snap());
const sec=(z.t-a.t)/1000,m=new Map(a.gets);
console.log('window',sec.toFixed(0),'s | JSON.stringify >20KB:',z.big-a.big,'calls,',((z.bigBytes-a.bigBytes)/1e6).toFixed(2),'MB serialized');
console.log('localStorage reads during play:');z.gets.map(([k,v])=>[k,v-(m.get(k)||0)]).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]).slice(0,8).forEach(x=>console.log('  ',x[1],x[0]));
await b.close()})();
