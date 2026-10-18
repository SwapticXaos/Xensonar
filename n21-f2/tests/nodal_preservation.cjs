const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const myzelG2Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/myzel_g2_fix13_seams.json'),'utf8'));
const emilia3Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/emilia3_shuffle_seams.json'),'utf8'));
const organShuffleSeams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/organ_shuffle_g2_seams.json'),'utf8'));
function restoreFix13(file,data){return restoreSeams(myzelG2Seams,file,restoreSeams(organShuffleSeams,file,restoreSeams(emilia3Seams,file,data)));}
const consolidationFix13Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_consolidation_fix13_seams.json'),'utf8'));
const libraryPreviewEditFix12cSeams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_library_preview_edit_fix12c_seams.json'),'utf8'));
const uiEnglishFix12Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_ui_english_fix12_seams.json'),'utf8'));
const modeUnityFix12Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_mode_unity_fix12_seams.json'),'utf8'));
const libraryLayoutFix11Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_library_layout_fix11_seams.json'),'utf8'));
const libraryFix10Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_library_fix10_seams.json'),'utf8'));
const editFix9Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_edit_fix9_seams.json'),'utf8'));
const distributionFix8Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_distribution_fix8_seams.json'),'utf8'));
const compositionFix7Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_composition_fix7_seams.json'),'utf8'));
const fix6bSeams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_fix6b_seams.json'),'utf8'));
const fix5Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_middle_fix5_seams.json'),'utf8'));
const middleFix4Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_middle_fix4_seams.json'),'utf8'));
const middleFix3Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_middle_fix3_seams.json'),'utf8'));
const frontendSeams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_frontend_seams.json'),'utf8'));
const middleFix2Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_middle_fix2_seams.json'),'utf8'));
const middleSeams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_middle_fix1_seams.json'),'utf8'));
const seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_clean5_seams.json'),'utf8'));
function restoreSeams(table,file,data){const entry=table.find(e=>e.file===file);if(!entry)return data;let source=data.toString();for(const change of [...entry.seams].reverse()){assert.equal(source.slice(change.position,change.position+change.after.length),change.after,'Unreviewed change at Nodal integration seam: '+file);source=source.slice(0,change.position)+change.before+source.slice(change.position+change.after.length)}assert.equal(crypto.createHash('sha256').update(source).digest('hex'),entry.baselineSha256,'Existing code changed outside the Nodal seam: '+file);return Buffer.from(source)}
function restoreBaseline(file,data){data=restoreFix13(file,data);return restoreSeams(seams,file,restoreSeams(frontendSeams,file,restoreSeams(middleSeams,file,restoreSeams(middleFix2Seams,file,restoreSeams(middleFix3Seams,file,restoreSeams(middleFix4Seams,file,restoreSeams(fix5Seams,file,restoreSeams(fix6bSeams,file,restoreSeams(compositionFix7Seams,file,restoreSeams(distributionFix8Seams,file,restoreSeams(editFix9Seams,file,restoreSeams(libraryFix10Seams,file,restoreSeams(libraryLayoutFix11Seams,file,restoreSeams(uiEnglishFix12Seams,file,restoreSeams(modeUnityFix12Seams,file,restoreSeams(libraryPreviewEditFix12cSeams,file,restoreSeams(consolidationFix13Seams,file,data)))))))))))))))));}
module.exports={restoreBaseline,restoreFix13,restoreFix12C:(file,data)=>restoreSeams(consolidationFix13Seams,file,restoreFix13(file,data))};
if(require.main===module && process.argv.includes('--historical')){for(const entry of [...consolidationFix13Seams,...libraryPreviewEditFix12cSeams,...modeUnityFix12Seams,...uiEnglishFix12Seams,...libraryLayoutFix11Seams,...libraryFix10Seams,...editFix9Seams,...distributionFix8Seams,...compositionFix7Seams,...fix6bSeams,...fix5Seams,...middleFix4Seams,...middleFix3Seams,...middleFix2Seams,...middleSeams,...frontendSeams,...seams])restoreBaseline(entry.file,fs.readFileSync(path.join(root,entry.file)));console.log('PASS exact CONSOLIDATION_FIX13/LIBRARY_PREVIEW_EDIT_FIX12C/MODE_UNITY_FIX12/ENGLISH_FIX12/LIBRARY_LAYOUT_FIX11/LIBRARY_FIX10/EDIT_FIX9/DISTRIBUTION_FIX8/COMPOSITION_FIX7/FIX6B/FIX5/MIDDLE_FIX4/MIDDLE_FIX3/MIDDLE_FIX2/MIDDLE_FIX1/FRONTEND1/BACKEND1/CLEAN5 integration seams; other existing sources byte-identical');}

// Historical seam offsets describe FIX13, not the later merged source.
// The default preservation gate checks the delivered F4.4.2 baseline explicitly.
if(require.main===module && !process.argv.includes('--historical')) require('./f446-preservation.cjs');
