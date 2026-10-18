

/* Session restoration contains real PCM, not merely source filenames. */
const __F35636DualStore=(()=>{
  let opening=null;
  function open(){if(opening)return opening;opening=new Promise((resolve,reject)=>{let request;
    try{request=indexedDB.open('xensonar-dual-donor-material-f35636',1);}catch(e){reject(e);return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('sessions'))request.result.createObjectStore('sessions');};
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};
    request.onerror=()=>{opening=null;reject(request.error||Error('Session storage unavailable.'));};});opening=opening.catch(e=>{opening=null;throw e;});return opening;}
  async function read(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),r=tx.objectStore('sessions').get('current');let value=null;r.onsuccess=()=>{value=r.result??null;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Session read cancelled.'));});}
  async function write(value){const db=await open();const sources=Object.fromEntries(['A','B'].map(slot=>{const s=value.sources?.[slot];return [slot,s?{...s,samples:s.samples.slice()}:null];}));return new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put({...value,sources},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Session save cancelled.'));});}
  return Object.freeze({read,write});
})();