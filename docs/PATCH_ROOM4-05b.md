# ROOM4-05b: P2-Punkte (Clip-Info, „Original speed“ bei Tempowechsel, Cache/Langzeit-Looping)

Basis: THUNDER-Q01 (`index.html` 8 683 123 B), jetzt 8 685 043 B (+1 920 B). Zone: Info-Zeile und Tempo = WARM (Raum IV Oberfläche), Cache = KALT. Der Audio-Graph und das Rendering sind unverändert; der Mixdown-Hash der Testdatei ist gleich geblieben (`833a9776cceb945d`).

| Punkt | Änderung |
|---|---|
| **Clip-Info (Plan 3)** | Im Inspektor des gewählten Clips eine ruhige Zeile „Stereo · 48 kHz · 00:12.8“ / „Mono · 44,1 kHz · 00:03.4“. Bittiefe wird bewusst nicht gezeigt (intern Float-PCM, Tooltip sagt es). Bis zum Dekodieren steht „decoding source …“. |
| **„Original speed“ nach Tempoänderung (Plan 4, erster Schritt)** | Länge und Startpunkt (In) von Original-speed-Clips sind in Beats beim alten Tempo gespeichert. Nach einem Tempowechsel blieben die Beats gleich, ein Clip mit 4 s Audio wurde bei halbem Tempo 8 s lang und lief doppelt. Jetzt skaliert `retempo` Länge und In mit dem Tempoverhältnis, die reale Dauer bleibt. Beat-gebundene Fits („Bars × beats“, „Source tempo“) bleiben bewusst unverändert. Real geprüft: 7,2 Beats bei 108 BPM werden bei 54 BPM zu 3,6. |
| **Langzeit-Looping (Plan 2)** | Die Schlüssel schon geplanter Stimmen verwarf nichts, Schleifendurchläufe summierten sich über Stunden. Schlüssel vergangener Durchläufe werden jetzt entfernt (Test: 2 h Looping ergeben unter 100 Schlüssel). |
| **Audio-Cache** | Dekodiertes PCM blieb nach dem Verlassen von Raum IV im Speicher. Beim Verlassen werden fertige Puffer verworfen, laufende Dekodierungen nicht (Kalt-Raum-Vertrag). Beim Wiedereintritt wird neu dekodiert. |

Test: `tests/room4_04_tempo_and_beat.test.cjs`, jetzt 8 Tests (drei neue sind rot auf dem Vorgänger). 99 Regressionstests grün, Raum-IV-Probe, Tempo-Probe (`tools/probes/multitrack_tempo_probe.js`) und Mixdown-Probe ohne Fehler.

## Offen
- Die vollständige Trennung „Wiedergabe“ / „Zeitbindung“ (Plan 4) und Pitch-erhaltendes Time-Stretching sind nicht angefasst.
- Der Cache wurde nicht über eine lange reale Sitzung gemessen (Speicherprofil fehlt); die Looping-Schlüssel nur in einer Simulation.
- Beim Wiedereintritt in Raum IV (z. B. nach dem Wave-Editor-Roundtrip) dekodiert das Material erneut; das ist spürbar nur bei sehr langen Dateien.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Info-Zeile, Tempowechsel). Nicht: Abhören, Gerät, USER_ACCEPTED.
Rollback: Commit `3f51177`.
