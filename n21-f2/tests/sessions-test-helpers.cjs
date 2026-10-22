'use strict';
// Older isolated UI/store fixtures now share the actual Grid profile helpers.
// Their minimal React/owner fakes stay focused on each original interaction.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function install(context){
 context.crypto??=crypto.webcrypto;
 context.__XenBassGrid??={normalize:value=>value&&typeof value==='object'?{...value}:{},subscribe:()=>()=>{},snapshot:()=>({})};
 const quick=fs.readFileSync('src/mix/03_quick_menu.js','utf8');
 const prefix=quick.slice(0,quick.indexOf('function __xenValidateQuickItems('));
 Object.assign(context,vm.runInContext('(()=>{'+prefix+';return {__xenGridUid,__xenGridKey,__xenGridProfile,__xenGridCompatibleMode,__xenGridModeName}})()',context));
 context.__xenQuickEntryTitle??=entry=>entry.name;
 if(context.__XenMetaAudition&&!context.__XenMetaAudition.status)context.__XenMetaAudition.status=()=>null;
 return context;
}
module.exports={install};
