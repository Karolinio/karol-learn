import { z } from 'zod';
import { pruefeKarte, slug, TRACKS, vorschlagSchema, type Karte, type Vorschlag } from '@karol-learn/karten-kern';
import { imOrdner, jsonDateien, liesJson, liesJsonOder, schreibeJsonAtomar } from './dateien';

export const vidSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, 'ungültige Vorschlags-id');

const laufSchema = z.object({
  laufId: z.string(),
  quelle: z.string(),
  erstellt: z.string(),
  vorschlaege: z.array(vorschlagSchema),
  /** Erklärideen des Tutors; ältere Läufe haben keine. Einzelne kaputte Ideen werden übersprungen. */
  ideen: z.array(z.unknown()).default([]),
});
type Lauf = z.infer<typeof laufSchema>;

export const ideeSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
  titel: z.string().trim().min(1).max(80),
  art: z.enum(['skizze', 'vergleich', 'uebung']),
  beschreibung: z.string().trim().min(1).max(400),
  track: z.enum(TRACKS),
  thema: z.string().trim().min(1),
  quelle: z.string().trim().min(1).optional(),
});
export type Idee = z.infer<typeof ideeSchema> & { quelle: string; laufId: string };

/** Angenommene Karten landen hier: im Rohbestand bleiben sie über `npm run aufteilen` hinweg erhalten. */
export const EINGANG_DATEI = 'eingang.json';

export class FachFehler extends Error {
  constructor(public status: number, nachricht: string) { super(nachricht); }
}

async function alleLaeufe(inhalt: string): Promise<{ pfad: string; lauf: Lauf }[]> {
  const ordner = imOrdner(inhalt, 'vorschlaege');
  const dateien = await jsonDateien(ordner);
  const laeufe = await Promise.all(dateien.map(async (f) => {
    const pfad = imOrdner(ordner, f);
    try {
      const r = laufSchema.safeParse(await liesJson(pfad));
      return r.success ? { pfad, lauf: r.data } : undefined;
    } catch (e) {
      if (e instanceof SyntaxError) return undefined; // halb geschriebene oder kaputte Datei überspringen
      throw e;
    }
  }));
  return laeufe.filter((l): l is { pfad: string; lauf: Lauf } => l !== undefined);
}

export async function offeneVorschlaege(inhalt: string): Promise<(Vorschlag & { laufId: string; laufQuelle: string })[]> {
  const laeufe = await alleLaeufe(inhalt);
  return laeufe.flatMap(({ lauf }) => lauf.vorschlaege
    .filter((v) => v.status === 'offen')
    .map((v) => ({ ...v, laufId: lauf.laufId, laufQuelle: lauf.quelle })));
}

export async function ideen(inhalt: string): Promise<Idee[]> {
  const laeufe = await alleLaeufe(inhalt);
  return laeufe.flatMap(({ lauf }) => lauf.ideen.flatMap((roh) => {
    const r = ideeSchema.safeParse(roh);
    return r.success ? [{ ...r.data, quelle: r.data.quelle ?? lauf.quelle, laufId: lauf.laufId }] : [];
  }));
}

async function finde(inhalt: string, vid: string) {
  for (const eintrag of await alleLaeufe(inhalt)) {
    const v = eintrag.lauf.vorschlaege.find((x) => x.vorschlagId === vid);
    if (v) return { ...eintrag, vorschlag: v };
  }
  throw new FachFehler(404, `Vorschlag ${vid} nicht gefunden`);
}

async function setzeStatus(pfad: string, lauf: Lauf, vid: string, status: Vorschlag['status']) {
  const neu = { ...lauf, vorschlaege: lauf.vorschlaege.map((v) => (v.vorschlagId === vid ? { ...v, status } : v)) };
  await schreibeJsonAtomar(pfad, neu);
}

async function alleIds(inhalt: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const roh = imOrdner(inhalt, 'rohbestand');
  for (const f of await jsonDateien(roh)) {
    const d = await liesJson<{ karten?: Karte[] }>(imOrdner(roh, f));
    for (const k of d.karten ?? []) ids.add(k.id);
  }
  for (const track of TRACKS) {
    const ordner = imOrdner(inhalt, 'karten', track);
    for (const f of await jsonDateien(ordner)) {
      const d = await liesJson<{ karten?: Karte[] }>(imOrdner(ordner, f));
      for (const k of d.karten ?? []) ids.add(k.id);
    }
  }
  return ids;
}

// Schreibende Vorgänge nacheinander, damit zwei Annahmen sich nicht überholen.
let kette: Promise<unknown> = Promise.resolve();
function nacheinander<T>(arbeit: () => Promise<T>): Promise<T> {
  const lauf = kette.then(arbeit, arbeit);
  kette = lauf.catch(() => undefined);
  return lauf;
}

export function nimmAn(inhalt: string, vid: string): Promise<Karte> {
  return nacheinander(() => nimmAnJetzt(inhalt, vid));
}

export function lehneAb(inhalt: string, vid: string): Promise<{ vorschlagId: string }> {
  return nacheinander(() => lehneAbJetzt(inhalt, vid));
}

async function nimmAnJetzt(inhalt: string, vid: string): Promise<Karte> {
  const { pfad, lauf, vorschlag } = await finde(inhalt, vid);
  if (vorschlag.status !== 'offen') throw new FachFehler(409, `Vorschlag ist schon ${vorschlag.status}`);
  const karte: Karte = {
    id: vorschlag.id, track: vorschlag.track, thema: vorschlag.thema, stufe: vorschlag.stufe,
    frage: vorschlag.frage, antwort: vorschlag.antwort, quelle: vorschlag.quelle,
    ...(vorschlag.erklaerhilfe ? { erklaerhilfe: vorschlag.erklaerhilfe } : {}),
    ...(vorschlag.skizze ? { skizze: vorschlag.skizze } : {}),
  };
  const p = pruefeKarte(karte);
  if (!p.ok) throw new FachFehler(422, p.fehler.join('; '));
  const name = slug(karte.thema);
  if (!name) throw new FachFehler(422, 'Thema ergibt keinen gültigen Dateinamen');
  const ziel = imOrdner(inhalt, 'karten', karte.track, `${name}.json`);
  const quelle = imOrdner(inhalt, 'rohbestand', EINGANG_DATEI);
  const roh = await liesJsonOder(quelle, { hinweis: 'Im Eingang angenommene Karten. Schreibt der Server.', karten: [] as Karte[] });
  // Ein früherer Versuch kann nach dem ersten Schreiben abgebrochen sein: dann hier zu Ende führen statt 409.
  const angefangen = roh.karten.some((k) => k.id === karte.id && k.frage === karte.frage);
  if (!angefangen && (await alleIds(inhalt)).has(karte.id)) throw new FachFehler(409, `id ${karte.id} gibt es schon`);
  const datei = await liesJsonOder(ziel, { track: karte.track, thema: karte.thema, karten: [] as Karte[] });
  // Erst die Quelle (dauerhaft), dann die erzeugte Themen-Datei (sofort sichtbar ohne aufteilen).
  if (!angefangen) await schreibeJsonAtomar(quelle, { ...roh, karten: [...roh.karten, karte] });
  if (!datei.karten.some((k) => k.id === karte.id)) await schreibeJsonAtomar(ziel, { ...datei, karten: [...datei.karten, karte] });
  await setzeStatus(pfad, lauf, vid, 'angenommen');
  return karte;
}

async function lehneAbJetzt(inhalt: string, vid: string): Promise<{ vorschlagId: string }> {
  const { pfad, lauf, vorschlag } = await finde(inhalt, vid);
  if (vorschlag.status !== 'offen') throw new FachFehler(409, `Vorschlag ist schon ${vorschlag.status}`);
  await setzeStatus(pfad, lauf, vid, 'abgelehnt');
  return { vorschlagId: vid };
}
