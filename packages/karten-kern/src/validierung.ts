import { karteSchema, themenDateiSchema, TRACKS, type Karte } from './typen';
import { slug } from './slug';

export interface Pruefergebnis { ok: boolean; fehler: string[] }

export function pruefeKarte(roh: unknown): Pruefergebnis {
  const r = karteSchema.safeParse(roh);
  if (!r.success) {
    const id = (roh as { id?: unknown })?.id;
    return { ok: false, fehler: r.error.issues.map((i) => `${String(id)}: ${i.path.join('.')} ${i.message}`) };
  }
  const k = r.data;
  return k.id.startsWith(`${k.track}-`)
    ? { ok: true, fehler: [] }
    : { ok: false, fehler: [`${k.id}: id braucht das Präfix "${k.track}-"`] };
}

export interface BestandsDatei { pfad: string; inhalt: unknown }

function pruefeDatei(d: BestandsDatei): string[] {
  const teile = d.pfad.split('/');
  const ordner = teile[teile.length - 2] ?? '';
  const name = (teile[teile.length - 1] ?? '').replace(/\.json$/, '');
  const r = themenDateiSchema.safeParse(d.inhalt);
  if (!r.success) return [`${d.pfad}: Struktur ungültig`];
  const datei = r.data;
  const fehler: string[] = [];
  if (!(TRACKS as readonly string[]).includes(ordner) || datei.track !== ordner) {
    fehler.push(`${d.pfad}: Track "${datei.track}" passt nicht zum Ordner "${ordner}"`);
  }
  if (slug(datei.thema) !== name) fehler.push(`${d.pfad}: Dateiname passt nicht zu Thema "${datei.thema}"`);
  for (const roh of datei.karten) {
    const p = pruefeKarte(roh);
    fehler.push(...p.fehler.map((f) => `${d.pfad}: ${f}`));
    if (!p.ok) continue;
    const k = roh as Karte;
    if (k.track !== ordner) fehler.push(`${d.pfad}: ${k.id} hat Track "${k.track}", Ordner ist "${ordner}"`);
    if (k.thema !== datei.thema) fehler.push(`${d.pfad}: ${k.id} hat Thema "${k.thema}" statt "${datei.thema}"`);
  }
  return fehler;
}

/** Prüft alle Themen-Dateien: Schema, Track = Ordner, Thema = Datei, ids eindeutig. */
export function pruefeBestand(dateien: BestandsDatei[]): Pruefergebnis & { anzahl: number } {
  const fehler = dateien.flatMap(pruefeDatei);
  const gesehen = new Map<string, string>();
  let anzahl = 0;
  for (const d of dateien) {
    const karten = (d.inhalt as { karten?: unknown })?.karten;
    if (!Array.isArray(karten)) continue;
    for (const k of karten as { id?: string }[]) {
      anzahl += 1;
      const id = String(k?.id);
      const frueher = gesehen.get(id);
      if (frueher) fehler.push(`${d.pfad}: id ${id} doppelt (schon in ${frueher})`);
      else gesehen.set(id, d.pfad);
    }
  }
  return { ok: fehler.length === 0, fehler, anzahl };
}
