/* P7.38.11: Decide freshness BEFORE any application initializer can write defaults,
   and AFTER package-station boot recovery has restored localStorage when pending.
   Other existing XenSonar data also blocks seeding: an untouched quick menu by
   itself is not evidence of a new browser. Storage failures are never 'fresh'. */
window.__XenBoot?.mark("module-entered");
const __XenStarterColdBrowser=(()=>{
 try{return !Object.keys(localStorage).some(key=>/^xensonar(?:[.:-]|$)/i.test(key))}
 catch{return false}
})();
