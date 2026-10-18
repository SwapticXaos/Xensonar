const fs=require('node:fs'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));
const source=manifest.files.map(file=>fs.readFileSync(file,'utf8')).join('');
const method=source.slice(source.indexOf('async function spectrum(samples, sampleRate, options = {})'),source.indexOf('return Object.freeze({ combine, complement, spectrum });'));
assert.match(method,/const spectrumWindow\s*=\s*Float64Array\.from/,'must compute cosine taper once per call');
assert.match(method,/const spectrumRows\s*=\s*Array\.from/,'must compute frequency ranges once per call');
assert.match(method,/spectrumWindow\[i\]/);
assert.match(method,/spectrumRows\[y\]/);
console.log('PASS: spectrum plans reusable per-render window and bin mappings');
