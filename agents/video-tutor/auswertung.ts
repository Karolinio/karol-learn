import { z } from 'zod';
import { entpackeClaudeAusgabe, findeDublette, pruefeKarte, type Karte, type Track, type Vorschlag } from '@karol-learn/karten-kern';

const rohVorschlag = z.object({
  id: z.string(), track: z.enum(['aie', 'fde']), thema: z.string(), stufe: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  frage: z.string(), antwort: z.string(), begruendung: z.string().max(300).default(''),
  erklaerhilfe: z.string().trim().max(300).optional(),
});
const ideeSchema = z.object({
  titel: z.string().trim().min(1).max(80),
  art: z.enum(['skizze', 'vergleich', 'uebung']),
  beschreibung: z.string().trim().min(1).max(400),
  track: z.enum(['aie', 'fde']),
  thema: z.string().trim().min(1),
});
export type Idee = z.infer<typeof ideeSchema> & { id: string; quelle: string };
const antwortSchema = z.object({ vorschlaege: z.array(z.unknown()), ideen: z.array(z.unknown()).default([]) });
export interface ClaudeNutzlast { vorschlaege: unknown[]; ideen: unknown[] }

/** Prüft die entpackte Nutzlast des Tutors. Hülle und Code-Zaun kennt nur karten-kern/claude-cli. */
export function parseClaudeAusgabe(stdout: string): ClaudeNutzlast {
  return antwortSchema.parse(entpackeClaudeAusgabe(stdout));
}

/** Behält nur gültige Ideen des richtigen Tracks; höchstens acht. */
export function werteIdeenAus(roh: readonly unknown[], o: { laufId: string; quelle: string; track?: Track }): Idee[] {
  return roh.slice(0, 8).flatMap((r) => {
    const p = ideeSchema.safeParse(r);
    return p.success && (!o.track || p.data.track === o.track) ? [p.data] : [];
  }).map((idee, i) => ({ ...idee, id: `${o.laufId}-i${i + 1}`, quelle: o.quelle }));
}

export interface Auswertung { vorschlaege: Vorschlag[]; ungueltig: number; dubletten: number }

export function werteAus(roh: readonly unknown[], o: { laufId: string; quelle: string; track?: Track; bestand: readonly Karte[]; max: number }): Auswertung {
  const vorschlaege: Vorschlag[] = [];
  let ungueltig = 0;
  for (const r of roh.slice(0, o.max)) {
    const p = rohVorschlag.safeParse(r);
    const karte = p.success ? { ...p.data, quelle: o.quelle, erklaerhilfe: p.data.erklaerhilfe || undefined } : undefined;
    const { begruendung = '', ...mitLeeren } = karte ?? {};
    const nurKarte = Object.fromEntries(Object.entries(mitLeeren).filter(([, w]) => w !== undefined));
    if (!karte || !pruefeKarte(nurKarte).ok || (o.track && karte.track !== o.track)) { ungueltig += 1; continue; }
    const vergleich = [...o.bestand.filter((b) => b.track === karte.track), ...vorschlaege.filter((v) => v.track === karte.track)];
    const dublettVon = findeDublette(karte, vergleich);
    vorschlaege.push({
      ...(nurKarte as unknown as Karte), begruendung, status: 'offen',
      vorschlagId: `${o.laufId}-${vorschlaege.length + 1}`,
      ...(dublettVon ? { dublettVon } : {}),
    });
  }
  return { vorschlaege, ungueltig: ungueltig + Math.max(0, roh.length - o.max), dubletten: vorschlaege.filter((v) => v.dublettVon).length };
}
