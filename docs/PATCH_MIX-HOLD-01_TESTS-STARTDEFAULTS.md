# MIX-HOLD-01 · Testkorrekturen nach den Startdefaults · Prüfrunde Kopplungen

Parent: `c766f9a` (index.html 8 267 734 Bytes). Rollback: `c766f9a`.
Neu: index.html 8 267 823 Bytes (+89), sha256 `10b406378f6528017027e6bfd80c4c220e80ee666301d7d9c81fc482330a0ce2`.
Status: CODE_PRESENT, UNIT_VERIFIED (128/128), BROWSER_CHECKED (`run_e2e.sh` erstmals vollständig grün: 68 + 5 Alt-Tests, Exit 0; Chromium headless). Nicht gehört, nicht auf dem Gerät des Nutzers geprüft.

## 1. MIX-HOLD-01 (Zone HEISS: Regler → AudioParam) – Rücknahme von LIVE-SLIDER-SOFT (`6163066`)
`__xenSmoothMixParam` (`src/mix/01_pan.js`; Lautstärke/Pan der Spuren, Drum-Rack, Material-Pegel) hält wieder per `cancelAndHoldAtTime`
(Firefox ohne diese Funktion: wertbasierter Rückfall wie vor dem 16.11.).
- Gefunden durch den Alt-Test `mix_audio_browser` (keine Sprünge bei schnellen Lautstärke-/Panfahrten): grün bis `3405fad`, rot ab `6163066`
  (Bisektion über die gebauten `index.html`). Fiel nicht auf, weil `run_e2e.sh` die Alt-Tests über `| tail -1` ohne Exitcode lief (jetzt `pipefail`).
- Messung (deterministisch: OfflineAudioContext mit suspend/resume alle 16 ms = 60 Reglerereignisse/s, Sinus durch das Drum-Rack,
  simulierte Verzögerung von currentTime gegenüber dem Audio-Thread 0/5/10/20 ms; größter Abtastschritt, Referenz ohne Bewegung 0,0020):

  | Variante | vorausgeplant (Alt-Test) | live, 0–20 ms Verzögerung |
  |---|---|---|
  | wertbasiert (LIVE-SLIDER-SOFT) | **0,0369 (Sprung)** | 0,0043 |
  | `cancelAndHoldAtTime` (jetzt wieder) | 0,0043 | 0,0043 |
  | modellbasiert (erwogen, verworfen) | 0,0043 | 0,0043 |

  0,0043 = natürlicher Schritt des lauteren Sinus, also kein Sprung. Der „Rücklauf“, den LIVE-SLIDER-SOFT beheben wollte, trat auch mit
  simulierter Verzögerung nicht auf (dort selbst als „nicht reproduziert“ vermerkt). Die modellbasierte Variante wäre browserunabhängig, aber
  `__f49MaterialLevel` schreibt denselben Gain-Parameter direkt (Materialstart); ein mitgerechnetes Modell könnte veralten. Daher die erprobte Variante.
- Echtzeitmessung im Headless-Chromium war unbrauchbar (Aussetzer auch ohne Reglerbewegung, bis 0,12).
- Offen: Firefox nicht verfügbar; dort war und bleibt der wertbasierte Weg aktiv. Nicht gehört.

## 2. Rote Browser-Tests: veraltete Annahmen, keine Programmfehler (außer 1.)
Ursache meist die Startdefaults `182e933` (Wave Starter Psy Lab „Barber Spiral“, Keyboard Nodal „troodle“, 31 EDO Harmonic Minor) bzw. VARIANTE-EN.
- `room5_psylab`, `room5_live_psylab`: Psy-Lab-Chunk lädt beim Start, weil der Startklang Psy Lab ist (gewollt, ROOM5-10: gewählter Klang wird
  bei laufendem Audio vorgeladen; die Prüfung `isId` vor dem Laden ist vorhanden). Der Kalt-Vertrag wird jetzt für einen Nutzer mit anderem Klang
  geprüft (Entrophon im Menü wählen, 12 EDO alle Stufen, Reload) – dort bleibt der Chunk kalt; zusätzlich: frischer Browser lädt ihn (Startklang).
- `stems_instruments`, `thunder_one_clock`, `thunder_lane_split_ui`: setzen die früheren Entrophon-Klänge (Thunder E ist bei Psy-Lab-Klang
  bewusst aus und gesperrt, „no Hold mechanism yet“).
- `stems_record`: Nodal troodle hat Effekt-Sends → Space-Stem hörbar (gegengeprüft: mit Entrophon wieder 2 Stems). Test zählt jetzt die gesendeten Stems.
- `variante_room`: Text „Start ignition“ statt „Zündung starten“ (VARIANTE-EN, `1cddccd`).
- `grid_drag_selection`, `live_grid_handles` (schon in `58a1aba`): 12 EDO.

## 3. Prüfrunde Kopplungen (keine Codeänderung nötig)
- Tasten-Listener: nach Besuch aller Räume und geparkter Forge ist im Live-Raum nur noch der (seit KEY-OWNER-01 gesperrte) Wave-Editor-Listener
  zusätzlich registriert. Canonical-Forge-Hotkeys hängen an einem Fokusbereich, der durch die Fokusfreigabe beim Raumwechsel endet.
- CPU-Anomalie aus KEY-OWNER-01 erklärt: Verlassen des Live-Raums schaltet Power aus (dokumentiert, `AUDIT_2026-11-13.md`). Korrekt gemessen
  (Power nach Rückkehr wieder an): geparkte Forge = gleiche Hauptthread-Last (228–248 ms/s), gleiche rAF-Quellen und Timer wie ohne Forge.
- Nodal-Hold (neuer Keyboard-Startklang): die Uhr läuft im Nodal-Worklet (Exact: 8–9 Notennachrichten statt 18–19 bei Loose, auch bei
  150-ms-Rucklern unverändert); der Zähler „main 22“ erfasst bei Nodal nur die visuellen Pulse.
