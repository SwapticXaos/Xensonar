# Xensonar — Anti-Burst Constitution v2

20.09.2026 · Normativer Erweiterungsvertrag für W/N/H · **Kein Produktpatch**

323 bleibt eingefrorener Produktstand. 320 bleibt eingefrorene Performance-Oracle. Diese Constitution ergänzt die bisherigen musikalischen Invarianten. Sie erklärt weder die aktuellen Implementierungsnamen noch die konkreten alten Timer zu dauerhaft notwendigen Architekturelementen.

## Beweisregel

S = Source-/Routingprüfung; M = Modul-/Architekturmodell; D = Sampleberechnung ohne physisches Gerät; B = realer Browser; T = gezielter Stall; A = Audiovergleich; L = physische Ausgabe und Live-Spiel. Ein grüner Marker, ein ACK und ein nichtnulliger Sampleblock dürfen nicht als jeweils stärkere Beweisstufe ausgegeben werden. „Keine Regression“ benennt Buildprofil, Backend, Gerät, Szenario und Prüfgrenze.

## Die Regeln

| ID | Verbindlicher Vertrag | Akzeptanz / Revert |
|---|---|---|
| AB01 | **Aktueller musikalischer Intent hat Vorrang vor historischem Catch-up.** Bekannte Programme laufen autonom; verpasste externe Anschläge werden nicht pauschal nachgespielt. | T: 100/250/500-ms-Kontrollstall erzeugt weder proportionalen Replay noch wachsende Callbackarbeit nach Rückkehr. Hörbare neue Akzente aus alter History sind Revert. |
| AB02 | **Ereigniszeit, gewünschter Termin, Rendertermin und Ausgabezeit sind getrennt.** Die ursprüngliche Zeit überlebt jede Grenze. | M/T: altes Event wird nicht durch `now`, Offset-Clamp oder neue IPC-Ankunft frisch. Clockunsicherheit darf keine neue Stale-Toleranz schaffen. |
| AB03 | **Die früheste günstige Zulassung liegt vor teurem Körperbau.** Enginegrenzen ergänzen diese Zulassung. | S/B: abgewiesener Attack erzeugt keine schwere VoiceSpec-/Graph-/Assetarbeit. Der 90.61-Gate bleibt für seinen unveränderten Pfad wirksam. |
| AB04 | **Kontinuierlicher Zustand ist kein Eventstrom.** Full Snapshot oder korrekt versionierte Komponenten; nie naive Ersetzung verschiedener Partial Patches. | M: Revision 21 kann nicht von 20 verdrängt werden; Root-Update und Pressure-Update bleiben beide erhalten. |
| AB05 | **Kleine bewusste Akkorde bleiben Akkorde.** Dichte Glissbewegung darf Current-Target sein; drei bewusste Noten dürfen nicht zusammenkoaleszieren. | B/T/A: Chord3 vollständig und zeitlich zusammen; Gliss20 bewahrt 323-Klassifikation. Keine künstlich gerollten Akkorde durch ein zu kleines Startbudget. |
| AB06 | **Eine Programmuhr pro musikalisch gekoppelter Domain.** Hold, Rhythmus und RFL-Programme werden nur ausdrücklich übertragen. | S/T: keine Doppeluhren; keine per-Tick-/per-Grain-Zustellung für als autonom bezeichnete Programme. RFL Synth/Material teilen den Session-/Phasenvertrag. |
| AB07 | **Clock-Mapping ist identifiziert, endlich genau und verwerfbar.** Browser-, Host-, Stream- und Frameepoch sind explizit. | M/T/L: Drift, Suspend, Devicewechsel und Reconnect werden erkannt. Ungültiger DAC-Bezug wird nicht als samplegenaue Ausgabe ausgegeben. |
| AB08 | **Die gesamte Arbeit ist begrenzt.** Grenzen gelten für Bytes, Commands, Scans, Programme, Stimmen, Releases, Tails, Maps, ACKs und Retirement. | S/M/B: Invalid-/Stale-Verarbeitung zählt mit; Outbox/Socket wachsen nicht unbegrenzt. Queuekapazität allein ist kein PASS. |
| AB09 | **Note-Off/Cancel sind lebenszyklusbezogen und idempotent.** Release beendet einen aktiven oder noch wartenden Notentoken. Recycelte DSP-Slots sind keine Notenidentität. | M/T/A: Release vor Start verhindert späten Start; doppeltes Release bleibt harmlos; altes Update belebt geschlossenen Token nicht. |
| AB10 | **Panic ist eine terminale Fence, kein Diagnoseereignis.** Alte Attack-Epoch schließen, Pending verwerfen, Programme stoppen, aktive Stimmen definiert ausblenden. | M/D/T/A: nach angewandter Fence keine neuen Starts aus alter Epoch; innerhalb des vereinbarten Fadefensters stumm; neues Arm ist ausdrücklich. |
| AB11 | **Disconnect/Übertragungsstau haben einen Engine-eigenen Abschlussvertrag.** Release hat reservierten Zugang; unerreichbare Empfänger werden zusätzlich durch Lease begrenzt. | T/L: kein unbegrenzt hängender Hold. „Panic sofort über unterbrochenen Transport“ wird nicht versprochen. UI-Stall und bestätigter Disconnect sind verschiedene Ereignisse. |
| AB12 | **Genau ein hörbarer Besitzer je Lane und Epoch.** Ein begrenzter, zentral gesteuerter Übergang darf zwei Renderquellen mischen. | B/A/L: kein dauerhaftes Legacy-plus-Pilot; fehlendes UI-ACK löst keine Doppelung aus. Getrennte Ausgänge brauchen Stop-/Stumm-/Leasebeweis vor Wechsel. |
| AB13 | **Readiness hat mehrere Beweise.** Capability, Modul, ACK, aktuelle Frames, richtige Signalgestalt, Busroute und Lautsprecher sind getrennt. | B/D/A/L: Health benennt Session/Revision/Frame und Alter; historische Zähler oder frisch empfangene alte Reports gelten nicht als frischer Outputproof. |
| AB14 | **Klangkörper und Artikulation dürfen nicht heimlich vereinfacht werden.** Preset, Partials, Filter, Pan, Material, Loops, Microtuning, Zufall und Ausklänge gehören zum Vertrag. | D/A/L: Ein Sinus ersetzt keinen Carrier, ein Ausschnitt keinen vollen Loop; unverstandene Fälle bleiben beim bisherigen Besitzer. |
| AB15 | **On-time und held-long bleiben musikalisch erhalten.** Verbesserte Stale-Erkennung darf akzeptierte On-time-Hüllkurven oder vorhandene musikalische Latenztoleranz nicht beiläufig ändern. | M/A/L: getrennte Normal-/Hold-Fälle, Peaks, Release, Dauer und Priorität. ARP-P1 bleibt eigener Zweidateien-Vertrag. |
| AB16 | **Echtzeit-DSP wartet nicht.** Kein Callback-I/O, Mutex, unbeschränktes Scannen, dynamisches Programmkompilieren oder Assetdecodieren. Speicher wird vorab reserviert. | S/D/B/L: tatsächlicher Callbackaufwand unter Budget; Host-/VM-Allokationen ehrlich messen. Rust/WASM allein ist kein Beweis. |
| AB17 | **Assets sind vollständig identifiziert und lebenszyklussicher.** Inhaltshash, Format, Frames, Kanäle, Rate, Generation und Ready-Zustand sind eindeutig. | M/D/A: keine Detached-/Unloaded-Bufferleser, keine veraltete Assetzuordnung; Retirement erst nach letztem Leser/Tail; fehlendes Asset erzeugt keinen falschen Ersatzklang. |
| AB18 | **Audio-Blockgrenzen sind keine musikalischen Zeitgrenzen.** Events erhalten ihren Sampleoffset; Phasen und Reader integrieren Änderungen stetig. | D/A: variable Blockgrößen, nicht ganzzahlige Stepdauern, Tempowechsel und Retune ohne kumulativen Rasterfehler oder Phasensprung. |
| AB19 | **Überlast erhält musikalische Prioritäten.** Tatsächliche DSP-Klassen, laufende Körper, Releases und kleine Akkorde zählen; Dekoration kann eine eigene Policy haben. | B/T/A/L: keine universelle nominale Voicezahl als Leistungsbeweis. Jede Degradation ist benannt und messbar; keine unbemerkte Ausdünnung als Performancegewinn. |
| AB20 | **Diagnose bleibt kalt und begrenzt.** Kein pro-Quantum-Großobjekt, keine pro-Attack-Reactinvalidierung. | B/T: Message-/Byteobergrenzen und Feature-OFF-Nachweis; temporäre Instrumentierungskosten separat. |
| AB21 | **Master und Aufnahme sind Teil der musikalischen Wahrheit.** Hörbare migrierte Spuren erscheinen im vorgesehenen Take und werden korrekt nach Drums/ohne Drums geroutet. | B/A/L: kein `destination`-Bypass als Produktintegration; Native-Recording/Preview/Outputstrategie vor Aufnahmefreigabe. |
| AB22 | **Warmer Zustand und ständig aktive Steuerarbeit werden getrennt bewertet.** Persistente Stimmen dürfen Kontinuität sichern; zusätzliche RAF-/Timerlast braucht einen Zweck. | B/T/L: Idle/OFF nahe Null; Warmhalten nicht nach Sauberkeitsheuristik entfernen. |
| AB23 | **Recovery beginnt mit neuer Identität und stummem Ausgang.** Alte Async-Ergebnisse, Events, ACKs und Programme erhalten keine neue Gültigkeit durch Reconnect. | M/T/L: Restart-/Suspend-/Devicewechseltests; kein automatischer Replay; gezieltes Arm nach neuem Renderproof. |
| AB24 | **Messung und Referenz bleiben ehrlich.** 323 Sourcefreeze, 320-Oracle, Core/Full, Backend-/Geräteprofile getrennt. | B/A/L: keine Schwellenanpassung im zu prüfenden Patch, keine CPU-Entlastung durch größere versteckte Latenz oder weggelassene Musik. |

## Übernahme der bisherigen Constitution

| v1 | v2 |
|---|---|
| C01 Current Intent | AB01/02/04/08 |
| C02 früher 90.61-Gate | AB03 |
| C03 Input != Audioevent | AB04/05 |
| C04 kleine Akkorde | AB05 |
| C05 Root Follow liest Target | AB04/06 |
| C06 Hold-Takt/Idle | AB06/11/22 |
| C07 zentrale RFL-Uhr | AB06/12/23 |
| C08/C09 Material-/Synth-Resync | AB01/02/03/08 |
| C10/C11 bewährte Defaultbesitzer | AB12/14/24; unveränderte 323-Defaults bleiben |
| C12 kalte Diagnose | AB20 |
| C13 warme Kontinuität | AB22 |
| C14 Core/Full | AB24 |
| C15 unveränderte Golden Oracle | AB24 |

Die historische v1-Beschreibung des expliziten 50-ms-Synth-Resync-Guards ist keine ausreichende Ausführungsbeschreibung: Der aktuelle Coordinator begrenzt `nextSliceStart` schon davor nach vorne. Maßgeblich bleibt die beobachtete Resynchronisation ohne historischen Konstruktionssturm, nicht ein bestimmter Zähler. Die feinen Host-Timing-Ratios bleiben verrauscht; das erlaubt keine heimliche Lockerung des Locks.

## Unmittelbare Revert-Kriterien

Ein Kandidat bleibt experimentell oder wird zurückgenommen, sobald eines der folgenden Ereignisse auftritt:

- Release/Panic erzeugt hängende, wiederbelebte oder erst nach Abschluss startende alte Noten.
- Unter UI-Stall laufen Programmuhr oder gehaltene Stimmen aus, obwohl die Engine selbst weiterläuft und der vereinbarte Leasebereich nicht überschritten ist.
- Legacy und Kandidat werden dauerhaft gleichzeitig hörbar oder native Spuren fehlen unbemerkt in der Aufnahme.
- Chord3, normale On-time-Artikulation oder held-long verschlechtern sich; ein vereinfachter Klang wird als Parität ausgegeben.
- Ressourcen oder Empfangsrückstände wachsen mit Laufzeit/Stalldauer; Slot-Recycling hinterlässt unbeschränkte Maps.
- Eine neue Clock-/Deviceepoch nimmt alte Daten an, benutzt ein ungültiges Mapping oder holt die Vergangenheit nach.
- Die Leistung erscheint nur besser, weil Stimmen, Effekte oder zeitliche Genauigkeit fehlen beziehungsweise größere Puffer eingesetzt werden.
- Bestehende 320-Gates scheitern in einem qualifizierten Wiederholungs-/Kalibrierverfahren. Ein instabiler Messhost liefert „nicht entscheidbar“, keinen erzwungenen PASS.

## Freigabestapel

1. Quelle/Provenienz und Feature-OFF-Scope geprüft.
2. Semantische Modul-/Protokolltests bestanden, einschließlich adversarialer Reihenfolge.
3. DSP-Signaltests bestanden, bei eingefrorenen Fixtures und Seeds.
4. Tatsächlicher Host mit Signalroute, Fehler-/Lifecycle-Prüfung und zeitlichen Störungen bestanden.
5. Vergleichbare musikalische Last, tatsächliche Callback-/Ausgabelatenz und begrenzte Ressourcen nachgewiesen.
6. Physische Aufnahme/Loopback und Live-Spiel auf dem Zielgerät bestanden.
7. Erst danach nächste musikalische Domäne übernehmen; bei Produktintegration zusätzlich bestehende 320-Oracle und Core/Full-Gates.

Ein kleiner P0 darf absichtlich nur einen Klangtyp unterstützen. Er muss diesen Umfang offen benennen und vollständig prüfen. Ein kleiner Umfang ist kein Nachweis für die Robustheit des gesamten Xensonar.
