# ROOM4-14: Aufnahme von einem Audio-Eingang direkt auf eine Spur

Basis: ROOM4-13 (`index.html` 8 874 569 B), jetzt 8 884 383 B (+9 814 B, im lazy geladenen Raum-IV-Chunk). Zone: KALT bis zum Druck auf Rec; während der Aufnahme läuft die Erfassung in einem AudioWorklet (Audio-Thread), die Oberfläche bleibt unbeteiligt.

## Bedienung
In der Werkzeugzeile: `● Rec`, Eingangswahl (`Default input` oder ein benanntes Gerät, Namen erscheinen nach der ersten Freigabe), `Latency ms`. Rec startet die Wiedergabe ab dem Cursor und nimmt gleichzeitig auf (Overdub, mit Metronom und Vorzähler, falls eingeschaltet). `■ Stop rec` oder Leertaste beendet: Die Aufnahme liegt als neue Spur „Rec n“ (unter der gewählten Spur), als Clip ab dem Cursor, taktgebunden zum Projekttempo, als Material verlustfrei (32-bit-Float-WAV) in der Bibliothek. Der Eingang wird nicht abgehört (keine Rückkopplung): Kopfhörer nutzen.

## Technik
- Erfassung im **gleichen AudioContext** wie die Wiedergabe: ein Worklet schreibt Blöcke mit der Sample-Position; der Clip beginnt an der Sample-Position des Wiedergabestarts, um die eingestellte Latenz nach hinten geschoben (`recSlice`). So liegt die Aufnahme nach dem Sample-Takt, nicht nach geratener Uhrzeit.
- `Latency ms` = Umlaufzeit (Ausgang + Eingang). Voreinstellung: Basis- plus Ausgangslatenz des Browsers; der Wert wird gemerkt und ist per Gehör nachzustellen.
- Worklet lädt über Blob-URL, bei `file://` (Blob verweigert) über Data-URL, zuletzt ein ScriptProcessor als Reserve.
- Läuft die Aufnahme beim Verlassen des Raums, wird sie gesichert und erscheint beim nächsten Öffnen auf einer neuen Spur (Eingangs-Postfach). Stille oder Übersteuerung werden gemeldet.
- Rec-Zustand und Eingangswahl liegen nur in der Oberfläche (localStorage), nicht im Projekt.

## Prüfung (`tools/probes/multitrack_record_probe.js`, Chromium mit Test-Mikrofon)
Bedienelemente da; Rec → „■ Stop rec“; nach etwa 4 s Stop: neue Spur „Rec 1“, Clip bei Beat 0, 7,06 Beats (3,9 s), taktgebunden bei 108 BPM, Inspektor „Stereo · 48 kHz · 00:03.9“, Export der Aufnahme allein (erste Spur stumm) hat Signal (RMS 0,082), keine Fehler; Worklet-Pfad aktiv. Unit-Test `recSlice` (Positionen, Latenz, Lücke vor der Erfassung). Neu: ein Test, der Hooks hinter dem frühen `return` verbietet (der erste Entwurf riss sonst React-Fehler 310 beim Öffnen des Raums aus; im Zwischenstand `17d4b88` war der Raum deshalb nicht öffenbar, behoben in `2eaf473`). 100 Regressionstests grün; Standard-Export unverändert (`833a9776cceb945d`).

## Grenzen
- **Mit echtem Mikrofon, Audio-Interface und Kopfhörern nicht getestet.** Gemessen ist nur der Weg mit dem Testmikrofon; die Latenz-Voreinstellung (hier 0) ist auf Geräten ein Schätzwert.
- Es gibt keine Eingangsüberwachung, keinen Pegelmesser vor der Aufnahme und keine Mehrkanal-Wahl (Stereo oder Mono wird als Stereo gespeichert).
- Die Aufnahme liegt bis zum Stopp im Arbeitsspeicher (Mono-/Stereo-Float, grob 11 MB je Minute stereo bei 44,1 kHz). Schließt der Browser abrupt, ist sie weg.
- Kein Punch-in/-out, kein Takes-Stapel; jede Aufnahme ist eine neue Spur.
- Aufnahme des Hauptraum-Ausgangs gibt es hier nicht: Der Hauptraum schläft in Raum IV. Dafür bleibt „Send to Multitrack“ aus den Räumen; Drums und Bass sind direkt als Quellen wählbar (ROOM4-08).
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Testmikrofon). Nicht: echtes Gerät, Abhören, Firefox/Safari, USER_ACCEPTED. Rollback: Commit `131b7e3` (ROOM4-13).
