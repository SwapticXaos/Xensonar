(()=>{const sites=n=>{const s=new Error().stack.split('\n');const o=[];for(let i=2;i<s.length&&o.length<n;i++){const m=s[i].match(/index\.html:(\d+):(\d+)/);if(m)o.push(m[1]+':'+m[2])}return o.join(' < ')};
const m=new Map(),js=new Map();let on=false;const g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(on){const key=k+' | '+sites(5);m.set(key,(m.get(key)||0)+1)}return g.call(this,k)};
const J=JSON.stringify;JSON.stringify=function(...a){const r=J.apply(this,a);if(on&&r&&r.length>20000){const key=sites(6);js.set(key,(js.get(key)||0)+r.length)}return r};
window.__a4={start(){on=true},dump:()=>({gets:[...m],js:[...js]})};})();
