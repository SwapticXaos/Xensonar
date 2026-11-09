'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const lab=fs.readFileSync('src/rooms/lab.js','utf8');
const css=fs.readFileSync('styles/areas/028_inline-028.css','utf8');
const canonical=fs.readFileSync('styles/areas/040_xen-p9-m9-cockpit-canonical.css','utf8');
const featured=lab.match(/const __forgeFeaturedStampIds=\[([\s\S]*?)\];/)?.[1];
assert(featured,'Curated source of truth must exist');
const ids=[...featured.matchAll(/'([^']+)'/g)].map(x=>x[1]);
for(const id of ['glass-orb','shimmer-rain'])assert(ids.includes(id),`${id} must be in Curated`);
for(const id of ['ee-beam','gamelan-plate'])assert(!ids.includes(id),`${id} removed from Curated`);
assert.equal(new Set(ids).size,ids.length,'no duplicate Curated entries');
assert.equal(ids.length,16,'curated remains 16 diverse presets');
// Removal from Curated must not destroy data or historic stamp IDs used by saved projects.
const atlas=fs.readFileSync('src/app/forge/03_spectral_grid_and_archives.js','utf8');
for(const id of ['ee-beam','gamelan-plate','glass-orb','shimmer-rain'])assert(atlas.includes(`id:"${id}"`),`${id} must still exist in All`);
const gallery=lab.slice(lab.indexOf('function JHe('),lab.indexOf('function __createForgeMicCapture('));
assert.match(gallery,/state\.setStampData\(__forgePresetStampForTool\(preset\.stamp\)\)/,'click must load real stamp data');
assert.match(gallery,/state\.setStampPhase\('stamping'\);setActive\(preset\.id\)/,'green state must happen after stamp load');
assert.match(gallery,/className:'xen-stamp-tile-preview'/,'thumbnail wrapper required to anchor feedback');
assert.match(gallery,/active===p\.id&&h\('span',\{key:checkSerial,className:'xen-stamp-loaded-check'/,'selected preview gets green check');
assert.match(css,/\.xen-stamp-loaded-check\{/,'check styling exists');
assert.match(css,/\.xen-stamp-tile-preview\{[^}]*position:relative/,'badge positioned relative to actual thumbnail');
// Progressive discovery: no native hover tooltip on upper right scroll affordances.
const corner=lab.slice(lab.indexOf("'data-forge-down-corner':true"),lab.indexOf("onClick:__forgeScrollToForgeActionRack")+55);
assert(!corner.includes('title:'),'no browser tooltip explaining gold or turquoise corner');
assert(corner.includes("'aria-label':'Scroll to the very bottom'"),'accessible name remains on gold');
assert(corner.includes("'aria-label':'Scroll down to the Forge UP controls'"),'accessible name remains on turquoise');
// PLAY should use a single existing presentation owner, not repeated inline geometry.
const play=lab.slice(lab.indexOf('className:__ForgeRackClass(\'play\''),lab.indexOf('material:n&&u.jsx(xi',{fromIndex:lab.indexOf('className:__ForgeRackClass(\'play\'')}));
assert(play.includes('xen-forge-giant-play-wrap'),'PLAY geometry wrapper class');
assert(play.includes('xen-forge-giant-play-ghost'),'PLAY accessible geometry anchor');
assert(!play.includes('transform:"translate('),'PLAY size should not be inline layout patch');
assert.match(canonical,/\.xen-forge-giant-play-wrap\{/,'PLAY wrapper geometry centralized in CSS');
assert.match(canonical,/\.xen-forge-giant-play-ghost\{/,'PLAY ghost geometry centralized in CSS');
console.log('PASS R13: Curated 16, original preset IDs preserved, actual loaded feedback, discovery, PLAY presentation ownership');
