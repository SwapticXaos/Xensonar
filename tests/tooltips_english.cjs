'use strict';
// TIPS-EN: the UI is English, so tooltips (title), accessible names (aria-label) and placeholders in the source must be English too.
// Scans object-literal / attribute strings for German diacritics and common German words. Usage: node tests/tooltips_english.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const files=[];(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(p.endsWith('.js'))files.push(p)}})('src');
const attr=/(title|aria-label|placeholder)['"]?\s*[:=]\s*(["'`])((?:(?!\2)[^\n\\]|\\.)*)\2/g;
const german=/[äöüÄÖÜß]|\b(und|oder|nicht|für|wird|Klicken|Linksklick|Rechtsklick|schließen|Fenster|Auswahl|Einstellung|Spur|Taktometer|öffnen|löschen|speichern|bitte|ziehen|verschieben|Alle|Keine)\b/;
const bad=[];
for(const f of files){const s=fs.readFileSync(f,'utf8');let m;while((m=attr.exec(s))){if(german.test(m[3]))bad.push(f+': '+m[3].slice(0,90))}}
assert.deepEqual(bad,[],'German tooltip / aria-label / placeholder texts:\n'+bad.join('\n'));
console.log('PASS tooltips, aria-labels and placeholders are English ('+files.length+' source files scanned)');
