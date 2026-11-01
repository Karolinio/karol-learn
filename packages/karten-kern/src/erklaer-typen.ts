import { z } from 'zod';
import { MAX_ANTWORT, MAX_ERKLAERHILFE, MAX_FRAGE, trackSchema, type Track } from './typen';

/** Karols Erklärung: kürzer ist kein Gedanke, länger ist keine Erklärung mehr. */
export const MIN_ERKLAER_TEXT = 20;
export const MAX_ERKLAER_TEXT = 1200;
/** Prüfgrenze: doppelt so groß wie der Zielwert, auf den der Agent kürzt (ZIEL_LAENGE). */
export const MAX_NACHFRAGE = 400;
/** Vier Kriterien zu je 0–3 Punkten. */
export const MAX_ERKLAER_PUNKTE = 12;

export const ZIELPERSON_IDS = ['gf', 'it', 'dsb', 'dev', 'ciso'] as const;
export type ZielpersonId = (typeof ZIELPERSON_IDS)[number];
export const zielpersonIdSchema = z.enum(ZIELPERSON_IDS);

export const zielpersonSchema = z.object({
  id: zielpersonIdSchema,
  titel: z.string().trim().min(1).max(80),
  /** Wofür die Person sich interessiert: steht in der App als „will wissen: …“. */
  sorgt: z.string().trim().min(1).max(160),
  fachniveau: z.enum(['niedrig', 'mittel', 'hoch']),
  tracks: z.array(trackSchema).min(1),
});
export type Zielperson = z.infer<typeof zielpersonSchema>;

/** Reihenfolge je Track; die erste ist der Standard. */
const REIHENFOLGE: Readonly<Record<Track, readonly ZielpersonId[]>> = {
  aie: ['gf', 'it', 'dev'],
  fde: ['it', 'ciso', 'dsb', 'dev', 'gf'],
};

const tracksVon = (id: ZielpersonId): Track[] => (['aie', 'fde'] as const).filter((t) => REIHENFOLGE[t].includes(id));

const STAMM: readonly Omit<Zielperson, 'tracks'>[] = [
  { id: 'gf', titel: 'Geschäftsführer im Mittelstand', sorgt: 'Nutzen, Risiko und Kosten', fachniveau: 'niedrig' },
  { id: 'it', titel: 'IT-Leiterin', sorgt: 'Betrieb, Integration und Wartung', fachniveau: 'mittel' },
  { id: 'dsb', titel: 'Datenschutzbeauftragter', sorgt: 'Daten, DSGVO und Protokolle', fachniveau: 'mittel' },
  { id: 'dev', titel: 'Entwickler beim Kunden', sorgt: 'Schnittstellen, Fehlerfälle und Grenzen', fachniveau: 'hoch' },
  { id: 'ciso', titel: 'Informationssicherheit einer Bank', sorgt: 'Aufsicht und DORA, Nachweis, Haftung, Zugriffskontrolle', fachniveau: 'mittel' },
];

export const ZIELPERSONEN: readonly Zielperson[] = Object.freeze(STAMM.map((z) => Object.freeze({ ...z, tracks: tracksVon(z.id) })));

export function zielperson(id: ZielpersonId): Zielperson {
  const z = ZIELPERSONEN.find((x) => x.id === id);
  if (!z) throw new Error(`Zielperson ${id} unbekannt`);
  return z;
}

export function zielpersonenFuer(track: Track): Zielperson[] {
  return REIHENFOLGE[track].map(zielperson);
}

const karteIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const erklaerTextSchema = z.string().trim().min(MIN_ERKLAER_TEXT).max(MAX_ERKLAER_TEXT);
const nachfrageSchema = z.object({
  frage: z.string().trim().min(1).max(MAX_NACHFRAGE),
  ersterText: z.string().trim().min(1).max(MAX_ERKLAER_TEXT),
});

/** Was die App an den Server schickt. Die Karte selbst liest der Server aus inhalt/karten. */
export const erklaerAnfrageSchema = z.object({
  karteId: karteIdSchema,
  zielperson: zielpersonIdSchema,
  text: erklaerTextSchema,
  nachfrage: nachfrageSchema.optional(),
});
export type ErklaerAnfrage = z.infer<typeof erklaerAnfrageSchema>;

export const kriteriumSchema = z.object({
  punkte: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  satz: z.string().trim().min(1).max(400),
});
export type Kriterium = z.infer<typeof kriteriumSchema>;

export const KRITERIEN = ['richtigkeit', 'vollstaendigkeit', 'verstaendlichkeit', 'kuerze'] as const;
export type KriteriumName = (typeof KRITERIEN)[number];

/**
 * Rückmeldung des Coachs. Die Summe rechnet gesamtUrteil im Code, nie das Modell.
 * Grenzen sind das Doppelte der Zielwerte: der Agent kürzt vorher (bereiteBewertungVor).
 */
export const erklaerBewertungSchema = z.object({
  urteil: z.string().trim().min(1).max(320),
  kriterien: z.object({
    richtigkeit: kriteriumSchema,
    vollstaendigkeit: kriteriumSchema,
    verstaendlichkeit: kriteriumSchema,
    kuerze: kriteriumSchema,
  }),
  falscheAussagen: z.array(z.object({
    zitat: z.string().trim().min(1).max(400),
    korrektur: z.string().trim().min(1).max(480),
  })).max(3),
  /** Indizes in kernpunkteVon(karte); unpassende verwirft die App. */
  fehlendeKernpunkte: z.array(z.number().int().min(0).max(20)).max(5),
  besserSatz: z.string().trim().min(1).max(600),
  /** In Runde 2 ignoriert; darf dort leer sein. */
  nachfrage: z.string().trim().max(MAX_NACHFRAGE),
});
export type ErklaerBewertung = z.infer<typeof erklaerBewertungSchema>;

export const STUFEN = ['kundenreif', 'fast', 'nochmal'] as const;
export type ErklaerStufe = (typeof STUFEN)[number];

export const erklaerErgebnisSchema = z.object({
  karteId: karteIdSchema,
  track: trackSchema,
  zielperson: zielpersonIdSchema,
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  modus: z.enum(['coach', 'selbst']),
  punkte: z.number().int().min(0).max(MAX_ERKLAER_PUNKTE),
  max: z.number().int().min(1).max(MAX_ERKLAER_PUNKTE),
  stufe: z.enum(STUFEN),
  runden: z.union([z.literal(1), z.literal(2)]),
  /** Karols letzte Fassung, nur lokal gespeichert: zum Vergleichen beim nächsten Mal. */
  text: z.string().max(MAX_ERKLAER_TEXT).optional(),
});
export type ErklaerErgebnis = z.infer<typeof erklaerErgebnisSchema>;

/** stdin des Erklär-Coachs: die Karte kommt vom Server, nie vom Client. */
export const coachEingabeSchema = z.object({
  karte: z.object({
    id: karteIdSchema,
    track: trackSchema,
    frage: z.string().trim().min(1).max(MAX_FRAGE),
    antwort: z.string().trim().min(1).max(MAX_ANTWORT),
    erklaerhilfe: z.string().trim().min(1).max(MAX_ERKLAERHILFE).optional(),
    kernpunkte: z.array(z.string().trim().min(1).max(MAX_ANTWORT)).min(1).max(5),
  }),
  zielperson: zielpersonSchema,
  text: erklaerTextSchema,
  nachfrage: nachfrageSchema.optional(),
});
export type CoachEingabe = z.infer<typeof coachEingabeSchema>;

export const AGENT_FEHLERARTEN = ['eingabe', 'claude_fehlt', 'zeit', 'ausgabe', 'claude_fehler'] as const;
export type AgentFehlerart = (typeof AGENT_FEHLERARTEN)[number];

/** stdout des Erklär-Coachs: genau eine Zeile. */
export const agentAntwortSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), bewertung: erklaerBewertungSchema }),
  z.object({ ok: z.literal(false), art: z.enum(AGENT_FEHLERARTEN), meldung: z.string().max(500) }),
]);
export type AgentAntwort = z.infer<typeof agentAntwortSchema>;
