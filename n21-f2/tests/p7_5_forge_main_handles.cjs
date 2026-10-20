'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||'/mnt/data/P7_4_KEYBOARD_CURSOR/n21-f2';
const s=fs.readFileSync(root+'/src/forge/editor/01_display_and_canvas.js','utf8');
function extract(name){const i=s.indexOf('function '+name+'(');assert(i>=0,`missing ${name}`);const rest=s.slice(i);const st=rest.indexOf('{');let level=0;for(let j=st;j<rest.length;j++){if(rest[j]==='{')level++;else if(rest[j]==='}'&&!--level)return rest.slice(0,j+1)}throw Error('unterminated '+name)}
const c={};vm.createContext(c);vm.runInContext(extract('__f375ForgeSelectionMainPixel')+';this.map=__f375ForgeSelectionMainPixel;',c);
const map=c.map;
// Visible viewport: data positions [200, 700) in a 1000-cell carrier, zoom=2 in a 1000px main canvas.
const input={width:1000,zoomX:2,offsetX:200,rectWidth:1000};
assert.equal(map(.2,input),0);assert.equal(map(.7,input),1000);assert.equal(map(.45,input),500);
assert.equal(map(.1,input),null,'offscreen left boundary should be hidden');
assert.equal(map(.8,input),null,'offscreen right boundary should be hidden');
assert.equal(map(.75,{width:1000,zoomX:1,offsetX:0,rectWidth:500,canvasWidth:1000}),375);
assert(s.includes('data-forge-main-sample-start'),'missing purple start marker');
assert(s.includes('data-forge-main-sample-end'),'missing purple end marker');
assert(s.includes('__ForgeNavigatorSample.select(span.start,span.end)'),'main drag must update same Navigator sample owner');
assert(s.includes('onMouseDown:beginDrag'),'start/end line or triangle must be draggable');
console.log('PASS P7.5 Forge main canvas synchronized purple boundary handles and zoom mapping');
