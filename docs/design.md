# karol-learn: Design-Notizen

Stand 27.10.2026. Grundlage: fünf gezielte Mobbin-Suchen (iOS), sechs Bilder einzeln angesehen.

## Gesehene Referenzen

| App | Bildschirm | Was wir übernehmen |
|---|---|---|
| Bumble (People) | Swipe-Karte, volle Breite | Karte füllt fast die Breite (16 px Rand), Radius ~20, Aktionsknopf rund unten rechts, Tab-Leiste mit 4 Einträgen, Label über der Karte statt Text auf der Karte |
| Givingli (Kartenstapel) | Karten-Viewer | Nachbarkarte lugt hervor (Tiefe), runde Aktionen ✕ / ✓ in 44-px-Kreisen links und rechts oben, kleiner Zähler-Pill „2 of 2" unter der Karte |
| Quizlet (Suche, Kartensets) | Liste der Sets | Weiße Karten auf leicht grauem Grund, 1 px Haarlinie statt Schatten, Titel 17 semibold, Meta 15 regular, Pill-Aktion rechts unten in Akzent-Tint, Filter als breiter Tint-Knopf |
| Duolingo (Lernpfad) | Home-Pfad | Vertikaler Pfad mit Knoten im Zickzack, aktueller Knoten mit Ring, gesperrte Knoten grau, Abschnitts-Trenner mit Haarlinie und Titel mittig, „Jump here"-Pill über dem nächsten Knoten |
| Cal AI (Progress) | Fortschritt | Large Title 34 bold, Kacheln in zwei Spalten mit Radius 20, Tagesserie als 7 Punkte (S M T W T F S) mit Häkchen, Zahl groß und Label klein darunter, schwebende Tab-Leiste |

## Muster, die wir festhalten

- **Abstände:** 4er-Raster. Seitenrand 16 px (20 px ab 768 px). Zwischen Gruppen 32 px, innerhalb einer Karte 16–20 px. Kein gleichförmiges Padding: Titelbereich luftig, Listen dicht.
- **Radien:** Karte 20, große Lernkarte 28, Knopf 14, Listenzeile 12, Pill 999, Sheet oben 28.
- **Typo-Skala (iOS):** Large Title 34/41 bold −0.02em, Title 2 22/28 bold, Title 3 20/25 semibold, Headline 17/22 semibold, Body 17/22, Subhead 15/20, Footnote 13/18, Caption 12/16. Systemschrift `-apple-system`, bewusst: die App soll sich wie ein iOS-Bordmittel anfühlen.
- **Kartenstapel-Tiefe:** zwei Karten sichtbar dahinter, je 10 px tiefer und 4 % kleiner, leicht blasser. Beim Ziehen der oberen Karte rücken sie mit (Hinweis auf das Ergebnis).
- **Gesten:** Ziehen 1:1 mit dem Finger, Drehung bis ±12°, Auslösung ab 110 px oder Flick > 600 px/s, sonst Feder zurück (Dämpfung 1, Antwort 0,4 s). Nach Flick leichter Bounce. Tippen dreht die Karte (rotateY, 0,5 s Feder).
- **Rückmeldung:** grüner bzw. roter Schleier wächst mit dem Weg, Label „Wusste ich" / „Nochmal" schräg oben, wie ein Stempel.
- **Fortschritt:** Ringe mit runden Kappen, Spur in 12 % der Farbe. Je Thema ein dreifarbiger Balken (grün kann, orange lerne, grau offen). Tagesserie als sieben Punkte.
- **Navigation:** Large Title, der beim Scrollen in eine kleine, glasige Leiste übergeht. Tab-Leiste glasig mit `backdrop-filter`, aktiver Tab im Track-Akzent.
- **Track-Akzent:** AI Engineer Indigo, Forward Deployed Engineer Petrol. Segment-Control mit gleitendem weißem Daumen.

## Farben und Kontrast

Nur hell. Alle Werte stehen in `apps/web/src/styles/tokens.css`. Für Text gibt es je Farbe eine dunklere „ink"-Variante, damit WCAG AA (4,5 : 1) auf Weiß und auf `#F2F2F7` hält. Leuchtende Systemfarben nur für Flächen, Ringe und Icons.
