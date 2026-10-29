import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil } from './teile';

const ORDNER = [
  { id: 'apps', titel: 'apps/', unter: 'Programme: web (die App), server', text: 'Was läuft: apps/web ist die Lern-App, apps/server der kleine lokale Server für den Eingang.' },
  { id: 'packages', titel: 'packages/', unter: 'geteilte Logik: karten-kern', text: 'Gemeinsame, pure Logik mit Tests. Neue Regeln für Karten kommen zuerst hierher.' },
  { id: 'agents', titel: 'agents/', unter: 'je Agent: agent.json, prompt.md, README', text: 'Jeder Agent bekommt einen eigenen Ordner, z. B. agents/video-tutor, mit festen Pflichtdateien.', karte: 'fde-eigenes-repo' },
  { id: 'inhalt', titel: 'inhalt/', unter: 'Karten, Roadmaps, Bilder: nur Daten', text: 'Nur Daten, kein Code. rohbestand/ ist die Quelle, karten/ wird daraus erzeugt.' },
  { id: 'scripts', titel: 'scripts/', unter: 'Werkzeuge: aufteilen, pruefen, index', text: 'Kleine Werkzeuge, die man mit npm run startet: aufteilen, pruefen, index-bauen.' },
  { id: 'docs', titel: 'docs/', unter: 'Plan, Design, Struktur, Screenshots', text: 'Wissen für Menschen: der Plan, Design-Notizen, die Struktur-Regeln und Screenshots.', karte: 'fde-agents-md' },
] as const;
const Y0 = 62;
const ABSTAND = 62;

export const repoStruktur = macheSkizze({
  id: 'repo-struktur',
  titel: 'Repo von oben nach unten',
  track: 'fde',
  themen: ['Repo-Struktur'],
  kurztext: 'Die Ordner dieses Repos, je ein Satz. Und die Regel, die sie sauber hält.',
  viewBox: '0 0 360 470',
  schritte: [
    { titel: 'Die Wurzel', text: 'Oben liegen nur Ordner und wenige feste Dateien: README, AGENTS.md, package.json, tsconfig.', karte: 'fde-b-git-repo', fokus: ['wurzel'] },
    ...ORDNER.map((o) => ({ titel: o.titel, text: o.text, karte: 'karte' in o ? o.karte : undefined, fokus: [o.id, `z-${o.id}`] })),
    { titel: 'Die Regel', text: 'Neues kommt in den passenden Ordner. npm run pruefen meldet, wenn etwas falsch liegt, und der Pre-Commit-Hook hält es an.', fokus: ['regel', 'stamm'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="wurzel" x={8} y={8} b={170} h={40} titel="karol-learn/" links />
      <Pfeil id="stamm" ab={1} d={`M24 48 L24 ${Y0 + 5 * ABSTAND + 26}`} ohneSpitze />
      {ORDNER.map((o, i) => (
        <g key={o.id}>
          <Pfeil id={`z-${o.id}`} ab={i + 1} d={`M24 ${Y0 + i * ABSTAND + 26} L40 ${Y0 + i * ABSTAND + 26}`} ohneSpitze />
          <Kasten id={o.id} ab={i + 1} x={44} y={Y0 + i * ABSTAND} b={308} h={52} titel={o.titel} unter={o.unter} links r={12} />
        </g>
      ))}
      <Notiz id="regel" ab={7} x={24} y={450} zeilen={['Falsch abgelegt? npm run pruefen meldet es.']} art="akzent" versteckt />
    </>
  ),
});
