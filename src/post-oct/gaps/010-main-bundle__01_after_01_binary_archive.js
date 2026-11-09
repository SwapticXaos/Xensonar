// ML-IDB01: load the authoritative working copy before any room initializes.
try{await window.__XenMelodicCompact.preload()}catch(error){console.error('[melodic][idb-boot-blocked]',error)}
