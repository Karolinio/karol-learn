import type { ErklaerBewertung } from './erklaer-typen';
import type { Karte } from './typen';

/** Testdaten für das Erklär-Training. Nicht für die App. */
export const bewertungBeispiel: ErklaerBewertung = {
  urteil: 'Verständlich und richtig, aber der Kostenaspekt fehlt.',
  kriterien: {
    richtigkeit: { punkte: 3, satz: 'Alles, was du sagst, stimmt.' },
    vollstaendigkeit: { punkte: 2, satz: 'Dass Tokens die Kosten bestimmen, fehlt.' },
    verstaendlichkeit: { punkte: 3, satz: '„Wortstücke“ versteht jeder Geschäftsführer.' },
    kuerze: { punkte: 2, satz: 'Der zweite Satz wiederholt den ersten.' },
  },
  falscheAussagen: [],
  fehlendeKernpunkte: [1],
  besserSatz: 'Ein Token ist ein Wortstück. Danach rechnet der Anbieter ab, also bestimmt es Ihre Kosten.',
  nachfrage: 'Und was heißt das für meine Rechnung?',
};

export const erklaerKarte = (id: string, extra: Partial<Karte> = {}): Karte => ({
  id, track: 'aie', thema: 'Modelle', stufe: 2, frage: `Frage ${id}?`,
  antwort: 'Ein Token ist ein Stück Text. Modelle rechnen in Tokens ab.', quelle: 'Test', ...extra,
});
