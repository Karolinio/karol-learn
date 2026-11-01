import type { ErklaerStufe, KriteriumName, ZielpersonId } from '@karol-learn/karten-kern';
import type { ErklaerFehlerArt } from '../lib/erklaeren';

/** „Erklär es …“: Dativ je Zielperson. */
export const ANREDE: Readonly<Record<ZielpersonId, string>> = {
  gf: 'dem Geschäftsführer', it: 'der IT-Leiterin', dsb: 'dem Datenschutzbeauftragten',
  dev: 'dem Entwickler beim Kunden', ciso: 'der Informationssicherheit der Bank',
};

/** Kürzel im Avatar der Sprechblase. */
export const KUERZEL: Readonly<Record<ZielpersonId, string>> = { gf: 'GF', it: 'IT', dsb: 'DS', dev: 'DEV', ciso: 'IS' };

export const STUFE: Readonly<Record<ErklaerStufe, { titel: string; unter: string }>> = {
  kundenreif: { titel: 'Kundenreif', unter: 'So kannst du es im Termin sagen.' },
  fast: { titel: 'Fast', unter: 'Ein Stück fehlt noch. Unten steht, welches.' },
  nochmal: { titel: 'Nochmal', unter: 'Lies die Rückmeldung und versuch es gleich noch einmal.' },
};

export const KRITERIUM: Readonly<Record<KriteriumName, string>> = {
  richtigkeit: 'Richtigkeit', vollstaendigkeit: 'Vollständigkeit', verstaendlichkeit: 'Verständlichkeit', kuerze: 'Kürze',
};

/** Ruhige Fehlertexte: was passiert ist, nicht wessen Schuld. */
export const FEHLER: Readonly<Record<Exclude<ErklaerFehlerArt, 'abgebrochen'>, string>> = {
  netz: 'Der lokale Server antwortet gerade nicht. Läuft npm run dev auf dem Mac?',
  claude_fehlt: 'Auf dem Mac ist claude nicht eingerichtet. Prüf selbst, das geht genauso gut.',
  zeit: 'Claude hat diesmal zu lange gebraucht.',
  ausgabe: 'Die Antwort kam in einem unerwarteten Format.',
  claude_fehler: 'Claude hat einen Fehler gemeldet.',
  eingabe: 'Die Anfrage wurde nicht angenommen.',
};
