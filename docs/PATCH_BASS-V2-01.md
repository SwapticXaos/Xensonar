# BASS-V2-01 · Moderne Bass-Stimmen (Stufe Klang des Bass-Workshop-Umbaus)

**Zone:** HEISS (Bass-Note und residenter Bass-Worklet). Die klassischen Stimmen bleiben auf ihrem bisherigen Weg.
**Dateien / Owner:**
- `src/sessions/v2-session-store.js`: Stimmenkatalog `__f48BassVoices`, Rezept-Schema `__xenBassVoiceRecipeClean` (Owner der Bass-Rezepte in Sessions, Mustern und der Stimmen-Bibliothek).
- `src/rhythm/04_workspace_and_transport.js`: Notenbeschreibung `__xenBassV2Plan`, nativer Fallback `__xenBassV2Native`, Weiche in `OPe` (`playBassNote`).
- `src/post-oct/gaps/010-main-bundle__16_live_voice_host.js`: zweite Filterstufe im Worklet `xen-bass-voices`.
- `src/rhythm/02_bass_and_rack.js`: Editor-Gruppe „Modern shaping“.
**Größe:** `index.html` +7 387 Bytes (8 294 256 → 8 301 643).

## Neu
- **Fünf Werksstimmen:** Acid Line · 24 dB, Sub 808 (Tonhöhenabfall), Reese · detuned (3-fach Unison), Deep Pluck, Square Punch.
- **Optionale Rezeptfelder:**
  - Filtersteilheit 12/24 dB
  - Attack
  - Tiefe und Abklingen der Filterhüllkurve
  - Zusatzresonanz
  - Tonhöhenabfall (Startverhältnis, Zeit)
  - Unison (1–3 Stimmen, Spreizung)
  - Drive
  - Glide-Zeit
  - Alle Felder sind begrenzt. Ein Rezept ohne diese Felder bleibt exakt das alte, es kommen keine Schlüssel hinzu.
- **Stimmen-Editor:** Gruppe „Modern shaping“ mit allen neuen Feldern. Jeder Regler steht auf dem Wert, der dem bisherigen Verhalten entspricht.
- **Ein Weg für Live und Export:** Eine moderne Note wird einmal als Plan beschrieben (Zeitleisten wie AudioParam-Aufrufe). Das Worklet spielt ihn, der native Fallback (Offline-Renderings, Start) setzt denselben Plan in WebAudio-Knoten um. 24 dB sind im Worklet eine zweite Biquad-Stufe mit gleichen Koeffizienten, nativ zwei Biquads.

## Messung
- **Alte Stimmen bit-genau:** `tests/e2e/voice_host_pcm.cjs` (66 Noten über alle 11 Stimmen, Worklet gegen nativ): SNR 100,6 dB, maximale Abweichung −77,8 dBFS, wie vorher.
- **Obermenge:** Jede alte Stimme über die neue Notenbeschreibung (Rezept mit einem neuen Feld auf seinem Standardwert) gegen den klassischen Weg: ≥ 112 dB in allen 18 Fällen (6 Stimmen × 3 Grit-Stufen).
- **Lautheit** einer Standardphrase gegenüber Classic Forge:
  | Stimme | Pegel | Spitze |
  |---|---|---|
  | Acid Line | −2,8 dB | 0,90 |
  | Sub 808 | +0,3 dB | 0,88 |
  | Reese | −1,3 dB | 0,96 |
  | Deep Pluck | −0,6 dB | 0,85 |
  | Square Punch | −0,4 dB | 0,98 |

  Die alten Stimmen liegen bei −3,3 bis +0,5 dB.
- **Wirkung:**
  - 24 dB gegen 12 dB bei gleicher Grenzfrequenz: Energie 1–4 kHz 9,98·10⁻⁷ gegen 2,57·10⁻¹⁰ (−36 dB).
  - Sub 808: 111 Hz am Anfang, dann 55 Hz.
  - Attack 30 ms: Anschlagsspitze 0,093 statt 0,763.
- Nicht gehört.

## Tests
Neu: `tests/e2e/bass_v2_voices.cjs`. Er prüft Obermenge, Lautheit, Wirkung, Rezeptsicherheit und den Editor (Auswahl, 24-dB-Anzeige, eine Änderung wird Arbeitskopie und behält die neuen Felder). Grün: `voice_host_pcm`, Build-Check, `run_tests.sh` 133/133, `run_e2e.sh` (siehe Status).

## Retrokompatibilität
Gespeicherte Rezepte, Sessions, Muster und `.xenpack` enthalten nur alte Felder und bleiben unverändert. Neue Felder werden nur gespeichert, wo eine neue Stimme gewählt oder bearbeitet wurde. Ältere Builds verwerfen sie beim Bereinigen und spielen die Stimme dann klassisch.

Rollback: `b234f55`.
