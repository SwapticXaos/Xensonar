};
const __cache={};
function __norm(parts){const out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p)}return out.join('/')}
function __resolve(from,spec){if(!spec.startsWith('.'))return spec;const base=from.split('/');base.pop();let id=__norm(base.concat(spec.split('/')));if(!/\.[cm]?[jt]s$/.test(id))id+='.ts';return id}
function __req(id){if(__cache[id])return __cache[id].exports;const factory=__mods[id];if(!factory)throw new Error('Overlay module missing: '+id);const module={exports:{}};__cache[id]=module;factory(module,module.exports,spec=>__req(__resolve(id,spec)));return module.exports}
return __req("patch-entry.ts");
})();