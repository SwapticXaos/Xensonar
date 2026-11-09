(()=>{const m=new Map();const g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){m.set(k,(m.get(k)||0)+1);return g.call(this,k)};
const J=JSON.stringify;let big=0,bigBytes=0;JSON.stringify=function(...a){const r=J.apply(this,a);if(r&&r.length>20000){big++;bigBytes+=r.length}return r};
window.__a3={snap:()=>({gets:[...m],big,bigBytes,t:performance.now()})};})();
