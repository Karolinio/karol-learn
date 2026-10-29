import { macheSkizze } from './mache';
import { Kasten, Pfeil, Teil } from './teile';

const STATIONEN = [
  { id: 'discovery', titel: 'Discovery', unter: 'Ist-Ablauf aufnehmen, Schmerz finden', text: 'Du schaust dir den echten Ablauf an, am besten vorgeführt. Ziel: der Schmerz, nicht der Wunsch.', karte: 'fde-k-disc-prozessaufnahme' },
  { id: 'business', titel: 'Business Case', unter: 'Lohnt es sich? Stunden mal Kosten', text: 'Du rechnest: gesparte Stunden mal Stundensatz gegen Kosten pro Lauf und Risiko.', karte: 'fde-k-bc-stundenersparnis' },
  { id: 'pilot', titel: 'Pilot', unter: 'klein, echt, mit Erfolgskriterium', text: 'Ein kleiner, echter Einsatz mit echten Nutzern. Das Erfolgskriterium steht vorher fest.', karte: 'fde-k-pilot-poc-pilot-prod' },
  { id: 'messen', titel: 'Messen', unter: 'Zahlen gegen das Kriterium', text: 'Du misst gegen das vereinbarte Kriterium. Ohne Zahl weiß niemand, ob der Pilot gelungen ist.', karte: 'fde-k-pilot-erfolg' },
  { id: 'rollout', titel: 'Rollout', unter: 'mehr Nutzer, Schulung, Übergabe', text: 'Mehr Nutzer, Schulung, Übergabe an den Kunden. Change Management gehört dazu.', karte: 'fde-k-pilot-uebergabe' },
  { id: 'betrieb', titel: 'Betrieb', unter: 'Logs, Updates, Support', text: 'Nach dem Go-live: Logs lesen, Updates einspielen, Fehler beheben. Die Arbeit hört nicht auf.', karte: 'fde-k-pilot-betrieb' },
] as const;
const Y0 = 14;
const ABSTAND = 74;

export const einsatz = macheSkizze({
  id: 'einsatz',
  titel: 'Ein FDE-Einsatz',
  track: 'fde',
  themen: ['Discovery', 'Business Case', 'Pilot & Rollout', 'Betrieb'],
  kurztext: 'Von der Discovery bis zum Betrieb, als Zeitachse.',
  viewBox: '0 0 360 460',
  schritte: STATIONEN.map((s, i) => ({ titel: s.titel, text: s.text, karte: s.karte, fokus: [s.id, `d${i}`, `l${i}`] })),
  zeichnung: () => (
    <>
      {STATIONEN.map((s, i) => {
        const y = Y0 + i * ABSTAND;
        return (
          <g key={s.id}>
            {i > 0 ? <Pfeil id={`l${i}`} ab={i} d={`M34 ${y - ABSTAND + 36} L34 ${y + 16}`} ohneSpitze /> : null}
            <Teil id={`d${i}`} ab={i} kinder={<circle cx={34} cy={y + 27} r={9} className="sk-punkt" />} />
            <Kasten id={s.id} ab={i} x={60} y={y} b={292} h={56} titel={s.titel} unter={s.unter} links />
          </g>
        );
      })}
    </>
  ),
});
