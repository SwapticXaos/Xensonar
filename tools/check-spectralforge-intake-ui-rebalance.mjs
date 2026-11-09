#!/usr/bin/env node
import fs from "node:fs";

function expect(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const intake = fs.readFileSync('src/features/l3lab/materialIntake/MaterialIntakePanel.tsx', 'utf8');
const forgeRoom = fs.readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const workshop = fs.readFileSync('src/features/xensonar/rooms/ExperimentalForgeWorkshopRoom.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const topology = fs.readFileSync('src/features/topology/MyzelTopologyPanel.tsx', 'utf8');

expect(intake.includes('Timbre extrahieren (rudimentär)'), 'MaterialIntakePanel should rename the embodiment button honestly.');
expect(intake.includes('Material-Metadaten'), 'MaterialIntakePanel should host the export metadata block.');
expect(intake.includes("externalLoadOrigin === 'cut-upload'") && intake.includes('pendingCutUploadScrollRef'), 'MaterialIntakePanel should persist cut-upload auto-scroll intent only for cut-upload origin.');
expect(!forgeRoom.includes('Taktsegmente (Orientierungsmarker)'), 'SpectralForgeRoom should no longer host the old top-of-canvas metadata row.');
expect(workshop.includes('externalAudioUploadOrigin'), 'ExperimentalForgeWorkshopRoom should forward external upload origin.');
expect(app.includes("setSpectralForgeExternalAudioOrigin('cut-upload')"), 'App should mark cut-upload origin for spectral forge handoff.');
expect(topology.includes('III. Nodal Installation'), 'Topology heading should use III. Nodal Installation.');
console.log('ok');
