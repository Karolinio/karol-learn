import { createStore, get, set, del } from 'idb-keyval';
import { z } from 'zod';
import { lernstandSchema, MAX_NEUE, sessionSchema, trackSchema } from '@karol-learn/karten-kern';

export type SpeicherArt = 'idb' | 'local' | 'ram';

export interface Speicher {
  art: SpeicherArt;
  lies<T>(schluessel: string): Promise<T | undefined>;
  schreibe(schluessel: string, wert: unknown): Promise<void>;
  loesche(schluessel: string): Promise<void>;
}

const PRAEFIX = 'kl:';

function ramSpeicher(): Speicher {
  const daten = new Map<string, unknown>();
  return {
    art: 'ram',
    lies: async <T,>(s: string) => daten.get(s) as T | undefined,
    schreibe: async (s, w) => { daten.set(s, structuredClone(w)); },
    loesche: async (s) => { daten.delete(s); },
  };
}

function localSpeicher(ls: Storage): Speicher {
  return {
    art: 'local',
    lies: async <T,>(s: string) => { const r = ls.getItem(PRAEFIX + s); return r === null ? undefined : (JSON.parse(r) as T); },
    schreibe: async (s, w) => { ls.setItem(PRAEFIX + s, JSON.stringify(w)); },
    loesche: async (s) => { ls.removeItem(PRAEFIX + s); },
  };
}

function idbSpeicher(): Speicher {
  const store = createStore('karol-learn', 'stand');
  return {
    art: 'idb',
    lies: <T,>(s: string) => get<T>(s, store),
    schreibe: (s, w) => set(s, w, store),
    loesche: (s) => del(s, store),
  };
}

async function funktioniert(sp: Speicher): Promise<boolean> {
  try {
    await sp.schreibe('__probe', 1);
    const ok = (await sp.lies<number>('__probe')) === 1;
    await sp.loesche('__probe');
    return ok;
  } catch {
    return false;
  }
}

/** Ersatz-Kette: IndexedDB, dann localStorage, zuletzt RAM (mit Hinweis in der UI). */
export async function oeffneSpeicher(umgebung: { indexedDB?: unknown; localStorage?: Storage } = globalThis): Promise<Speicher> {
  if (umgebung.indexedDB) {
    const idb = idbSpeicher();
    if (await funktioniert(idb)) return idb;
  }
  try {
    if (umgebung.localStorage) {
      const ls = localSpeicher(umgebung.localStorage);
      if (await funktioniert(ls)) return ls;
    }
  } catch { /* localStorage gesperrt: weiter zu RAM */ }
  return ramSpeicher();
}

/** Bittet den Browser, den Speicher nicht zu löschen (wichtig auf iOS). */
export async function bitteUmDauer(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export const neueSchema = z.union([z.literal(5), z.literal(10), z.literal(20)]);

export const einstellungenSchema = z.object({
  track: trackSchema.default('aie'),
  exportErinnert: z.string().optional(),
  /** Höchstens so viele neue Karten pro Session (5, 10 oder 20). */
  neueProSession: neueSchema.catch(MAX_NEUE as 10).default(MAX_NEUE as 10),
});
export type Einstellungen = z.infer<typeof einstellungenSchema>;

export const exportSchema = z.object({
  version: z.literal(1),
  exportiert: z.string(),
  lernstand: z.record(lernstandSchema),
  sessions: z.array(sessionSchema),
  einstellungen: einstellungenSchema,
});
export type SpeicherExport = z.infer<typeof exportSchema>;

export function baueExport(d: Omit<SpeicherExport, 'version' | 'exportiert'>, jetzt = new Date()): SpeicherExport {
  return { version: 1, exportiert: jetzt.toISOString(), ...d };
}

export type ImportErgebnis = { ok: true; daten: SpeicherExport } | { ok: false; fehler: string };

export function pruefeImport(text: string): ImportErgebnis {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein JSON.' };
  }
  const r = exportSchema.safeParse(roh);
  return r.success ? { ok: true, daten: r.data } : { ok: false, fehler: 'Die Datei passt nicht zum Export-Format von karol-learn.' };
}
