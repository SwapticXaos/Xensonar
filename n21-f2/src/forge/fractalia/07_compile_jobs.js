/* Shared compilation with consumer-owned cancellation and bounded execution. */
function createFractaliaCompileJobs(compile,{maxCache=12}={}) {
 const cache=new Map(),pending=new Map(),queue=[];let running=null,serial=0;
 const abort=()=>new DOMException('Fractalia preparation cancelled','AbortError');
 function remove(job){if(pending.get(job.key)===job)pending.delete(job.key)}
 function rejectConsumer(job,c,error){if(!job.consumers.delete(c))return;c.signal?.removeEventListener('abort',c.abort);c.reject(error);if(!job.consumers.size&&!job.done){job.cancelled=true;remove(job)}}
 function checkJob(job){for(const c of [...job.consumers]){try{if(c.signal?.aborted)throw abort();c.check()}catch(error){rejectConsumer(job,c,error)}}if(job.cancelled||!job.consumers.size)throw abort()}
 async function pump(){if(running)return;queue.sort((a,b)=>b.priority-a.priority||a.id-b.id);const job=queue.shift();if(!job)return;
  if(job.cancelled){pump();return}running=job;
  try{checkJob(job);const atlas=await compile({...job.args,check:()=>checkJob(job),onProgress:p=>{job.progress=p;for(const c of job.consumers)try{c.onProgress?.(p)}catch{}}});checkJob(job);
   cache.set(job.key,atlas);while(cache.size>maxCache)cache.delete(cache.keys().next().value);job.done=true;
   for(const c of job.consumers){c.signal?.removeEventListener('abort',c.abort);c.resolve(atlas)}job.consumers.clear();
  }catch(error){job.done=true;for(const c of [...job.consumers])rejectConsumer(job,c,error)}finally{remove(job);running=null;queueMicrotask(pump)}
 }
 function request(key,args,{check=()=>{},onProgress,signal,priority=1}={}){
  try{check();if(signal?.aborted)throw abort()}catch(error){return Promise.reject(error)}
  if(cache.has(key)){onProgress?.(1);return Promise.resolve(cache.get(key))}
  let job=pending.get(key);if(!job||job.cancelled){job={key,args,id:++serial,priority,consumers:new Set(),progress:0,cancelled:false,done:false};pending.set(key,job);queue.push(job)}else job.priority=Math.max(job.priority,priority);
  const promise=new Promise((resolve,reject)=>{const c={resolve,reject,check,onProgress,signal};c.abort=()=>rejectConsumer(job,c,abort());job.consumers.add(c);signal?.addEventListener('abort',c.abort,{once:true});if(signal?.aborted)c.abort();else onProgress?.(job.progress)});
  queueMicrotask(pump);return promise;
 }
 return Object.freeze({request,stats:()=>({running:running&&!running.cancelled?1:0,pending:pending.size,cached:cache.size,consumers:[...pending.values()].reduce((a,j)=>a+j.consumers.size,0)})});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createFractaliaCompileJobs;
