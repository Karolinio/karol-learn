import type { Lernstand, Lernstufe } from './typen';

/** Tage bis zur nächsten Fälligkeit je Box. */
export const ABSTAENDE: Readonly<Record<number, number>> = Object.freeze({ 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 });
export const MAX_BOX = 5;
export const ABSTAND_WIEDERHOLUNG = 3;
export const MAX_WIEDERHOLUNGEN = 2;

export function plusTage(isoTag: string, tage: number): string {
  const [j, m, t] = isoTag.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(j, m - 1, t + tage)).toISOString().slice(0, 10);
}

export function neuerStand(id: string, heute = '1970-01-01'): Lernstand {
  return { id, box: 0, faellig: heute, richtig: 0, falsch: 0, serie: 0 };
}

/** Leitner-Bewertung: rechts eine Box höher, links zurück in Box 1, fällig morgen. */
export function bewerte(stand: Lernstand | undefined, gewusst: boolean, heute: string, id?: string): Lernstand {
  if (!stand && !id) throw new Error('bewerte braucht einen Stand oder eine id');
  const alt = stand ?? neuerStand(id as string, heute);
  if (!gewusst) {
    return { ...alt, box: 1, faellig: plusTage(heute, 1), falsch: alt.falsch + 1, serie: 0, zuletzt: heute };
  }
  const box = Math.min(alt.box + 1, MAX_BOX);
  return { ...alt, box, faellig: plusTage(heute, ABSTAENDE[box] ?? 0), richtig: alt.richtig + 1, serie: alt.serie + 1, zuletzt: heute };
}

export function stufeVon(stand: Lernstand | undefined): Lernstufe {
  if (!stand || stand.box === 0) return 'offen';
  return stand.box >= 4 ? 'kann' : 'lerne';
}

/** Nach einem Fehler kommt die Karte drei Karten später noch einmal, höchstens zweimal. */
export function reiheNachFehler(
  reihe: readonly string[],
  index: number,
  zaehler: Readonly<Record<string, number>>,
): { reihe: readonly string[]; zaehler: Readonly<Record<string, number>> } {
  const id = reihe[index];
  if (id === undefined) throw new Error(`Index ${index} liegt außerhalb der Reihe`);
  const bisher = zaehler[id] ?? 0;
  if (bisher >= MAX_WIEDERHOLUNGEN) return { reihe, zaehler };
  const ziel = Math.min(index + 1 + ABSTAND_WIEDERHOLUNG, reihe.length);
  return {
    reihe: [...reihe.slice(0, ziel), id, ...reihe.slice(ziel)],
    zaehler: { ...zaehler, [id]: bisher + 1 },
  };
}
