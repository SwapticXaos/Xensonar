# ROOM4-02: Raum IV · Multitrack, Arbeitsfassung

Nutzer-Rückmeldung zu ROOM4-01: Grunddesign gefällt; manche Spuren still (Umrechnungen prüfen; Forge/Melodic Loop erzeugen teils synthetisch/hybrid); Clips auch in andere Spuren ziehen; Rechtsklick überall sinnvoll belegen; Funktionsumfang auf das Niveau der anderen Räume bringen.

| | |
|---|---|
| Basis | ROOM4-01, `index.html` 8 606 167 Bytes, SHA-256 `30223a12…71ea` |
| Ergebnis | `index.html` 8 631 771 Bytes, SHA-256 `c93a1846f6dccdce53f861cdbf295f895071bab83671966434e3cc9ef6b3e11b` |
| Größenzuwachs | +25,6 KB gegenüber ROOM4-01, **ausschließlich im inerten Raum-Chunk** (jetzt 54,0 KB). Hauptprogramm bytegleich; Chunk beim Start nachweislich nicht ausgewertet. |
| Zone | KALT bei geschlossenem Raum. Beim Abspielen HEISS · Steuerung (200-ms-Planung, 1,5 s Vorlauf). Bearbeitungen während der Wiedergabe: Mixer als AudioParam, geänderte Clips werden kurz ausgeblendet und ab „jetzt“ neu geplant, ohne Neuaufbau. Dekodieren und Mixdown sind KALT (Offline-Kontexte). |
| Daten-Owner | Unverändert `xensonar-multitrack-v1` (Format v2, v1 wird verlustfrei gelesen). Gelesen: Materialbibliothek, `__XenStarterMaterial`. Mitgenutzt: `__xenMaterialLaneChain`, `__XenEQ`, `__XenWaveCoreW01.encodeWav`. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium, echtes Layout). Nicht: Abhören, Gerätetest, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Warum Spuren still waren

1. **Starter-/Demo-Material** erhält sein Audio erst auf Anfrage über `__XenStarterMaterial.ensure()`, wie im Live Room. Das fehlte. **Behoben.**
2. **Änderungen während der Wiedergabe** (neue Spur, neuer, verschobener oder kopierter Clip) wurden erst beim nächsten Start hörbar. **Behoben:** Live-Abgleich per Signatur pro Clip.
3. **Unsichtbare Fehler:** Ein Clip, dessen Material fehlt oder nicht dekodiert werden kann, war einfach still. **Jetzt:** rot markiert, mit Grund (Tooltip, Ansage, Inspektor); die Statuszeile nennt die Zahl betroffener Clips.
4. **Umrechnung der Länge:** Clips wurden immer als Takte × Schläge des Materials an das Projekttempo angepasst, genau wie im Live Room. Ist die Taktangabe falsch (z. B. Forge-Vorgabe „4 Takte“ bei 2 s Audio), läuft das Material viermal zu langsam. **Neu:** pro Clip wählbar **Tempo-fit** oder **Originaltempo** (Länge aus der echten Audiodauer, Rate 1). Loop-Rec-Takes starten im Originaltempo. Der Inspektor zeigt die Bandgeschwindigkeit („Tape ×…“) bzw. „Original speed · real length …“.
5. **Synthetisch/hybrid:** Was Forge und Melodic Loop als Material senden, liegt in der Bibliothek immer als **gerendertes Audio** vor (`a0e`: `audio.blob`), auch bei synthetischer oder hybrider Herkunft. Root-Follow-Einträge verweisen auf dieselben Materialien und legen nur eine Abspiel-Konfiguration darüber (granular/synthetisch, live). In Raum IV erklingt das gerenderte Audio. Eine Root-Follow-Wiedergabe als Spur wäre ein eigener Schritt.

## Neu

- **Ziehen:** Clips frei verschieben, auch **in andere Spuren** (Zielspur wird hervorgehoben). **Alt+Ziehen kopiert.** **Kanten ziehen** kürzt oder verlängert (links mit Versatz ins Material, die Schleife läuft weiter).
- **Rechtsklick überall** (auch per Tastatur: Kontextmenü-Taste/Shift+F10, Pfeile, Enter, Esc):
  - **Clip:** Duplizieren, Teilen am Cursor, Kopieren, Clip-Mute, Material ×2, Länge = ein Zyklus, Originaltempo/Tempo-fit, Fades 1 Schlag/aus, Loop auf Clip, In Spur verschieben, Löschen.
  - **Spurfläche:** Material hier einfügen, Einfügen, Cursor setzen, Abspielen ab hier, Loop-Start/-Ende, Spur darunter.
  - **Spurkopf (auch ⋯):** Mute, Solo, Mixer zurücksetzen, Spur duplizieren, Nach oben/unten, Spur darunter, Löschen.
  - **Lineal:** Cursor, Abspielen ab hier, Loop-Start/-Ende, Loop an/aus, Mixdown Song/Loop.
- **Clip-Modell v2:** Start, Länge, Versatz ins Material, Gain, Fade-in/-out (in Schlägen), Clip-Mute, Umrechnung.
- **Bearbeiten:** Teilen (S), Duplizieren (Strg+D), Kopieren/Einfügen (Strg+C/V), Clip-Mute (M), ↑/↓ verschiebt in die Nachbarspur, +/− um einen Materialzyklus, Doppelklick in eine Spur fügt das gewählte Material ein.
- **Loop-Bereich** (L), nahtlos wiederholt; im Lineal sichtbar.
- **Master:** Regler und Pegelanzeige (rAF nur während der Wiedergabe).
- **Mixdown:** WAV 16 Bit (TPDF-Dither) oder 32 Bit Float, Song oder Loop-Bereich, 48 kHz, über den WAV-Encoder des Wave Editors. Meldet Spitzenpegel und Übersteuerung.
- **Wellenformen** in den Clips; jedes Material wird einmal und kontextunabhängig dekodiert.
- **Listenansicht:** jetzt mit Länge, Versatz, Fades, Mute.
- Spurfarben, Undo/Redo bis 100 Schritte.

## Prüfungen (`node tools/probes/multitrack_probe.js`)

| Schritt | Ergebnis |
|---|---|
| Start | Chunk nicht ausgewertet, keine Fehler |
| Clips | Wellenformen vorhanden |
| Ziehen in andere Spur | Spur 1 → Spur 2, Takt 9 (32 Schläge weiter) |
| Kante trimmen | 448 → 336 px (16 → 12 Schläge) wie erwartet |
| Teilen am Cursor | 2 → 3 Clips |
| Rechtsklick | Clip 12, Spurfläche 7, Spurkopf 8, Lineal 7 Einträge; Esc schließt |
| Wiedergabe / Live-Mute | 0,24 → Mute aller Clips 0 → Unmute 0,24 |
| Loop 0–4 Schläge | Laufmarke max. 3,96, springt zurück |
| Originaltempo | 112 → 100,8 px (2 s bei 108 BPM = 3,6 Schläge), Inspektor korrekt |
| Mixdown | Download `Untitled Arrangement.wav`, gültiges RIFF/WAVE, 26,7 s, Spitze −17,1 dBFS |
| Neuladen | 3 Clips erhalten |
| Raum verlassen | 0,24 → 0 |
| `livezone_probe.js` | 13 Schritte unverändert |

## Wiederverwendung: was es gibt, was wohin gehört

| Vorhanden | Owner | In Raum IV |
|---|---|---|
| Kettenbauer Quelle → Pitch → Gain → Pan → EQ | `__xenMaterialLaneChain` (R1) | **genutzt** (eine Kette je Spur) |
| EQ-Kern | `__XenEQ` | **genutzt** (Schlüssel `arrangement:<Spur>`); Bedien-UI für diese Schlüssel folgt |
| WAV-Encoder (16 Bit Dither / Float) | `__XenWaveCoreW01.encodeWav` | **genutzt** für den Mixdown |
| Starter-Material | `__XenStarterMaterial` | **genutzt** |
| Material-Pitch hochwertig (vorgerendert) | `__XenMaterialPitchVariants` (PITCH-HQ-01) | **nächster Schritt:** Clip-Pitch über dieselben Varianten |
| W01-Operationen (cut, fade, normalize, reverse …) und 25 Offline-Effekte mit Automation | `__XenWaveCoreW01` | **nächster Schritt:** „Clip bearbeiten/rendern“ erzeugt ein neues Material (nicht-destruktiv), Clip zeigt darauf |
| W01-Oberfläche | `__XenWaveUIW01` (hängt an den Canvases der Forge) | nicht direkt; über „Send to Wave Editor“/Rückweg als neues Material |
| Taktometer, Takt-Segmente, Marker | Lab/Forge | als Raster-/Markerquelle für Clips, wenn das Material sie trägt |
| Loop-Rec-Takes | Materialbibliothek (`sessionTake`) | **bereits Quelle** (Originaltempo voreingestellt) |
| Long-Master-Aufnahmen | `xensonar-master-long-sessions-v1` | eigene Quelle (Streaming in Stücken), späterer Schritt |
| Root-Follow-Konfiguration (synthetisch/granular) | Root-Follow-Bank | eigener Spurtyp „Root Follow“, späterer Schritt |
| Referenzgraph / Package Station | `__XenReferenceGraphP26/27` | **offen:** Adapter `arrangement.clip.material` für Lösch- und Exportschutz |

## Offene Punkte

- Abhören: Übergänge beim Live-Bearbeiten, Mixdown im Vergleich zur Wiedergabe (der Mixdown nutzt Gain/Pan ohne EQ-Gerät; solange es keine EQ-Bedienung für Arrangement-Spuren gibt, ist das identisch).
- Überlappende Clips auf einer Spur werden gemischt (kein automatisches Kürzen).
- Löschschutz über den Referenzgraphen fehlt noch (gelöschtes Material → roter Clip).

## Rückweg

ROOM4-01 (`30223a12…71ea`) oder PITCH-HQ-01. Das Projektformat v2 wird von ROOM4-01 gelesen: Unbekannte Felder werden ignoriert, Längen gehen dort über `repeats` verloren.
