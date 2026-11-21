/* Lazy bootstrap for Package Station v4: keeps the 92 KB binary archive codec cold on normal boot
   (only two localStorage reads) and compiles xen-chunk-package-station on recovery, Eye open, or direct global access. */
let __xenPackageStation4Instance;
function __xenPackageStation4(){
 if(__xenPackageStation4Instance)return __xenPackageStation4Instance;
 const create=__xenLoadChunk('package-station');
 __xenPackageStation4Instance=create();
 Object.defineProperty(globalThis,'__XenPackageStation4',{value:__xenPackageStation4Instance,writable:true,configurable:true,enumerable:true});
 return __xenPackageStation4Instance;
}
if(!Object.hasOwn(globalThis,'__XenPackageStation4')){
 Object.defineProperty(globalThis,'__XenPackageStation4',{configurable:true,enumerable:true,get(){return __xenPackageStation4()}});
}
// Stop before ANY application initializer during restore. Normal boot performs only two key reads.
let __xenRestoredWorkspace4=null;
if(localStorage.getItem('xensonar:package-station:v4:recovery')||localStorage.getItem('xensonar:package-station:v4:runtime'))
 __xenRestoredWorkspace4=await __xenPackageStation4().boot();
