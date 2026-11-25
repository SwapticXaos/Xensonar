'use strict';
// Small source extractor for the plain production functions exercised by VM tests.
module.exports=(source,name)=>{
 const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing production function '+name);
 const brace=source.indexOf('{',start);let depth=0,quote=null,escape=false;
 for(let i=brace;i<source.length;i++){
  const ch=source[i];
  if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote=null;continue}
  /* comments are not code: an apostrophe in a comment ("the analysis' grid") must not open a string */
  if(ch==='/'&&source[i+1]==='/'){const nl=source.indexOf('\n',i);i=nl<0?source.length:nl;continue}
  if(ch==='/'&&source[i+1]==='*'){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+1;continue}
  if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
  if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('Unterminated production function '+name);
};
