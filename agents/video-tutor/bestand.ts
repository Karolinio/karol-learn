import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { karteSchema, TRACKS, type Karte } from '@karol-learn/karten-kern';

export function ladeKarten(inhalt: string): Karte[] {
  return TRACKS.flatMap((track) => {
    const ordner = join(inhalt, 'karten', track);
    if (!existsSync(ordner)) return [];
    return readdirSync(ordner).filter((f) => f.endsWith('.json')).flatMap((f) => {
      const d = JSON.parse(readFileSync(join(ordner, f), 'utf8')) as { karten?: unknown[] };
      return (d.karten ?? []).flatMap((k) => { const r = karteSchema.safeParse(k); return r.success ? [r.data] : []; });
    });
  });
}

export function baueAuftrag(prompt: string, karten: readonly Karte[], transkript: string, track?: string): string {
  const relevante = track ? karten.filter((k) => k.track === track) : karten;
  const themen = [...new Set(relevante.map((k) => `${k.track}: ${k.thema}`))].sort();
  const vorhanden = relevante.map((k) => `- ${k.id} | ${k.frage}`).join('\n');
  return [
    prompt.trim(),
    track ? `\nNur Track \`${track}\`.` : '',
    `\n## Vorhandene Themen\n${themen.join('\n')}`,
    `\n## Vorhandene Fragen (nicht wiederholen)\n${vorhanden}`,
    `\n## Transkript\n<transkript>\n${transkript}\n</transkript>`,
  ].join('\n');
}
