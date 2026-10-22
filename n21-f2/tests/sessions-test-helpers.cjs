'use strict';
// Older isolated UI/store fixtures now share the actual Grid profile helpers.
// Their minimal React/owner fakes stay focused on each original interaction.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
// These older isolated store tests begin with an authored profile, not a fresh
// browser. Expose its named Storage property before evaluating the *real* early
// template owner. Fresh-browser installation is covered by the native starter test.
function installBootSnapshot(context,root=process.cwd()){
 if(!context.localStorage)return context;
 if(vm.runInContext('typeof __XenStarterColdBrowser',context)!=='undefined')return context;
 const original=context.localStorage,key='xensonar:isolated-authored-profile';
 const storage=Object.create(original);
 Object.defineProperty(storage,key,{value:'existing',enumerable:true});
 storage.getItem=name=>name===key?'existing':original.getItem(name);
 context.localStorage=storage;
 const head=fs.readFileSync(path.join(root,'template/head.html'),'utf8'),start=head.indexOf('const __XenStarterColdBrowser='),end=head.indexOf('})();',start);
 if(start<0||end<start)throw Error('Missing real early starter freshness owner');
 vm.runInContext(head.slice(start,end+5),context);
 return context;
}
function install(context){
 installBootSnapshot(context);
 context.crypto??=crypto.webcrypto;
 context.__XenBassGrid??={normalize:value=>value&&typeof value==='object'?{...value}:{},subscribe:()=>()=>{},snapshot:()=>({})};
 const quick=fs.readFileSync('src/mix/03_quick_menu.js','utf8');
 const prefix=quick.slice(0,quick.indexOf('function __xenValidateQuickItems('));
 Object.assign(context,vm.runInContext('(()=>{'+prefix+';return {__xenGridUid,__xenGridKey,__xenGridProfile,__xenGridCompatibleMode,__xenGridModeName}})()',context));
 context.__xenQuickEntryTitle??=entry=>entry.name;
 if(context.__XenMetaAudition&&!context.__XenMetaAudition.status)context.__XenMetaAudition.status=()=>null;
 return context;
}
module.exports={install,installBootSnapshot};
