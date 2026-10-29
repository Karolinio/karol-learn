import type { Track, Vorschlag } from '@karol-learn/karten-kern';

export const SERVER = (import.meta.env.VITE_KL_SERVER as string | undefined) ?? 'http://127.0.0.1:8810';
const STATUS_TIMEOUT_MS = 800;

type Umschlag<T> = { success: boolean; data: T | null; error: string | null };
export type OffenerVorschlag = Vorschlag & { laufId: string; laufQuelle: string };
export interface Idee { id: string; titel: string; art: 'skizze' | 'vergleich' | 'uebung'; beschreibung: string; track: Track; thema: string; quelle: string; laufId: string }
export interface Eingang { vorschlaege: OffenerVorschlag[]; ideen: Idee[] }

async function rufe<T>(pfad: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const ab = new AbortController();
  const zeit = setTimeout(() => ab.abort(), timeoutMs);
  try {
    const r = await fetch(`${SERVER}${pfad}`, { ...init, signal: ab.signal, headers: { 'Content-Type': 'application/json' } });
    const u = (await r.json()) as Umschlag<T>;
    if (!u.success || u.data === null) throw new Error(u.error ?? `HTTP ${r.status}`);
    return u.data;
  } finally {
    clearTimeout(zeit);
  }
}

/** Findet den lokalen Server; ohne Antwort in 800 ms gilt er als nicht da. */
export async function serverDa(): Promise<boolean> {
  try {
    const d = await rufe<{ ok: boolean }>('/api/status', {}, STATUS_TIMEOUT_MS);
    return d.ok === true;
  } catch {
    return false;
  }
}

export async function holeEingang(): Promise<Eingang> {
  const d = await rufe<Partial<Eingang> | OffenerVorschlag[]>('/api/vorschlaege');
  // Ältere Server lieferten nur die Liste.
  return Array.isArray(d) ? { vorschlaege: d, ideen: [] } : { vorschlaege: d.vorschlaege ?? [], ideen: d.ideen ?? [] };
}
export const nimmAn = (vid: string) => rufe<unknown>(`/api/vorschlaege/${encodeURIComponent(vid)}/annehmen`, { method: 'POST' });
export const lehneAb = (vid: string) => rufe<unknown>(`/api/vorschlaege/${encodeURIComponent(vid)}/ablehnen`, { method: 'POST' });
export const meldeAnServer = (id: string, grund: string) =>
  rufe<unknown>('/api/meldungen', { method: 'POST', body: JSON.stringify({ id, grund }) });
