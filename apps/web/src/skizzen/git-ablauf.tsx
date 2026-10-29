import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil, Teil } from './teile';

const punkt = (id: string, ab: number, x: number, y: number) => (
  <Teil id={id} ab={ab} kinder={<circle cx={x} cy={y} r={9} className="sk-punkt" />} />
);

export const gitAblauf = macheSkizze({
  id: 'git-ablauf',
  titel: 'Git: Branch bis Merge',
  track: 'fde',
  themen: ['Git & Ablauf'],
  kurztext: 'main, Branch, Commits, Pull Request, Review, Merge. Nie direkt auf main.',
  viewBox: '0 0 360 460',
  schritte: [
    { titel: 'main', text: 'main ist der Stand, der läuft. Jeder Punkt ist ein Commit: ein gespeicherter Schritt mit Nachricht.', karte: 'fde-b-git-repo', fokus: ['main', 'm0'] },
    { titel: 'Branch abzweigen', text: 'Für eine Änderung zweigst du einen Branch ab. main bleibt dabei unberührt.', karte: 'fde-b-git-branch', fokus: ['abzweig', 'branch', 'n-branch'] },
    { titel: 'Commits', text: 'Auf dem Branch machst du kleine Commits. Jeder lässt sich einzeln ansehen und zurücknehmen.', karte: 'fde-b-git-commit', fokus: ['b1', 'b2'] },
    { titel: 'Pull Request', text: 'Fertig? Du öffnest einen Pull Request: die Bitte, den Branch in main zu übernehmen.', karte: 'fde-pull-request', fokus: ['pr', 'p-pr'] },
    { titel: 'Review', text: 'Jemand liest den Code, die CI lässt die Tests laufen. Erst wenn beides grün ist, geht es weiter.', karte: 'fde-ci-cd', fokus: ['review', 'p-rv'] },
    { titel: 'Merge', text: 'Merge: Die Commits kommen in main. Der Branch hat seinen Zweck erfüllt.', karte: 'fde-b-git-merge', fokus: ['merge', 'm1'] },
    { titel: 'Nie direkt auf main', text: 'main ist geschützt. Änderungen kommen nur über einen Pull Request, nie als direkter Commit.', karte: 'fde-b-git-main-schuetzen', fokus: ['regel', 'main'] },
  ],
  zeichnung: () => (
    <>
      <Notiz id="main" x={56} y={20} zeilen={['main']} anker="middle" art="stark" />
      <Pfeil id="main" d="M56 30 L56 446" ohneSpitze />
      {punkt('m0', 0, 56, 60)}
      <Pfeil id="abzweig" ab={1} d="M56 60 C 56 100, 196 92, 196 128" ohneSpitze />
      <Pfeil id="branch" ab={1} d="M196 128 L196 304" ohneSpitze />
      <Notiz id="n-branch" ab={1} x={208} y={120} zeilen={['feature/login']} art="code" />
      {punkt('b1', 2, 196, 160)}
      <Notiz id="b1" ab={2} x={212} y={165} zeilen={['Commit']} />
      {punkt('b2', 2, 196, 212)}
      <Notiz id="b2" ab={2} x={212} y={217} zeilen={['Commit']} />
      <Pfeil id="p-pr" ab={3} d="M196 262 L214 262" />
      <Kasten id="pr" ab={3} x={218} y={238} b={134} h={50} titel="Pull Request" unter="Bitte um Merge" />
      <Pfeil id="p-rv" ab={4} d="M285 290 L285 306" />
      <Kasten id="review" ab={4} x={218} y={310} b={134} h={50} titel="Review" unter="Mensch + CI" />
      <Pfeil id="merge" ab={5} d="M196 304 C 196 370, 56 352, 56 396" />
      {punkt('m1', 5, 56, 404)}
      <Notiz id="m1" ab={5} x={72} y={430} zeilen={['Merge-Commit']} />
      <Notiz id="regel" ab={6} x={72} y={262} zeilen={['nie direkt', 'auf main']} art="nein" versteckt />
    </>
  ),
});
