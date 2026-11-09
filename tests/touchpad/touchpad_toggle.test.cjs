'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('src/myzel/01_effect_mapping.js','utf8');
const start=source.indexOf('/* GNOME command helper:');
const end=source.indexOf('function __PerformanceSoundLane(',start);
assert(start>0&&end>start,'touchpad module delimiters');
const fragment=source.slice(start,end);
const state=[];let index=0;const copies=[],pending=[];
const react={
 useState(init){const slot=index++;if(!state[slot])state[slot]={value:init};return [state[slot].value,v=>{state[slot].value=typeof v==='function'?v(state[slot].value):v}]},
 useRef(v){const slot=index++;if(!state[slot])state[slot]={value:{current:v}};return state[slot].value}
};
const jsx={jsx:(kind,props)=>({kind,props}),jsxs:(kind,props)=>({kind,props})};
const scope={P:react,u:jsx,navigator:{clipboard:{writeText(text){copies.push(text);return new Promise((resolve,reject)=>pending.push({resolve,reject}))}}}};
vm.createContext(scope);vm.runInContext(fragment,scope);
const render=()=>{index=0;return vm.runInContext('__XenTouchpadTypingHelp()',scope)};
const collect=(node,filter,all=[])=>{if(node&&typeof node==='object'){if(filter(node))all.push(node);const children=node.props?.children;if(Array.isArray(children))children.forEach(c=>collect(c,filter,all));else collect(children,filter,all);}return all};
const button=(mode)=>collect(render(),n=>n.kind==='button'&&n.props?.['aria-label']?.startsWith('Choose '+mode))[0];
const commandCard=()=>collect(render(),n=>n.props?.className==='xen-touchpad-command-card');
const copyButton=()=>collect(render(),n=>n.kind==='button'&&n.props?.['aria-label']==='Copy selected touchpad terminal command')[0];
(async()=>{
 assert.equal(commandCard().length,0,'initially closed');
 button('false').props.onClick();
 assert.equal(commandCard().length,1,'first click opens');
 assert.equal(copies.length,1,'first click copies');
 assert(button('false').props['aria-pressed'],'false currently selected');
 button('false').props.onClick();
 assert.equal(commandCard().length,0,'second click same selection collapses');
 assert.equal(button('false').props['aria-pressed'],false,'collapsed is not selected');
 assert.equal(copies.length,1,'collapse does not copy');
 pending[0].resolve();await Promise.resolve();
 assert.equal(commandCard().length,0,'late clipboard promise cannot reopen popup');
 button('true').props.onClick();
 assert.equal(commandCard().length,1,'different selection opens');
 assert(copies.at(-1).endsWith(' true'));
 const savedCopy=copyButton();savedCopy.props.onClick();
 assert.equal(commandCard().length,1,'copy button does not toggle card');
 assert.equal(copies.length,3,'copy button repeats command');
 assert(copies.at(-1).endsWith(' true'));
 button('false').props.onClick();
 assert.equal(commandCard().length,1,'switch mode stays open');
 assert(button('false').props['aria-pressed']);
 button('false').props.onClick();
 assert.equal(commandCard().length,0,'mode can collapse after switching');
 assert.equal(copies.length,4,'no copy on second collapse');
 console.log('PASS touchpad click open/same-click close/different-switch/re-copy/late clipboard');
})().catch(e=>{console.error(e);process.exitCode=1});
