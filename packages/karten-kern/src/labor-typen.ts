import { z } from 'zod';
import { trackSchema } from './typen';

/** Obergrenze für freie Texte: schützt Prüfung und App vor aufgeblähten Dateien. */
export const MAX_LABOR_TEXT = 20_000;
const textSchema = z.string().trim().min(1).max(MAX_LABOR_TEXT);
const SZENARIO_ID = /^(aie|fde)-labor-[a-z0-9-]+$/;

/** Ein Text mit seiner Länge in Tokens (geschätzt, fest im Skript). */
const tokenTextSchema = z.object({ text: textSchema, tokens: z.number().int().min(0) });

export const ROLLEN = ['system', 'user', 'assistant', 'tool_use', 'tool_result'] as const;
export type Rolle = (typeof ROLLEN)[number];

export interface Nachricht {
  id: string;
  rolle: Rolle;
  text: string;
  tokens: number;
  tool?: string;
  aufrufId?: string;
  istFehler?: boolean;
  istInjektion?: boolean;
}

export const skriptRundeSchema = z.object({
  denken: tokenTextSchema,
  bitte: z.object({ tool: z.string().regex(/^[a-z][a-z0-9_]*$/), args: z.string().max(MAX_LABOR_TEXT), tokens: z.number().int().min(0) }).optional(),
  ergebnis: tokenTextSchema.extend({
    /** Was die Schnittstelle in Wahrheit gemeldet hat. Ohne fehlerDurchreichen sieht das Modell nur `text`. */
    fehler: z.object({ status: z.number().int().min(100).max(599), text: textSchema }).optional(),
    /** Der Text enthält eine eingeschleuste Anweisung, die dieses Tool auslösen will. */
    injektion: z.object({ zielTool: z.string().min(1) }).optional(),
  }).optional(),
  fertig: z.boolean().optional(),
});
export type SkriptRunde = z.infer<typeof skriptRundeSchema>;

export const skriptSchema = z.object({
  system: tokenTextSchema,
  user: tokenTextSchema,
  tools: z.array(z.object({ name: z.string().regex(/^[a-z][a-z0-9_]*$/), beschreibung: textSchema, tokens: z.number().int().min(0) })).min(1).max(12),
  runden: z.array(skriptRundeSchema),
  /** Wiederholt sich ohne Stoppbedingung, wenn `runden` aufgebraucht sind. */
  schleife: skriptRundeSchema.optional(),
});
export type Skript = z.infer<typeof skriptSchema>;

export const harnessReglerSchema = z.object({
  toolAnzahl: z.number().int().min(1).max(12),
  maxRunden: z.number().int().min(1).nullable(),
  kontextLimit: z.number().int().min(1000),
  gateway: z.boolean(),
  mandat: z.object({ tools: z.array(z.string()) }).optional(),
  caching: z.boolean(),
  ergebnisMaxTokens: z.number().int().min(1).optional(),
  kompaktierungAb: z.number().gt(0).max(1).optional(),
  gleicheBitteMax: z.number().int().min(1).optional(),
  fehlerDurchreichen: z.boolean(),
});
export type HarnessRegler = z.infer<typeof harnessReglerSchema>;

export const wahlSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  text: z.string().trim().min(1).max(140),
  richtig: z.boolean(),
  /** 1–2 Sätze in einfacher Sprache. */
  warum: z.string().trim().min(1).max(320),
});
export type Wahl = z.infer<typeof wahlSchema>;

export const fixSchema = z.object({ regler: harnessReglerSchema.partial().optional(), skript: skriptSchema.optional() });
export type Fix = z.infer<typeof fixSchema>;
export const reparaturSchema = wahlSchema.merge(fixSchema).extend({
  /** Ändert am simulierten Lauf nichts (z. B. „anderes Modell“). Pflicht, wenn weder regler noch skript gesetzt ist. */
  wirkungslos: z.boolean().optional(),
});
export type Reparatur = z.infer<typeof reparaturSchema>;

export const METRIKEN = ['ende', 'usd', 'kontextMax', 'injektion', 'fehlerSichtbar', 'tool'] as const;
export const beweisSchema = z.object({ metrik: z.enum(METRIKEN), erwartet: z.union([z.string(), z.number(), z.boolean()]) });
export type Beweis = z.infer<typeof beweisSchema>;

export const szenarioSchema = z.object({
  id: z.string().regex(SZENARIO_ID, 'id: <track>-labor-<slug>'),
  track: trackSchema,
  themen: z.array(z.string().min(1)).min(1),
  titel: z.string().trim().min(1).max(60),
  symptom: z.string().trim().min(1).max(400),
  skript: skriptSchema,
  regler: harnessReglerSchema,
  ursachen: z.tuple([wahlSchema, wahlSchema, wahlSchema]),
  reparaturen: z.tuple([reparaturSchema, reparaturSchema, reparaturSchema]),
  /** Im gebauten Index ohne ausgeschlossene Karten; mindestens eine verlangt pruefeSzenario. */
  karten: z.array(z.string()),
  skizze: z.string().regex(/^[a-z0-9-]+$/).optional(),
  beweis: beweisSchema,
}).refine((s) => s.id.startsWith(`${s.track}-`), { message: 'id braucht das Präfix des Tracks', path: ['id'] });
export type Szenario = z.infer<typeof szenarioSchema>;

/** Sandbox für den Simulator: ein Lauf ohne Rätsel. */
export const grundlaufSchema = z.object({
  id: z.string().regex(/^(aie|fde)-grundlauf$/),
  track: trackSchema,
  themen: z.array(z.string().min(1)).min(1),
  titel: z.string().trim().min(1).max(60),
  skript: skriptSchema,
  regler: harnessReglerSchema,
});
export type Grundlauf = z.infer<typeof grundlaufSchema>;

export const laborErgebnisSchema = z.object({
  szenarioId: z.string().regex(SZENARIO_ID),
  track: trackSchema,
  geloest: z.boolean(),
  /** 1 = ohne Fehlgriff gelöst, jede falsche Wahl zählt einen Versuch mehr. */
  versuche: z.number().int().min(1).max(99),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type LaborErgebnis = z.infer<typeof laborErgebnisSchema>;

export type Ende = 'fertig' | 'max_runden' | 'kontext_voll' | 'wiederholung' | 'not_aus';
/** Sicherung gegen echte Endlosläufe: so viele Runden höchstens, egal was der Regler sagt. */
export const HARTES_LIMIT = 30;

export interface RundenKosten { input: number; cacheLesen: number; cacheSchreiben: number; output: number; usd: number }

export type SpanArt = 'lauf' | 'runde' | 'modell' | 'gateway' | 'tool';
export type SpanStatus = 'ok' | 'fehler' | 'abgelehnt';
export interface Span { id: string; eltern?: string; art: SpanArt; name: string; startMs: number; dauerMs: number; status: SpanStatus }

export interface SimSchritt {
  runde: number;
  nachrichten: readonly Nachricht[];
  kontextTokens: number;
  kontextAnteil: number;
  kosten: RundenKosten;
  kumuliert: RundenKosten;
  spans: readonly Span[];
  ereignis: string;
}

export interface SimLauf {
  schritte: readonly SimSchritt[];
  ende: Ende;
  injektionAusgefuehrt: boolean;
  fehlerSichtbar: boolean;
  /** Tools, die wirklich ausgeführt wurden, in Reihenfolge. */
  genutzteTools: readonly string[];
}
