# Aktueller Zustand und sichere Herkunft (09.11.2026)

## Was wir als aktuell belegen können

**Letzter in der Library gespeicherter Komplettstand** `XenSonar_W31_DUBECHO03_LIVEGUARD02_NETLIFY.zip` (erstellt am 09.11.2026, 04:44 UTC). ZIP: ein `index.html`, **8,555,619 Bytes**, Hash `e4fcc0852649c84e7c00c3b251d6dbbb89f11e2af88ae153d2e6723d898deb29`. ZIP selbst `c89af8f8126824283910cddb9794482b80cd8528ff6c740a99318aecb0087e74`.

Die HTML trägt die Metadaten `DUB-ECHO-03+RACK-LIVE-01+NPARAMS-GATE-01`. Gegen ihren DUB02-Vorgänger sind **nur Scriptblock 10/32** (nullbasiert) und HTML-Metadaten/Titel geändert, keine 77 CSS-Blöcke. Quell-Diff: `evidence/WHAT_CHANGED_SINCE_DUB02.md`. Das ist ein **Source-Befund**. Die im Meta-Tag behauptete Browser-Testung ist kein eigenständiger in diesem Handoff neuerlich ausgeführter End-to-End-Test.

## Belegte Vorgeschichte

- **W31 (08.11.)** konsolidierte ED1-Drumkits + Drumbeat-EQ-/Speicherpfade + Package Station, Root Follow Smooth Entry, Golden Move & Mix, Volume-vs-Gain und Long Master Recording: Rohblock-Streaming zu IndexedDB, zusammenhängender WAV/FLAC-Export mit 16-/24-Bit FLAC, SecurityError-Fallback. **QA_PENDING** einschließlich echter langer Hardwareaufnahme.
- **AF01**: Reparatur Kandidat für Firefox bei unterbrochener `AudioParam.setValueCurveAtTime`-Automation; statt laufender Kurven abbrechbare Ramps; im KH04-Hinweis als simuliert geprüft. Ein aktueller langer Firefox-Test steht nicht fest.
- **ML01**: Entry-Regressionen bei Melodic Loop/Drum-Zugängen.
- **KH04**: 16 Steps/1 Bar Donner-Arp als unbenannte initiale Keyboard-Hold-Voreinstellung, `troodle · Nodal + EQ (Factory)` mit Original-Factory-EQ im normalen Sound-Picker, gespeicherte Custom-EQs nicht überschreiben. Kein vollumfänglicher physischer Audio-Test dokumentiert.
- **DUB02**: dokumentierter Polyrhythmus-Dub-Echo-Vorgänger, vier Zeiteingabemodelle, FF/Browser/OfflineAudioContext-Proben, aber keine Langzeit-Live-Hardwareabnahme.
- **DUB03 + RACK-LIVE-01 + NPARAMS-GATE-01**: aktuelle Hauptvariante der Echo-Zeitsteuerung relativ zur Barfraktion, zum aktiven Beat-/Segmentmarker oder frei in Millisekunden, Feel, Links/Rechts-Polyrhythmik, Cross-Feed/Throw/Spin und UI-/Persistenz-Gate für Slider. Die Bezeichnungen stammen aus aktuellem **Code und HTML-Metadaten**, nicht aus rückwirkend als bestanden behaupteter User-Abnahme.

## Wichtig: Vergleich DUB02/DUB03

DUB02 beschreibt `N/D` als Anteil einer **ganzen Note** und sein Limit als **19,5 s**. DUB03 verwendet andere Datenfelder, n/d vom **Bar**, Marker-Bezüge und `__xenDrumEchoMaxSec=3.9` im aktuellen JS. **Der Formwechsel ist nicht lediglich eine kosmetische UI-Veränderung.** Bei Bugs zuerst Schema/Timing/Audiozustand und tatsächliches Verhalten prüfen; nicht 1:1 DUB02-Dokumentation auf DUB03 übertragen.

## Nicht in die Mainline hineinphantasieren

`TextSound Agent TTS01` existiert als **separater** Experimentalkandidat (regelbasierte Text→Klang-Erzeugung, nicht Claude-/LLM-gesteuert, eigener AudioContext, keine native Main-Mix-/Recorderintegration). Seine Original-QA-Notiz ist unter `evidence/XenSonar_TextSound_Agent_QA_Notes.md` erhalten. **Nicht** behaupten, dass diese Funktion im aktuellen DUB03-Stand integriert sei. Ein eigener späterer Integrationsvertrag wäre nötig.

## Deployment-Realität

Netlify-Projektname aus bisheriger Arbeit: `xensonar.netlify.app`; zuletzt wurde zwischen funktionierenden Preview-Deploys und älter wirkender Produktion unterschieden. Das Handoff bestätigt **keine** aktuelle Produktionsveröffentlichung. Zur Aktualisierung manuell ZIP der bestehenden Site als neuen Deploy bereitstellen, den Ziel-Deploy ausdrücklich auf Production veröffentlichen und auf der Produktions-URL prüfen; Preview ≠ Production.

## Statussprache

- `CODE_PRESENT`: in der vorliegenden Quellfassung nachweisbar.
- `STATIC_TESTED`: Syntax/Hash/Diff/ZIP-Integrität nachgewiesen.
- `BEHAVIOR_TESTED`: isolierte Logik-/DOM-/Audio-Simulationen, wenn im jeweiligen Bericht belegt.
- `BROWSER_QA_PENDING`: keine aktuelle vollständige Anwendung/Browser-Abnahme.
- `HARDWARE_QA_PENDING`: keine echte lange Performance mit Audiointerface/Controller/Dateisystem.
- `PRODUCTION_UNVERIFIED`: tatsächlicher Netlify-Production-Stand nicht von hier geprüft.

Jede weitere Version muss diese Ebenen getrennt dokumentieren.
