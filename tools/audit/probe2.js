(()=>{const W=window;const sites=n=>{const s=new Error().stack.split('\n');const o=[];for(let i=2;i<s.length&&o.length<n;i++){const m=s[i].match(/index\.html:(\d+):(\d+)/);if(m)o.push(m[1]+':'+m[2])}return o.join(' < ')};
const A=W.__a2={ap:new Map(),apSame:new Map(),wc:new Map()};const bump=(m,k)=>m.set(k,(m.get(k)||0)+1);
const P=AudioParam.prototype;const last=new WeakMap();
for(const k of ['setTargetAtTime','setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','cancelScheduledValues','cancelAndHoldAtTime','setValueCurveAtTime']){const o=P[k];if(!o)continue;P[k]=function(...a){const s=sites(1);bump(A.ap,k+' @'+s);if(k==='setTargetAtTime'){const prev=last.get(this);if(prev===a[0])bump(A.apSame,s);last.set(this,a[0])}return o.apply(this,a)}}
const st=W.setTimeout;W.setTimeout=function(f,d,...r){const s=sites(4);if(s.startsWith('9257:'))bump(A.wc,s);return st.call(W,f,d,...r)};
A.snap=()=>({ap:[...A.ap],same:[...A.apSame],wc:[...A.wc],t:performance.now()});})();
