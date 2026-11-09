# XenSonar W31/KH04 — TextSound Agent TTS01 (isolierter Testkandidat)

**Datum:** 2026-11-09

## Provenienz
- Unveränderter Parent: `XenSonar_W31_AF01_ML01_KH04_FACTORY16_TROODLE_EQ_TEST.html` (8,523,945 Bytes)
- Parent SHA-256: `0bbe9536dbe77d89feb38382be303dcedf16b8b1d8a6b246bbb0c1dc11440ee0`
- Kandidat: `XenSonar_W31_KH04_TextSound_Agent_QA.html`
- Kandidat SHA-256: `a6a5bc6ba36ccf3b06b6e8bcec9ec91e72c942caf2ce552c3f11b2471aeab87b`
- Änderung: ausschließlich drei neue, am Ende des HTML eingefügte, isolierte Inline-Skripte. Keine bestehenden Skripte, CSS-Blöcke, Storage-Daten, Session-Owner oder Audio-Routen editiert.

## Funktion
- Separat einschaltbarer „✦ Text → Sound“-Dialog als Shadow-DOM-Widget.
- Offline-Textinterpreter mit deutschen und englischen Schlüsselbegriffen, neun Klangklassen, optionaler Dauer, Tonfrequenz, Tempo, Klangfarbe und Echo.
- Browserseitiger Web-Audio-Synthesizer für Drone, Pad, Glocke, Laser, Regen, Wind, Pluck, Kick und Beat.
- Wiedergabe / Stop; renderbarer, importierbarer Stereo-PCM-WAV-Export (48 kHz, 16 Bit); maximal 30 Sekunden pro Sound.
- Eigenständiger AudioContext. **Keine** Einbindung in XenSonars bestehende Master-Audio-Engine, Session-Registry oder Recorder. Nicht mit echter Sprachmodell-Integration verwechseln.
- Keine Netzwerkzugriffe, API-Schlüssel, Speicherung oder automatischen Datenänderungen.

## Prüfergebnisse
- TDD: sieben kontrolllogische Unit Tests PASS; zu Beginn erwarteter RED-Test, anschließend GREEN.
- Browserprüfung in Chromium (isolierte HTML-Demo, via Playwright set_content): vier Promptarten inklusive Start/Stop PASS, Browser pageerrors 0.
- WAV-Plausibilitätsprobe: PCM RIFF/WAVE, 2 Kanäle, 48 kHz, 16 Bit, 2,5 s bei 2-s-Prompt; Audio nicht stumm, Peak ~ -7,9 dBFS beim getesteten Beat (Signalprobe, **keine** Abhörqualitätsaussage).
- Offline-Render aller neun Klangklassen: gültige PCM-Daten mit hörbarer numerischer Aktivität; 9/9 PASS.
- Chromium-Visual auf Desktop 1120×850 und Mobile 360×740 erstellt, keine sichtbaren abgeschnittenen Controls im isolierten Demo.
- JS Syntaxprüfungen: drei neue Skripte PASS. Vollständiger vorhandener Parent ist Byte für Byte unverändert.

## Voreingetragene Ablehnungshypothesen und Gates
1. **„Da kommt kein Ton“:** Gegenprobe PCM-Export + tatsächliche Play-Aktion bestanden; keine physische Windows-/UAD-Volt-Abhörprüfung.
2. **„Stop funktioniert nicht“:** Spielstart/Stop/Status geprüft; Echo-Gate auf vollständiger Ausgabelinie; eine physische Kontrolle ausstehend.
3. **„Sound Agent blockiert vorhandene Buttons“:** isolierte Desktop- und Mobile-Geometrie geprüft, aber kein vollständiger Vergleich gegen lebende XenSonar-App wegen Container-Browserrestriktionen. **Offen**.
4. **„Mein freier Prompt wird wie von einer KI verstanden“:** Ablehnung berechtigt: Diese Stufe ist regelbasiert, kein LLM; die UI deklariert das ausdrücklich. Ein Backend-/LLM-gestützter semantischer Parser gehört in einen separaten Schritt.
5. **„Sound erscheint direkt in XenSonars Master-Recorder“:** Ablehnung berechtigt: Audio läuft in getrenntem Kontext. WAV kann nach Download manuell importiert werden.

## Einschränkung der integrierten Browserprüfung
Der komplette 8,5-MB-XenSonar-Kandidat startet in der eingeschränkten Browserumgebung bei `set_content` nicht regulär (Parent-`localStorage` SecurityError, Mandala-Boot-Overlay blockiert Pointer). `file://` und externe URLs werden mit `ERR_BLOCKED_BY_ADMINISTRATOR` abgewiesen. Kein Beweis eines Bugs in echter lokaler XenSonar-/Netlify-Laufzeit; aber **keine vollständige E2E-Abnahme** des integrierten Kandidaten möglich.

**Gate: PROVISIONAL / QA_PENDING.** Nicht automatisch als Production Deploy verwenden. Erst lokal oder im Netlify-Preview live prüfen, insbesondere Overlay-Geometrie, Pegel, Stop, Speicherung unverändert, Wave-Import und Master-Recorder-Isolation.
