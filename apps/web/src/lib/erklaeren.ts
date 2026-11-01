import { z } from 'zod';
import { erklaerBewertungSchema, type AgentFehlerart, type ErklaerAnfrage, type ErklaerBewertung } from '@karol-learn/karten-kern';
import { SERVER } from './server';

/** Server wartet 75 s auf den Coach, claude 60 s: die App gibt nach 90 s auf. */
export const ERKLAER_TIMEOUT_MS = 90_000;

export type ErklaerFehlerArt = AgentFehlerart | 'netz' | 'abgebrochen';

export class ErklaerFehler extends Error {
  constructor(public art: ErklaerFehlerArt, meldung: string) { super(meldung); }
}

const umschlagSchema = z.object({ success: z.boolean(), data: z.unknown(), error: z.string().nullable() });
const datenSchema = z.object({ bewertung: erklaerBewertungSchema });

function artVon(status: number): AgentFehlerart {
  if (status === 504) return 'zeit';
  if (status === 503) return 'claude_fehlt';
  if (status === 502) return 'ausgabe';
  if (status >= 400 && status < 500) return 'eingabe';
  return 'claude_fehler';
}

async function hole(anfrage: ErklaerAnfrage, signal: AbortSignal, fetcher: typeof fetch): Promise<Response> {
  try {
    return await fetcher(`${SERVER}/api/erklaeren`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(anfrage),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ErklaerFehler('abgebrochen', 'Abgebrochen');
    throw new ErklaerFehler('netz', 'Der lokale Server ist nicht erreichbar');
  }
}

/** Ein Lauf je Aufruf. Prüft die Antwort ein drittes Mal mit demselben zod-Schema wie Agent und Server. */
export async function bewerteErklaerung(anfrage: ErklaerAnfrage, abbruch?: AbortSignal, fetcher: typeof fetch = fetch): Promise<ErklaerBewertung> {
  const ab = new AbortController();
  let zeitUm = false;
  const zeit = setTimeout(() => { zeitUm = true; ab.abort(); }, ERKLAER_TIMEOUT_MS);
  const weiter = () => ab.abort();
  if (abbruch?.aborted) ab.abort();
  abbruch?.addEventListener('abort', weiter);
  try {
    const r = await hole(anfrage, ab.signal, fetcher);
    const u = umschlagSchema.safeParse(await r.json().catch(() => null));
    if (!u.success) throw new ErklaerFehler(artVon(r.status), `Unerwartete Antwort (HTTP ${r.status})`);
    if (!r.ok || !u.data.success) throw new ErklaerFehler(artVon(r.status), u.data.error ?? `HTTP ${r.status}`);
    const d = datenSchema.safeParse(u.data.data);
    if (!d.success) throw new ErklaerFehler('ausgabe', 'Die Bewertung hat ein unerwartetes Format');
    return d.data.bewertung;
  } catch (e) {
    if (zeitUm) throw new ErklaerFehler('zeit', 'Keine Antwort nach 90 Sekunden');
    throw e;
  } finally {
    clearTimeout(zeit);
    abbruch?.removeEventListener('abort', weiter);
  }
}
