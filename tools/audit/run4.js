const {chromium}=require('playwright');const fs=require('fs');const lines=fs.readFileSync(process.argv[2],'utf8').split('\n');
const sn=s=>{const [l,c]=s.split(':').map(Number);return (lines[l-1]||'').slice(Math.max(0,c-90),c+20).replace(/\s+/g,' ')};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
await p.addInitScript({path:__dirname+'/probe4.js'});await p.goto('file://'+process.argv[2]);await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);await p.evaluate(()=>__a4.start());await p.waitForTimeout(10000);
const d=await p.evaluate(()=>__a4.dump());
console.log('== large JSON.stringify by caller (bytes in 10s)');d.js.sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([k,v])=>{console.log((v/1e6).toFixed(2)+' MB',k);k.split(' < ').slice(0,6).forEach(s=>console.log('     ',s,'|',sn(s)))});
console.log('== storage reads by caller (10s)');d.gets.sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v])=>{const [key,st]=k.split(' | ');console.log(v,key);(st||'').split(' < ').slice(0,5).forEach(s=>console.log('     ',s,'|',sn(s)))});
await b.close()})();
