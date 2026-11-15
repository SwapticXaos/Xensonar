# META-COPY-RFL-01 · Meta-Menü: Drop-Hinweis nur auf gültigen Feldern, Material → Root Follow Loop kopiert

Parent: `110fbbe` (PSY-LANE-01, index.html 8 082 843 Bytes). Rollback: `110fbbe`.
Neu: index.html 8 086 297 Bytes (+3 454), sha256 `d0d57687523b06150232b1337ec0268336f9530ff58b4f46b881f90a8463e83c`.
Zone: KALT (Meta-Menü, Drag nur im Dialog; Kopie läuft einmal pro Drop abseits vom Zeigerpfad). Kein Audio-Graph, kein Hot-Pfad.
Status: CODE_PRESENT, UNIT_VERIFIED (121/121), BROWSER_CHECKED (neuer E2E-Test, RED auf Parent nachgewiesen). Nicht gehört, nicht auf Gerät.

## 1. „+ drop here“ nur bei gültigem Ziel
Vorher: Beim Ziehen einer Bibliothekszeile (z. B. Schlagzeugmuster) über eine falsche Spalte wurde die Zielspalte rot (`is-drop-invalid`), trug aber gleichzeitig `is-drop-lane` und damit den Text „+ drop here“. Jetzt: `is-drop-lane` nur ohne `invalidReason`; das CSS blendet den Text zusätzlich bei `.is-drop-invalid` aus. Der Geist-Text am Zeiger zeigt bei Rot „✕ HIER NICHT ABLEGBAR“ statt „LOSLASSEN → SESSION“, und er bekommt dann kein `is-over`. Die Farbzuordnung ist unverändert.

## 2. Material Track → Root Follow Loop = Kopie (auch Loop-Rec)
Vorher: Reiner Referenzwechsel (`reassignLane`). Ging nur, wenn die ID schon Mitglied der Root-Follow-Bank war; Loop-Rec-Takes (`loop-rec-*`) waren grundsätzlich gesperrt, bei normalen Material-Einträgen verschwand der Eintrag aus dem Material Track.
Jetzt (`__xenMetaDropTarget` → `copy`, `__xenMetaCommitDrop` → `__xenMetaCopyMaterialToRootFollow`):
- Der Eintrag im Material Track bleibt. Rot erscheint nicht.
- Es entsteht ein neues dauerhaftes Material (`<Name> · Root Follow`, `rootFollowPreferred`, gleicher Herkunftsstempel wie „Raw als Root Follow Loop“ aus Spectral Forge), Mitglied der Root-Follow-Bank (`sourceKind:'material'`, `renderMode:'flowing'`) und Session-Eintrag in der Root-Follow-Spalte an der Drop-Position.
- Länge = Einstellung des Loop-Editors (Rechtsklick-Menü, Takte vorn/hinten ± wie `__XenRackLiveBarEdits`): 6 Takte, 2 hinten gekürzt → Kopie mit 4 Takten (gerendert mit demselben `__xenRackRenderBarEdit` wie „Save as New Material“). Ohne Bearbeitung wird das Audio unverändert kopiert.
- Loop-Rec-Take: Kopie ist ein normales Material (kein `sessionTake`); der Take bleibt im Material Track, die Aufnahme gehört weiter der Session.
- Umgekehrter Weg (Root Follow → Material) und Shift + Tile (Tausch) bleiben wie vorher. Bibliothekszeilen ziehen weiter nur in die eigene Spalte.
- Wer wirklich verschieben will, löscht den Eintrag danach im Material Track.

Daten-Owner: Material-Bibliothek (`__registerDurableMaterial`), Root-Follow-Bank (`UA`), Session-Entwurf (`__XenMetaSessions.addItem`). Keine neuen Speicherschlüssel, keine Migration.

## Tests
- Neu `tests/e2e/meta_copy_root_follow.cjs` (läuft in `tools/run_e2e.sh`): echter Mausdrag. Rote Spalte ohne Hinweis (alle fünf Spalten), gültige Spalte mit Hinweis; Material (6 → 4 Takte) und Loop-Rec-Take (6 → 5 Takte) werden kopiert; Original bleibt, gleiche Audiogröße, Kopie in der Bank. Auf dem Parent schlägt der Test mit „no drop here on drum while red“ fehl.

## Offene Risiken
- Zweimal ziehen erzeugt zwei Kopien (gewollt: jede Kopie ist ein eigener Eintrag).
- Kopie ohne Bearbeitung übernimmt das Audio byte-gleich; bei Bearbeitung entsteht ein 16-Bit-WAV (wie „Save as New Material“).
- Nicht geprüft: Abspielen der Kopie im Hauptraum, Kopie mit Fremdformaten (nur synthetische Plan-Einträge ohne Audio melden „Original loop audio is unavailable“).

## 3. Spaltenflächen beim Scrollen (Nachtrag)
Vorher: Das Board-Grid hielt die Spaltenhöhe auf der sichtbaren Höhe; bei vielen Einträgen ragten die Kacheln unten aus den Spaltenflächen heraus. Jetzt `grid-auto-rows:max-content` und `min-height:auto` an der Spalte: alle fünf Flächen wachsen mit dem längsten Inhalt und scrollen mit (Messung bei 14 Einträgen: Fläche 787 px, scrollHeight 805 px, sichtbar 318 px). Nur CSS.
