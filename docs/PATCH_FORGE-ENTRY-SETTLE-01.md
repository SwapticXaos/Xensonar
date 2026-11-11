# FORGE-ENTRY-SETTLE-01

Basis: THUNDER-HPP01d (8 931 111 B laut Build davor), jetzt 8 931 643 B (rund +0,5 KB, nichts Neues zu laden). Status: CODE_PRESENT, UNIT_VERIFIED (101 + 4 Prüfungen). Nicht im Browser/auf dem Gerät geprüft.

**Zone:** WARM (Betreten der Spectral Forge). Audio-Thread und Play-Pfad unverändert.

1. **Absturzschutz beim schnellen Wechsel in die Forge.** Ursache (Code-Befund): Die automatische „after-paint“-Vorschau (Hörweise rechnet sich selbst, sobald eine Zeichnung/Carrier da ist) startete nach nur 80–520 ms Ruhe, also noch während der 633-KB-Lab-Chunk per `eval` ausgewertet und das erste Rendern erfolgte. Jetzt: (a) der Chunk wird erst nach einem gemalten Frame ausgewertet (`z4`, `src/rhythm/02_bass_and_rack.js`), (b) die Auto-Vorschau wartet nach jedem Betreten 2,5 s (`__FORGE_ENTRY_SETTLE_MS`, `s6e` in `src/forge/editor/07_composition_and_preview_ui.js`). Ein Druck auf Play umgeht das Warten und rechnet sofort.
2. **Mülleimer („Clear Workbench“)** lässt den Stempel stehen (`wDe(e,keepStamp)` in `src/app/forge/05_forge_state_and_analysis.js`). Geleert wird er weiter per Rechtsklick. „Reset Forge Main Path“ räumt wie bisher alles.
3. **Umbenennung der Hörweisen:** Gaia → Gahjer, Hildegard → Holgriot, Isolde → Ingor (nur sichtbare Namen). IDs/machineIds (`gaia-terrain-carrier` usw.) und gespeicherte Rezepte bleiben, daher keine Migration.

Daten-Owner: Stempel = `pe`-Store (`stampData`). Rollback: `git revert` dieses Commits.
Offen: Der Absturz wurde nicht reproduziert (kein Browser-Lasttest). Falls er bleibt, ist der nächste Kandidat die Wiederherstellung des gespeicherten Forge-Projekts beim Betreten.
