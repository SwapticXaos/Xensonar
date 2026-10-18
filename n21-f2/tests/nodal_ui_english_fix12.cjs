'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sources = {
  designer: read('src/nodal/07_sound_designer.js'),
  bridge: require('./nodal_sources.cjs').readNodalSources(root),
  library: read('src/nodal/03_library.js'),
  runtime: read('src/nodal/04_audio_runtime.js'),
  distribution: read('src/forge_and_melodic/07_tuning_and_logic_view.js'),
  melodic: read('src/forge_and_melodic/06_note_editor_and_material_tools.js')
};
const forbidden = {
  designer: ['Raum wird Stimme','Nodal-Sounddesign','KLANGKÖRPER','Vorhören','Klangkörper speichern','Klangkörper laden','HÜLLKURVE','Gespeicherte Klangkörper','Anregung','Kopplung aus','Knoten ziehen','Änderungen übernehmen','Abbrechen · zurück','Glutgeflecht','Atemkörper','Glasverband'],
  bridge: ['Nodal-Klänge','Verwalten (','Umbenennen','Knoten','im Projekt','Nodal-Instrument bearbeiten','Synthetische Instrumente'],
  library: ['Instrumentname muss','Instrument wurde nicht gefunden'],
  runtime: ['keine Startbestätigung'],
  distribution: ['Name der Komposition','Komposition benennen','Name für die Distribution','Nodal-Kompositionen gehen'],
  melodic: ['children:"Wiederholung"']
};
for (const [file, bad] of Object.entries(forbidden)) for(const label of bad) {
  assert(!sources[file].includes(label), `${file}: German UI text still present: ${label}`);
}
assert.match(sources.designer, /'Sound Design'/, 'English room title');
assert.match(sources.designer, /'Save Instrument'/, 'English save action');
assert.match(sources.bridge, /'Manage \('/, 'English manager toggle');
assert.match(sources.distribution, /Composition name · Material Track \/ Root Follow/, 'English distribution name field');
assert.match(sources.bridge, /'Edit Nodal Instrument ↗'/, 'English edit button');
assert.match(sources.melodic, /children:"Repeat"/, 'English repeat label');
console.log('PASS FIX12: all new Nodal and Distribution surfaces use concise English UI labels');
