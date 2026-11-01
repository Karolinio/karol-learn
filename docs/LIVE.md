# Live-Stand

Die App läuft auf Vercel. Jeder Push auf `main` baut und veröffentlicht sie automatisch neu.
Das Vercel-Projekt gehört dem Account karolinio (Team „karolinio's projects“, Hobby, kostenlos).

## Was online funktioniert

- Karten, Lexikon, Skizzen, Themenbilder, Fortschritt, Labor (Simulator und Störfälle)
- Erklär-Training im Modus „Selbst prüfen“: die Musterantwort mit Kernpunkten vergleichen

## Was nur lokal funktioniert

- **„Bewerten lassen“** im Erklär-Training: braucht den lokalen Server und `claude` auf deinem Mac.
  Ohne Server zeigt die App automatisch „Selbst prüfen“, ein Fehler entsteht nicht.
- **Video-Tutor** (`npm run tutor`): läuft nur auf deinem Mac über dein Claude-Abo, nie online.

Ein echter `claude`-Lauf startet nur, wenn du ihn auslöst (Knopf oder `npm run tutor`).

## Auf dem Handy

- Online: die Vercel-Adresse im Handy-Browser öffnen (Adresse im Vercel-Projekt unter „Domains“).
- Lokal im selben WLAN: `npm run handy` auf dem Mac, dann die dort angezeigte Adresse im Handy öffnen.
  Dabei läuft auch „Bewerten lassen“, solange der Server auf dem Mac läuft.

## Neue Funktionen veröffentlichen

1. Lokal bauen und prüfen: `npm run pruefen`, `npm test`, `npm run build`.
2. Committen und pushen auf `main`.
3. Vercel baut automatisch. Im Projekt unter „Deployments“ siehst du den Stand und Fehler.

Schlägt der Build fehl, steht der Grund im Build-Log des Deployments.
Der alte Stand bleibt online, bis ein neuer Build durchläuft.

## Einstellungen

- `vercel.json` setzt nur Build-Befehl (`npm run build`) und Ausgabeordner (`apps/web/dist`).
- Keine Umgebungsvariablen nötig. Geheimnisse gehören nie ins Repo.
- `.vercel/` ist in `.gitignore`, weil Vercel dort beim Build Dateien ablegt.

## Offen

- Das Projekt `karol-learn-web` stammt vom ersten Anlauf mit dem Fehler `KL_WURZEL`. Vermutlich gibt es darin nur fehlgeschlagene Builds. Vor dem Löschen im Projekt prüfen, ob eine Produktion existiert.
- Nur für eine Veröffentlichung für andere: die 13 wiya-Erwähnungen in Karten anderer Themen
  (siehe `KL_AUSSCHLIESSEN=wiya` in `docs/plan.md`).
