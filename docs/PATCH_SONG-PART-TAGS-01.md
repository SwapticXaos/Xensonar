# SONG-PART-TAGS-01 — Song-Teil-Bezeichnung und -Farben reisen mit dem gesendeten Material

## Anforderung (strukturiert)
1. **Benennung im Wave-Editor**
   - Großbuchstabe = Art des Teils (A, B, C …, wie von der Analyse vergeben).
   - Zahl = Wiederholung dieser Art, nur wenn sie mehrfach vorkommt: A1, A2, A3 (B kommt zweimal → B1, B2; C nur einmal → C).
   - Kleinbuchstabe = Unterteilung (Abschnitt) innerhalb genau dieses Teils: A1a, A1b … (vorher A1, A2 = Abschnitte – das ist jetzt die Wiederholung).
   - Benannte Arten: „Verse 1“, „Verse 2“, Abschnitte „Verse 1a“ (nicht wiederholt: „Bridge a“).
2. **Farben**
   - oben / Körper = Farbe der Art (Buchstabe, wie bisher, frei wählbar pro Song),
   - unten = Farbton des Abschnitts (wie bisher in der Leiste),
   - Rand = Farbe der Wiederholung (1, 2, 3 … je eigene Farbe); in der Leiste als Rahmen um den Teil.
3. **Titel beim Senden**: Liegt die lila Maske auf einem Teil oder Abschnitt (≥ 80 % Überdeckung in beide Richtungen), wird „ · A1b“ an den Titel gehängt – für Material Track, Root Follow Loop, Pink Track (Melodic Loop) und Sample. Freie Masken behalten den reinen Titel. Ein altes Kennzeichen im Titel wird ersetzt, nicht verdoppelt.
4. **Anzeige der gesendeten Spur**
   - Quick Rack: Kärtchen-Körper oben Art-Farbe / unten Abschnitts-Farbton, Rand = Wiederholungsfarbe (eine Session-Farbe hat Vorrang).
   - Mixing Desk: Crate-Einträge und Deck-Streifen mit zweifarbigem Chip „A1b“ (oben/unten wie im Wave-Editor, Ring = Wiederholung), Rand und linkes Zweifarb-Band; im Namen steht der Songtitel, das Kennzeichen im Chip.
   - Multitrack: Teile heißen A1 B1 A2 …, Abschnitte A1a A1b; beim Zurückholen in den Wave-Editor wird daraus wieder die Art (Buchstabe) mit ihrem Namen.

## Technik
- `src/ui/10_song_part_tint.js` (Hauptbundle): `__XenSongPartTint` – Paletten, `shade`, `parse` / `withTag` (Muster „ · A2b“ am Titelende), Farbregister je gesendetem Titel (`xensonar.songParts.materialTint.v1`, eigene Art-Farben eines Songs bleiben erhalten), `tintFor`, `quickTint`; `__XenSongPartChip`.
- `src/rooms/00_song_parts_edit.js`: `tagParts` (occ, repeats, tag, occColor, Abschnitts-`tag`/`subLetter`), `displayName`, `sectionName`.
- `src/rooms/lab.js`: Leiste (Rahmen, Abschnittsnamen, Griffe), Taktometer-Label, Multitrack-Export (`l` = Kennzeichen, `o` = Wiederholungsfarbe), Rückweg (Art aus dem Buchstaben), `__xenSongPartForRange` + Sendetitel (`fe`).
- `src/mix/03_quick_menu__*`: `__xenQuickTint` (Session-Farbe vor Teil-Farbe).
- `src/ui/07_dj_mix_stage.js` + `048_xen-dj-mix-stage.css`: Chip, Rand, Band.
- Das Material-Schema bleibt unverändert (Kennzeichen steckt im Namen).

## Tests
`tests/song_part_tint.test.cjs`, `tests/song_parts_edit.test.cjs` (neuer Fall), `tests/e2e/song_part_tags_send.cjs` (neu), `tests/e2e/mt_song_parts.cjs` (angepasst), `snap_all_wave_editor`.
