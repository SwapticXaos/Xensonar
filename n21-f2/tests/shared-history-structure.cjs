'use strict';
const assert=require('assert/strict'),ts=require('typescript');
module.exports=(text,contract)=>{
 let ast=ts.createSourceFile('reviewed.js',text,99,true);assert.equal(ast.parseDiagnostics.length,0);const edits=[];
 if(contract.nestedFunctions){const found=new Map();function visit(n){if(ts.isFunctionDeclaration(n)&&contract.nestedFunctions.includes(n.name?.text)){found.set(n.name.text,(found.get(n.name.text)||0)+1);edits.push([n.body.getStart(ast),n.body.end]);}else ts.forEachChild(n,visit)}visit(ast);for(const name of contract.nestedFunctions)assert.equal(found.get(name),1,'unique reviewed nested function '+name);for(const [a,b] of edits.sort((x,y)=>y[0]-x[0]))text=text.slice(0,a)+'{}'+text.slice(b);ast=ts.createSourceFile('reviewed.js',text,99,true);}
 const printer=ts.createPrinter({removeComments:true});return ast.statements.filter(n=>!n.name||!contract.functions.includes(n.name.text)).map(n=>printer.printNode(ts.EmitHint.Unspecified,n,ast)).join('\n');
};
