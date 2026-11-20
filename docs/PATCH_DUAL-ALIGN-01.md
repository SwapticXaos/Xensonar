# DUAL-ALIGN-01 · Dual Donor Assembly, Variante 3 („aligned“)

Zone: **KALT** (Forge → Donor Workshop → Dual Donor · Assembly; Offline-Worker). Kein Live-Audiopfad berührt.
Parent: `d406387` (DEAD-MYZEL-01), `index.html` sha256 `3523e8d9…`, 8 333 504 B.

## 1 · Analyse: was die Dual-Donor-Assembly bisher tut

Bedienung: zwei Spender A/B laden, im Spektrogramm Zeit-Frequenz-Rechtecke markieren, jedem Rechteck eine **Rolle** geben
(Sound character / Resonances / Texture / Motion), Rechtecke von A und B **verbinden** (Cross / Imprint / Interlock), Rest-Material
wählen (nur Verbundenes / Rest von A / Rest von B), rendern. Ergebnis: ein neuer Spender (WAV, Library, „Use in Forge“).

Renderer (Variante 1 `f3.56.36`, Variante 2 `f3.56.41`, `src/forge/original/05_dual_donor.js`, `src/forge/dual/01_dsp_and_worker.js`):
STFT 2048/256 bei 48 kHz; pro Ausgaberahmen und Verbindung je ein Rahmen aus A und B an **gleicher relativer Position**
(Ausgabezeit 0…1 ↦ Regionszeit 0…1), log-relative Abbildung der Frequenzbänder, Kombination der Beträge je Bin, Phasen-Vocoder
mit Peak-Locking, Spitzen-Normierung auf 0,88.

## 2 · Würdigung der Grundidee

Die Idee ist stark und eigenständig:
- **Ein Klangkörper statt zwei Spuren** („All audible bins derive from marked PCM … no A+B player“, „spectral joins cannot spawn two voices“).
- **Rollen statt Regler**: Resonanz / Textur / Bewegung ist genau die Quelle-Filter-Zerlegung, mit der professionelles Morphing
  arbeitet (Hüllkurve = Filter, Feinstruktur = Anregung inkl. Tonhöhe, Bewegung = Zeitgestalt). Das UI lässt sie auf frei
  markierte Zeit-Frequenz-Regionen anwenden – feiner als jedes Morph-Plugin.
- **Drei Beziehungsarten** mit klarer Musik: Mitte finden (Cross), eine Eigenschaft aufprägen (Imprint), gegenseitig verzahnen (Interlock).
- Saubere Datenhaltung: revisionsgebundene Rezepte, PCM-Sitzungen, Varianten-Router, Worker, Abbruch.

## 3 · Harte Kritik: warum die Ausführung primitiv war

Gemessen mit synthetischen Spendern bekannter Antwort (`tests/helpers/dual_donor_rig.cjs`, Variante 2 vs. 3):

| Problem | Ursache im Code | Messung Variante 2 | Variante 3 |
|---|---|---|---|
| Zwei Tonhöhen ergeben Brei statt einer Stimme | keine Tonhöhenerkennung; Cross mittelt Beträge zweier unterschiedlich liegender Obertonreihen | Energie auf gemeinsamer Reihe (220/311 Hz → 261,6 Hz): **3 %** | **100 %**, B-Reihe < 6 % |
| „Resonanz“ überträgt bei hohen Stimmen den Obertonkamm statt der Formanten | „Hüllkurve“ = gleitendes Mittel über ±10 Bins (±234 Hz, linear) | Formant-Korrelation 660-Hz-A → 110-Hz-B: **0,37**, 22 % Energie auf A-Reihe | **0,69**, B-Tonhöhe 100 %, A-Reihe 8 % |
| Einsätze verschmieren / verschwinden | Zeit nur linear gestreckt („relative progress“) | A-Einsatz 0,2 s, B-Einsatz 1,2 s → nur ein Einsatz bei 1,18 s (A verschluckt, weil Cross multiplikativ mit B-Stille) | **ein** Einsatz bei 0,70 s (DTW über Pegel/Einsatz/Helligkeit) |
| Bewegung wird nicht übertragen | „Motion“ = Pegelverhältnis + Mittelung momentaner Frequenzabweichungen | Vibrato A (36 Cent) auf B: **1,8 Cent** | **36 Cent**, B-Tonhöhe bleibt 220 Hz |
| Interlock = Zufallsverzerrung | Lese-Verschiebung proportional zur Hüllkurvensteigung des anderen (×0,035) | gemeinsame Reihe 24 %, Formanten unter dem Tal | Reihe 100 %, beide Formanten > Tal + 10 dB |
| Phasen-Unsinn | Phase = Kreismittel der Phasen **zweier fremder Signale** | – | Phase des dominanten Beitrags, peak-gekoppelt, Reset an ausgerichteten Einsätzen |
| Rest-Material zeitlich entkoppelt | Rest läuft über die ganze Datei, die Verbindung nur über ihre Region | – | Rest liest **denselben Moment** (Zeitachse der ersten Verbindung) |
| Kerbe an Bandkanten des Rests | Rest nur wo `!covered`, Verbindung blendet aus | −2,5 dB bei 2 kHz | ±0,6 dB |
| Morph nur als Mittelpunkt | Cross fest bei 50/50 | – | Morph-Weg Start/Ende (A→B über die Dauer) |

Weitere Schwächen: Momentanfrequenz aus Rahmen mit variablem Abstand; Resampling 44,1→48 kHz linear; für jede Verbindung und
jeden Ausgaberahmen zwei frische FFTs samt Sinc-Resampling (auch wenn Verbindungen dieselbe Region nutzen).

## 4 · Was Variante 3 macht (`src/rooms/00_dual_aligned_dsp.js`)

1. **Analyse einmal pro Region**, in der Abtastrate des Spenders (keine Umrechnung): Hann-STFT, echte Momentanfrequenz
   (Zwillingsrahmen mit Abstand n/8), Phase auf Fenstermitte bezogen (FFT-Größen-unabhängig), **True Envelope**
   (iterierte Cepstrum-Glättung, Liftergrad an f0 gekoppelt), f0 + Stimmhaftigkeit (normierte Autokorrelation, Oktav-Schutz,
   Median-Glättung, Entscheidung über hörbare Rahmen), Bandpegel, Einsätze (Fluss über 60-dB-Boden, auf aktive Bins normiert,
   nicht im abgeschnittenen Regionsende).
2. **Zeitausrichtung** je Verbindung per DTW (gemeinsam skalierte Merkmale, Steigungsstrafe, ±60 % Band, geglättet, monoton);
   Taktgeber nach Rolle: Cross nach Bewegungsanteil, Imprint nach Ziel (bei „Motion“ nach Quelle), Interlock Mitte.
   Option „Linear progress“ erhält das bisherige Verhalten.
3. **Quelle-Filter-Morph**: Feinstruktur (inkl. Tonhöhe) wird auf **eine** gemeinsame f0 umgelesen, die Hüllkurve bleibt an
   ihrem Ort (Formanterhalt). Rollen bestimmen je Eigenschaft den B-Anteil; „Sound character“ = neutral → Morph-Weg entscheidet.
   Stärke 0 = ausgerichtete Schichtung, 100 % = voller Morph.
   - Imprint: Resonanz → Ziel bekommt Formanten der Quelle; Textur → Feinstruktur der Quelle auf Ziel-Tonhöhe; Motion → Pegelkontur,
     Timing und Tonhöhenbewegung (Vibrato) der Quelle; Sound character → Klangfarbe der Quelle auf Tonhöhe/Dynamik des Ziels.
   - Interlock: jede Struktur durch die Resonanz der anderen gebogen, dann besitzt je Frequenzbereich der lokal stärkere Spender
     den Klang (Salienz über ±6 % Frequenz geglättet, zeitlich geglättet, Schärfe = Stärke).
4. **Pegel**: je Verbindung Bandpegel-Kontur aus Bewegungsanteil, Mittelwert nach Balance.
5. **Ein Phasenfeld**: Bin-Phase aus dem dominanten Beitrag, Spitzen laufen mit dessen Momentanfrequenz, Nachbarn an die Spitze
   gekoppelt, Reset an ausgerichteten Einsätzen.

UI: Variante „3 · aligned (attacks, pitch, resonances)“ (Standard für **neue** Entwürfe), Regler Morph start/end, Auswahl
Time alignment, Analysezeile nach dem Bauen („Connection 1: A 220 Hz · B 330 Hz · attacks A/B 1/1, 1 aligned“).

## 5 · Daten-Owner, Retrokompatibilität

- Entwurf: `__F35634DualWorkbench` / localStorage-Blueprint (unverändert, Feld `revision` darf jetzt `aligned` sein).
- Gespeicherte Entwürfe mit `revision: 'revised'|'original'` bleiben bei ihrer Variante; **Variante 1 und 2 sind bytegleich**
  (Fabrik-Text-Hash im Test). Fehlende Revision bleibt Variante 2. Sitzungen (`.xds`) aus älteren Ständen laden unverändert.
- Ein älterer XenSonar-Stand, der einen `aligned`-Entwurf liest, fällt über `__f35634Clean` auf Variante 2 zurück.
- Router: Varianten werden erst bei Gebrauch erzeugt (vorher beide beim Start).

## 6 · Prüfungen

- `tests/dual_donor_aligned.test.cjs` (10 Tests, ~20 s): Identität (A×A = A, ±0,5 dB je Teilton), eine Reihe, Morph-Weg,
  Formant-Imprint, Vibrato-Imprint, Einsatz-Ausrichtung (+Linear-Option), Interlock, Rest-Kanten, 44,1/96 kHz, Ton×Rauschen,
  Determinismus, Abbruch, Router + Bytegleichheit Variante 2.
- `tests/e2e/dual_donor_aligned.cjs`: echter Ablauf im Layout (Forge → Donor Workshop → Dual; B-Datei laden; Auto-Cross;
  Analysezeile; Morph-Ende invalidiert das alte Hybrid; Neu bauen; Variante 2 blendet die Variante-3-Regler aus; keine Seitenfehler).
- Rechenzeit (Node, ein Kern): 2-s-Körper aus 2-s-Spendern ~1,0 s; 8-s-Körper aus 30-s-Spendern ~3,5 s (Worker).

**Nicht gehört.** Klang ist nur gemessen (Tonhöhenreihen, Formant-Korrelation, Einsatzzahl, Kantenpegel), nicht abgehört.

## 7 · Single-Donor-Wege: untersucht, bewusst nicht geändert

Gelesen: Klanggestalt (`src/forge/revised/02_gestalt.js`) mit den Modi Articulation, Resonant Imprint, Timbre Motion,
Material States, Film, Hauch & Reibung, Stillbild, Wandernd, Signatur. Die Variante-2-Fassungen arbeiten bereits mit
peak-verfolgendem Phasen-Vocoder, Tonhöhenreferenz und Resonanzkorrektur auf Original-PCM – deutlich reifer als Dual 1/2.

Verdächtigster Kandidat war **„Hauch & Reibung · 2“** (`air`): Rauschanteil = „Bin liegt unter der Hüllkurve“ (Kehrwert des
Abstands), d. h. auch die Fensterflanken sauberer Teiltöne gelten als „Luft“, und die Rezeptgewichte Noise 1,8 / Tonal 0,55
(die Variante 1 nutzt) werden ignoriert. Versuch: Rauschanteil über Kohärenz der Momentanfrequenz mit dem eigenen Teilton,
Rezeptgewichte wieder wirksam.

Prüfung mit **echter Worker-Eingabe** (im Prüf-Build `Worker.postMessage` mitgeschnitten: Trägerplan, Spendermodell, Rezept;
dann in Node mit Eltern- und neuer Fassung gerendert):

| Spender | Anteil außerhalb der Obertonreihe 1–3 kHz, alt → neu | Pegel |
|---|---|---|
| sauberer Ton 196 Hz | 0,4 % → 0,3 % | +1,7 dB |
| derselbe mit Hauch (−14 dB) | 22,2 % → 24,4 % | +1,7 dB |

Der vermutete Fehler zeigt sich im Ergebnis nicht (Flanken werden im Peak-Locking ohnehin in die Hauptkeule zurückgelegt),
der Gewinn ist marginal. Nach Projektregel (bewährte Audiopfade nur bei reproduziertem Problem) **zurückgenommen**; keine
Änderung an Single-Donor-Code. Methode für spätere Arbeit: Worker-Eingabe im Prüf-Build mitschneiden
(`addInitScript` um `Worker.postMessage`, Render via `__xenProbe.draw.evalInBundle('xt.renderDonorBodyToBuffer(...)')`
nach „🧪 Transform to Carrier“), Klanggestalt-Worker-Skript in Node aus denselben sechs Fabriken nachbauen.
