import { plusTage } from './wiederholung';

/** Anzahl aufeinanderfolgender Lerntage, die heute oder gestern enden. */
export function tagesserie(tage: readonly string[], heute: string): number {
  const menge = new Set(tage);
  let tag = menge.has(heute) ? heute : plusTage(heute, -1);
  let serie = 0;
  while (menge.has(tag)) {
    serie += 1;
    tag = plusTage(tag, -1);
  }
  return serie;
}
