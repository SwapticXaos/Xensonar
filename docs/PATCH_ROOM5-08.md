# ROOM5-08: Psy Lab für den Live-Raum vorbereiten (Host, noch nicht verdrahtet)

Status: CODE_PRESENT, UNIT_VERIFIED (`tests/room5_live_host.cjs`). **Keine Bedienung im Live-Raum ändert sich**; es gibt noch keinen Schalter, keinen Eintrag in Auswahllisten und keinen Aufruf von `LiveHost`.
Zone: KALT (liegt im lazy Chunk `xen-room-psylab`; ohne Raum V / ohne ersten Ton wird nichts geladen oder angelegt). Daten-Owner der Klänge: localStorage `xensonar.psylab.instruments.v1` (Raum V).
HTML-Zuwachs: wenige hundert Byte im lazy Chunk.

## Was jetzt da ist (`LiveHost`, Export des Chunks)
- Ein **headless** `PsyEngine({visual:false})` pro Spur (`keyboard`, `wave`), erst beim ersten Ton angelegt; keine Analyser, kein Mandala, kein Metronom.
  Tastatur und Wave Starter können damit gleichzeitig **verschiedene** Patches spielen.
- Klang-IDs `psylab:<patch-id>` (wie `sample:` / `nodal:`); `entries()` liefert die Werkspatches plus die in Raum V gespeicherten Nutzerpatches im Katalogformat
  `{value,label,hint,originLabel:'Psy Lab'}` für die Rubrik und die Suche.
- `start/stop/bend/allOff/dispose`, Stimmen-IDs `lane:keyId`. Unbekannte ID: `false`, kein Ton.

## Haken für die eigentliche Verdrahtung (nächster Patch, mit Hörtest)
1. Rubrik: `src/mix/02_performance_catalog.js` `groups()` – Familie „Psy Lab“ (`psylab:`-Präfix), Reihenfolge Classic, Nodal, Entrophon, **Psy Lab**, Samples; `canPan` bleibt `false`.
2. Einträge und Suche („search presets“): `src/myzel/01_effect_mapping.js` (Zeilen um 174–194, 359, 424) speisen `groups()`; dort `LiveHost.entries()` einspeisen, ohne den Chunk für jeden Menüaufruf zu laden (kleiner Leser der Patchliste oder Chunk beim ersten Öffnen der Rubrik).
3. Auflösung: `$w(e)` in `src/audio/05_live_voice_runtime.js` → `{kind:"psylab",id}`; Wiedergabe über den Pfad von `playWaveStartSound` (Wave Starter: Enter / linke Maustaste) und den Tastaturpfad (`APe`/`bPe`, Release-Ereignisse).
4. Thunder: für `psylab:` kein Hold-Plan, kein Enter-Hold (Vorgabe); Spur-Schalter aus ROOM5-07 greifen dafür nicht.
5. Pegel und Aufnahme: Ausgang geht wie bisher über `getMasterInput`; Aufnahmepfad vorher/nachher per PCM prüfen (CLAUDE.md: kein neuer Audio-Graph ohne PCM- und Abhörtest).

## Offen / Risiken
- Ohne Hörtest nicht beurteilbar: Latenz der Worklet-Nachricht beim Tastenanschlag, Pegel gegenüber Entrophon, Stimmenzahl im Live-Betrieb.
- Release-Pfad (Taste/Enter/Maus loslassen) ist der kritische Teil der Verdrahtung: hängende Töne vermeiden (`allOff` beim Raumwechsel und Stop).
- Rollback: Commit davor (4088db8).
